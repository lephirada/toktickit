# TokTickIT — REST API Specification (Sprint 3 / Issue 10)

**Base URL:** `/api`  
**Protocol:** HTTP/1.1 (JSON payload, UTF-8 encoded)  
**Security Context:** HTTP-Only, SameSite Session Cookie (`toktickit_session`) containing a signed HS256 JWT  

---

## 1. Global Standards & Envelope Principles

All API endpoints strictly adhere to standard HTTP status codes and return responses wrapped in consistent, predictable JSON structures.

### 1.1 Single Resource Success Envelope
```json
{
  "data": { ... }
}
```

### 1.2 Paginated Collection Success Envelope
List endpoints that support pagination return results wrapped in a `data` array with an accompanying `pagination` object:
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
* **Pagination Rules:**
  - `page`: 1-indexed (values $< 1$ default to 1).
  - `pageSize`: default is `10`.
  - Maximum `pageSize` is clamped to `50` to protect database performance.
  - Empty results return `{ "data": [], "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0, "hasNext": false, "hasPrev": false } }`.

### 1.3 Standardized Error Envelope
All error responses return a standardized JSON structure with `code`, `message`, and `details`:
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "The requested status transition is not allowed.",
    "details": {
      "currentStatus": "NEW",
      "requestedStatus": "RESOLVED",
      "allowedNextStatuses": ["OPEN", "CANCELLED"]
    }
  }
}
```

For input validation failures, `details.fieldErrors` maps specific invalid inputs to user-friendly messages:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "details": {
      "fieldErrors": {
        "summary": "Summary is required and must be at least 5 characters.",
        "categoryId": "Category is required."
      }
    }
  }
}
```

### 1.4 HTTP Status Code Mapping
| HTTP Status | TokTickIT Usage |
| :--- | :--- |
| **`200 OK`** | Successful read (`GET`), update (`PATCH`/`PUT`), soft-removal, or logout. |
| **`201 Created`** | Successful entity creation (`POST`). |
| **`400 Bad Request`** | Malformed request syntax or blocked self-deactivation. |
| **`401 Unauthorized`** | Missing, invalid, expired, or deactivated session credentials. |
| **`403 Forbidden`** | Authenticated user lacks required role, or password-change gate is active. |
| **`404 Not Found`** | Resource does not exist or is intentionally hidden due to ownership isolation. |
| **`409 Conflict`** | Duplicate operation (email conflict, duplicate confirmation, last-admin lockout). |
| **`410 Gone`** | Soft-deleted attachment download attempt. |
| **`422 Unprocessable Entity`** | Well-formed request format but invalid field values, password complexity failure, or invalid status transition. |
| **`500 Internal Server Error`** | Unhandled server exception (sensitive details, stack traces, and database credentials are never exposed). |

---

## 2. Authentication & Session Endpoints

### 2.1 Login
* **Method:** `POST`
* **Route:** `/api/auth/login`
* **Authentication:** Public
* **Request Body:**
  ```json
  {
    "email": "jennifer.anderson@toktickit.com",
    "password": "Password123!"
  }
  ```
* **Validation:**
  - `email`: Mandatory valid email string, non-empty.
  - `password`: Mandatory string, non-empty.
* **Success Response (`200 OK`):**
  - **Header:** `Set-Cookie: toktickit_session=<jwt>; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`
  - **Body:**
    ```json
    {
      "data": {
        "id": 3,
        "email": "jennifer.anderson@toktickit.com",
        "fullName": "Jennifer Anderson",
        "role": "REQUESTER",
        "mustChangePassword": false
      }
    }
    ```
* **Error Responses:**
  - `400 Bad Request`: Missing email or password (`VALIDATION_ERROR`).
  - `401 Unauthorized`: Invalid password or inactive account (`INVALID_CREDENTIALS`). Does not expose account existence.

### 2.2 Logout
* **Method:** `POST`
* **Route:** `/api/auth/logout`
* **Authentication Contract & Idempotency:**
  - **Idempotent / Permissive Authentication:** The logout endpoint does **not** return `401 Unauthorized` if the session is expired, missing, or malformed.
  - Calling `/api/auth/logout` when authenticated, when holding an expired token, or when unauthenticated always succeeds and returns **`200 OK`**.
  - In all cases, the server issues a clearing `Set-Cookie` header with `Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0` to ensure the client browser clears `toktickit_session`.
  - This design guarantees that user logout is fully idempotent and will never fail or leave the user trapped in an un-clearable session state due to an unexpected 401 error.
* **Success Response (`200 OK`):**
  - **Header:** `Set-Cookie: toktickit_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
  - **Body:**
    ```json
    {
      "data": {
        "message": "Successfully logged out"
      }
    }
    ```
* **Error Responses:** None. The logout endpoint is universally non-failing (`200 OK`).

### 2.3 Current User State
* **Method:** `GET`
* **Route:** `/api/auth/me`
* **Authentication:** Authenticated (Exempted from password-change gate)
* **Success Response (`200 OK`):**
  ```json
  {
    "data": {
      "id": 3,
      "email": "jennifer.anderson@toktickit.com",
      "fullName": "Jennifer Anderson",
      "role": "REQUESTER",
      "mustChangePassword": false
    }
  }
  ```
* **Error Response:** `401 Unauthorized` if session is missing, expired, or user is deactivated.

### 2.4 Change Password
* **Method:** `POST`
* **Route:** `/api/auth/change-password`
* **Authentication:** Authenticated (Exempted from password-change gate)
* **Request Body:**
  ```json
  {
    "currentPassword": "InitialPass123!",
    "newPassword": "NewSecurePass2026!",
    "confirmPassword": "NewSecurePass2026!"
  }
  ```
* **Validation:**
  - `newPassword`: 8 to 72 characters; at least 1 uppercase, 1 lowercase, 1 digit, 1 special character.
  - `confirmPassword`: Must match `newPassword`.
  - `newPassword`: Must not equal `currentPassword`.
* **Success Response (`200 OK`):**
  ```json
  {
    "data": {
      "message": "Password changed successfully",
      "mustChangePassword": false
    }
  }
  ```
* **Error Responses:**
  - `400 Bad Request`: Incorrect current password (`INVALID_CURRENT_PASSWORD`).
  - `422 Unprocessable Entity`: New password violates complexity policy or mismatch (`VALIDATION_ERROR`).

---

## 3. Requester Ticket Endpoints

### 3.1 List My Tickets
* **Method:** `GET`
* **Route:** `/api/tickets`
* **Authentication:** `requireAuth`, `requireRole('REQUESTER')`
* **Query Parameters:**
  - `page`: integer (default 1)
  - `pageSize`: integer (default 10, max 50)
  - `search`: string (case-insensitive substring of `ticketNo` or `summary`)
  - `status`: string (enum `TicketStatus`)
  - `categoryId`: integer
  - `priority`: string (enum `Priority`)
  - `sortBy`: `'createdAt'` | `'updatedAt'` | `'ticketNo'` (default `'createdAt'`)
  - `sortOrder`: `'asc'` | `'desc'` (default `'desc'`)
* **Ownership Enforcement:** Scoped strictly to `requesterId = req.user.id`. Client-supplied requester IDs are ignored.
* **Success Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "ticketNo": "TKT-2026-00001",
        "summary": "MacBook Pro keyboard key sticking intermittently",
        "requestedPriority": "P2_MEDIUM",
        "itPriority": "P2_MEDIUM",
        "status": "RESOLVED",
        "resolutionIndicated": false,
        "createdAt": "2026-02-01T09:15:00.000Z",
        "category": { "id": 2, "name": "Hardware" },
        "attachmentCount": 0
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 16,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
  ```

### 3.2 Create Ticket
* **Method:** `POST`
* **Route:** `/api/tickets`
* **Authentication:** `requireAuth`, `requireRole('REQUESTER')`
* **Request Body:**
  ```json
  {
    "categoryId": 1,
    "relatedSystemId": 4,
    "priority": "P1_HIGH",
    "summary": "Cannot access Corporate Email after VPN reconnect",
    "description": "Whenever VPN drops and reconnects, Outlook hangs indefinitely.",
    "attachmentIds": [12, 14]
  }
  ```
* **Validation:**
  - `summary`: Mandatory, 5–100 characters, trimmed.
  - `description`: Mandatory, 10–2,000 characters, trimmed.
  - `categoryId`: Mandatory valid Category ID.
  - `priority` (or `requestedPriority`): Valid `Priority` enum (`P0_URGENT`, `P1_HIGH`, `P2_MEDIUM`, `P3_LOW`). The server persists this as `ticket.requestedPriority` and initializes `itPriority` to `null`.
* **Success Response (`201 Created`):** Returns Ticket object with `ticketNo` (`TKT-YYYY-NNNNN`), `status: "NEW"`, `requestedPriority`, `itPriority: null`, and linked attachments.
* **Legacy Compatibility Note on `priority` Field:** In all ticket response JSON payloads (`GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets`), the server additionally returns `priority` as a read-only compatibility alias reflecting `requestedPriority`. This ensures that existing Lab 2 client views and automated regression suites continue functioning without breaking changes during Sprint 3. New Sprint 3 screens consume canonical `requestedPriority` and `itPriority`.

### 3.3 Requester Ticket Detail
* **Method:** `GET`
* **Route:** `/api/tickets/:id`
* **Authentication:** `requireAuth`, `requireRole('REQUESTER')`
* **Ownership Enforcement:** If `ticket.requesterId !== req.user.id`, the server returns `404 Not Found` without disclosing resource existence.
* **Success Response (`200 OK`):** Returns full ticket metadata, category, related system, active attachments list, public comments thread, and activity timeline. Internal notes are **strictly omitted**.

### 3.4 Confirm Problem Appears Resolved
* **Method:** `POST`
* **Route:** `/api/tickets/:id/confirm-resolved`
* **Authentication:** `requireAuth`, `requireRole('REQUESTER')`
* **Ownership Enforcement:** Caller must own the ticket.
* **Preconditions:** Ticket must be in status `IN_PROGRESS` or `WAITING_FOR_REQUESTER`.
* **Request Body (Optional):**
  ```json
  {
    "feedbackComment": "Wi-Fi reconnected successfully after rebooting the router."
  }
  ```
* **Behavior:**
  - Does NOT set `status = 'RESOLVED'`.
  - If ticket was `WAITING_FOR_REQUESTER`, status transitions to `IN_PROGRESS`.
  - If ticket was `IN_PROGRESS`, status remains `IN_PROGRESS`.
  - Atomically sets `resolutionIndicated = true`.
  - Appends an automated Public Comment: `"[Resolution Feedback] The requester indicated that the reported issue appears resolved."`
  - Logs a `TicketActivity` record with action `INDICATE_RESOLVED`.
* **Success Response (`200 OK`):**
  ```json
  {
    "data": {
      "id": 1,
      "ticketNo": "TKT-2026-00001",
      "status": "IN_PROGRESS",
      "resolutionIndicated": true,
      "message": "Resolution confirmation recorded successfully."
    }
  }
  ```
* **Error Responses:**
  - `404 Not Found`: Ticket not found or owned by another requester.
  - `409 Conflict`: Ticket already has `resolutionIndicated === true` (`ALREADY_INDICATED_RESOLVED`).
  - `422 Unprocessable Entity`: Ticket is in an invalid status (e.g. `NEW`, `RESOLVED`, `CLOSED`).

---

## 4. Discussion Endpoints (Comments & Notes)

> [!NOTE]
> **Data Model & Visibility Mapping Contract:**
> At the database persistence layer, both Public Comments and Internal Notes are stored in the unified `"Comment"` table.
> - **Public Comments** (`/api/tickets/:id/comments`) correspond to `visibility: PUBLIC` and map to database column `"isInternal" = false`.
> - **Internal Notes** (`/api/staff/tickets/:id/notes`) correspond to `visibility: INTERNAL` and map to database column `"isInternal" = true`.

### 4.1 List Public Comments
* **Method:** `GET`
* **Route:** `/api/tickets/:id/comments`
* **Authentication:** `requireAuth`
* **Authorization:** Permitted for ticket's Requester owner, active IT Staff, and Administrator.
* **Success Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": 101,
        "ticketId": 1,
        "authorId": 6,
        "authorName": "David Lee",
        "authorRole": "IT_STAFF",
        "content": "We have ordered a replacement keyboard part for your device.",
        "createdAt": "2026-09-16T10:30:00.000Z"
      }
    ]
  }
  ```

### 4.2 Post Public Comment
* **Method:** `POST`
* **Route:** `/api/tickets/:id/comments`
* **Authentication:** `requireAuth`
* **Authorization:** Permitted for ticket's Requester owner, active IT Staff, and Administrator.
* **Request Body:**
  ```json
  {
    "content": "Thank you for the update. Let me know when the part arrives."
  }
  ```
* **Validation:** 1 to 2,000 characters, non-empty, whitespace-only rejected (`422 Unprocessable Entity`).
* **Side Effect:** If the ticket is in `WAITING_FOR_REQUESTER` and the comment is posted by the ticket's Requester, the ticket status automatically transitions to `IN_PROGRESS`.
* **Success Response (`201 Created`):** Returns the created Public Comment object.

### 4.3 List Internal Notes
* **Method:** `GET`
* **Route:** `/api/staff/tickets/:id/notes`
* **Authentication:** `requireAuth`, `requireRole('IT_STAFF', 'ADMINISTRATOR')`
* **Authorization:** Strictly restricted to Staff and Admin. Requesters receive `404 Not Found`.
* **Success Response (`200 OK`):** Returns array of internal note objects ordered by `createdAt ASC`.

### 4.4 Post Internal Note
* **Method:** `POST`
* **Route:** `/api/staff/tickets/:id/notes`
* **Authentication:** `requireAuth`, `requireRole('IT_STAFF', 'ADMINISTRATOR')`
* **Request Body:**
  ```json
  {
    "content": "Diagnostic logs indicate memory bus fault in slot 2. Escalate to hardware vendor."
  }
  ```
* **Validation:** 1 to 2,000 characters, whitespace-only rejected (`422 Unprocessable Entity`).
* **Success Response (`201 Created`):** Returns created InternalNote object.

---

## 5. IT Staff Queue & Operational Endpoints

### 5.1 Staff Ticket Queue Query
* **Method:** `GET`
* **Route:** `/api/staff/tickets`
* **Authentication:** `requireAuth`, `requireRole('IT_STAFF', 'ADMINISTRATOR')` (Requesters receive 403 Forbidden).
* **Query Parameters:**
  - `page`: integer (default 1)
  - `pageSize`: integer (default 10, clamped to max 50)
  - `search`: string (matches `ticketNo` or `summary`)
  - `status`: string (enum `TicketStatus`)
  - `categoryId`: integer
  - `requestedPriority`: string (enum `Priority`)
  - `itPriority`: string (enum `Priority`)
  - `assignedStatus`: `'ALL'` | `'UNASSIGNED'` | `'ASSIGNED'`
  - `ownerId`: integer
  - `sortBy`: `'createdAt'` | `'itPriority'` | `'status'` | `'updatedAt'` (default `'createdAt'`)
  - `sortOrder`: `'asc'` | `'desc'` (default `'desc'`)
* **Success Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "ticketNo": "TKT-2026-00001",
        "summary": "MacBook Pro keyboard key sticking intermittently",
        "requester": { "id": 3, "fullName": "Jennifer Anderson", "email": "jennifer.anderson@toktickit.com" },
        "category": { "id": 2, "name": "Hardware" },
        "relatedSystem": { "id": 1, "name": "Corporate Laptop" },
        "requestedPriority": "P2_MEDIUM",
        "itPriority": "P2_MEDIUM",
        "status": "OPEN",
        "owner": { "id": 6, "fullName": "David Lee" },
        "resolutionIndicated": false,
        "createdAt": "2026-02-01T09:15:00.000Z",
        "updatedAt": "2026-02-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 16,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
  ```

### 5.2 Claim or Reassign Ticket
* **Method:** `PATCH`
* **Route:** `/api/staff/tickets/:id/assign`
* **Authentication:** `requireAuth`, `requireRole('IT_STAFF', 'ADMINISTRATOR')`
* **Request Body:**
  ```json
  {
    "ownerId": 6
  }
  ```
  *(Omitting `ownerId` defaults to self-claiming with `req.user.id`).*
* **Validation:** Target owner must exist, be active, and hold role `IT_STAFF` or `ADMINISTRATOR`. Assigning inactive users returns `422 Unprocessable Entity`.
* **Side Effect:** If the ticket is currently `NEW`, claiming it automatically transitions status to `OPEN`.
* **Success Response (`200 OK`):** Returns updated ticket object with `owner` populated and logs `TicketActivity`.

### 5.3 Update IT Priority
* **Method:** `PATCH`
* **Route:** `/api/staff/tickets/:id/priority`
* **Authentication:** `requireAuth`, `requireRole('IT_STAFF', 'ADMINISTRATOR')`
* **Request Body:**
  ```json
  {
    "itPriority": "P1_HIGH"
  }
  ```
* **Validation:** `itPriority` must be a valid `Priority` enum.
* **Success Response (`200 OK`):** Updates `itPriority` while `requestedPriority` remains unmodified.

### 5.4 Transition Ticket Status
* **Method:** `PATCH`
* **Route:** `/api/staff/tickets/:id/status`
* **Authentication:** `requireAuth`, `requireRole('IT_STAFF', 'ADMINISTRATOR')`
* **Request Body:**
  ```json
  {
    "status": "RESOLVED",
    "resolutionSummary": "Replaced keyboard top-case and tested key switches."
  }
  ```
* **Validation & Business Rules:**
  - Transitions must strictly obey the approved state machine.
  - If target status is `RESOLVED`, `resolutionSummary` (10–1000 characters) is mandatory.
  - If target status is `CANCELLED`, `cancellationReason` (10–500 characters) is mandatory.
  - If target status is `REOPENED`, `reopenReason` (10–500 characters) is mandatory.
  - Closed tickets cannot be modified unless explicitly reopened.
* **Success Response (`200 OK`):** Returns updated ticket and atomically records `TicketActivity`.
* **Error Response (`422 Unprocessable Entity`):** Invalid transition returns `INVALID_STATUS_TRANSITION` error envelope listing allowable next states.

---

## 6. Administrator User Management Endpoints

### 6.1 List Users
* **Method:** `GET`
* **Route:** `/api/admin/users`
* **Authentication:** `requireAuth`, `requireRole('ADMINISTRATOR')` (Non-admins receive 403 Forbidden).
* **Query Parameters:**
  - `search`: string (case-insensitive substring of `fullName` or `email`)
  - `role`: `'REQUESTER'` | `'IT_STAFF'` | `'ADMINISTRATOR'`
  - `isActive`: `'true'` | `'false'`
* **Success Response (`200 OK`):** Returns array of user records without password hashes.

### 6.2 Create User
* **Method:** `POST`
* **Route:** `/api/admin/users`
* **Authentication:** `requireAuth`, `requireRole('ADMINISTRATOR')`
* **Request Body:**
  ```json
  {
    "email": "robert.wilson@toktickit.com",
    "fullName": "Robert Wilson",
    "role": "IT_STAFF",
    "isActive": true,
    "initialPassword": "InitialPass123!"
  }
  ```
* **Validation:**
  - `email`: Valid email format, unique in database (case-insensitive). Duplicate returns `409 Conflict` (`DUPLICATE_EMAIL`).
  - `role`: Exactly one of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
  - `initialPassword`: Valid password string (min 8 chars).
* **Behavior:** Password is stored as a bcrypt hash, and `mustChangePassword` is set to `true`.
* **Success Response (`201 Created`):** Returns created user profile.

### 6.3 Edit User
* **Method:** `PATCH`
* **Route:** `/api/admin/users/:id`
* **Authentication:** `requireAuth`, `requireRole('ADMINISTRATOR')`
* **Request Body:**
  ```json
  {
    "fullName": "Robert Wilson Jr.",
    "role": "IT_STAFF",
    "isActive": false
  }
  ```
* **Safety Guardrails:**
  - **Self-Deactivation Block:** If `req.user.id === targetUser.id` and `isActive === false` -> returns `400 Bad Request` (`CANNOT_DEACTIVATE_SELF`).
  - **Last Active Administrator Protection:** If target user is the sole remaining active Administrator and request deactivates or demotes them -> returns `409 Conflict` (`LAST_ADMIN_PROTECTED`).
* **Success Response (`200 OK`):** Returns updated user profile.

### 6.4 Reset Initial Password
* **Method:** `POST`
* **Route:** `/api/admin/users/:id/initial-password`
* **Authentication:** `requireAuth`, `requireRole('ADMINISTRATOR')`
* **Request Body:**
  ```json
  {
    "initialPassword": "NewTempPass123!"
  }
  ```
* **Behavior:** Stores bcrypt hash of new initial password and sets `mustChangePassword = true`.
* **Success Response (`200 OK`):**
  ```json
  {
    "data": {
      "message": "Initial password updated successfully. User must change password at next login."
    }
  }
  ```

---

## 7. Attachment Endpoints

* **Pre-Upload Staging (`POST /api/attachments/pre-upload`):** Permitted only for `REQUESTER` role. Validates MIME (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) and size ($\le 5\text{MB}$).
* **Download Attachment (`GET /api/attachments/:id/download`):**
  - Requires active session.
  - If caller is `REQUESTER`: Permitted only if caller owns the parent ticket. Foreign access returns `404 Not Found`.
  - If caller is `IT_STAFF` or `ADMINISTRATOR`: Permitted for any ticket.
  - If attachment is soft-deleted: Returns `410 Gone` (`ATTACHMENT_SOFT_DELETED`) across all roles.
* **Soft-Removal (`DELETE /api/attachments/:id`):** Permitted for owning Requester, Staff, or Admin. Requires `reason` (5–255 chars) and records `TicketActivity`. Physical files are never erased.
