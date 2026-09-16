# TokTickIT — Sprint 3 Engineering Specification (Issue 10)

**Course:** CPE 334 Software Engineering Laboratory  
**Sprint:** 3 — Users, Roles, IT Staff Ticketing, and Admin Screens  
**Design System:** Zen Green Palette  
**Status:** Authoritative Specification  

---

## 1. Sprint Goal

Build the core authenticated IT Service Desk workflow for Lab 3 by replacing the temporary Development Requester selector with real authentication, session management, and server-enforced role-based access control (RBAC).

By the end of Issues 10–17, the application supports three primary roles (`Requester`, `IT Staff`, `Administrator`) with the following core capabilities:
* User authentication with email and password via HTTP-Only session cookies.
* Mandatory first-login password change for accounts created with initial passwords.
* Server-side role authorization and ownership protection across all endpoints.
* Requester ticket creation, dashboard tracking, attachment management, Public Comments, and problem resolution confirmation.
* IT Staff shared Ticket Queue with search, multi-field filtering, sorting, and pagination.
* Ticket ownership claiming, reassignment, IT Priority management, and permitted status transitions.
* Append-only Public Comments and role-restricted Internal Notes.
* Minimalist Administrator user management with critical safety guardrails preventing self-deactivation or last-admin lockout.
* 100% preservation of existing Lab 2 data (5 users, 16 tickets, 7 attachments) and zero regression of Requester functionality.

---

## 2. Stakeholder Request

The IT Service Desk requires a production-grade system that allows employees (Requesters) to submit and track support requests, while enabling IT Staff to process, triage, and collaborate on those requests in a controlled, auditable, and traceable manner.

The system must ensure that:
* Requesters can access only their own tickets and attachments.
* IT Staff can access tickets according to their assigned permissions and manage operational priorities.
* Administrators can manage user accounts, assign roles, and control system access.
* Ticket ownership and status changes follow strict operational workflows.
* Internal notes are strictly protected and never exposed to Requesters.
* Public comments facilitate collaboration between Requesters and IT Staff.
* Authentication and password complexity rules are enforced consistently by the server.
* Important ticket activities are recorded in an audit history for traceability.
* The application remains responsive, accessible, and usable on desktop, tablet, and mobile screens.

---

## 3. Scope Boundaries

### 3.1 In-Scope (Included in Issues 10–17)

1. **Documentation and Engineering Contracts (Issue 10):**
   * Complete Lab 3 specification documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `migration-plan.md`, `evidence.md`, `reviewer.md`).
2. **Database and Migration (Issue 11):**
   * Evolve `RequesterUser` to unified `User` model with roles (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`) and password hashes.
   * Add `requestedPriority`, `itPriority`, `ownerId`, `resolutionIndicated`, and `resolutionSummary` to `Ticket`.
   * Expand `TicketStatus` enum (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), mapping legacy `REJECTED` tickets to `CANCELLED`.
   * Add `Comment` model (`visibility: PUBLIC | INTERNAL`) and `TicketActivity` audit history.
   * Non-destructive migration preserving existing 5 users, 16 tickets, and 7 attachments.
   * Idempotent seed populating 10 users (5 Requesters, 4 IT Staff, 1 Administrator).
3. **Authentication and Authorization (Issue 12):**
   * Login, logout, current-user retrieval (`/api/auth/me`), and password change endpoints.
   * HTTP-Only, SameSite session cookie with signed HS256 JWT (`toktickit_session`).
   * Password-change gate blocking operational routes when `mustChangePassword = true`.
   * Active-account check invalidating deactivated sessions on their next request.
   * Server-side role authorization and Requester ownership isolation (404 Not Found anti-leakage).
   * Foundational Requester discussion APIs (`GET/POST /api/tickets/:id/comments`, `POST /api/tickets/:id/confirm-resolved`).
   * Complete removal of `X-Requester-Id` header and migration of Lab 2 server tests to cookie authentication.
4. **Client Authentication and Shared Shell (Issue 13):**
   * Login screen with validation, busy state, and safe error display.
   * Change Password screen with real-time password policy checklist.
   * Shared application shell, header, navigation, current-user display, role-aware links, and logout action.
   * Protected client route guards for authentication, password reset, and role permissions.
   * Requester workflow regression: Create Ticket, My Tickets, Requester Ticket Detail.
   * Public Comments thread UI and "Problem Appears Resolved" confirmation modal.
   * Migration of Lab 2 client component tests to `AuthContext`.
5. **Staff Queue (Issue 14):**
   * IT Staff Ticket Queue API (`GET /api/staff/tickets`) with search, multi-field filtering, sorting, and pagination (default 10, max 50).
   * Responsive Staff Queue UI (desktop multi-column table, mobile stacked cards) with status, priority, and `[Requester Confirmed Resolved]` badges.
   * Queue-level role authorization (IT Staff and Admin only).
6. **Staff Ticket Operations (Issue 15):**
   * Staff Ticket Detail UI with operational panels.
   * Claim unassigned ticket (atomic, status `NEW` -> `OPEN`) and reassignment controls.
   * IT Priority updates independent of Requested Priority.
   * Status transition state machine across all 8 statuses with mandatory summaries for `RESOLVED`, `CANCELLED`, and `REOPENED`.
   * Role-restricted Internal Notes API and UI (amber container with lock badge).
   * Closed ticket operational restrictions.
   * Concurrency protection and atomic `TicketActivity` logging.
7. **Administrator User Management (Issue 16):**
   * Administrator-only user directory with search by name/email and role filter.
   * User creation with one permitted role and initial password (`mustChangePassword = true`).
   * User editing (name, role, active/inactive toggle).
   * Set new initial password forcing password reset at next login.
   * Safety guardrails: block self-deactivation (400) and block deactivating/demoting the last active Administrator (409).
   * No user deletion endpoint (deactivation over deletion).
8. **Integration, E2E Testing, Responsive UI, and Final Verification (Issue 17):**
   * 20-step end-to-end integration flow across all three user roles.
   * Playwright E2E suites: authentication, staff ticket flow, user administration.
   * Automated screenshot collection across Desktop (1280x900), Tablet (768x1024), and Mobile (375x812) viewports with zero horizontal overflow.
   * Documentation completion: `reviewer.md`, `ai-use.md`, `evidence.md`, README.
   * Clean client/server production builds and 100% passing automated test execution.

### 3.2 Out-of-Scope (Explicitly Excluded per Handout Section 4.2)

The following capabilities are **not required** for Lab 3:
* Email notifications, invitations, or password-reset emails.
* SMS notifications.
* External identity providers, social login, and Single Sign-On (SSO).
* Multi-factor authentication (MFA).
* Self-registration and Requester-created accounts.
* Actions Taken by IT Staff (deferred to Lab 4).
* Formal SLA calculations, automated escalation rules, and notification workers.
* Dashboards and KPI analytics beyond simple queue counts.
* Real-time WebSocket notifications.
* Public customer portal.
* Knowledge base management and asset inventory management.
* Server-side JWT revocation using a session store (stateless token clearing is used).
* Full audit-log administration UI (internal activity history only).
* Multi-tenant organizations, departments, customer administration, and profile photos.
* Multiple roles assigned to one user (each user has exactly one permitted role).
* User deletion, bulk user operations, import/export, and account audit history screens.
* Advanced user-list features (mandatory pagination, multi-column sorting, multiple simultaneous filters on user list).
* Production deployment infrastructure or cloud storage integration.

---

## 4. Issue Ownership Model (Issues 10 to 17)

To ensure strict sequential delivery and avoid circular dependencies or boundary confusion, each issue has an explicit, singular technical ownership scope:

| Issue | Title | Branch Name | Primary Ownership |
| :---: | :--- | :--- | :--- |
| **10** | Documentation & Contract | `feature/10-lab3-documentation` | Authoritative specifications only (`docs/lab-03/*.md`). Zero code or migrations. |
| **11** | Database Schema, Migration & Seed | `feature/11-database-migration` | Complete database relational models, in-place migration, and idempotent seed. |
| **12** | Authentication & Authorization | `feature/12-authentication-authorization` | JWT session cookies, auth endpoints, middleware (`requireAuth`, `requireRole`), foundational discussion endpoints, and Lab 2 server test migration. |
| **13** | Client Auth & Shared Shell | `feature/13-client-auth-shell` | Login/Password Change screens, Header navigation shell, `AuthContext`, route protection, Requester workflow regression, Public Comments UI, and Lab 2 client test migration. |
| **14** | Staff Queue | `feature/14-staff-queue` | Staff Queue query API (`GET /api/staff/tickets`) and responsive Queue UI (desktop table, mobile cards). Focuses strictly on listing and viewing. |
| **15** | Staff Ticket Operations | `feature/15-staff-ticket-operations` | Staff Ticket Detail UI, claim/reassign, IT Priority, status transition state machine, Internal Notes API & UI, and operational audit records. |
| **16** | User Management | `feature/16-user-management` | Administrator user directory, user creation, editing, active toggle, initial password reset, and safety guardrails. |
| **17** | Integration & Final Verification | `feature/17-integration-e2e` | 20-step E2E flow, Playwright test journeys, responsive screenshots (all views x 3 viewports), `reviewer.md`, `ai-use.md`, `evidence.md`, and final builds. |

---

## 5. Numbered Functional Requirements

- **FR-01 (Secure Authentication):** The system shall authenticate users via `POST /api/auth/login` using email address and password, issuing an HTTP-Only, SameSite session cookie (`toktickit_session`) containing a signed HS256 JWT upon credential validation.
- **FR-02 (Account Active Verification):** The system shall verify that an account is active (`isActive = true`) during login and on every protected API request. Inactive accounts receive `401 Unauthorized` (`INVALID_CREDENTIALS` or `ACCOUNT_DEACTIVATED`).
- **FR-03 (Mandatory First-Login Password Change):** Users flagged with `mustChangePassword = true` shall be blocked from all operational endpoints (`403 Forbidden`) until submitting a compliant new password via `POST /api/auth/change-password`.
- **FR-04 (Identity Retrieval):** The system shall expose `GET /api/auth/me` to return the authenticated user's ID, email, full name, role, and `mustChangePassword` state (accessible even during mandatory password change).
- **FR-05 (Authenticated Logout):** The system shall provide `POST /api/auth/logout` which clears the session cookie and terminates authenticated access.
- **FR-06 (Server-Side Role Authorization):** All protected endpoints shall verify that the caller possesses the required role (`REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`). Unauthorized roles receive `403 Forbidden`.
- **FR-07 (Requester Ownership Isolation):** Requesters shall access only tickets and attachments where `ticket.requesterId === req.user.id`. Direct access to foreign resources shall return `404 Not Found` without disclosing resource existence.
- **FR-08 (Requester Ticket Operations):** Authenticated Requesters shall create tickets, stage attachments, query their dashboard, and inspect ticket details using authenticated session identity without client-supplied identity headers (`X-Requester-Id`).
- **FR-09 (Public Comments Thread):** Authorized Requesters, IT Staff, and Administrators shall view and append Public Comments (`GET` / `POST /api/tickets/:id/comments`) to tickets. Comments are append-only and validate length (1–2000 chars).
- **FR-10 (Problem Appears Resolved Confirmation):** An authenticated Requester viewing an owned ticket in `IN_PROGRESS` or `WAITING_FOR_REQUESTER` status shall be able to invoke `POST /api/tickets/:id/confirm-resolved`. This sets `resolutionIndicated = true`, auto-transitions `WAITING_FOR_REQUESTER` to `IN_PROGRESS`, posts a public comment, and logs an activity record, without setting the status to `RESOLVED`.
- **FR-11 (Staff Ticket Queue):** The system shall provide `GET /api/staff/tickets` allowing IT Staff and Administrators to search by ticket number/summary, filter by category/priority/status/owner, sort, and paginate (default 10, max 50).
- **FR-12 (Ticket Claiming & Reassignment):** IT Staff and Administrators shall be able to claim unassigned tickets (`NEW` -> `OPEN`) or reassign ownership (`PATCH /api/staff/tickets/:id/assign`) to any active IT Staff or Administrator.
- **FR-13 (IT Priority Management):** IT Staff and Administrators shall be able to update `itPriority` (`PATCH /api/staff/tickets/:id/priority`) independently of the Requester's original `requestedPriority`.
- **FR-14 (Status State Machine Enforcement):** IT Staff and Administrators shall be able to transition tickets across the 8 permitted statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`). Mandatory summaries are enforced for `RESOLVED` (`resolutionSummary`), `CANCELLED` (`cancellationReason`), and `REOPENED` (`reopenReason`).
- **FR-15 (Role-Restricted Internal Notes):** IT Staff and Administrators shall be able to create and view Internal Notes (`POST` / `GET /api/staff/tickets/:id/notes`). Requesters shall receive `404 Not Found` or `403 Forbidden` and never receive internal notes in any response.
- **FR-16 (Administrator User Management):** Administrators shall be able to list users (`GET /api/admin/users`), search, filter by role, create users with initial passwords (`POST /api/admin/users`), edit user details (`PATCH /api/admin/users/:id`), toggle active/inactive status, and set new initial passwords (`POST /api/admin/users/:id/initial-password`).
- **FR-17 (Administrator Safety Guardrails):** The administrative subsystem shall reject self-deactivation attempts (`400 Bad Request`), prevent deactivating or demoting the last active Administrator (`409 Conflict`), reject duplicate email addresses (`409 Conflict`), and prohibit user deletion.
- **FR-18 (Responsive Presentation):** All views shall adapt smoothly across Desktop (>=992px), Tablet (768–991px), and Mobile (<768px) viewports with zero unintended page-level horizontal overflow.

---

## 6. Numbered Business Rules

| Rule ID | Rule Name | Description | Enforcement Point |
| :--- | :--- | :--- | :--- |
| **BR-01** | **Active User Authentication** | Only an active user account (`isActive = true`) with valid credentials may authenticate. Deactivated accounts receive generic `401 Unauthorized` (`INVALID_CREDENTIALS`). | Server (`/api/auth/login`) |
| **BR-02** | **First-Login Password Reset** | Users with `mustChangePassword = true` cannot access normal application functionality until a compliant new password is saved. | Server Middleware & Client Route Guard |
| **BR-03** | **Authenticated Identity Authority** | The authenticated session, never client-supplied headers or body fields, strictly determines user identity and ownership. | Server Middleware (`requireAuth`) |
| **BR-04** | **Public vs. Internal Note Visibility** | Public Comments are visible to the Requester, IT Staff, and Administrator. Internal Notes are strictly restricted to IT Staff and Administrator and filtered from all Requester endpoints. | Server Controllers & Database Queries |
| **BR-05** | **Requester Resolution Limitation** | A Requester may indicate that a problem appears resolved (`resolutionIndicated = true`), but cannot formally set the ticket to `RESOLVED` or `CLOSED`. Formal resolution is reserved for IT Staff and Administrator. | Server Controller & State Machine |
| **BR-06** | **Single Role Assignment** | Every user account has exactly one assigned role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multiple roles per user are prohibited. | Server Schema & Validation |
| **BR-07** | **Ticket Ownership Eligibility** | A Ticket may have zero or one primary Ticket Owner (`ownerId`). Only active users with role `IT_STAFF` or `ADMINISTRATOR` may be assigned as ticket owners. Inactive users cannot receive new assignments. | Server Assignment Endpoint |
| **BR-08** | **Priority Separation** | `requestedPriority` preserves the Requester's submitted priority. `itPriority` is initialized to `requestedPriority` and can subsequently be updated only by IT Staff or Administrator. | Server Model & Update Controller |
| **BR-09** | **Permitted Status State Machine** | Permitted statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`. Transitioning `NEW` -> `OPEN` requires an assigned owner. Invalid transitions return `422 Unprocessable Entity`. | Server State Machine Controller |
| **BR-10** | **Discussion Immutability & Validation** | Public Comments and Internal Notes are append-only. Editing and deletion are excluded. Content must be 1 to 2,000 characters; whitespace-only submissions are rejected (`422 Unprocessable Entity`). | Server Validation |
| **BR-11** | **Admin Self-Deactivation Guard** | An Administrator cannot deactivate their own active account (`req.user.id !== targetUser.id`). Violations return `400 Bad Request` (`CANNOT_DEACTIVATE_SELF`). | Server Controller (`PATCH /api/admin/users/:id`) |
| **BR-12** | **Last Active Admin Protection** | The system prevents deactivating, demoting, or altering the last remaining active Administrator. Violations return `409 Conflict` (`LAST_ADMIN_PROTECTED`). | Server Database Transaction Check |
| **BR-13** | **Unique Email Enforcement** | Email addresses must be unique across all users (case-insensitive). Duplicate submissions return `409 Conflict` (`DUPLICATE_EMAIL`). | Database Constraint & API Validation |
| **BR-14** | **Initial Password Reset Mandate** | Setting a new initial password via Administrator action automatically sets `mustChangePassword = true`. | Server Controller |
| **BR-15** | **Account Deactivation Over Deletion** | User accounts are deactivated (`isActive = false`) rather than physically deleted. No deletion endpoints exist. | Server API Surface |

---

## 7. Roles and Permissions Matrix

| Capability / Action | Requester | IT Staff | Administrator | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :--- |
| **Log in / Log out** | Yes | Yes | Yes | `POST /api/auth/login`, `POST /api/auth/logout` |
| **Change own password** | Yes | Yes | Yes | `POST /api/auth/change-password` |
| **View own profile (`me`)** | Yes | Yes | Yes | `GET /api/auth/me` |
| **Create tickets** | Yes | No | No | `requireRole('REQUESTER')` |
| **View own tickets** | Yes | No (uses queue) | No (uses queue) | Scoped to `requesterId = req.user.id` |
| **View staff ticket queue** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Claim unassigned ticket** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Assign / reassign ticket** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Update IT Priority** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Transition ticket status** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Confirm resolved** | Yes (own eligible tickets) | No | No | `POST /api/tickets/:id/confirm-resolved` |
| **Add public comment** | Yes (own tickets) | Yes (authorized) | Yes (authorized) | `POST /api/tickets/:id/comments` |
| **Add internal note** | No | Yes | Yes | `POST /api/staff/tickets/:id/notes` |
| **View internal notes** | No | Yes | Yes | `GET /api/staff/tickets/:id/notes` |
| **Upload attachment** | Yes (own tickets) | Yes (authorized) | Yes (authorized) | Attachment access rules |
| **Remove attachment** | Yes (own attachments) | Yes (authorized) | Yes (authorized) | Attachment soft-removal audit |
| **View user management** | No | No | Yes | `requireRole('ADMINISTRATOR')` |
| **Create / edit user** | No | No | Yes | `requireRole('ADMINISTRATOR')` |
| **Activate / deactivate user**| No | No | Yes | `requireRole('ADMINISTRATOR')` |
| **Reset initial password** | No | No | Yes | `requireRole('ADMINISTRATOR')` |

---

## 8. Ticket Lifecycle & Status State Machine

The ticket lifecycle strictly enforces permitted operational transitions across all eight statuses:

```
[NEW] ──(Claim / Assign)──> [OPEN] ──(Start Work)──> [IN_PROGRESS] ──(Formal Resolve)──> [RESOLVED] ──(Close)──> [CLOSED]
  │                           │                            ▲  │                               │                     │
  │                           │             Wait for Req   │  │                               │                     │
  │ (Cancel)                  │ (Cancel)           ┌───────┘  │ (Cancel)                      │ (Reopen)            │ (Reopen)
  │                           │                    │          ▼                               │                     │
  ▼                           ▼                    [WAITING_FOR_REQUESTER]                    ▼                     ▼
[CANCELLED] <─────────────────┴───────────────────────────────┴───────────────────────────> [REOPENED] ──────────> [OPEN]
```

### 8.1 Status Definitions
* **`NEW`:** Ticket created by Requester, awaiting initial review and assignment.
* **`OPEN`:** Ticket assigned to an active staff owner, accepted into the working queue.
* **`IN_PROGRESS`:** Active investigation or resolution work underway by assigned owner.
* **`WAITING_FOR_REQUESTER`:** Blocked awaiting additional information or verification from Requester.
* **`RESOLVED`:** Assigned staff member indicates issue is resolved. Requires mandatory `resolutionSummary`.
* **`CLOSED`:** Terminal operational completion. Normal editing operations locked.
* **`REOPENED`:** Previously resolved or closed ticket reopened due to recurring issues. Requires `reopenReason`.
* **`CANCELLED`:** Terminal cancellation before resolution. Requires `cancellationReason`.

### 8.2 Transition Validation
* Attempting an invalid status transition returns **`422 Unprocessable Entity`** (`INVALID_STATUS_TRANSITION`) with current status, requested status, and allowable next states.
* Reassignment does not silently alter ticket status unless an explicit status update is submitted.
* A normal public comment does not alter ticket status, except when a ticket is in `WAITING_FOR_REQUESTER`, where a Requester comment or confirmation automatically returns status to `IN_PROGRESS`.

---

## 9. Authentication & Security Contract Summary

* **Token Format:** Stateless JWT signed using `HS256` with 8-hour lifetime.
* **Secret Configuration:** Read from `JWT_SECRET`. Production terminates immediately if missing or weak. Development falls back safely with a logged warning.
* **Cookie Handling:** Stored in `toktickit_session` with `httpOnly: true`, `sameSite: 'lax'`, `secure: true` (in production), `path: '/'`. The frontend never stores the token in `localStorage`, `sessionStorage`, or URL parameters.
* **Active Verification:** On every request, `requireAuth` verifies the token signature and queries database active status. Deactivated users immediately receive `401 Unauthorized` (`ACCOUNT_DEACTIVATED`).
* **Stateless Logout Limitation:** Logout clears the client session cookie. The documentation transparently acknowledges that clearing the cookie does not revoke a copied stateless token held externally before expiration.

---

## 10. Acceptance Criteria (Issue-by-Issue Summary)

### Issue 10 — Documentation & Contract
* **AC-10-01:** Required documentation files (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `migration-plan.md`, `evidence.md`, `reviewer.md`) exist under `docs/lab-03/`.
* **AC-10-02:** Functional requirements are numbered and describe expected system behavior clearly.
* **AC-10-03:** API contract defines paths, methods, auth, payloads, responses, and status codes.
* **AC-10-04:** UI contract defines screens, layout, tokens, validation, role visibility, and responsive rules.
* **AC-10-05:** Test specification connects acceptance criteria to planned automated tests.
* **AC-10-06:** Terminology and rules are consistent across all documents.
* **AC-10-07:** Documentation is established before feature implementation begins.

### Issue 11 — Database Schema, Migration & Seed
* **AC-11-01:** Prisma schema supports `User`, `Ticket`, `Comment`, `TicketActivity`, `Attachment`, `Category`, `RelatedSystem`.
* **AC-11-02:** Database migration preserves existing 5 users with IDs 1–5.
* **AC-11-03:** Migration is non-destructive (no reset, truncate, or deletion of existing data).
* **AC-11-04:** Migration handles actual PostgreSQL enum, sequence, and constraint names correctly.
* **AC-11-05:** Seed script is idempotent (safe to run repeatedly without duplicate rows).
* **AC-11-06:** Final development dataset contains exactly 10 users (5 Requesters, 4 IT Staff, 1 Administrator).
* **AC-11-07:** Passwords stored only as bcrypt hashes.
* **AC-11-08:** Seed does not overwrite existing password hashes or `mustChangePassword` flags on re-run.
* **AC-11-09:** Jennifer test fixture consistency is resolved cleanly.
* **AC-11-10:** Existing Lab 2 server tests continue to pass.

### Issue 12 — Authentication and Authorization
* **AC-12-01:** Valid login creates session cookie and returns user profile.
* **AC-12-02:** Invalid login returns 401 Unauthorized without exposing details.
* **AC-12-03:** Inactive users cannot log in (401 Unauthorized).
* **AC-12-04:** JWT claims, expiration, and cookie settings match the contract.
* **AC-12-05:** Invalid, malformed, or expired sessions return 401 Unauthorized.
* **AC-12-06:** Deactivated users lose access immediately on next request (401).
* **AC-12-07:** Password change updates hash and sets `mustChangePassword = false`.
* **AC-12-08:** Password change restrictions block operational routes when required.
* **AC-12-09:** Logout clears the session cookie.
* **AC-12-10:** Stateless logout limitation is documented.
* **AC-12-11:** Role authorization is enforced on the server (403 Forbidden).
* **AC-12-12:** Requester ownership is enforced (404 Not Found anti-leakage).
* **AC-12-13:** Internal notes are strictly excluded from Requester responses.

### Issue 13 — Client Authentication and Shared Shell
* **AC-13-01:** Login screen includes required fields, validation, loading, and error handling.
* **AC-13-02:** Successful login updates auth state and redirects to destination.
* **AC-13-03:** Invalid login displays clear user-facing error.
* **AC-13-04:** First-login password change redirects to change-password screen and blocks normal navigation.
* **AC-13-05:** Unauthenticated users accessing protected routes are redirected to login.
* **AC-13-06:** Role-based navigation shows only permitted options.
* **AC-13-07:** Logout clears local auth state and redirects to login.
* **AC-13-08:** JWT is not stored in browser `localStorage` or `sessionStorage`.
* **AC-13-09:** Application shell is responsive without horizontal page overflow.

### Issue 14 — Staff Queue
* **AC-14-01:** Staff queue is protected against Requesters and unauthenticated users.
* **AC-14-02:** Active IT Staff and Administrators can view queue data.
* **AC-14-03:** Queue displays required ticket fields and status badges.
* **AC-14-04:** Search matches ticket numbers and summaries.
* **AC-14-05:** Filters correctly isolate tickets by category, priority, status, and owner.
* **AC-14-06:** Sorting and pagination function accurately (default 10, max 50).
* **AC-14-07:** Loading, empty, no-results, and error states are implemented.
* **AC-14-08:** Queue layout adapts to desktop, tablet, and mobile without page horizontal scroll.

### Issue 15 — Staff Ticket Operations
* **AC-15-01:** Staff ticket detail displays required operational information.
* **AC-15-02:** Requesters cannot access staff-only content or operational views.
* **AC-15-03:** Claiming an unassigned ticket sets owner and transitions status to `OPEN`.
* **AC-15-04:** Assignment rules are enforced (role and state validation).
* **AC-15-05:** Inactive users cannot be assigned as ticket owners.
* **AC-15-06:** Permitted status transitions update status and record activity.
* **AC-15-07:** Invalid status transitions are rejected with 422 Unprocessable Entity.
* **AC-15-08:** Closed ticket operational restrictions are enforced.
* **AC-15-09:** Public comments are saved with author and timestamp.
* **AC-15-10:** Internal notes are saved and visible only to Staff and Admin.
* **AC-15-11:** Internal notes are never leaked to Requesters.
* **AC-15-12:** Confirm-resolved records resolution indication and transitions ticket to `IN_PROGRESS`.
* **AC-15-13:** Requester cannot directly set status to `RESOLVED` or `CLOSED`.
* **AC-15-14:** Attachments follow file type, size, count, and ownership rules.
* **AC-15-15:** Soft-removed attachments return 410 Gone.
* **AC-15-16:** Operational actions generate `TicketActivity` records.
* **AC-15-17:** Multi-step operational changes execute atomically in transactions.

### Issue 16 — User Management
* **AC-16-01:** User management is restricted strictly to active Administrators (403 for others).
* **AC-16-02:** User list displays required account attributes without sensitive credentials.
* **AC-16-03:** Search by name/email and role filtering function accurately.
* **AC-16-04:** User creation saves valid role, unique email, bcrypt hash, and initial password state.
* **AC-16-05:** Duplicate email submissions return 409 Conflict.
* **AC-16-06:** User editing updates name, role, and active status safely.
* **AC-16-07:** Deactivating a user prevents login and blocks new ticket assignments.
* **AC-16-08:** Inactive users cannot be assigned tickets.
* **AC-16-09:** Password reset forces `mustChangePassword = true` for target account.
* **AC-16-10:** Last remaining active Administrator is protected against deactivation or demotion.
* **AC-16-11:** Sensitive data (hashes, JWT secrets) is never returned in user management responses.
* **AC-16-12:** User management interface is fully responsive without horizontal overflow.

### Issue 17 — Integration, E2E Testing, Responsive UI, and Final Verification
* **AC-17-01:** All required features from Issues 10–16 integrate seamlessly using shared contracts.
* **AC-17-02:** 20-step end-to-end workflow passes across frontend, backend, database, and auth layers.
* **AC-17-03:** Server-side role separation is verified across Requester, Staff, and Admin roles.
* **AC-17-04:** Complete screenshot sets exist for all 8 views across Desktop, Tablet, and Mobile in `artifacts/lab-03/screenshots/`.
* **AC-17-05:** Responsive UI adapts cleanly without unintended page-level horizontal overflow.
* **AC-17-06:** All required automated tests execute and pass with zero skipped or todo tests.
* **AC-17-07:** Client and server production build commands succeed.
* **AC-17-08:** Database migration and idempotent seed execution are verified on integration branch.
* **AC-17-09:** Required CI workflow checks pass.
* **AC-17-10:** Evidence folder and review documentation are complete.
* **AC-17-11:** No undocumented contract conflicts remain.

---

## 11. Product Definition of Done

Lab 03 is complete only when all of the following conditions are satisfied:
- [ ] Issues 10–17 are implemented and merged sequentially into `lab3-staging`.
- [ ] All required engineering documents (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`, `migration-plan.md`, `evidence.md`, `reviewer.md`, `ai-use.md`) are complete and consistent.
- [ ] Database schema supports all approved entities without data loss.
- [ ] Existing development data (IDs 1–5, 16 tickets, 7 attachments) is preserved.
- [ ] Database migration is non-destructive and seed is idempotent (10 total users).
- [ ] Authentication uses the approved cookie-based JWT contract.
- [ ] Passwords are stored only as bcrypt hashes.
- [ ] First-login password change gate works reliably.
- [ ] Role-based authorization is enforced on the server.
- [ ] Requester ownership isolation works (404 Not Found anti-leakage).
- [ ] Internal notes are strictly protected from Requesters.
- [ ] Staff ticket queue functions with search, filters, sorting, and pagination.
- [ ] Ticket assignment, claim, and status state machine rules work.
- [ ] Public comments and internal notes work with proper visibility separation.
- [ ] Attachments follow file type, size, count, and soft-removal rules.
- [ ] Activity records are created for required operational actions.
- [ ] Administrator user management works with self-deactivation and last-admin protections.
- [ ] Client and server production builds pass.
- [ ] All automated tests execute and pass with zero skipped or todo tests.
- [ ] CI checks pass.
- [ ] Required screenshots are complete across Desktop, Tablet, and Mobile viewports with no horizontal scroll.
- [ ] Final evidence package is verified and ready for main branch merge.
