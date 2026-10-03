# TokTickIT — Sprint 3 Final Submission Package (9 Parts)

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Semester:** 1/2026  
**Lab Assignment:** Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens (Score: 60)  
**Repository:** `lephirada/toktickit`  
**Integration Branch:** `feature/17-integration-e2e` → `lab3-staging` → `main`

---

## Answer Part 1: Git Use with Engineering Workflow (10 Points)

### 1.1 Git Commit History & Branching Discipline
This sprint adhered strictly to a Git Flow branching strategy where feature isolation branches were systematically created per GitHub Issue, verified through automated CI, reviewed by peer reviewer, and merged into `lab3-staging`:

```text
main (Release / Stable)
 ^
 |-- lab3-staging (Sprint 3 Integration Branch)
 |    ^
 |    |-- feature/10-lab3-documentation       (Issue 10: Sprint 3 Specifications & Test Plan) [PR #32]
 |    |-- feature/11-database-migration       (Issue 11: Schema Migration & Idempotent Seed)   [PR #33]
 |    |-- feature/12-authentication-authorization (Issue 12: JWT Auth, Password Hash & APIs)  [PR #34]
 |    |-- feature/13-client-auth-shell        (Issue 13: Client Auth Shell & Role Navigation) [PR #35]
 |    |-- feature/14-staff-queue              (Issue 14: IT Staff Ticket Queue & Filter Drawer)[PR #36]
 |    |-- feature/15-staff-ticket-operations  (Issue 15: Staff Claims, Transitions & Notes)   [PR #37]
 |    |-- feature/16-user-management          (Issue 16: Administrator User Management)       [PR #38]
 |    `-- feature/17-integration-e2e          (Issue 17: Full E2E Journey & Verification)     [PR #39]
```

### 1.2 GitHub Project / Kanban Board Evidence
All sprint issues (Issues 10 through 17) were tracked with clear user stories, acceptance criteria, and moved through Kanban phases (`Todo` → `In Progress` → `Review` → `Done`).

### 1.3 Peer Review Records
Peer review logs are documented in [`docs/lab-03/reviewer.md`](reviewer.md) with peer reviewer identity, PR links, reviewer critiques, author responses, and approval verdicts.

### 1.4 README & Repository Structure
- Core project README: [`README.md`](../../README.md) updated with complete Lab 3 feature breakdown, API contract tables, and test instructions.
- Clean `.gitignore` prevents check-in of build artifacts, SQLite database files, logs, and sensitive `.env` secrets.

---

## Answer Part 2: Spec DD (5 Points)

- **Deliverable Path:** [`docs/lab-03/specification.md`](specification.md)
- **Key Contents:**
  - **Numbered Requirements:** Numbered Functional Requirements (FR-01 through FR-18) covering Authentication, Authorization, Staff Queue, Staff Operations, and Admin User Management.
  - **Business Rules:** Strict business rules (BR-01 through BR-15) defining ownership, password complexity, cookie JWT storage, transition matrices, and admin safety guardrails.
  - **Authorization Matrix:** Complete role separation table enforcing server-side permission checks across `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR` roles.
  - **Acceptance Criteria:** Testable criteria (AC-10-01 through AC-17-11).
  - **Migration & Seed Decisions:** Non-destructive evolution from Lab 2 requester records to the unified `User` model, preserving all 16 existing tickets and 7 attachments.
  - **Product Definition of Done:** Measurable completion criteria verified prior to release.

---

## Answer Part 3: Test DD and Traceability (10 Points)

- **Deliverable Path:** [`docs/lab-03/tests.md`](tests.md)
- **Test Traceability & Execution Summary:**
  - **Backend API & Unit Tests:** 250 tests passed across 16 test files (`server/tests/lab-03/`).
  - **Frontend Component Tests:** 111 tests passed across 12 test files (`client/src/tests/lab-03/`).
  - **Playwright Browser E2E Tests:** 64 tests passed across 7 test suites (`e2e/lab-03/`).
  - **Total Passing Automated Tests:** 425 passed tests, 0 skipped, 0 failed.
- **Continuous Integration:** GitHub Actions CI workflow runs automatically on every pull request to ensure zero regressions across client, server, and E2E suites.

---

## Answer Part 4: AI Use with Reflection (5 Points)

- **Deliverable Path:** [`docs/lab-03/ai-use.md`](ai-use.md)
- **AI Tooling:** Antigravity AI Agent with Claude 3.5 Sonnet / Gemini models.
- **Selected Key Prompts:** Documented prompt progressions for specification generation, database migration scripts, Vitest mock setups, and Playwright browser journeys.
- **My Reflection:** Reflection on balancing AI code generation speed with human oversight, ensuring server-side security enforcement over cosmetic UI controls, and maintaining strict test assertions.

---

## Answer Part 5: Working Login and Password Change UI (5 Points)

- **Evidence Screenshots:**
  - Desktop Login: [`artifacts/lab-03/screenshots/login/desktop.png`](../../artifacts/lab-03/screenshots/login/desktop.png)
  - Tablet Login: [`artifacts/lab-03/screenshots/login/tablet.png`](../../artifacts/lab-03/screenshots/login/tablet.png)
  - Mobile Login: [`artifacts/lab-03/screenshots/login/mobile.png`](../../artifacts/lab-03/screenshots/login/mobile.png)
  - Desktop Mandatory Change Password: [`artifacts/lab-03/screenshots/change-password/desktop.png`](../../artifacts/lab-03/screenshots/change-password/desktop.png)
- **Features Demonstrated:**
  - Valid and invalid login authentication with safe error feedback (`Invalid email or password`).
  - Inactive account block (`Account is deactivated`).
  - Mandatory first-login password change gate (`mustChangePassword: true`) blocking access to normal application until a valid new password meeting complexity criteria is submitted.
  - Role-aware navigation header and secure logout clearing HTTP-only auth cookies.

---

## Answer Part 6: Working IT Staff Ticket Queue UI (5 Points)

- **Evidence Screenshots:**
  - Desktop Queue: [`artifacts/lab-03/screenshots/staff-queue/desktop.png`](../../artifacts/lab-03/screenshots/staff-queue/desktop.png)
  - Tablet Queue (Filter Open): [`artifacts/lab-03/screenshots/staff-queue/tablet-filter-open.png`](../../artifacts/lab-03/screenshots/staff-queue/tablet-filter-open.png)
  - Mobile Queue (Cards View): [`artifacts/lab-03/screenshots/staff-queue/mobile.png`](../../artifacts/lab-03/screenshots/staff-queue/mobile.png)
- **Features Demonstrated:**
  - Operational queue displaying Ticket No, Summary, Category, Requested Priority, IT Priority, Status, Owner, and Last Updated.
  - Ownership filtering tabs: `All Tickets`, `Unassigned`, and `My Tickets`.
  - Responsive multi-filter drawer (Category, Status, Priority) and real-time debounced search.
  - Zero page-level horizontal overflow across Desktop (1280px), Tablet (768px), and Mobile (375px).

---

## Answer Part 7: Working IT Staff Ticket Detail UI (10 Points)

- **Evidence Screenshots:**
  - Desktop Staff Ticket Detail: [`artifacts/lab-03/screenshots/staff-ticket-detail/desktop.png`](../../artifacts/lab-03/screenshots/staff-ticket-detail/desktop.png)
  - Tablet Staff Ticket Detail: [`artifacts/lab-03/screenshots/staff-ticket-detail/tablet.png`](../../artifacts/lab-03/screenshots/staff-ticket-detail/tablet.png)
  - Mobile Staff Ticket Detail: [`artifacts/lab-03/screenshots/staff-ticket-detail/mobile.png`](../../artifacts/lab-03/screenshots/staff-ticket-detail/mobile.png)
- **Features Demonstrated:**
  - Explicit **Claim Ticket** action for unassigned tickets and colleague reassignment dropdown.
  - IT Priority updates (`P0_URGENT` to `P3_LOW`).
  - Controlled Status Transition modal enforcing resolution summaries for `RESOLVED`.
  - Visually distinct discussion tabs: Public Comments (shared with Requester) and Confidential Internal Notes (amber-badged, restricted to Staff and Admin).
  - Preserved attachment download and soft-removal continuity.

---

## Answer Part 8: Working Administrator User Management UI (5 Points)

- **Evidence Screenshots:**
  - Desktop User Directory: [`artifacts/lab-03/screenshots/user-management/desktop.png`](../../artifacts/lab-03/screenshots/user-management/desktop.png)
  - Create User Modal: [`artifacts/lab-03/screenshots/user-management/modal-create.png`](../../artifacts/lab-03/screenshots/user-management/modal-create.png)
  - Edit User Modal: [`artifacts/lab-03/screenshots/user-management/modal-edit.png`](../../artifacts/lab-03/screenshots/user-management/modal-edit.png)
  - Password Reset Modal: [`artifacts/lab-03/screenshots/user-management/modal-reset-password.png`](../../artifacts/lab-03/screenshots/user-management/modal-reset-password.png)
  - Safety Alert (Self-Deactivation): [`artifacts/lab-03/screenshots/user-management/safety-self-deactivation.png`](../../artifacts/lab-03/screenshots/user-management/safety-self-deactivation.png)
  - Safety Alert (Last Admin Protection): [`artifacts/lab-03/screenshots/user-management/safety-last-admin.png`](../../artifacts/lab-03/screenshots/user-management/safety-last-admin.png)
- **Features Demonstrated:**
  - Minimalist user management table with real-time search, role filters, and dynamic Clear Filters.
  - Creation of new accounts with temporary password forcing first-login change.
  - Administrative password reset.
  - Critical guardrails: Prevents self-deactivation and demotion/deactivation of the last active Administrator.
  - Complete server-side 403 Forbidden protection against non-admin access.

---

## Answer Part 9: Zen Green UI and Responsive Evidence (5 Points)

- **Deliverable Paths:** [`docs/lab-03/ui-spec.md`](ui-spec.md) and [`docs/lab-03/evidence.md`](evidence.md)
- **Visual Design System Checklist:**
  - Design Tokens: Consistent application of Zen Green `#1B4D3E`, neutral grays, semantic alert colors, and accessible contrast ratios ($\ge 4.5:1$).
  - Responsive Viewport Verification: Validated across 24 combinations (8 screens $\times$ 3 viewports: Desktop 1280px, Tablet 768px, Mobile 375px).
  - Overflow Prevention: Explicit Playwright assertions (`scrollWidth <= clientWidth`) confirm zero page-level horizontal overflow across all screens.
