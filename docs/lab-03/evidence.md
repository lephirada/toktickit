# TokTickIT — Sprint 3 Verification & Evidence Artifacts (Issue 10)

**Course:** CPE 334 Software Engineering Laboratory  
**Sprint:** 3 — Users, Roles, IT Staff Ticketing, and Admin Screens  
**Status:** In Progress (Documentation Phase — Placeholders provided for subsequent issues)

> [!NOTE]
> Per project guidelines, screenshots, test results, and PR links are NOT fabricated. This document establishes the structured evidence inventory to be populated sequentially during the execution of Issues 11 through 17.

---

## 1. GitHub Issues & Pull Requests Registry

| Issue ID     | Branch Name                               | Issue Description                         | Pull Request Link       | Review Status                   | Merge Commit |
| :----------- | :---------------------------------------- | :---------------------------------------- | :---------------------- | :------------------------------ | :----------- |
| **Issue 10** | `feature/10-lab3-documentation`           | Documentation & Engineering Contract      | `[PR #32]`              | `[Approved]`                    | `[Merge]`    |
| **Issue 11** | `feature/11-database-migration`           | Database Migration & Idempotent Seed      | `[PR #33]`              | `[Approved]`                    | `[Merged]`   |
| **Issue 12** | `feature/12-authentication-authorization` | Auth Foundation, Session & Discussion API | `[PR #34]`              | `[Request Changes -> Approved]` | `[Merge]`    |
| **Issue 13** | `feature/13-client-auth-shell`            | Client Auth Shell & Requester Discussion  | `[PR #35]`              | `[Approved]`                    | `[Merge]`    |
| **Issue 14** | `feature/14-staff-queue`                  | IT Staff Ticket Queue API & UI            | `[PR #36]`              | `[Approved]`                    | `[Merged]`   |
| **Issue 15** | `feature/15-staff-ticket-operations`      | IT Staff Ticket Detail & Operations       | `[PR #37]`              | `[In Review / Implemented]`     | `[Pending]`  |
| **Issue 16** | `feature/16-user-management`              | Administrator User Management             | `[PR #... Placeholder]` | `[Pending]`                     | `[Pending]`  |
| **Issue 17** | `feature/17-integration-e2e`              | End-to-End E2E Verification & Audit       | `[PR #... Placeholder]` | `[Pending]`                     | `[Pending]`  |

---

## 2. Automated Test Execution Evidence

### 2.1 Backend Migration & Seed Verification Tests

- **Target Command:** `npm --prefix server run test -- tests/lab-03/migration-verification.test.ts`
- **Test Log Output:**

```text
 RUN  v2.1.9 /Users/peta/Downloads/toktickit/server

 ✓ tests/lab-03/migration-verification.test.ts (3)
   ✓ Issue 11 — Database Schema, Migration & Seed Verification (migration.test.ts) (3)
     ✓ verifies the physical migration SQL file exists and is non-empty
     ✓ executes the exact migration SQL file on a populated Lab 2 baseline and verifies zero data loss
     ✓ verifies seed idempotency and credential protection on repeated runs

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Duration  4.37s
```

### 2.2 Backend Supertest API Integration Test Suites

- **Target Command:** `npm --prefix server run test -- tests/lab-03/auth.api.test.ts tests/lab-03/authorization.api.test.ts tests/lab-03/jwt-password.test.ts`
- **Test Log Output:**

```text
 RUN  v2.1.9 /Users/peta/Downloads/toktickit/server

 ✓ tests/lab-03/jwt-password.test.ts (7)
 ✓ tests/lab-03/auth.api.test.ts (20)
 ✓ tests/lab-03/authorization.api.test.ts (28)

 Test Files  3 passed (3)
      Tests  55 passed (55)
   Duration  2.92s
```

- **Full Server Suite Verification:** `npm --prefix server test`

```text
 RUN  v2.1.9 /Users/peta/Downloads/toktickit/server

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)
 ✓ tests/lab-02/attachments.api.test.ts (7)
 ✓ tests/lab-02/create-ticket.api.test.ts (13)
 ✓ tests/lab-02/my-tickets.api.test.ts (17)
 ✓ tests/lab-02/requesters.test.ts (5)
 ✓ tests/lab-02/ticket-detail.api.test.ts (20)
 ✓ tests/lab-03/auth.api.test.ts (20)
 ✓ tests/lab-03/authorization.api.test.ts (28)
 ✓ tests/lab-03/jwt-password.test.ts (7)
 ✓ tests/lab-03/migration-verification.test.ts (3)
 ✓ tests/lab-03/migration.test.ts (3)

 Test Files  12 passed (12)
      Tests  125 passed (125)
   Duration  11.48s
```

### 2.2.1 AC-12-10 Stateless JWT Logout Limitation & Security Audit

- **Stateless Token Model:** Authentication relies on signed JSON Web Tokens stored exclusively in HTTP-Only, SameSite=Lax `toktickit_session` cookies.
- **Logout Semantics:** Calling `POST /api/auth/logout` instructs the browser client to clear the cookie (`res.clearCookie('toktickit_session', { path: '/' })`).
- **Architectural Limitation:** Because verification is stateless, clearing the client cookie cannot forcibly revoke a raw JWT that an attacker or client may have extracted or copied prior to logout; such tokens remain cryptographically valid until the token's `exp` claim expires (8 hours).
- **Defense-in-Depth Mitigations:**
  1. **Database Liveness Verification:** Every authenticated request queries `User.findUnique({ where: { id: payload.sub } })` to ensure `isActive === true`. Deactivating an employee's account terminates access on the immediate next request with `401 ACCOUNT_DEACTIVATED`, regardless of remaining JWT validity.
  2. **Bounded Lifespan:** Tokens are strictly constrained to 8 hours (`8 * 60 * 60` seconds).
  3. **Secret Rotation (`JWT_SECRET`):** In the event of token compromise, rotating the server `JWT_SECRET` instantly and fleet-wide revokes all existing sessions.

### 2.2.2 Issue 14 IT Staff Queue API Suite (`staff-queue.api.test.ts`)

- **Target Command:** `npm --prefix server run test -- tests/lab-03/staff-queue.api.test.ts`
- **Test Log Output:**

```text
 ✓ tests/lab-03/staff-queue.api.test.ts (23)
   ✓ Issue 14 — IT Staff Ticket Queue API Suite (staff-queue.api.test.ts) (23)
     ✓ Scenario 1: denies unauthenticated requests with 401 UNAUTHORIZED
     ✓ Scenario 2: denies REQUESTER user with 403 FORBIDDEN_ROLE
     ✓ Scenario 3: allows IT_STAFF user with 200 OK and valid response structure
     ✓ Scenario 4: allows ADMINISTRATOR user with 200 OK
     ✓ Scenario 5: blocks inactive IT_STAFF user with 401 ACCOUNT_DEACTIVATED
     ✓ Scenario 6: searches tickets by exact and partial ticketNo
     ✓ Scenario 7: searches tickets by summary keywords
     ✓ Scenario 8: performs case-insensitive substring search
     ✓ Scenario 9: filters tickets by categoryId
     ✓ Scenario 10: filters tickets by requestedPriority
     ✓ Scenario 11: filters tickets by itPriority
     ✓ Scenario 12: filters tickets by status
     ✓ Scenario 13: filters tickets by owner=UNASSIGNED
     ✓ Scenario 14: filters tickets by owner=MY_TICKETS for currently authenticated staff
     ✓ Scenario 15: filters tickets using combined search, category, status, and owner criteria
     ✓ Scenario 16: applies default pagination (page 1, pageSize 10)
     ✓ Scenario 17: supports custom page query parameter
     ✓ Scenario 18: supports custom pageSize query parameter
     ✓ Scenario 19: clamps pageSize > 50 down to 50
     ✓ Scenario 20: supports sorting by allowed fields, directions, fallbacks, and deterministic tie-breaker
     ✓ Scenario 21: returns accurate pagination metadata matching data count
     ✓ Scenario 22: returns empty data array when requested page is beyond totalPages
     ✓ Scenario 23: returns empty array when filter criteria match zero tickets

 Test Files  1 passed (1)
      Tests  23 passed (23)
```

### 2.2.3 Issue 15 IT Staff Operations & Notes API Suites (`staff-ticket-detail.api.test.ts` & `comments-notes.api.test.ts`)

- **Target Command:** `npm --prefix server run test -- tests/lab-03/staff-ticket-detail.api.test.ts tests/lab-03/comments-notes.api.test.ts`
- **Test Log Output:**

```text
 ✓ tests/lab-03/staff-ticket-detail.api.test.ts (52)
   ✓ Issue 15 — Staff Ticket Operations API Suite (staff-ticket-detail.api.test.ts) (52)
     ✓ 1. RBAC & Security Access (AC-15-02) (5)
     ✓ 2. Active Staff Users List (GET /api/staff/users) (2)
     ✓ 3. Operational Ticket Detail (GET /api/staff/tickets/:id - AC-15-01) (2)
     ✓ 4. Claim & Assignment Operations (AC-15-03, AC-15-04, AC-15-05) (9)
     ✓ 5. IT Priority Updates (AC-15-16) (3)
     ✓ 6. State Machine & Status Transitions (AC-15-06, AC-15-07, AC-15-13) (18)
     ✓ 7. Transaction Atomicity & Rollback (AC-15-17) (1)
     ✓ 8. Attachment Access Matrix (AC-15-14, AC-15-15, ATT-01..12) (12)
 ✓ tests/lab-03/comments-notes.api.test.ts (12)
   ✓ Issue 15 — Public Comments & Internal Notes Suite (comments-notes.api.test.ts) (12)
     ✓ 1. Public Comments (AC-15-09) (2)
     ✓ 2. Internal Notes Creation & Retrieval (AC-15-10) (8)
     ✓ 3. Internal Notes Privacy & Leakage Prevention (AC-15-11) (2)

 Test Files  2 passed (2)
      Tests  64 passed (64)
```

- **Full Server Suite Verification:** `npm --prefix server test` (15/15 test files passed, 214/214 tests passed).

### 2.3 Frontend React Testing Library Component Suites

- **Target Command:** `npm --prefix client run test -- tests/lab-03/*.test.tsx`
- **Test Log Output (Issue 13 — Login & Change Password Suites):**

```text
 RUN  v2.1.8 /Users/peta/Downloads/toktickit/client

 ✓ tests/lab-03/Login.test.tsx (8)
   ✓ Issue 13 — LoginScreen Component & Auth Integration Tests (8)
     ✓ validates empty email and empty password upon submission without calling api.login
     ✓ validates invalid email format upon submission
     ✓ displays loading spinner and disables submit button during authentication
     ✓ displays clear error banner when invalid credentials (401) are returned
     ✓ displays specific error banner when inactive account returns authentication error
     ✓ displays server unavailable error banner when API is unreachable
     ✓ successful login updates auth state and redirects to My Tickets for normal users
     ✓ successful login with mustChangePassword=true redirects to Change Password and blocks normal navigation
 ✓ tests/lab-03/ChangePassword.test.tsx (4)
   ✓ Issue 13 — ChangePasswordScreen Component Tests (4)
     ✓ evaluates real-time password policy checklist dynamically as input changes
     ✓ displays error banner when change-password API fails
     ✓ handles successful password change, updates auth state, and allows continuation
     ✓ completes full password change continuation in App: unlocks normal application and redirects to /my-tickets

 Test Files  2 passed (2)
      Tests  12 passed (12)
   Duration  5.29s
```

### 2.3.1 Issue 14 Staff Ticket Queue Component Suite (`StaffTicketQueue.test.tsx`)

- **Target Command:** `npm --prefix client run test -- tests/lab-03/StaffTicketQueue.test.tsx`
- **Test Log Output:**

```text
 ✓ tests/lab-03/StaffTicketQueue.test.tsx (19)
   ✓ Issue 14 — StaffTicketQueue Component Tests (StaffTicketQueue.test.tsx) (19)
     ✓ Scenario 1: renders all 11 required columns in desktop table view
     ✓ Scenario 2: renders status badges with correct Lab 3 status classes and text
     ✓ Scenario 3: renders both requested priority and IT priority clearly
     ✓ Scenario 4: renders requester details and assigned owner or unassigned badge
     ✓ Scenario 5: updates search input value synchronously as user types
     ✓ Scenario 6: debounces search input without triggering fetch on every keystroke
     ✓ Scenario 7: executes API query after debounce timer expires
     ✓ Scenario 8: renders all required filter controls in the toolbar
     ✓ Scenario 9: triggers API query with reset to page 1 when filter changes
     ✓ Scenario 10: restores default filter parameters when Reset Filters is clicked
     ✓ Scenario 11: renders pagination controls with accurate text and disabled states
     ✓ Scenario 12: renders skeleton placeholder rows during loading state
     ✓ Scenario 13: renders empty queue illustration and message when totalItems is 0 and no filters active
     ✓ Scenario 14: renders no-results message and Clear Filters button when filters match 0 tickets
     ✓ Scenario 15: renders error alert banner with retry button on API failure
     ✓ Scenario 16: renders mobile cards exposing all required fields
     ✓ Scenario 17: does not render duplicate filter bars or navigation items
     ✓ Scenario 18: includes proper accessible headers, test IDs, and labels
     ✓ Scenario 19: toggles collapsible filter drawer and displays active filter count badge

 Test Files  1 passed (1)
      Tests  19 passed (19)
```

### 2.3.2 Issue 15 Staff Ticket Detail Component Suite (`StaffTicketDetail.test.tsx`)

- **Target Command:** `npm --prefix client run test -- tests/lab-03/StaffTicketDetail.test.tsx`
- **Test Log Output:**

```text
 ✓ tests/lab-03/StaffTicketDetail.test.tsx (9)
   ✓ StaffTicketDetail Component (StaffTicketDetail.test.tsx) (9)
     ✓ renders operational ticket details, metadata, and status badges
     ✓ shows 'Claim Ticket' button when ticket is unassigned and triggers claim API
     ✓ reassigns ticket owner when selecting new staff user from dropdown
     ✓ updates IT Priority when changing dropdown value
     ✓ opens StatusTransitionModal and validates reason fields on submission
     ✓ enforces mandatory reason length in StatusTransitionModal when target is CANCELLED
     ✓ renders Amber Internal Notes tab with Lock Icon and allows posting internal notes
     ✓ renders Activity timeline tab with audit events
     ✓ locks operational controls when ticket status is CLOSED or CANCELLED

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

- **Full Client Suite Verification:** `npm --prefix client test` (11/11 test files passed, 103/103 tests passed).

### 2.4 Playwright 20-Step End-to-End Browser Journey

- **Target Command:** `npm --prefix e2e run test -- tests/lab-03/full-journey.spec.ts`
- **Test Log Output Placeholder:**

```text
[PLACEHOLDER: Paste Playwright test runner output verifying all 20 end-to-end lifecycle steps:
 Steps 1-5: Unauthenticated redirect, First-login forced reset, Requester ticket creation, Ownership isolation
 Steps 6-13: Staff queue triage, Claim ticket, IT Priority update, Status progression, Public comment, Internal note
 Steps 14-16: Requester views public comment (no internal note), Clicks "Problem Appears Resolved", Flag set
 Step 17: Staff sees [Requester Confirmed Resolved] badge, Enters resolution summary, Formally resolves ticket
 Steps 18-20: Admin user management, Self-deactivation blocked, Last-admin protected, New staff user provisioned]
```

### 2.5 Lab 2 Regression Test Verification

- **Target Commands:**
  - Server Regression: `npm --prefix server run test -- tests/lab-02/`
  - Client Regression: `npm --prefix client run test -- tests/lab-02/`

- **Server Regression Test Log Output:**

```text
 RUN  v2.1.9 /Users/peta/Downloads/toktickit/server

 ✓ tests/lab-02/attachments.api.test.ts (7)
 ✓ tests/lab-02/create-ticket.api.test.ts (13)
 ✓ tests/lab-02/my-tickets.api.test.ts (17)
 ✓ tests/lab-02/requesters.test.ts (5)
 ✓ tests/lab-02/ticket-detail.api.test.ts (20)

 Test Files  5 passed (5)
      Tests  62 passed (62)
   Duration  4.04s
```

- **Client Regression Test Log Output:**

```text
 RUN  v2.1.8 /Users/peta/Downloads/toktickit/client

 ✓ tests/lab-02/App.test.tsx (16)
 ✓ tests/lab-02/AttachmentSection.test.tsx (9)
 ✓ tests/lab-02/CreateTicket.test.tsx (7)
 ✓ tests/lab-02/MyTickets.test.tsx (13)
 ✓ tests/lab-02/RequesterHeader.test.tsx (6)
 ✓ tests/lab-02/RequesterTicketDetail.test.tsx (7)

 Test Files  6 passed (6)
      Tests  58 passed (58)
   Duration  4.94s
```

---

## 3. UI State & Responsive Screenshot Catalog (24 Baseline Images)

Screenshots will be captured automatically by `e2e/lab-03/capture-screenshots.spec.ts` and stored in `artifacts/lab-03/screenshots/`.

| Image Identifier | Screen View                  | Viewport & Resolution       | File Path Placeholder                                                |
| :--------------- | :--------------------------- | :-------------------------- | :------------------------------------------------------------------- |
| `SCR-01-D`       | Login Screen                 | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/01-login-desktop.png`                  |
| `SCR-01-T`       | Login Screen                 | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/01-login-tablet.png`                   |
| `SCR-01-M`       | Login Screen                 | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/01-login-mobile.png`                   |
| `SCR-02-D`       | Change Password Screen       | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/02-change-password-desktop.png`        |
| `SCR-02-T`       | Change Password Screen       | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/02-change-password-tablet.png`         |
| `SCR-02-M`       | Change Password Screen       | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/02-change-password-mobile.png`         |
| `SCR-03-D`       | My Tickets Dashboard         | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/03-my-tickets-desktop.png`             |
| `SCR-03-T`       | My Tickets Dashboard         | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/03-my-tickets-tablet.png`              |
| `SCR-03-M`       | My Tickets Dashboard         | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/03-my-tickets-mobile.png`              |
| `SCR-04-D`       | Create Ticket Screen         | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/04-create-ticket-desktop.png`          |
| `SCR-04-T`       | Create Ticket Screen         | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/04-create-ticket-tablet.png`           |
| `SCR-04-M`       | Create Ticket Screen         | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/04-create-ticket-mobile.png`           |
| `SCR-05-D`       | Requester Ticket Detail      | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/05-ticket-detail-desktop.png`          |
| `SCR-05-T`       | Requester Ticket Detail      | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/05-ticket-detail-tablet.png`           |
| `SCR-05-M`       | Requester Ticket Detail      | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/05-ticket-detail-mobile.png`           |
| `SCR-06-D`       | IT Staff Ticket Queue        | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/06-staff-queue-desktop.png`            |
| `SCR-06-T`       | IT Staff Ticket Queue        | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/06-staff-queue-tablet.png`             |
| `SCR-06-T-FO`    | IT Staff Queue (Filter Open) | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/06-staff-queue-tablet-filter-open.png` |
| `SCR-06-M`       | IT Staff Ticket Queue        | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/06-staff-queue-mobile.png`             |
| `SCR-06-M-FO`    | IT Staff Queue (Filter Open) | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/06-staff-queue-mobile-filter-open.png` |
| `SCR-07-D`       | IT Staff Ticket Detail       | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/07-staff-ticket-desktop.png`           |
| `SCR-07-T`       | IT Staff Ticket Detail       | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/07-staff-ticket-tablet.png`            |
| `SCR-07-M`       | IT Staff Ticket Detail       | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/07-staff-ticket-mobile.png`            |
| `SCR-08-D`       | Admin User Management Table  | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/08-admin-users-desktop.png`            |
| `SCR-08-T`       | Admin User Management Table  | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/08-admin-users-tablet.png`             |
| `SCR-08-M`       | Admin User Management Table  | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/08-admin-users-mobile.png`             |

---

## 4. Production Build & Lint Verification

- **Server Build Command:** `npm --prefix server run build`
- **Server Build Output:**

```text
> toktickit-server@1.0.0 build
> tsc
```

- **Client Build Command:** `npm --prefix client run build`
- **Client Build Output:**

```text
> toktickit-client@1.0.0 build
> tsc && vite build

vite v6.4.3 building for production...
transforming (1) src/main.tsx...
✓ 60 modules transformed.
rendering chunks (1)...
computing gzip size (3)...
dist/index.html                   0.39 kB │ gzip:  0.27 kB
dist/assets/index-DP8p7haN.css  244.55 kB │ gzip: 34.16 kB
dist/assets/index-B7VImgTi.js   272.85 kB │ gzip: 73.15 kB
✓ built in 786ms
```
