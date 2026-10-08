# TokTickIT — REST API Specification (Sprint 4 / Issue 18)

**Base URL:** `/api`  
**Protocol:** HTTP/1.1 (JSON payload, UTF-8 encoded)  
**Security Context:** HTTP-Only, SameSite Session Cookie (`toktickit_session`) containing a signed HS256 JWT  
**Design System:** Zen Green Palette  
**Status:** Authoritative Specification  

---

## 1. Global Standards & Envelope Principles

All API endpoints strictly follow RESTful design conventions, standard HTTP status codes, and predictable JSON response envelopes.

### 1.1 Single Resource Success Envelope
```json
{
  "data": { ... }
}
```

### 1.2 Paginated / Collection Success Envelope
For collections without pagination or where array results are returned directly within data:
```json
{
  "data": [ ... ]
}
```

For paginated collections:
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 1.3 Standardized Error Envelope
All client and server errors return a consistent envelope containing `error.code`, `error.message`, and optional structured `error.details`:
```json
{
  "error": {
    "code": "RESOLUTION_ACTION_REQUIRED",
    "message": "At least one action taken must be recorded before resolving this ticket.",
    "details": {
      "ticketId": 14,
      "currentStatus": "IN_PROGRESS",
      "requestedStatus": "RESOLVED",
      "actionsCount": 0
    }
  }
}
```

For validation failures:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for one or more fields.",
    "details": {
      "fieldErrors": {
        "description": "Action description is required and must be between 10 and 2000 characters.",
        "timeSpentMinutes": "Time spent must be an integer between 1 and 1440 minutes."
      }
    }
  }
}
```

---

## 2. Concurrency & Identity Architecture Contracts

### 2.1 Optimistic Concurrency Control Contract (`expectedUpdatedAt`)

To prevent dirty writes and silent overwrite collisions when multiple IT Staff members view and modify action logs concurrently:
1. Every `PUT /api/tickets/:id/actions/:actionId` request **must** provide the `expectedUpdatedAt` concurrency token in the JSON request body.
2. The server compares `expectedUpdatedAt` against the existing database record's `updatedAt` timestamp (converted to ISO-8601 UTC string).
3. **Missing Token Contract:** If `expectedUpdatedAt` is omitted, `null`, or undefined, the server immediately rejects the request with HTTP **`400 Bad Request`**:
   ```json
   {
     "error": {
       "code": "MISSING_CONCURRENCY_TOKEN",
       "message": "The 'expectedUpdatedAt' concurrency token is required to update an action record.",
       "details": {
         "actionId": 8,
         "requiredField": "expectedUpdatedAt"
       }
     }
   }
   ```
4. **Stale Record Conflict Contract:** If `expectedUpdatedAt` does not match the current `updatedAt` in the database (indicating another user or process updated the action in the interim), the server rejects the request with HTTP **`409 Conflict`**:
   ```json
   {
     "error": {
       "code": "STALE_ACTION_CONFLICT",
       "message": "The action record has been modified by another user since you loaded it. Please reload the latest version before applying changes.",
       "details": {
         "actionId": 8,
         "providedUpdatedAt": "2026-10-08T10:15:30.000Z",
         "currentUpdatedAt": "2026-10-08T10:18:45.120Z",
         "currentRecord": {
           "id": 8,
           "description": "Updated firmware configuration per network supervisor review.",
           "actionType": "CONFIGURATION",
           "timeSpentMinutes": 45,
           "performedAt": "2026-10-08T10:10:00.000Z",
           "updatedAt": "2026-10-08T10:18:45.120Z",
           "performedBy": {
             "id": 6,
             "fullName": "Alex Morgan"
           }
         }
       }
     }
   }
   ```

### 2.2 Server Authority for Performer Identity (`performedById`)

* Under zero-trust security principles, client applications cannot supply or dictate the identity of the person who performed the work.
* `performedById` is **strictly derived on the server** from `req.user.id` through the verified session cookie (`toktickit_session`).
* If a client request includes `performedById`, `performerId`, or `userId` in the body payload:
  - The API layer ignores the client-supplied value completely, or
  - If explicitly validated, rejects with `400 Bad Request` (`IMMUTABLE_IDENTITY_OVERRIDE`).
  - The database insert always uses `req.user.id`.

---

## 3. Server-Enforced Resolution Gate API Contract

### 3.1 Status Transition Endpoint (`PATCH /api/tickets/:id/status`)

* **Endpoint:** `PATCH /api/tickets/:id/status`
* **Access Control:** `IT_STAFF`, `ADMINISTRATOR` (403 Forbidden for `REQUESTER`)
* **Request Payload:**
  ```json
  {
    "status": "RESOLVED",
    "resolutionSummary": "Replaced faulty Cat6 Ethernet patch cable and verified Gigabit link negotiation on port 24."
  }
  ```

### 3.2 Resolution Gate Execution Flow

When `status === "RESOLVED"`:
1. **Pure Structural Transition Check (`shared/ticketStateMachine.ts`):**
   - The server validates whether the ticket's current status allows transitioning to `RESOLVED` (only `IN_PROGRESS` is allowed).
   - Validates that `resolutionSummary` is provided and between 10 and 1,000 characters.
   - If invalid, returns `422 Unprocessable Entity` (`INVALID_STATUS_TRANSITION` or `VALIDATION_ERROR`).
2. **Server-Enforced Action Count Gate (Database Query):**
   - The server counts the number of child `ActionTaken` records associated with `ticketId`:
     ```ts
     const actionsCount = await prisma.actionTaken.count({
       where: { ticketId }
     });
     ```
   - If `actionsCount < 1`, the server halts execution and returns HTTP **`422 Unprocessable Entity`**:
     ```json
     {
       "error": {
         "code": "RESOLUTION_ACTION_REQUIRED",
         "message": "At least one action taken must be recorded before resolving this ticket.",
         "details": {
           "ticketId": 14,
           "currentStatus": "IN_PROGRESS",
           "requestedStatus": "RESOLVED",
           "actionsCount": 0
         }
       }
     }
     ```
3. **Commit & Activity Audit:**
   - If `actionsCount >= 1` and `resolutionSummary` is valid, the server updates ticket status to `RESOLVED`, sets `resolutionSummary`, records `updatedAt`, and writes a `TicketActivity` entry (`STATUS_CHANGED`).

---

## 4. Actions Taken REST API Endpoints

### 4.1 List Actions Taken (`GET /api/tickets/:id/actions`)

Retrieves chronological actions taken recorded for a parent ticket.

* **URL:** `GET /api/tickets/:id/actions`
* **Access Control:**
  - `IT_STAFF` / `ADMINISTRATOR`: Can view actions for any ticket.
  - `REQUESTER`: Can view actions **only** for tickets where `ticket.requesterId === req.user.id`. Attempting to access an unowned ticket returns `404 Not Found` (anti-enumeration).
* **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "ticketId": 14,
        "description": "Ran diagnostic ping and traceroute tests to gateway; confirmed high latency on switch port.",
        "actionType": "INVESTIGATION",
        "timeSpentMinutes": 30,
        "performedAt": "2026-10-08T09:15:00.000Z",
        "createdAt": "2026-10-08T09:20:00.000Z",
        "updatedAt": "2026-10-08T09:20:00.000Z",
        "performedBy": {
          "id": 7,
          "fullName": "Chris Taylor",
          "email": "chris.taylor@toktickit.com",
          "role": "IT_STAFF"
        }
      },
      {
        "id": 2,
        "ticketId": 14,
        "description": "Re-crimped RJ45 connector and tested cable continuity with fluke tester.",
        "actionType": "REPAIR",
        "timeSpentMinutes": 25,
        "performedAt": "2026-10-08T10:00:00.000Z",
        "createdAt": "2026-10-08T10:05:00.000Z",
        "updatedAt": "2026-10-08T10:05:00.000Z",
        "performedBy": {
          "id": 7,
          "fullName": "Chris Taylor",
          "email": "chris.taylor@toktickit.com",
          "role": "IT_STAFF"
        }
      }
    ]
  }
  ```
* **Error Responses:**
  - `401 Unauthorized`: Session cookie missing or expired.
  - `404 Not Found`: Ticket does not exist or belongs to another Requester.

---

### 4.2 Record Action Taken (`POST /api/tickets/:id/actions`)

Records a new technical action taken on an active ticket.

* **URL:** `POST /api/tickets/:id/actions`
* **Access Control:** `IT_STAFF`, `ADMINISTRATOR` (`403 Forbidden` for `REQUESTER`)
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "description": "Swapped out defective display cable and verified 4K 60Hz video output on workstation.",
    "actionType": "REPAIR",
    "timeSpentMinutes": 20,
    "performedAt": "2026-10-08T11:00:00.000Z"
  }
  ```
* **Field Constraints:**
  - `description`: String, required, 10–2,000 characters (trimmed).
  - `actionType`: String, optional (default `"INVESTIGATION"`), max 50 characters. Allowed values: `"INVESTIGATION"`, `"CONFIGURATION"`, `"REPAIR"`, `"COMMUNICATION"`, `"OTHER"`.
  - `timeSpentMinutes`: Integer, required, positive integer between 1 and 1,440.
  - `performedAt`: ISO-8601 string, optional (default: `now()`), cannot be future-dated by more than 5 minutes.
  - `performedById`: Disallowed in payload; derived from `req.user.id`.
* **Business Rule Validation:**
  - Parent ticket must be in a workable status (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
  - If ticket is in `NEW`, `RESOLVED`, `CLOSED`, or `CANCELLED`, returns `422 Unprocessable Entity` (`TICKET_NOT_IN_WORKABLE_STATE`).
* **Response (201 Created):**
  ```json
  {
    "data": {
      "id": 3,
      "ticketId": 14,
      "description": "Swapped out defective display cable and verified 4K 60Hz video output on workstation.",
      "actionType": "REPAIR",
      "timeSpentMinutes": 20,
      "performedAt": "2026-10-08T11:00:00.000Z",
      "createdAt": "2026-10-08T11:02:15.000Z",
      "updatedAt": "2026-10-08T11:02:15.000Z",
      "performedBy": {
        "id": 6,
        "fullName": "Alex Morgan",
        "email": "alex.morgan@toktickit.com",
        "role": "IT_STAFF"
      }
    }
  }
  ```
* **Error Responses:**
  - `400 Bad Request`: Invalid JSON payload or client attempts to supply `performedById`.
  - `401 Unauthorized`: Session missing or expired.
  - `403 Forbidden`: Authenticated user is a `REQUESTER`.
  - `404 Not Found`: Ticket not found.
  - `422 Unprocessable Entity`: Field validation failed (`VALIDATION_ERROR`) or ticket not workable (`TICKET_NOT_IN_WORKABLE_STATE`).

---

### 4.3 Update Action Taken (`PUT /api/tickets/:id/actions/:actionId`)

Modifies an existing Action Taken record with optimistic concurrency validation.

* **URL:** `PUT /api/tickets/:id/actions/:actionId`
* **Access Control:** `IT_STAFF`, `ADMINISTRATOR` (`403 Forbidden` for `REQUESTER`)
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "expectedUpdatedAt": "2026-10-08T11:02:15.000Z",
    "description": "Swapped out defective display cable, verified 4K 60Hz video output, and recalibrated color profile.",
    "actionType": "REPAIR",
    "timeSpentMinutes": 35,
    "performedAt": "2026-10-08T11:00:00.000Z"
  }
  ```
* **Concurrency Evaluation:**
  - If `expectedUpdatedAt` is missing $\to$ `400 MISSING_CONCURRENCY_TOKEN`.
  - If `expectedUpdatedAt` does not match record's `updatedAt` $\to$ `409 STALE_ACTION_CONFLICT`.
* **Response (200 OK):**
  ```json
  {
    "data": {
      "id": 3,
      "ticketId": 14,
      "description": "Swapped out defective display cable, verified 4K 60Hz video output, and recalibrated color profile.",
      "actionType": "REPAIR",
      "timeSpentMinutes": 35,
      "performedAt": "2026-10-08T11:00:00.000Z",
      "createdAt": "2026-10-08T11:02:15.000Z",
      "updatedAt": "2026-10-08T11:15:42.000Z",
      "performedBy": {
        "id": 6,
        "fullName": "Alex Morgan",
        "email": "alex.morgan@toktickit.com",
        "role": "IT_STAFF"
      }
    }
  }
  ```
* **Error Responses:**
  - `400 Bad Request`: Missing `expectedUpdatedAt` (`MISSING_CONCURRENCY_TOKEN`).
  - `401 Unauthorized`: Session missing or expired.
  - `403 Forbidden`: Authenticated user is a `REQUESTER`.
  - `404 Not Found`: Ticket or Action Taken record does not exist.
  - `409 Conflict`: Stale record timestamp mismatch (`STALE_ACTION_CONFLICT`).
  - `422 Unprocessable Entity`: Validation failure or parent ticket is in closed/terminal status.

---

## 5. Operational Dashboard & Analytics API

### 5.1 Dashboard Overview Endpoint (`GET /api/staff/dashboard`)

Returns operational KPI summary metrics and workload distribution for IT operations.

* **URL:** `GET /api/staff/dashboard`
* **Access Control:** `IT_STAFF`, `ADMINISTRATOR` (`403 Forbidden` for `REQUESTER`)
* **Response (200 OK):**
  ```json
  {
    "data": {
      "metrics": {
        "totalOpen": 5,
        "inProgress": 3,
        "waitingForRequester": 2,
        "recentlyResolved": 8,
        "unassignedCount": 2,
        "totalTimeSpentMinutes": 645
      },
      "categoryBreakdown": [
        {
          "categoryId": 1,
          "categoryName": "Account & Access",
          "ticketCount": 6,
          "totalTimeSpentMinutes": 180
        },
        {
          "categoryId": 2,
          "categoryName": "Hardware",
          "ticketCount": 4,
          "totalTimeSpentMinutes": 240
        },
        {
          "categoryId": 3,
          "categoryName": "Software",
          "ticketCount": 3,
          "totalTimeSpentMinutes": 150
        },
        {
          "categoryId": 4,
          "categoryName": "Network",
          "ticketCount": 2,
          "totalTimeSpentMinutes": 75
        }
      ],
      "priorityBreakdown": {
        "P0_URGENT": 1,
        "P1_HIGH": 3,
        "P2_MEDIUM": 7,
        "P3_LOW": 4
      },
      "meta": {
        "calculationTimestamp": "2026-10-08T12:00:00.000Z",
        "recentlyResolvedWindowDays": 7,
        "recentlyResolvedWindowStart": "2026-10-01T12:00:00.000Z"
      }
    }
  }
  ```

### 5.2 Metric Calculation Specifications: Mandates vs. Project Decisions

To ensure full transparency between coursework specifications and engineering implementation decisions:

| Metric Name | Calculation Formula / SQL Definition | Source / Classification |
| :--- | :--- | :--- |
| **`totalOpen`** | Count of tickets where `status IN ('NEW', 'OPEN')` | **Lab Sheet Mandate:** Represents new and acknowledged incoming queue volume. |
| **`inProgress`** | Count of tickets where `status = 'IN_PROGRESS'` | **Lab Sheet Mandate:** Represents active work underway by assigned staff. |
| **`waitingForRequester`** | Count of tickets where `status = 'WAITING_FOR_REQUESTER'` | **Lab Sheet Mandate:** Blocked tickets awaiting requester input. |
| **`recentlyResolved`** | Count of tickets where `status = 'RESOLVED'` AND `updatedAt >= (NOW() - INTERVAL '7 DAYS')` | **Project Design Decision:** The Lab Sheet requests "recently resolved" tickets without specifying an arbitrary fixed cutoff; TokTickIT formally defines this as a **rolling 7-day window** ($t \ge \text{now}() - 7\text{ days}$) to maintain operational relevance and prevent historical count bloat. |
| **`unassignedCount`** | Count of tickets where `ownerId IS NULL` AND `status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')` | **Project Design Decision:** Essential operational metric identifying unowned triage items. |
| **`totalTimeSpentMinutes`** | Sum of `ActionTaken.timeSpentMinutes` across all actions linked to active or recently resolved tickets | **Lab Sheet Mandate:** Workload aggregation proving time accounting. |
| **`categoryBreakdown`** | Group by `categoryId` aggregating count of non-terminal tickets and sum of action durations | **Lab Sheet Mandate:** Resource distribution across IT domains. |
| **`priorityBreakdown`** | Group by effective IT priority (`itPriority` if present, else `requestedPriority`) | **Project Design Decision:** Prioritization visibility across active queue. |

---

## 6. Advisory Requester Resolution API

### 6.1 Confirm Problem Resolved (`POST /api/tickets/:id/confirm-resolved`)

Allows a Requester to indicate that a problem appears solved on their own ticket.

* **URL:** `POST /api/tickets/:id/confirm-resolved`
* **Access Control:** `REQUESTER` (strictly ticket owner: `ticket.requesterId === req.user.id`). IT Staff or Admin calling this receive `403 Forbidden`.
* **State Behavior:**
  1. Sets `ticket.resolutionIndicated = true`.
  2. If `ticket.status === 'WAITING_FOR_REQUESTER'`, auto-transitions to `'IN_PROGRESS'`.
  3. Appends an automated public comment: `"Requester indicated the problem appears resolved."`
  4. Records activity in `TicketActivity` (`REQUESTER_CONFIRMED_RESOLVED`).
* **Strict Invariant:** This endpoint **never** sets status to `RESOLVED` or `CLOSED`. Ticket status remains `IN_PROGRESS` or unchanged. Formal resolution is strictly reserved for IT Staff after meeting Resolution Gate criteria.
* **Response (200 OK):**
  ```json
  {
    "data": {
      "id": 14,
      "ticketNo": "TKT-2026-00014",
      "status": "IN_PROGRESS",
      "resolutionIndicated": true,
      "updatedAt": "2026-10-08T11:30:00.000Z"
    }
  }
  ```

---

## 7. Comprehensive Error Codes Matrix

| HTTP Status | Error Code | Description / Trigger Condition | User / Client Remediation |
| :---: | :--- | :--- | :--- |
| **400** | `MISSING_CONCURRENCY_TOKEN` | `PUT /api/tickets/:id/actions/:actionId` called without `expectedUpdatedAt`. | Provide `expectedUpdatedAt` from the loaded action record. |
| **400** | `IMMUTABLE_IDENTITY_OVERRIDE` | Client explicitly sent `performedById` in action creation/update. | Remove client-supplied ID; server populates it automatically. |
| **401** | `UNAUTHORIZED` | Session cookie is absent, expired, or invalid. | Log in to obtain a valid session cookie. |
| **403** | `FORBIDDEN` | Caller lacks role permission (e.g. Requester accessing dashboard or creating actions). | Access denied; route restricted to IT Staff/Admin. |
| **404** | `NOT_FOUND` | Ticket or Action Taken ID does not exist, or unowned Requester ticket. | Verify ID; avoid unauthorized resource access. |
| **409** | `STALE_ACTION_CONFLICT` | `expectedUpdatedAt` does not match database `updatedAt`. | Reload latest action record and review conflicting changes. |
| **422** | `RESOLUTION_ACTION_REQUIRED` | Attempting to transition `IN_PROGRESS -> RESOLVED` with `actionsCount === 0`. | Log at least one technical Action Taken before resolving. |
| **422** | `TICKET_NOT_IN_WORKABLE_STATE` | Attempting to log/edit action on `NEW`, `RESOLVED`, `CLOSED`, or `CANCELLED` ticket. | Claim or reopen ticket before recording work. |
| **422** | `INVALID_STATUS_TRANSITION` | Transition violates structural state machine in `shared/ticketStateMachine.ts`. | Follow allowed lifecycle transition sequence. |
| **422** | `VALIDATION_ERROR` | Description $< 10$ or $> 2000$ chars; time spent $< 1$ or $> 1440$; future timestamp. | Correct highlighted form fields according to constraints. |
| **500** | `INTERNAL_SERVER_ERROR` | Unexpected server or database exception. | Review server logs and retry request. |
