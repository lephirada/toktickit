# TokTickIT — REST API Specification (Sprint 2 / Issue 5)
**Base URL:** `/api`  
**Protocol:** HTTP/1.1 (JSON payload, UTF-8 encoded)  
**Security Context:** `X-Requester-Id` header (Integer ID of active requester)

---

## 1. Global Standards & Error Envelope

All API endpoints strictly adhere to standard HTTP status codes and return responses conforming to the defined envelope patterns.

### 1.1 Success Envelope (Single Resource & Collection)

For single resource queries and mutations:
```json
{
  "data": { ... }
}
```

For paginated list queries:
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 1.2 Standardized Error Envelope

When any endpoint encounters an error, it responds with the following standard envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The provided payload contains validation errors.",
    "correlationId": "req_c9a1b2c3d4e5",
    "fieldErrors": [
      {
        "field": "summary",
        "message": "Summary must be between 5 and 100 characters."
      }
    ]
  }
}
```

### 1.3 Standard HTTP Status Codes

| Code | Name | Usage in TokTickIT |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Successful GET, PUT, DELETE operations. |
| **`201 Created`** | Created | Resource successfully created (Ticket, Pre-upload attachment). |
| **`400 Bad Request`** | Bad Request | Malformed JSON, missing required headers (`X-Requester-Id`), or invalid query params. |
| **`403 Forbidden`** | Forbidden | The requester in `X-Requester-Id` is not authorized to access or modify the specified resource. |
| **`404 Not Found`** | Not Found | Target resource ID does not exist in the database. |
| **`410 Gone`** | Gone | The requested attachment was soft-deleted and can no longer be downloaded. |
| **`413 Payload Too Large`** | Too Large | Staged file upload exceeds the 5MB (5,242,880 bytes) size limit. |
| **`415 Unsupported Media Type`** | Unsupported Media | Staged file MIME type is not allowed (must be JPG, PNG, WEBP, or PDF). |
| **`422 Unprocessable Entity`** | Validation Error | Business rule validation failed (e.g. invalid string length, missing mandatory fields). |
| **`500 Internal Server Error`** | Server Error | Unhandled runtime exception; correlation ID provided for debugging. |

---

## 2. API Endpoints

---

### 2.1 Requester Context

#### `GET /api/requesters`
Retrieves all active requester users available for the requester context switcher.

* **Headers:** None required.
* **Query Parameters:** None.
* **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 1,
      "email": "sarah.connor@toktickit.com",
      "displayName": "Sarah Connor",
      "department": "Engineering",
      "isActive": true
    },
    {
      "id": 2,
      "email": "john.doe@toktickit.com",
      "displayName": "John Doe",
      "department": "Finance",
      "isActive": true
    }
  ]
}
```

---

### 2.2 Taxonomy Endpoints

#### `GET /api/categories`
Retrieves all ticket categories.

* **Headers:** None.
* **Response `200 OK`:**
```json
{
  "data": [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
}
```

#### `GET /api/related-systems`
Retrieves all related systems, optionally filtered by `categoryId`.

* **Headers:** None.
* **Query Parameters:**
  * `categoryId` *(optional, integer)*: Filter systems by category ID.
* **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 101,
      "name": "Single Sign-On (Okta)",
      "categoryId": 1
    },
    {
      "id": 102,
      "name": "VPN Gateway",
      "categoryId": 4
    }
  ]
}
```

---

### 2.3 Attachment Pre-Upload Staging

#### `POST /api/attachments/pre-upload`
Uploads a single file to staging storage prior to ticket creation.

* **Headers:**
  * `X-Requester-Id` *(required, integer)*
  * `Content-Type: multipart/form-data`
* **Form Data Body:**
  * `file`: Binary file stream (max 5MB; image/jpeg, image/png, image/webp, application/pdf).
* **Response `201 Created`:**
```json
{
  "data": {
    "attachmentId": 881,
    "originalName": "error_screen.png",
    "mimeType": "image/png",
    "sizeBytes": 245890,
    "createdAt": "2026-08-22T16:20:00.000Z"
  }
}
```
* **Error Responses:**
  * `413 Payload Too Large`:
    ```json
    {
      "error": {
        "code": "FILE_TOO_LARGE",
        "message": "File exceeds the maximum permitted size of 5 MB (5,242,880 bytes).",
        "correlationId": "req_839a9c81b2"
      }
    }
    ```
  * `415 Unsupported Media Type`:
    ```json
    {
      "error": {
        "code": "UNSUPPORTED_FILE_TYPE",
        "message": "Invalid file format. Allowed formats are: JPG, PNG, WEBP, PDF.",
        "correlationId": "req_729b12a9e1"
      }
    }
    ```

---

### 2.4 Ticket Management

#### `POST /api/tickets`
Creates a new IT ticket atomically, assigning a sequential ticket number and linking pre-uploaded attachments.

* **Headers:**
  * `X-Requester-Id` *(required, integer)*
  * `Content-Type: application/json`
* **Request Body:**
```json
{
  "summary": "VPN connection drops every 10 minutes",
  "description": "Whenever I connect to the corporate Cisco AnyConnect VPN, the gateway drops connection after 10 minutes with error code 403.",
  "priority": "P1_HIGH",
  "categoryId": 4,
  "relatedSystemId": 102,
  "attachmentIds": [881]
}
```
* **Validation Rules:**
  * `summary`: String, 5-100 characters (trimmed).
  * `description`: String, 10-2000 characters (trimmed).
  * `priority`: Enum: `P0_URGENT`, `P1_HIGH`, `P2_MEDIUM`, `P3_LOW`.
  * `categoryId`: Integer (must exist in database).
  * `relatedSystemId`: Integer (optional, if provided must belong to `categoryId`).
  * `attachmentIds`: Array of integers, max 5 elements (must be staged attachments uploaded by this requester).
* **Response `201 Created`:**
```json
{
  "data": {
    "id": 42,
    "ticketNo": "TKT-2026-00042",
    "summary": "VPN connection drops every 10 minutes",
    "description": "Whenever I connect to the corporate Cisco AnyConnect VPN, the gateway drops connection after 10 minutes with error code 403.",
    "priority": "P1_HIGH",
    "status": "NEW",
    "requesterId": 1,
    "categoryId": 4,
    "relatedSystemId": 102,
    "createdAt": "2026-08-22T16:25:00.000Z",
    "updatedAt": "2026-08-22T16:25:00.000Z",
    "attachments": [
      {
        "id": 881,
        "originalName": "error_screen.png",
        "sizeBytes": 245890,
        "mimeType": "image/png",
        "isSoftDeleted": false
      }
    ]
  }
}
```
* **Error Response `422 Unprocessable Entity`:**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed on ticket creation payload.",
    "correlationId": "req_fa82910ba1",
    "fieldErrors": [
      {
        "field": "summary",
        "message": "Summary must be between 5 and 100 characters."
      }
    ]
  }
}
```

---

#### `GET /api/tickets`
Retrieves a paginated list of tickets created by the active requester.

* **Headers:**
  * `X-Requester-Id` *(required, integer)*
* **Query Parameters:**
  * `page` *(optional, integer, default: 1)*
  * `limit` *(optional, integer, default: 10, allowed: 10, 20, 50)*
  * `status` *(optional, enum: `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REJECTED`)*
  * `search` *(optional, string, matches `ticketNo` or `summary` case-insensitively)*
  * `sortBy` *(optional, string, default: `createdAt`)*
  * `sortOrder` *(optional, string: `asc` | `desc`, default: `desc`)*
* **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 42,
      "ticketNo": "TKT-2026-00042",
      "summary": "VPN connection drops every 10 minutes",
      "priority": "P1_HIGH",
      "status": "NEW",
      "category": {
        "id": 4,
        "name": "Network"
      },
      "relatedSystem": {
        "id": 102,
        "name": "VPN Gateway"
      },
      "attachmentCount": 1,
      "createdAt": "2026-08-22T16:25:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

#### `GET /api/tickets/:id`
Retrieves complete read-only details of a single ticket.

* **Headers:**
  * `X-Requester-Id` *(required, integer)*
* **Path Parameters:**
  * `id` *(required, integer)*: Ticket internal primary key.
* **Response `200 OK`:**
```json
{
  "data": {
    "id": 42,
    "ticketNo": "TKT-2026-00042",
    "summary": "VPN connection drops every 10 minutes",
    "description": "Whenever I connect to the corporate Cisco AnyConnect VPN, the gateway drops connection after 10 minutes with error code 403.",
    "priority": "P1_HIGH",
    "status": "NEW",
    "requester": {
      "id": 1,
      "displayName": "Sarah Connor",
      "email": "sarah.connor@toktickit.com",
      "department": "Engineering"
    },
    "category": {
      "id": 4,
      "name": "Network"
    },
    "relatedSystem": {
      "id": 102,
      "name": "VPN Gateway"
    },
    "attachments": [
      {
        "id": 881,
        "originalName": "error_screen.png",
        "mimeType": "image/png",
        "sizeBytes": 245890,
        "isSoftDeleted": false,
        "deletedAt": null,
        "deletionReason": null
      }
    ],
    "createdAt": "2026-08-22T16:25:00.000Z",
    "updatedAt": "2026-08-22T16:25:00.000Z"
  }
}
```
* **Error Response `403 Forbidden` (Ownership Violation):**
```json
{
  "error": {
    "code": "FORBIDDEN_RESOURCE",
    "message": "You are not authorized to view or access this ticket.",
    "correlationId": "req_8491290382"
  }
}
```

---

### 2.5 Attachment Lifecycle & Download

#### `GET /api/attachments/:id/download`
Streams the binary content of an active attachment file.

* **Headers:**
  * `X-Requester-Id` *(required, integer)*
* **Path Parameters:**
  * `id` *(required, integer)*: Attachment ID.
* **Response `200 OK`:**
  * `Content-Type: image/png` (matches attachment MIME type)
  * `Content-Disposition: inline; filename="error_screen.png"`
  * Body: Binary stream
* **Error Response `410 Gone` (Soft-deleted file):**
```json
{
  "error": {
    "code": "ATTACHMENT_SOFT_DELETED",
    "message": "This attachment was removed and is no longer available for download.",
    "correlationId": "req_b298412810"
  }
}
```
* **Error Response `403 Forbidden`:**
```json
{
  "error": {
    "code": "FORBIDDEN_RESOURCE",
    "message": "You do not have permission to download this attachment.",
    "correlationId": "req_a772189031"
  }
}
```
* **Error Response `404 Not Found`:**
```json
{
  "error": {
    "code": "ATTACHMENT_NOT_FOUND",
    "message": "The requested attachment does not exist.",
    "correlationId": "req_a91b2c3d4e"
  }
}
```

---

#### `DELETE /api/attachments/:id`
Performs an audited soft-deletion of an attachment.

* **Headers:**
  * `X-Requester-Id` *(required, integer)*
  * `Content-Type: application/json`
* **Path Parameters:**
  * `id` *(required, integer)*: Attachment ID.
* **Request Body:**
```json
{
  "reason": "Uploaded incorrect log file with sensitive tokens"
}
```
* **Validation Rules:**
  * `reason`: Mandatory string, 5 to 255 characters (trimmed).
* **Response `200 OK`:**
```json
{
  "data": {
    "id": 881,
    "isSoftDeleted": true,
    "deletedAt": "2026-08-22T16:40:00.000Z",
    "deletedBy": 1,
    "deletionReason": "Uploaded incorrect log file with sensitive tokens"
  }
}
```
* **Error Response `422 Unprocessable Entity` (Missing/Invalid Reason):**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "A non-empty deletion reason between 5 and 255 characters is required.",
    "correlationId": "req_d092831821",
    "fieldErrors": [
      {
        "field": "reason",
        "message": "Reason must be at least 5 characters long."
      }
    ]
  }
}
```
