# TokTickIT — Sprint 3 Test Engineering Specification (Issue 10)

**Project:** TokTickIT Enterprise IT Helpdesk  
**Sprint:** 3 — Users, Roles, IT Staff Ticketing, and Admin Screens  
**Frameworks:** Vitest (Frontend & Unit), Supertest (Express API Integration), Playwright (End-to-End E2E)  

---

## 1. Test Engineering Strategy & Architecture

TokTickIT enforces a rigorous multi-tiered automated testing pyramid ensuring strict contract adherence, server-enforced role authorization, database migration safety, regression protection, and responsive accessibility.

```text
       / \
      / E2E \       Playwright (e2e/lab-03/): 20-step multi-role cross-functional flow & screenshot automation
     /-------\
    /   API   \     Supertest + Vitest (server/tests/lab-03/): Auth, RBAC, ownership, queue, notes, admin safety
   /-----------\
  / UI & Unit   \   React Testing Library + Vitest (client/tests/lab-03/): Form validation, modals, shell, guards
 /---------------\
/  DB Migration  \  Vitest DB Test (server/tests/lab-03/migration-verification.test.ts): Non-destructive assertions
-------------------
```

1. **Database Migration & Seed Tests (`server/tests/lab-03/migration-verification.test.ts`):**  
   Runs directly against the migrated PostgreSQL schema. Verifies that all 5 pre-existing users, 16 tickets, and 7 attachments retain their primary keys, foreign key relationships, and data integrity. Confirms that running the seed script multiple times is completely idempotent.
2. **Backend API Integration Tests (`server/tests/lab-03/*.api.test.ts`):**  
   Uses **Vitest** and **Supertest** against an isolated PostgreSQL instance. Tests bcrypt password verification, HTTP-Only session cookie lifecycle, RBAC middleware (`requireAuth`, `requireRole`), ownership boundaries (returning 404 for requester cross-ticket access), status state machine transitions, discussion privacy (internal notes hidden from requesters), and admin safety guardrails (self-deactivation, last-admin protection).
3. **Frontend Component & Unit Tests (`client/tests/lab-03/*.test.tsx`):**  
   Uses **Vitest** and **React Testing Library** with `@testing-library/user-event`. Tests login validation, real-time password rule checklists, staff queue filtering/searching, modal confirmations, responsive table-to-card transformations, and unauthenticated navigation redirects.
4. **End-to-End (E2E) Browser Tests (`e2e/lab-03/*.spec.ts`):**  
   Uses **Playwright** to execute comprehensive browser journeys across multiple personas (Requester, IT Staff, Admin). Covers authentication, forced password change, ticket triage, operational notes, confirm-resolved interactions, and admin user CRUD. Automatically captures 24 responsive screenshots across Desktop ($1280 \times 900$), Tablet ($768 \times 1024$), and Mobile ($375 \times 812$).
5. **Lab 2 Regression Verification (`server/tests/lab-02/`, `client/tests/lab-02/`):**  
   All 64 existing server tests and 49 client tests are adapted to use session-authenticated cookies and `AuthContext` while maintaining 100% pass rates across ticket creation, pre-upload staging, dashboard filtering, and soft-removal audits.

---

## 2. Traceability Matrix: Acceptance Criteria to Planned Automated Test Files

| Issue ID | Acceptance Criterion | Test Target File | Test Method / Type |
| :--- | :--- | :--- | :--- |
| **Issue 10** | Specification & Engineering Contract complete and consistent | `docs/lab-03/*.md` | Static Review / Audit |
| **Issue 11** | Non-destructive schema migration; 5 legacy users, 16 tickets, 7 attachments preserved | `server/tests/lab-03/migration-verification.test.ts` | Supertest / Prisma DB Test |
| **Issue 11** | Idempotent seed script; 10 users total (5 Requesters, 4 IT Staff, 1 Admin) | `server/tests/lab-03/migration-verification.test.ts` | Vitest Script Test |
| **Issue 12** | Valid credentials return 200 OK and set HTTP-Only session cookie | `server/tests/lab-03/auth.api.test.ts` | Supertest API |
| **Issue 12** | Inactive accounts rejected with 401; user enumeration prevented | `server/tests/lab-03/auth.api.test.ts` | Supertest API |
| **Issue 12** | `mustChangePassword = true` blocks operational routes with 403 | `server/tests/lab-03/auth.api.test.ts` | Supertest API |
| **Issue 12** | Password change clears flag and updates bcrypt hash | `server/tests/lab-03/auth.api.test.ts` | Supertest API |
| **Issue 12** | Requesters receive 404 when accessing unowned tickets or attachments | `server/tests/lab-03/authorization.api.test.ts` | Supertest API |
| **Issue 12** | Public Comments append-only; `POST /confirm-resolved` sets flag without setting RESOLVED | `server/tests/lab-03/comments-notes.api.test.ts` | Supertest API |
| **Issue 13** | Login screen form validation, error states, and session redirects | `client/tests/lab-03/Login.test.tsx` | RTL / Vitest |
| **Issue 13** | Change Password real-time 4-rule checklist validation | `client/tests/lab-03/ChangePassword.test.tsx` | RTL / Vitest |
| **Issue 13** | Shared navigation bar displays correct role links and user profile dropdown | `client/tests/lab-03/NavigationShell.test.tsx` | RTL / Vitest |
| **Issue 13** | Requester Ticket Detail displays public discussion thread and "Problem Appears Resolved" | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | RTL / Vitest |
| **Issue 14** | IT Staff Queue API returns paginated tickets with search & taxonomy filters | `server/tests/lab-03/staff-queue.api.test.ts` | Supertest API |
| **Issue 14** | Staff Queue UI renders 9-column table on desktop, cards on mobile | `client/tests/lab-03/StaffTicketQueue.test.tsx` | RTL / Vitest |
| **Issue 15** | Staff claim / reassign ticket updates owner and transitions NEW to OPEN | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Supertest API |
| **Issue 15** | IT Priority can be updated independently of Requested Priority | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Supertest API |
| **Issue 15** | Status state machine enforces required transition reasons (RESOLVED, CANCELLED) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Supertest API |
| **Issue 15** | Internal Notes visible to Staff/Admin; returns 404/403 to Requesters | `server/tests/lab-03/comments-notes.api.test.ts` | Supertest API |
| **Issue 15** | Staff Ticket Detail UI renders controls, status modal, and amber Internal Notes tab | `client/tests/lab-03/StaffTicketDetail.test.tsx` | RTL / Vitest |
| **Issue 16** | Admin User Management API supports listing, search, create, edit, password reset | `server/tests/lab-03/users-admin.api.test.ts` | Supertest API |
| **Issue 16** | Admin self-deactivation attempt returns 400 Bad Request | `server/tests/lab-03/users-admin.api.test.ts` | Supertest API |
| **Issue 16** | Deactivating or demoting the last active Administrator returns 409 Conflict | `server/tests/lab-03/users-admin.api.test.ts` | Supertest API |
| **Issue 16** | Admin User Management UI renders table, create/edit modals, safety dialogs | `client/tests/lab-03/UserManagement.test.tsx` | RTL / Vitest |
| **Issue 17** | Complete 20-step multi-role end-to-end user journey passes in browser | `e2e/lab-03/full-journey.spec.ts` | Playwright E2E |
| **Issue 17** | 24 responsive screenshots captured across Desktop, Tablet, and Mobile | `e2e/lab-03/capture-screenshots.spec.ts` | Playwright E2E |

---

## 3. Planned Test Suite Catalog

### 3.1 Migration & Database Integrity Suite (`server/tests/lab-03/migration-verification.test.ts`)
* **Pre-Migration Baseline Preservation:**
  - Asserts exact 5 users exist with preserved primary keys (`id: 1` through `id: 5`).
  - Asserts exact 16 tickets exist with preserved primary keys (`id: 1` through `id: 16`) and valid `requesterId` foreign keys.
  - Asserts exact 7 attachments exist with preserved primary keys (`id: 1` through `id: 7`) and valid `uploadedById` foreign keys.
* **Schema Evolution Assertions:**
  - Verifies table name is `users` and sequence is `users_id_seq`.
  - Verifies `role` column defaults to `REQUESTER`.
  - Verifies `mustChangePassword` defaults to `false`.
  - Verifies `itPriority` column defaults to `null`.
  - Verifies `resolutionIndicated` column defaults to `false`.
  - Verifies legacy `REJECTED` ticket status successfully converted to `CANCELLED`.
* **Seed Idempotency:**
  - Running seed twice in succession does not throw unique constraint violations, preserves existing password hashes, and maintains exactly 10 users in total.

### 3.2 Backend API Integration Test Suites (`server/tests/lab-03/`)

#### 1. Authentication & Session Suite (`auth.api.test.ts`)
* `POST /api/auth/login`: Valid credentials return 200, user profile, and set HTTP-Only `toktickit_session` cookie.
* `POST /api/auth/login`: Invalid password returns 401 `INVALID_CREDENTIALS`.
* `POST /api/auth/login`: Non-existent email returns 401 `INVALID_CREDENTIALS` (anti-enumeration).
* `POST /api/auth/login`: Deactivated account returns 401 `ACCOUNT_DEACTIVATED`.
* `GET /api/auth/me`: Valid session returns current authenticated user.
* `GET /api/auth/me`: Missing cookie returns 401 `UNAUTHENTICATED`.
* `GET /api/auth/me`: User with `mustChangePassword: true` returns 200 with flag populated.
* `POST /api/auth/change-password`: Weak password fails with 422 `VALIDATION_ERROR` and specific field error details.
* `POST /api/auth/change-password`: Mismatched confirmation fails with 422.
* `POST /api/auth/change-password`: Correct new password updates hash, clears `mustChangePassword`, and returns 200.
* `POST /api/auth/logout`: Clears session cookie and drops authentication.
* Immediate Session Invalidation: Deactivating an account in the database causes subsequent requests from that session cookie to fail with 401.

#### 2. Authorization & Ownership Suite (`authorization.api.test.ts`)
* Role Gate: Requester calling `GET /api/staff/tickets` returns 403 `FORBIDDEN_ROLE`.
* Role Gate: Requester calling `GET /api/admin/users` returns 403 `FORBIDDEN_ROLE`.
* Role Gate: IT Staff calling `GET /api/admin/users` returns 403 `FORBIDDEN_ROLE`.
* Role Gate: IT Staff calling `POST /api/tickets` (Requester ticket creation) returns 403 `FORBIDDEN_ROLE`.
* Ownership Boundary: Requester fetching their own ticket (`GET /api/tickets/1`) returns 200.
* Ownership Anti-Leakage: Requester fetching another user's ticket returns 404 `NOT_FOUND` (not 403).
* Ownership Anti-Leakage: Requester downloading another user's attachment returns 404 `NOT_FOUND`.

#### 3. Discussion & Resolution Suite (`comments-notes.api.test.ts`)
* Public Comments: Requester, Staff, or Admin posting comment succeeds (201 Created).
* Public Comments: Empty or whitespace-only comment body returns 422.
* Public Comments: Comment body exceeding 2,000 characters returns 422.
* Internal Notes: IT Staff posting internal note succeeds (201 Created).
* Internal Notes: Administrator viewing internal notes succeeds (200 OK).
* Internal Notes Security Gate: Requester attempting `GET /api/staff/tickets/:id/notes` or `POST /api/staff/tickets/:id/notes` returns 403 or 404.
* Public Comments Listing: Requester calling `GET /api/tickets/:id/comments` returns only public comments.
* Confirm Resolved: Requester calling `POST /api/tickets/:id/confirm-resolved` sets `resolutionIndicated = true`, auto-transitions `WAITING_FOR_REQUESTER` to `IN_PROGRESS`, appends comment, and returns 200.
* Confirm Resolved Duplicate Gate: Calling `POST /confirm-resolved` a second time returns 409 `ALREADY_CONFIRMED_RESOLVED`.

#### 4. Staff Queue Suite (`staff-queue.api.test.ts`)
* Returns tickets across all requesters with pagination metadata (`page`, `pageSize`, `totalCount`, `totalPages`).
* Text search matches `ticketNo` or `summary` (case-insensitive).
* Taxonomy filtering matches `category` and `relatedSystem`.
* Priority filtering matches `requestedPriority` and `itPriority`.
* Status filtering matches single status or comma-separated statuses.
* Assignment filtering matches `unassigned=true` or specific `ownerId`.
* Clamps `pageSize` to maximum 50.

#### 5. Staff Ticket Detail & Operations Suite (`staff-ticket-detail.api.test.ts`)
* Claiming unassigned ticket sets `ownerId` to staff user and updates status `NEW` $\rightarrow$ `OPEN`.
* Reassigning ticket updates `ownerId` and creates an audit entry in `ticket_activities`.
* Updating `itPriority` updates IT priority without mutating `requestedPriority`.
* Permitted status transitions succeed (`OPEN` $\rightarrow$ `IN_PROGRESS`, `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_REQUESTER`, etc.).
* Invalid transitions return 422 `INVALID_STATUS_TRANSITION` (e.g. `NEW` $\rightarrow$ `RESOLVED`).
* Transition to `RESOLVED` requires non-empty `resolutionSummary`; otherwise returns 422.
* Transition to `CANCELLED` requires non-empty `cancellationReason`; otherwise returns 422.
* Transition from `RESOLVED` to `REOPENED` requires non-empty `reopenReason`; otherwise returns 422.

#### 6. Administrator User Management Suite (`users-admin.api.test.ts`)
* `GET /api/admin/users`: Returns all users with role, active status, and timestamps.
* `POST /api/admin/users`: Creates new user with hashed password and sets `mustChangePassword: true`.
* `POST /api/admin/users`: Duplicate email returns 409 `DUPLICATE_EMAIL`.
* `PATCH /api/admin/users/:id`: Successfully updates full name, role, or active status.
* Self-Deactivation Guard: Admin attempting to set `isActive: false` on themselves returns 400 `CANNOT_DEACTIVATE_SELF`.
* Last Active Administrator Guard: Deactivating or demoting the last active administrator returns 409 `LAST_ADMIN_PROTECTED`.
* Password Reset: Admin resetting a user's password updates hash and forces `mustChangePassword: true`.

---

## 4. Planned Frontend Component Test Suites (`client/tests/lab-03/`)

* **`Login.test.tsx`:** Form input state management, inline validation, loading spinner during submit, 401 error banner, redirect on success.
* **`ChangePassword.test.tsx`:** Real-time 4-point password complexity checklist, confirmation matching, CTA disable/enable states, submit handler.
* **`NavigationShell.test.tsx`:** Renders role-specific links for Requester, Staff, and Admin; renders user badge and profile dropdown; mobile drawer toggle.
* **`RequesterTicketDetail.test.tsx`:** Read-only metadata display, attachment list, public comments thread, "Problem Appears Resolved" banner and confirmation modal.
* **`StaffTicketQueue.test.tsx`:** 9-column desktop table rendering, badge colors, search input debouncing, filter changes, mobile card transformation.
* **`StaffTicketDetail.test.tsx`:** Owner display, claim button, IT priority dropdown, status transition modal with required reason fields, amber Internal Notes tab with privacy banner.
* **`UserManagement.test.tsx`:** User directory table, search bar, create user modal, edit user modal, self-deactivation alert interception, last-admin protection alert.

---

## 5. Planned 20-Step End-to-End Test Journey (`e2e/lab-03/full-journey.spec.ts`)

The end-to-end suite validates the complete, multi-persona lifecycle through 20 sequential steps:

1. **Step 1 (Unauthenticated):** Visit `/my-tickets` $\rightarrow$ verify automatic redirect to `/login`.
2. **Step 2 (Requester First Login):** Login as `sarah.connor` with temporary password $\rightarrow$ verify automatic redirect to `/change-password`.
3. **Step 3 (Password Change):** Attempt weak password $\rightarrow$ verify checklist errors. Enter valid password $\rightarrow$ verify success and redirect to `/my-tickets`.
4. **Step 4 (Requester Ticket Creation):** Sarah creates a new IT ticket ("VPN connection failing on macOS") with high priority and an attachment.
5. **Step 5 (Requester Ownership Isolation):** Sarah opens ticket $\rightarrow$ succeeds. Attempts to visit ticket ID belonging to Jennifer Anderson $\rightarrow$ receives 404 Not Found.
6. **Step 6 (Staff Login):** Logout $\rightarrow$ Login as IT Staff `david.lee`.
7. **Step 7 (Staff Queue Triage):** Navigate to `/staff/queue` $\rightarrow$ verify Sarah's new ticket appears with status `NEW`, unassigned.
8. **Step 8 (Ticket Claiming):** Open ticket $\rightarrow$ click "Claim Ticket" $\rightarrow$ verify owner updates to David Lee and status transitions to `OPEN`.
9. **Step 9 (IT Priority Assessment):** Update IT Priority to `P0_URGENT` $\rightarrow$ verify `itPriority` badge updates to Urgent while Requested Priority remains High.
10. **Step 10 (Status Progression):** Open Status Modal $\rightarrow$ advance status from `OPEN` to `IN_PROGRESS`.
11. **Step 11 (Public Communication):** Post public comment: *"We are inspecting the VPN gateway configurations."* $\rightarrow$ verify appears in public thread.
12. **Step 12 (Internal Collaboration):** Switch to "Internal Notes" tab $\rightarrow$ verify amber banner. Post note: *"Radius server logs indicate handshake timeout."* $\rightarrow$ verify note appears with lock icon.
13. **Step 13 (Waiting on Requester):** Update status to `WAITING_FOR_REQUESTER`.
14. **Step 14 (Requester Verification):** Logout $\rightarrow$ Login as Sarah Connor. Open ticket $\rightarrow$ verify Public Comment is visible; verify Internal Note is completely absent.
15. **Step 15 (Requester Confirm Resolved):** Sarah clicks "Problem Appears Resolved", enters feedback: *"VPN connected successfully now."* $\rightarrow$ submits.
16. **Step 16 (Indicator Verification):** Verify button changes to green confirmed badge. Verify ticket status automatically returned to `IN_PROGRESS`.
17. **Step 17 (Staff Resolution):** Logout $\rightarrow$ Login as David Lee. View queue $\rightarrow$ verify `[Requester Confirmed Resolved]` badge is visible on Sarah's ticket. Open ticket $\rightarrow$ transition status to `RESOLVED` providing required Resolution Summary.
18. **Step 18 (Admin Login & Directory):** Logout $\rightarrow$ Login as Administrator `admin@toktickit.com`. Navigate to `/admin/users`.
19. **Step 19 (Admin Safety Guards):**
    - Attempt to deactivate own account $\rightarrow$ verify safety modal displays *"You cannot deactivate your own account."*
    - Search for sole active administrator $\rightarrow$ attempt to change role or deactivate $\rightarrow$ verify safety modal displays *"Cannot deactivate or demote the last remaining active Administrator."*
20. **Step 20 (User Provisioning):** Admin creates a new IT Staff user (`grace.hopper@toktickit.com`) $\rightarrow$ verify appears in user list $\rightarrow$ logout $\rightarrow$ Grace logs in with temporary password $\rightarrow$ verify forced change-password flow.
