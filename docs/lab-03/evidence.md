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
| **Issue 13** | `feature/13-client-auth-shell`            | Client Auth Shell & Requester Discussion  | `[PR #... Placeholder]` | `[Pending]`                     | `[Pending]`  |
| **Issue 14** | `feature/14-staff-queue`                  | IT Staff Ticket Queue API & UI            | `[PR #... Placeholder]` | `[Pending]`                     | `[Pending]`  |
| **Issue 15** | `feature/15-staff-ticket-operations`      | IT Staff Ticket Detail & Operations       | `[PR #... Placeholder]` | `[Pending]`                     | `[Pending]`  |
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

### 2.3 Frontend React Testing Library Component Suites

- **Target Command:** `npm --prefix client run test -- tests/lab-03/*.test.tsx`
- **Test Log Output Placeholder:**

```text
[PLACEHOLDER: Paste Vitest output for frontend component suites:
 - Login.test.tsx
 - ChangePassword.test.tsx
 - NavigationShell.test.tsx
 - RequesterTicketDetail.test.tsx
 - StaffTicketQueue.test.tsx
 - StaffTicketDetail.test.tsx
 - UserManagement.test.tsx]
```

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
- **Test Log Output Placeholder:**

```text
[PLACEHOLDER: Paste test outputs confirming all 64 server tests and 49 client tests continue to pass 100%]
```

---

## 3. UI State & Responsive Screenshot Catalog (24 Baseline Images)

Screenshots will be captured automatically by `e2e/lab-03/capture-screenshots.spec.ts` and stored in `artifacts/lab-03/screenshots/`.

| Image Identifier | Screen View                 | Viewport & Resolution       | File Path Placeholder                                          |
| :--------------- | :-------------------------- | :-------------------------- | :------------------------------------------------------------- |
| `SCR-01-D`       | Login Screen                | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/01-login-desktop.png`            |
| `SCR-01-T`       | Login Screen                | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/01-login-tablet.png`             |
| `SCR-01-M`       | Login Screen                | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/01-login-mobile.png`             |
| `SCR-02-D`       | Change Password Screen      | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/02-change-password-desktop.png`  |
| `SCR-02-T`       | Change Password Screen      | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/02-change-password-tablet.png`   |
| `SCR-02-M`       | Change Password Screen      | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/02-change-password-mobile.png`   |
| `SCR-03-D`       | Shared Header Shell & Nav   | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/03-header-nav-desktop.png`       |
| `SCR-03-T`       | Shared Header Shell & Nav   | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/03-header-nav-tablet.png`        |
| `SCR-03-M`       | Shared Header Shell & Nav   | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/03-header-nav-mobile.png`        |
| `SCR-04-D`       | Requester Ticket Detail     | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/04-requester-ticket-desktop.png` |
| `SCR-04-T`       | Requester Ticket Detail     | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/04-requester-ticket-tablet.png`  |
| `SCR-04-M`       | Requester Ticket Detail     | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/04-requester-ticket-mobile.png`  |
| `SCR-05-D`       | IT Staff Ticket Queue       | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/05-staff-queue-desktop.png`      |
| `SCR-05-T`       | IT Staff Ticket Queue       | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/05-staff-queue-tablet.png`       |
| `SCR-05-M`       | IT Staff Ticket Queue       | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/05-staff-queue-mobile.png`       |
| `SCR-06-D`       | IT Staff Ticket Detail      | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/06-staff-ticket-desktop.png`     |
| `SCR-06-T`       | IT Staff Ticket Detail      | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/06-staff-ticket-tablet.png`      |
| `SCR-06-M`       | IT Staff Ticket Detail      | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/06-staff-ticket-mobile.png`      |
| `SCR-07-D`       | Admin User Management Table | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/07-admin-users-desktop.png`      |
| `SCR-07-T`       | Admin User Management Table | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/07-admin-users-tablet.png`       |
| `SCR-07-M`       | Admin User Management Table | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/07-admin-users-mobile.png`       |
| `SCR-08-D`       | User Modal Dialog           | Desktop ($1280 \times 900$) | `artifacts/lab-03/screenshots/08-user-modal-desktop.png`       |
| `SCR-08-T`       | User Modal Dialog           | Tablet ($768 \times 1024$)  | `artifacts/lab-03/screenshots/08-user-modal-tablet.png`        |
| `SCR-08-M`       | User Modal Dialog           | Mobile ($375 \times 812$)   | `artifacts/lab-03/screenshots/08-user-modal-mobile.png`        |

---

## 4. Production Build & Lint Verification

- **Server Build Command:** `npm --prefix server run build`
- **Server Build Output Placeholder:**

```text
[PLACEHOLDER: Paste tsc build output demonstrating clean TypeScript compilation with zero errors]
```

- **Client Build Command:** `npm --prefix client run build`
- **Client Build Output Placeholder:**

```text
[PLACEHOLDER: Paste Vite production build output demonstrating bundle creation with zero warnings/errors]
```
