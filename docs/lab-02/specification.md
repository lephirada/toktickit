# TokTickIT — Sprint 2 Engineering Specification (Issue 5)
**Course:** CPE 334 Software Engineering Laboratory  
**Sprint:** 2 — Requester-Facing MVP & Ticket Lifecycle Foundation  
**Design System:** Zen Green Palette  
**Status:** Approved / Authoritative Specification  

---

## 1. Sprint Goal

Deliver a production-ready, secure, and intuitive **Requester-Facing MVP** for TokTickIT in the **Zen Green design system**. This enables internal organization employees (Requesters) to select their user context, compose and submit IT support tickets with staged attachments, view their submitted tickets in a responsive list/card layout, inspect ticket details, and manage attachments with compliant soft-removal audit tracking.

---

## 2. Stakeholder Request Interpretation

| Stakeholder / Persona | Need / Objective | Business Impact |
| :--- | :--- | :--- |
| **Requester (Employee)** | Needs a frictionless, clean interface to report IT incidents and access requests with attachments without complicated logins or technical jargon. | Drastically reduces time to report issues; prevents submission of incomplete/unclear requests; eliminates lost attachments. |
| **IT Support Lead** | Demands structured, categorized tickets with deterministic numbering (`TKT-YYYY-NNNNN`), explicit priorities, and audit-logged file management. | Enables fast triage; ensures compliance; prevents accidental file loss while honoring soft-deletion policies. |
| **Course Evaluator (CPE 334)** | Validates end-to-end full-stack engineering standards: robust REST contracts, Prisma relational modeling, automated testing (Vitest, Supertest, Playwright), responsive UI, and clean architecture. | Verifies adherence to strict software engineering rigor and clean code discipline. |

---

## 3. Scope

### In-Scope (Included)
1. **Requester Context Switcher:** Header-based user context switcher selecting active employee profile (`RequesterUser`), passing identity via `X-Requester-Id` header (no passwords).
2. **Dynamic Taxonomy:** Dropdown population for Incident/Request Categories and Related Systems from database tables.
3. **Ticket Creation Form:** Structured form with fields for Summary, Description, Category, Related System, and Priority (`P0_URGENT` to `P3_LOW`).
4. **Pre-Upload Attachment Staging:** Async file drag-and-drop / picker staging with quota validation (max 5 files, 5MB each, JPG/PNG/WEBP/PDF), staging file tokens before transactional ticket commit.
5. **Form State Protection (Dirty Guard):** Unsaved changes detection prompting a confirmation modal before navigation or requester switching.
6. **My Tickets Dashboard:** Responsive list (multi-column table on desktop, stacked cards on mobile) with search, status filtering, sort order (default `createdAt` DESC), and pagination (10, 20, 50).
7. **Ticket Ownership Isolation:** Strict row-level isolation ensuring Requesters only see and access tickets where `requesterId == X-Requester-Id`.
8. **Read-Only Ticket Detail View:** Complete metadata breakdown, priority/status badges, system info, description, and attachment list.
9. **Attachment Download & Soft-Removal:** Streaming download for active attachments (`200 OK`), soft-removal with mandatory reason (`5-255` chars) preserving audit trail, and blocked downloads returning `410 Gone`.

### Out-of-Scope (Explicitly Excluded)
1. User Authentication / Passwords / RBAC login screens (Session-less header context `X-Requester-Id` is used for MVP).
2. IT Staff triage queues, assignment to agents, and ticket status progression (handled in Sprint 3).
3. Public discussion threads / requester comments (handled in Sprint 3).
4. Outbound Email/SMS notifications.
5. Hard file purging/physical disk deletion (retained for compliance).

---

## 4. Functional Requirements

- **FR-01 (Requester Switcher):** The application shall provide a global header dropdown listing all active `RequesterUser` records. Switching users updates global requester state and sets the `X-Requester-Id` header on all API calls.
- **FR-02 (Taxonomy Data):** The client shall query `GET /api/categories` and `GET /api/related-systems` to dynamically populate dropdown selections.
- **FR-03 (Pre-Upload Attachment Staging):** The client shall allow selecting up to 5 files. Each file is independently sent to `POST /api/attachments/pre-upload` returning a staged attachment ID and filename. Upload progress and error states (file too large, invalid MIME) must be shown per file.
- **FR-04 (Ticket Creation):** The client shall submit a validated ticket payload with staged attachment IDs to `POST /api/tickets`. The server binds the attachments and generates a unique ticket number inside an atomic database transaction.
- **FR-05 (Form Field Validation):** The client and server shall enforce synchronous and backend validation on all inputs (Summary: 5-100 chars, Description: 10-2,000 chars, Category: required, Priority: required valid enum).
- **FR-06 (Dirty Form Navigation Guard):** When a user has modified any form field in ticket creation and attempts to switch requester or navigate away, an alert modal shall intercept the action requesting discard confirmation.
- **FR-07 (My Tickets Dashboard):** The application shall display a paginated list of tickets created by the active requester, supporting search by Ticket No / Summary, status filtering, and sorting.
- **FR-08 (Ownership Isolation):** The API shall enforce that `GET /api/tickets` and `GET /api/tickets/:id` only return records owned by the requester passed in `X-Requester-Id`. Unauthorized access returns `403 Forbidden`.
- **FR-09 (Ticket Detail View):** The application shall render a read-only detail view of a selected ticket, displaying ticket number, created timestamp, status, priority, category, related system, full description, and attached files.
- **FR-10 (Attachment Download):** The system shall stream active attachment files via `GET /api/attachments/:id/download`.
- **FR-11 (Attachment Soft-Removal):** The application shall provide a soft-removal action on ticket attachments requiring a non-empty audit reason (5-255 characters). The server updates `deletedAt`, `deletedBy`, and `deletionReason`.
- **FR-12 (Soft-Deleted File Access Guard):** When an attachment is soft-deleted, subsequent calls to `GET /api/attachments/:id/download` shall return `410 Gone`. The UI shall display the item as soft-deleted with the deletion reason and disable the download action.

---

## 5. Business Rules

| Rule ID | Name | Rule Description | Enforcement |
| :--- | :--- | :--- | :--- |
| **BR-01** | **Ticket Number Format** | Ticket numbers must follow the format `TKT-YYYY-NNNNN` where `YYYY` is the creation year and `NNNNN` is a zero-padded sequential integer starting from `00001` per year. | Server Database Transaction / Atomic Counter |
| **BR-02** | **Initial Status** | Newly created tickets must strictly have `status = 'NEW'`. Allowed status enum: `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REJECTED`. | Server Model / Database Default |
| **BR-03** | **Priority Levels** | Priority must be one of: `P0_URGENT`, `P1_HIGH`, `P2_MEDIUM`, `P3_LOW`. Default value is `P2_MEDIUM`. | Client Form & API Validation |
| **BR-04** | **Summary Constraints** | Summary is mandatory, must be trimmed, minimum 5 characters, maximum 100 characters. | Client & Server (422 Unprocessable) |
| **BR-05** | **Description Constraints** | Description is mandatory, must be trimmed, minimum 10 characters, maximum 2,000 characters. | Client & Server (422 Unprocessable) |
| **BR-06** | **Attachment Quotas & Formats** | Max 5 attachments per ticket. Max file size: 5 MB (5,242,880 bytes). Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. | API Pre-upload & Client File Picker |
| **BR-07** | **Pre-Upload Expiration** | Pre-uploaded attachments not linked to a ticket within 24 hours are marked orphaned and eligible for background cleanup. | Server Background Worker / Query Scope |
| **BR-08** | **Attachment Soft-Removal** | Attachments are never physically deleted from the database or disk. Soft-removal sets `deletedAt = NOW()`, `deletedBy = requesterId`, and `deletionReason`. | Server `DELETE /api/attachments/:id` |
| **BR-09** | **Mandatory Deletion Reason** | A soft-removal request must provide a `reason` string between 5 and 255 characters. | Server API Validation (422 Unprocessable) |
| **BR-10** | **Requester Eligibility** | Only users with `isActive = true` can be selected in the context switcher or author tickets. Inactive users cannot submit tickets. | API Filter & Validation |
| **BR-11** | **Ownership Isolation** | A Requester can only list, view, and modify attachments on tickets where `ticket.requesterId == X-Requester-Id`. Violations return `403 Forbidden`. | Server Controller / Route Guard |

---

## 6. UI Specification Summary

TokTickIT utilizes the **Zen Green Design System**, engineered for high visual hierarchy, accessibility, and responsive density.

### Color Palette Tokens
- `--zg-primary: #006B3C` (Zen Forest Green - Header, Primary Buttons, Active Accents)
- `--zg-secondary: #0B7A46` (Zen Medium Green - Hover states, Secondary Links)
- `--zg-pale: #EAF6EF` (Zen Mint Pale - Badge backgrounds, Alert info fills, Table hover)
- `--zg-bg: #F5F7F6` (App Background Canvas)
- `--zg-surface: #FFFFFF` (Card & Table Surface)
- `--zg-text-primary: #1D2939` (Primary Body & Headings)
- `--zg-text-secondary: #667085` (Secondary & Helper Labels)
- `--zg-border: #D0D5DD` (Input and Card Borders)
- `--zg-error: #B42318` (Validation Errors & Urgent Highlights)

### Responsive Breakdown
- **Desktop ($\ge 992$px):** Multi-column navigation, wide form layout with side-by-side taxonomy pickers, full data table for tickets with sortable headers.
- **Tablet ($768$px to $991$px):** Fluid grid, consolidated table columns, collapsed metadata panel on details.
- **Mobile ($< 768$px):** Single-column stacked cards for My Tickets (no horizontal scrollbar), full-width primary action buttons, sticky bottom submit bar on forms.

---

## 7. Data Changes (Prisma Schema)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Priority {
  P0_URGENT
  P1_HIGH
  P2_MEDIUM
  P3_LOW
}

enum TicketStatus {
  NEW
  IN_PROGRESS
  RESOLVED
  CLOSED
  REJECTED
}

model RequesterUser {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  displayName String
  department  String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tickets     Ticket[]

  @@index([isActive])
}

model Category {
  id        Int             @id @default(autoincrement())
  name      String          @unique
  createdAt DateTime        @default(now())
  tickets   Ticket[]
  systems   RelatedSystem[]
}

model RelatedSystem {
  id         Int       @id @default(autoincrement())
  name       String
  categoryId Int
  category   Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  createdAt  DateTime  @default(now())
  tickets    Ticket[]

  @@unique([name, categoryId])
  @@index([categoryId])
}

model Ticket {
  id              Int          @id @default(autoincrement())
  ticketNo        String       @unique // Format: TKT-YYYY-NNNNN
  summary         String       @db.VarChar(100)
  description     String       @db.VarChar(2000)
  priority        Priority     @default(P2_MEDIUM)
  status          TicketStatus @default(NEW)
  requesterId     Int
  requester       RequesterUser @relation(fields: [requesterId], references: [id])
  categoryId      Int
  category        Category     @relation(fields: [categoryId], references: [id])
  relatedSystemId Int?
  relatedSystem   RelatedSystem? @relation(fields: [relatedSystemId], references: [id])
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  attachments     Attachment[]

  @@index([requesterId])
  @@index([status])
  @@index([createdAt])
}

model Attachment {
  id             Int       @id @default(autoincrement())
  originalName   String
  storageKey     String    @unique
  mimeType       String
  sizeBytes      Int
  ticketId       Int?
  ticket         Ticket?   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  uploadedById   Int
  isSoftDeleted  Boolean   @default(false)
  deletedAt      DateTime?
  deletedBy      Int?
  deletionReason String?   @db.VarChar(255)
  createdAt      DateTime  @default(now())

  @@index([ticketId])
  @@index([uploadedById])
  @@index([isSoftDeleted])
}
```

---

## 8. REST API Contract Summary

| Method | Endpoint | Description | Auth / Scope | Success | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/requesters` | Lists all active requesters for switcher. | Public | `200 OK` | `500` |
| `GET` | `/api/categories` | Lists all ticket categories. | Public | `200 OK` | `500` |
| `GET` | `/api/related-systems` | Lists systems (filterable by `categoryId`). | Public | `200 OK` | `500` |
| `POST` | `/api/attachments/pre-upload` | Pre-uploads single file multipart staging. | `X-Requester-Id` | `201 Created` | `400, 413, 415, 422, 500` |
| `POST` | `/api/tickets` | Creates ticket & binds staged attachments. | `X-Requester-Id` | `201 Created` | `400, 422, 500` |
| `GET` | `/api/tickets` | Paginated ticket list for active requester. | `X-Requester-Id` | `200 OK` | `400, 403, 500` |
| `GET` | `/api/tickets/:id` | Detailed view of single ticket. | `X-Requester-Id` | `200 OK` | `403, 404, 500` |
| `GET` | `/api/attachments/:id/download`| Streams file content. | `X-Requester-Id` | `200 OK` | `403, 404, 410, 500` |
| `DELETE`| `/api/attachments/:id` | Soft-deletes attachment with reason. | `X-Requester-Id` | `200 OK` | `400, 403, 404, 422, 500` |

---

## 9. Acceptance Criteria (Given-When-Then)

### AC-01: Requester Context Switcher
- **Given** the user navigates to the application,
- **When** the page loads,
- **Then** the header displays a dropdown of active requesters fetched from `GET /api/requesters`, and selecting a user updates the active context and injects `X-Requester-Id` on all subsequent HTTP requests.

### AC-02: Dynamic Taxonomy Cascading
- **Given** the Ticket Creation Form is open,
- **When** a user selects a Category (e.g., "Hardware"),
- **Then** the Related System dropdown dynamically updates to display only systems mapped to that Category (or shows "None/General" if unassigned).

### AC-03: Pre-Upload Attachment Staging & Validation
- **Given** a user selects a file $> 5$ MB or with MIME `application/zip`,
- **When** pre-upload is initiated,
- **Then** the UI halts the upload and renders an inline error badge; valid files (JPG, PNG, WEBP, PDF $\le 5$ MB) successfully stage via `POST /api/attachments/pre-upload` and show a green ready badge.

### AC-04: Atomic Ticket Submission
- **Given** a valid Summary, Description, Category, Priority, and 2 staged attachment IDs,
- **When** the user clicks "Submit Ticket",
- **Then** the server creates the ticket with a formatted ticket number `TKT-YYYY-NNNNN`, links the 2 attachments, sets status `NEW`, and redirects the user to the Ticket Detail view.

### AC-05: Client & Server Validation Errors
- **Given** a user inputs a 3-character Summary or an empty Description,
- **When** submission is attempted,
- **Then** form submission is blocked client-side, or if bypassed, the API responds with `422 Unprocessable Entity` containing field-level error messages in the standardized error envelope.

### AC-06: Dirty Form Navigation Guard
- **Given** a user has typed text into the ticket creation form,
- **When** they click "My Tickets" navigation or change the active requester in the header,
- **Then** a confirmation modal appears: "You have unsaved changes. Do you wish to discard them?", preventing accidental data loss unless confirmed.

### AC-07: My Tickets List with Filtering & Pagination
- **Given** Requester A has 25 submitted tickets,
- **When** viewing the "My Tickets" page with page size 10,
- **Then** only Requester A's tickets are shown (10 per page), sorted by `createdAt` descending, with pagination controls and a status filter dropdown.

### AC-08: Data Isolation & Ownership Guard
- **Given** Requester B attempts to access `GET /api/tickets/:id` or view a ticket owned by Requester A,
- **When** the request is evaluated on the server,
- **Then** the server returns `403 Forbidden` with error code `FORBIDDEN_RESOURCE`.

### AC-09: Read-Only Detail View Layout
- **Given** a valid ticket `TKT-2026-00001`,
- **When** the Requester views the detail page,
- **Then** the page renders the formatted Ticket Number, Status Badge, Priority Badge, Created Date, Category, System, Description, and Attachment cards with download links.

### AC-10: Active Attachment Download
- **Given** an active attachment associated with the user's ticket,
- **When** the user clicks "Download",
- **Then** `GET /api/attachments/:id/download` streams the binary file with appropriate `Content-Disposition` and `Content-Type` headers.

### AC-11: Attachment Soft-Removal with Mandatory Reason
- **Given** an attachment on a ticket owned by the active Requester,
- **When** the user clicks "Remove", provides a reason "Uploaded incorrect screenshot", and confirms,
- **Then** `DELETE /api/attachments/:id` marks the record soft-deleted with audit fields and the UI replaces the download link with a "Removed" tag and the reason.

### AC-12: Soft-Deleted Attachment Download Guard
- **Given** an attachment that has been soft-deleted,
- **When** any client requests `GET /api/attachments/:id/download`,
- **Then** the server responds with `410 Gone` and message "Attachment has been removed by requester".

---

## 10. Definition of Done (DoD)

- [ ] **Prisma Migration:** Schema migration applied to PostgreSQL adding `RequesterUser`, `RelatedSystem`, `Ticket`, and `Attachment` models with indexes and seed data.
- [ ] **REST API Endpoints:** All 9 endpoints implemented with full input validation, error handling envelope, and unit/integration test coverage.
- [ ] **Security & Isolation:** `X-Requester-Id` header middleware enforced; cross-tenant ticket or attachment access blocked with `403 Forbidden`.
- [ ] **Responsive Frontend:** Zen Green UI implemented across Desktop ($\ge 992$px), Tablet ($768$-$991$px), and Mobile ($< 768$px) without horizontal scrolling.
- [ ] **Pre-upload Staging:** Drag-and-drop file staging implemented with size/type validation and retry/removal capability.
- [ ] **Dirty State Guard:** Unsaved changes modal functional across React router transitions and requester switcher.
- [ ] **Test Coverage:** All Vitest unit tests, Supertest API tests, and Playwright E2E flows passing in CI without flake.
- [ ] **Documentation:** API specifications, UI guidelines, and test matrix committed to `docs/lab-02/`.

---

## 11. Architectural Assumptions and Decisions

1. **Pre-Upload Staging Pattern:** Files are uploaded and staged independently to disk/storage prior to ticket submission. This ensures fast form submission, provides immediate upload feedback per file, and avoids handling complex multipart forms during transactional ticket creation.
2. **Deterministic Ticket Numbering:** Generated using an atomic sequence or year-based query transaction (`TKT-YYYY-NNNNN`) to avoid collision in concurrent environments.
3. **Dirty-State Navigation Interceptor:** Implemented via custom React navigation hooks and browser `beforeunload` listeners to prevent accidental data loss during multi-step composition.
4. **Soft-Deletion vs Hard Deletion:** Compliance requirements necessitate retaining file metadata and audit trails (`deletedBy`, `deletedAt`, `deletionReason`), returning `410 Gone` on direct download attempts.
