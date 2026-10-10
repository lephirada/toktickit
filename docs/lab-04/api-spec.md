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

### 3.2 Resolution Gate Execution Flow & Boundary Validation Matrix

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
   - If `actionsCount < 1`, the server halts execution and returns HTTP **`422 Unprocessable Entity`** (`RESOLUTION_ACTION_REQUIRED`).
3. **Resolution Gate Boundary Validation Matrix:**

| Test / Evaluation Case | Input Values | Server Evaluation | HTTP Status & Error Code | Expected Result |
| :--- | :--- | :--- | :---: | :--- |
| **Missing Summary** | `resolutionSummary: undefined` or `null` | Field is required | `422 VALIDATION_ERROR` | Request rejected; status unchanged |
| **Below Min Length** | `resolutionSummary: "Fixed it."` (9 chars) | Length $< 10$ | `422 VALIDATION_ERROR` | Request rejected; status unchanged |
| **Exact Min Length** | `resolutionSummary: "1234567890"` (10 chars), `actionsCount >= 1` | Lower boundary satisfied | `200 OK` | Ticket status transitions to `RESOLVED` |
| **Exact Max Length** | `resolutionSummary: "a".repeat(1000)` (1000 chars), `actionsCount >= 1` | Upper boundary satisfied | `200 OK` | Ticket status transitions to `RESOLVED` |
| **Exceeds Max Length**| `resolutionSummary: "a".repeat(1001)` (1001 chars) | Length $> 1000$ | `422 VALIDATION_ERROR` | Request rejected; status unchanged |
| **Zero Actions Taken**| Valid summary (e.g. 50 chars), `actionsCount === 0` | Action count $< 1$ | `422 RESOLUTION_ACTION_REQUIRED` | Request rejected; status unchanged |
| **Valid Resolution** | Valid summary (e.g. 50 chars), `actionsCount >= 1` | Both criteria satisfied | `200 OK` | Ticket status transitions to `RESOLVED`, activity logged |

4. **Failure Payload for Zero Actions:**
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
5. **Commit & Activity Audit:**
   - If `actionsCount >= 1` and `resolutionSummary` satisfies boundary checks (10–1,000 chars), the server updates ticket status to `RESOLVED`, sets `resolutionSummary`, records `updatedAt`, and writes a `TicketActivity` entry (`STATUS_CHANGED`).

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
  - `performedAt`: ISO-8601 string, optional (default: `now()`). **Cannot be in the future** (`performedAt <= now()`). Any timestamp where `performedAt > now()` (future server time) is strictly rejected with `422 Unprocessable Entity` (`VALIDATION_ERROR`).
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

To ensure full transparency between coursework specifications, engineering implementation, and test suites, the status scope of each metric and the exact inclusion criteria for Action Taken durations are explicitly defined below:

#### 5.2.1 Status Scope Taxonomy
* **Active Workable Queue Statuses:** `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`
* **Incoming Unassigned Status:** `NEW`
* **Operational Completion (Temporary):** `RESOLVED`
* **Terminal Statuses:** `CLOSED`, `CANCELLED`
* **Non-Terminal Statuses:** `status NOT IN ('CLOSED', 'CANCELLED')` (i.e. `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`, `RESOLVED`)

#### 5.2.2 Metric Specifications Matrix

| Metric Name | Included Ticket Status Scope | Action Taken Time Inclusion Criteria | SQL / Prisma Definition | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **`totalOpen`** | `status IN ('NEW', 'OPEN')` | N/A (ticket count only) | `COUNT(*) WHERE status IN ('NEW', 'OPEN')` | **Lab Sheet Mandate:** Incoming and unassigned queue volume. |
| **`inProgress`** | `status = 'IN_PROGRESS'` | N/A (ticket count only) | `COUNT(*) WHERE status = 'IN_PROGRESS'` | **Lab Sheet Mandate:** Active tickets currently being worked on. |
| **`waitingForRequester`** | `status = 'WAITING_FOR_REQUESTER'` | N/A (ticket count only) | `COUNT(*) WHERE status = 'WAITING_FOR_REQUESTER'` | **Lab Sheet Mandate:** Tickets blocked awaiting requester input. |
| **`recentlyResolved`** | `status = 'RESOLVED'` AND `updatedAt >= (NOW() - INTERVAL '7 DAYS')` | N/A (ticket count only) | `COUNT(*) WHERE status = 'RESOLVED' AND updatedAt >= NOW() - INTERVAL '7 DAYS'` | **Project Design Decision:** Rolling 7-day window ($t \ge \text{now}() - 7\text{d}$) preventing historical resolved count bloat. |
| **`unassignedCount`** | `ownerId IS NULL` AND `status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')` | N/A (ticket count only) | `COUNT(*) WHERE ownerId IS NULL AND status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')` | **Project Design Decision:** Active workable tickets needing owner triage; excludes `RESOLVED`, `CLOSED`, `CANCELLED`. |
| **`totalTimeSpentMinutes`** | Parent tickets in: (1) Active workable states (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`), OR (2) Recently resolved (`RESOLVED` with `updatedAt >= NOW() - INTERVAL '7 DAYS'`) | Sum of `ActionTaken.timeSpentMinutes` for actions whose parent ticket matches the included ticket statuses. Actions on `CLOSED`, `CANCELLED`, or stale `RESOLVED` ($> 7$ days) tickets are **excluded**. | `SELECT COALESCE(SUM(a."timeSpentMinutes"), 0) FROM "ActionTaken" a JOIN "Ticket" t ON a."ticketId" = t."id" WHERE t."status" IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED') OR (t."status" = 'RESOLVED' AND t."updatedAt" >= NOW() - INTERVAL '7 DAYS')` | **Lab Sheet Mandate:** Reflects active labor and current-cycle throughput without accumulating ancient closed tickets. |
| **`categoryBreakdown`** | **`ticketCount`:** Non-terminal tickets (`status NOT IN ('CLOSED', 'CANCELLED')`) grouped by `categoryId`.<br>**`totalTimeSpentMinutes`:** Actions linked to tickets in that category adhering to the `totalTimeSpentMinutes` status scope. | Sum of `ActionTaken.timeSpentMinutes` for actions linked to tickets in active states or recently resolved ($7$ days) within each category. Actions on `CLOSED` or `CANCELLED` tickets are **excluded**. | See Section 5.2.3 SQL implementation below. | **Lab Sheet Mandate:** Domain resource and workload distribution. |
| **`priorityBreakdown`** | Non-terminal tickets (`status NOT IN ('CLOSED', 'CANCELLED')`) grouped by effective priority (`COALESCE(itPriority, requestedPriority)`). | N/A (ticket count only) | `COUNT(*) WHERE status NOT IN ('CLOSED', 'CANCELLED') GROUP BY COALESCE(itPriority, requestedPriority)` | **Project Design Decision:** Active queue priority distribution. |

#### 5.2.3 Category Breakdown SQL Query Implementation
```sql
SELECT
  c."id" AS "categoryId",
  c."name" AS "categoryName",
  COUNT(DISTINCT t."id") FILTER (
    WHERE t."status" NOT IN ('CLOSED', 'CANCELLED')
  ) AS "ticketCount",
  COALESCE(SUM(a."timeSpentMinutes") FILTER (
    WHERE t."status" IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')
       OR (t."status" = 'RESOLVED' AND t."updatedAt" >= NOW() - INTERVAL '7 DAYS')
  ), 0) AS "totalTimeSpentMinutes"
FROM "Category" c
LEFT JOIN "Ticket" t ON t."categoryId" = c."id"
LEFT JOIN "ActionTaken" a ON a."ticketId" = t."id"
GROUP BY c."id", c."name"
ORDER BY c."id" ASC;
```

#### 5.2.4 Comparative Summary: Ticket Status Scopes vs. Action Duration Scopes

To prevent any calculation discrepancy between developers and QA testers, the table below provides a strict, side-by-side comparison of **which ticket statuses apply to ticket counts** versus **which ticket statuses qualify for Action Taken duration aggregation**:

| Metric Field | Measured Entity | Included Ticket Status Scope | Excluded Ticket Status Scope | Action Taken Time Eligibility |
| :--- | :--- | :--- | :--- | :--- |
| **`totalOpen`** | Ticket Count | `NEW`, `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`, `RESOLVED`, `CLOSED`, `CANCELLED` | N/A (ticket count only) |
| **`inProgress`** | Ticket Count | `IN_PROGRESS` | All other statuses | N/A (ticket count only) |
| **`waitingForRequester`** | Ticket Count | `WAITING_FOR_REQUESTER` | All other statuses | N/A (ticket count only) |
| **`recentlyResolved`** | Ticket Count | `RESOLVED` where `updatedAt >= NOW() - INTERVAL '7 DAYS'` | All other statuses; `RESOLVED` where `updatedAt < NOW() - INTERVAL '7 DAYS'` | N/A (ticket count only) |
| **`unassignedCount`** | Ticket Count | `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` (where `ownerId IS NULL`) | `RESOLVED`, `CLOSED`, `CANCELLED`, and tickets with `ownerId IS NOT NULL` | N/A (ticket count only) |
| **`totalTimeSpentMinutes`** | Action Duration Sum (minutes) | N/A (aggregates actions) | N/A | Actions linked to parent tickets with:<br>• `status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`<br>• OR `status = 'RESOLVED'` AND `updatedAt >= NOW() - INTERVAL '7 DAYS'`<br>*(Actions on `CLOSED`, `CANCELLED`, or stale `RESOLVED` tickets $> 7$ days are **strictly excluded**)* |
| **`categoryBreakdown[i].ticketCount`** | Ticket Count | All non-terminal statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`, `RESOLVED` | `CLOSED`, `CANCELLED` | N/A (ticket count only) |
| **`categoryBreakdown[i].totalTimeSpentMinutes`** | Action Duration Sum (minutes) | N/A (aggregates actions) | N/A | Actions linked to tickets in category $i$ using the **exact same ticket status scope as `totalTimeSpentMinutes`**.<br>*(Actions on `CLOSED`, `CANCELLED`, or stale `RESOLVED` tickets are strictly excluded)* |
| **`priorityBreakdown[p].ticketCount`** | Ticket Count | All non-terminal statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`, `RESOLVED` | `CLOSED`, `CANCELLED` | N/A (ticket count only) |

##### Mathematical Invariant
$$\sum_{i} \text{categoryBreakdown}[i].\text{totalTimeSpentMinutes} \equiv \text{totalTimeSpentMinutes}$$
*If a test or implementation yields a difference between the sum of category times and the top-level `totalTimeSpentMinutes`, it indicates a scope mismatch defect.*

##### Design Rationale for Scope Differences
1. **Why `categoryBreakdown.ticketCount` includes all non-terminal tickets:** Support leads need full operational visibility into open and pending tickets across categories. A ticket resolved yesterday or 10 days ago (awaiting requester closing confirmation) is still active operational history for that department until formally `CLOSED`.
2. **Why `totalTimeSpentMinutes` limits `RESOLVED` to $\le 7$ days and excludes `CLOSED`/`CANCELLED`:** Summing actions on permanently closed tickets would produce an unbounded, ever-growing historical sum that ceases to be actionable. Restricting to active workable queues plus the rolling 7-day resolution window focuses metrics directly on the current operational cycle and active staff effort.

---

## 6. Advisory Requester Resolution API

### 6.1 Confirm Problem Resolved (`POST /api/tickets/:id/confirm-resolved`)

Allows a Requester to indicate that a problem appears solved on their own ticket.

* **URL:** `POST /api/tickets/:id/confirm-resolved`
* **Access Control:** `REQUESTER` (strictly ticket owner: `ticket.requesterId === req.user.id`). IT Staff or Admin calling this receive `403 Forbidden`.
* **State Behavior:**
  1. Sets `ticket.resolutionIndicated = true`.
  2. Leaves `ticket.status` completely unchanged (no automatic status transition occurs; the ticket strictly retains its existing status).
  3. Appends an automated public comment: `"Requester indicated the problem appears resolved."`
  4. Records activity in `TicketActivity` (`REQUESTER_CONFIRMED_RESOLVED`).
* **Strict Invariant:** This endpoint is strictly advisory and **never alters ticket status** under any circumstance. It cannot transition `WAITING_FOR_REQUESTER` to `IN_PROGRESS`, nor can it set status to `RESOLVED` or `CLOSED`. Formal resolution is strictly reserved for IT Staff and Administrators after satisfying the Resolution Gate.
* **Response (200 OK):**
  ```json
  {
    "data": {
      "id": 14,
      "ticketNo": "TKT-2026-00014",
      "status": "WAITING_FOR_REQUESTER",
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
