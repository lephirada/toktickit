# TokTickIT — Sprint 2 Test Engineering Specification (Issue 5)
**Course:** CPE 334 Software Engineering Laboratory  
**Sprint:** 2 — Requester-Facing MVP  
**Frameworks:** Vitest (Frontend & Unit), Supertest (Express API Integration), Playwright (End-to-End E2E)

---

## 1. Test Engineering Strategy

TokTickIT adopts a multi-tiered automated testing pyramid ensuring strict contract adherence, data isolation, and UI reliability.

```text
       / \
      / E2E \       Playwright: Full user workflows (Create -> View -> Soft-Delete)
     /-------\
    /   API   \     Supertest + Vitest: REST endpoint contracts, isolation, transactions
   /-----------\
  / UI & Unit   \   React Testing Library + Vitest: Form validation, dirty guards, rendering
 /---------------\
```

1. **Frontend Component & Unit Tests (`client/tests/lab-02/`):**  
   Uses **Vitest** and **React Testing Library** with `@testing-library/user-event` to simulate user interactions, verify form validation errors, check responsive card transforms, and test dirty state interception.
2. **Backend API Integration Tests (`server/tests/lab-02/`):**  
   Uses **Vitest** and **Supertest** with an isolated test PostgreSQL instance. Validates transaction boundaries, pre-upload file constraints, atomic sequential numbering (`TKT-YYYY-NNNNN`), data ownership enforcement (`X-Requester-Id`), and soft-deletion behavior (`410 Gone`).
3. **End-to-End (E2E) Browser Tests (`e2e/lab-02/`):**  
   Uses **Playwright** to execute end-to-end browser journeys covering requester context switching, ticket submission with file attachment, listing pagination, and soft-removal modal flows.

> [!NOTE]
> **Note on Implementation Scope:** The test file paths, suites, and execution commands documented below represent the planned test targets specified for Sprint 2 (Issues 6–9). These files and configurations will be implemented incrementally on their respective feature branches following Test-Driven Development (TDD).

---

## 2. Planned Test Suite Table

### 2.1 Backend API Tests (`server/tests/lab-02/`)

| Test ID | Test Name | Target Test File | Preconditions / Setup | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | Get Active Requesters | `server/tests/lab-02/requesters.test.ts` | Seeded active & inactive users. | Send `GET /api/requesters`. | Returns `200 OK` with only `isActive: true` users. | **Pass** (5/5) |
| **API-02** | Taxonomy Listing & Cascading Filter | `server/tests/lab-02/create-ticket.api.test.ts` | Seeded Categories and Related Systems. | Send `GET /api/categories` and `GET /api/related-systems?categoryId=1`. | Returns `200 OK` with category list and scoped systems matching category ID. | **Pass** |
| **API-03** | Valid File Pre-Upload | `server/tests/lab-02/create-ticket.api.test.ts` | Valid JPEG file (1MB). | Send `POST /api/attachments/pre-upload` with `X-Requester-Id: 1`. | Returns `201 Created` with staged `attachmentId` and storage key. | **Pass** |
| **API-04** | File Upload Constraints (Size & MIME) | `server/tests/lab-02/create-ticket.api.test.ts` | File $> 5$MB and a `.zip` file. | 1. Send 6MB file.<br>2. Send `.zip` file. | 1. Returns `413 Payload Too Large`.<br>2. Returns `415 Unsupported Media Type`. | **Pass** |
| **API-05** | Atomic Ticket Creation & Numbering | `server/tests/lab-02/create-ticket.api.test.ts` | Valid payload with staged attachment IDs. | Send `POST /api/tickets` with `X-Requester-Id: 1`. | Returns `201 Created`, ticket number matches `TKT-2026-NNNNN`, status is `NEW`, attachments linked. | **Pass** (13/13) |
| **API-06** | Ticket Payload Validation Errors | `server/tests/lab-02/create-ticket.api.test.ts` | Invalid payload (summary $< 5$ chars, missing category). | Send `POST /api/tickets` with `X-Requester-Id: 1`. | Returns `422 Unprocessable Entity` with standardized error envelope and `fieldErrors`. | **Pass** |
| **API-07** | My Tickets Pagination & Isolation | `server/tests/lab-02/my-tickets.api.test.ts` | Requester 1 has 15 tickets; Requester 2 has 5 tickets. | Send `GET /api/tickets?page=1&limit=10` with `X-Requester-Id: 1`. | Returns `200 OK` with exactly 10 tickets for Requester 1; pagination `totalCount: 15`; zero tickets from Requester 2. | **Pass** (17/17) |
| **API-08** | Ticket Detail Ownership Guard | `server/tests/lab-02/ticket-detail.api.test.ts` | Ticket ID 42 owned by Requester 1. | Send `GET /api/tickets/42` with `X-Requester-Id: 2`. | Returns `403 Forbidden` with code `FORBIDDEN_RESOURCE`. | **Pass** (18/18) |
| **API-09** | Attachment Stream Download | `server/tests/lab-02/attachments.api.test.ts` | Active attachment 881 on Ticket 42 owned by Requester 1. | Send `GET /api/attachments/881/download` with `X-Requester-Id: 1`. | Returns `200 OK` binary stream with correct `Content-Type` and `Content-Disposition`. | **Pass** |
| **API-08B**| Attachment Download Ownership Guard | `server/tests/lab-02/attachments.api.test.ts` | Active attachment 881 owned by Requester 1. | Send `GET /api/attachments/881/download` with `X-Requester-Id: 2`. | Returns `403 Forbidden`. | **Pass** |
| **API-10** | Attachment Soft-Removal & 410 Guard | `server/tests/lab-02/attachments.api.test.ts` | Active attachment 881. | 1. Send `DELETE /api/attachments/881` with reason "Wrong file".<br>2. Send `GET /api/attachments/881/download`. | 1. Returns `200 OK` with `isSoftDeleted: true`.<br>2. Returns `410 Gone` with soft-deleted message. | **Pass** |
| **API-11** | Add Attachment to Existing Ticket | `server/tests/lab-02/attachments.api.test.ts` | Owned ticket ID 42. | Send `POST /api/tickets/42/attachments` with valid PDF file. | Returns `201 Created` with attachment metadata, updates ticket attachments and timeline. | **Pass** |
| **API-12** | Add Attachment Ownership Guard | `server/tests/lab-02/attachments.api.test.ts` | Ticket ID 42 owned by Requester 1. | Send `POST /api/tickets/42/attachments` with `X-Requester-Id: 2`. | Returns `403 Forbidden` with code `FORBIDDEN_RESOURCE`. | **Pass** |
| **API-13** | Add Attachment Active Limit Guard | `server/tests/lab-02/attachments.api.test.ts` | Ticket ID 42 already has 5 active attachments. | Send 6th attachment attempt. | Returns `400 Bad Request` with code `MAX_ATTACHMENTS_EXCEEDED`. | **Pass** |
| **API-14** | Add Attachment File Validation | `server/tests/lab-02/attachments.api.test.ts` | Disallowed file extension (`.exe`). | Send `POST /api/tickets/42/attachments` with `.exe` payload. | Returns `415 Unsupported Media Type`. | **Pass** |

---

### 2.2 Frontend UI Component Tests (`client/tests/lab-02/`)

| Test ID | Test Name | Target Test File | Preconditions / Setup | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UI-01** | Requester Switcher & Header Context | `client/tests/lab-02/RequesterHeader.test.tsx` | Mocked `GET /api/requesters`. | Select user from dropdown / Profile Menu. | Header displays active user profile; updates context state and downstream API client header. | **Pass** (5/5) |
| **UI-02** | Taxonomy Cascading Dropdowns | `client/tests/lab-02/CreateTicket.test.tsx` | Mocked categories & systems. | Select Category "Hardware". | Related System dropdown enables and filters options strictly to Hardware systems. | **Pass** |
| **UI-03** | Client-Side Form Validation | `client/tests/lab-02/CreateTicket.test.tsx` | Render Ticket Creation form. | Click "Submit Ticket" with empty inputs. | Displays field-level inline error messages with red borders without triggering network request. | **Pass** |
| **UI-04** | Dirty-State Interception Modal | `client/tests/lab-02/CreateTicket.test.tsx`, `client/tests/lab-02/RequesterHeader.test.tsx` | User types in summary input. | Click "My Tickets" navigation link or switch user. | Interception modal renders; clicking "Discard" navigates, clicking "Cancel" keeps user on form. | **Pass** |
| **UI-05** | My Tickets Responsive & Filter Dashboard | `client/tests/lab-02/MyTickets.test.tsx` | Mocked ticket query API response. | Render dashboard across viewports, test search, filters, sorting, and pagination. | Desktop renders `<table>`; mobile renders stacked `.zg-ticket-card` list. Debounced search and multi-filtering trigger API queries. | **Pass** (7/7) |
| **UI-06** | Section 8.1 Requester Selection Screen | `client/tests/lab-02/MyTickets.test.tsx` | Render `SelectRequesterScreen`. | Select active development user and click Continue. | Updates active requester context, persists ID in `localStorage`, and triggers `onContinue` navigation. | **Pass** |
| **UI-07A**| Read-Only Detail View & Breadcrumbs | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Render `TicketDetailScreen` with mocked ticket. | Verify ticket number, summary, status/priority badges, metadata grid, description, 404/403 states, and breadcrumbs. | Read-only details render correctly; error state handles unauthorized access; breadcrumb navigates back to My Tickets. | **Pass** (4/4) |
| **UI-07B**| Attachment Section, Limit, Upload & Soft-Removal | `client/tests/lab-02/AttachmentSection.test.tsx` | Render `TicketDetailScreen` with active and removed files. | Test upload button, 5-limit disabling, modal removal with preset/custom reasons, active download, and 410 guard. | Attachment section displays files; '+ Add Attachment' uploads new file; button disables at 5 active; removal modal updates state; download guards work. | **Pass** (8/8) |

---

### 2.3 End-to-End Test (`e2e/lab-02/`)

| Test ID | Test Name | Target Test File | Flow Description | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E2E-01** | Full Requester Lifecycle Journey | `e2e/lab-02/requester-ticket-flow.spec.ts` | 1. Select Requester "Sarah Connor".<br>2. Navigate to "Create Ticket".<br>3. Fill summary, description, category, and stage image.<br>4. Submit ticket.<br>5. Verify redirect to Detail view.<br>6. Perform attachment soft-removal with reason.<br>7. Verify "Removed" badge on detail page.<br>8. Check My Tickets dashboard. | End-to-end journey executes cleanly; verified ticket number, status badge, audit log tag, and list persistence. | **Pass** |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criteria | Description | Automated Tests Covering AC | Status |
| :--- | :--- | :--- | :--- |
| **AC-01** | Requester Context Switcher | `API-01`, `UI-01`, `UI-06`, `E2E-01` | **Pass** |
| **AC-02** | Dynamic Taxonomy Cascading | `API-02`, `UI-02`, `E2E-01` | **Pass** |
| **AC-03** | Pre-Upload Attachment Staging & Validation | `API-03`, `API-04`, `E2E-01` | **Pass** |
| **AC-04** | Atomic Ticket Submission | `API-05`, `E2E-01` | **Pass** |
| **AC-05** | Client & Server Validation Errors | `API-06`, `UI-03` | **Pass** |
| **AC-06** | Dirty Form Navigation Guard | `UI-04`, `E2E-01` | **Pass** |
| **AC-07** | My Tickets List with Filtering & Pagination | `API-07`, `UI-05`, `E2E-01` | **Pass** |
| **AC-08** | Data Isolation & Ownership Guard | `API-07`, `API-08`, `API-08B`, `API-12` | **Pass** |
| **AC-09** | Read-Only Detail View Layout | `API-08`, `UI-07A`, `E2E-01` | **Pass** |
| **AC-10** | Active Attachment Download | `API-09`, `UI-07B`, `E2E-01` | **Pass** |
| **AC-11** | Attachment Soft-Removal with Reason | `API-10`, `UI-07B`, `E2E-01` | **Pass** |
| **AC-12** | Soft-Deleted Attachment Download Guard (410) | `API-10`, `UI-07B`, `E2E-01` | **Pass** |
| **AC-13** | Add Attachment to Existing Ticket (Section 14 Part 8) | `API-11`, `API-12`, `API-13`, `API-14`, `UI-07B` | **Pass** |

---

## 4. Test Execution Commands

```bash
# 1. Run all Unit & Component Tests (Frontend)
cd client
npm test

# 2. Run all API Integration Tests (Backend)
cd server
npm test

# 3. Run specific Sprint 2 Backend Test Suite
cd server && npm test

# 4. Run Playwright End-to-End Test Suite
npm run test:e2e
# or: npx playwright test
```
