# TokTickIT — Sprint 4 Verification & Evidence Artifacts (Issues 18–26)

**Course:** CPE 334 Software Engineering Laboratory  
**Sprint:** 4 — Parent-Child Work Structures, Resolution Gates, Operational Dashboards, and Regression Traceability  
**Status:** In Progress — Role-Based Dashboards & Visualizations Implemented (Issue 24)

> [!NOTE]
> Per project guidelines, all test results, screenshots, and verification artifacts documented herein are authentic and un-fabricated. This living document maintains the verified evidence inventory for Sprint 4 across Issues 18 through 26.

---

## 1. GitHub Issues & Pull Requests Registry

| Issue ID     | Branch Name                             | Issue Description                               | Pull Request Link                                  | Review Status | Merge Commit |
| :----------- | :-------------------------------------- | :---------------------------------------------- | :------------------------------------------------- | :------------ | :----------- |
| **Issue 18** | `feature/18-lab4-spec-docs`             | Sprint 4 Documentation, Contracts & Test Plan   | `[https://github.com/lephirada/toktickit/pull/50]` | `[Approved]`  | `[Merged]`   |
| **Issue 19** | `feature/19-database-migration-actions` | Database Evolution, ActionTaken Schema & Seed   | `[https://github.com/lephirada/toktickit/pull/51]` | `[Approved]`  | `[Merged]`   |
| **Issue 20** | `feature/20-actions-taken-backend`      | Actions Taken REST APIs & Concurrency Control   | `[https://github.com/lephirada/toktickit/pull/52]` | `[Approved]`  | `[Merged]`   |
| **Issue 21** | `feature/21-ticket-resolution-gate`     | Server-Enforced Resolution Gate & State Machine | `[https://github.com/lephirada/toktickit/pull/53]` | `[Approved]`  | `[Merged]`   |
| **Issue 22** | `feature/22-dashboard-backend-apis`     | Operational Dashboard & Analytics API           | `[https://github.com/lephirada/toktickit/pull/55]` | `[Approved]`  | `[Merged]`   |
| **Issue 23** | `feature/23-actions-taken-ui`           | Actions Taken UI & Concurrency Conflict Dialog  | `[https://github.com/lephirada/toktickit/pull/56]` | `[Approved]`  | `[Merged]`   |
| **Issue 24** | `feature/24-role-dashboards-ui`         | Operational Dashboard UI & Visualizations       | `[https://github.com/lephirada/toktickit/pull/57]` | `[In Review]` | `[Pending]`  |
| **Issue 25** | `feature/25-e2e-regression-hardening`   | Multi-Persona E2E Verification & Sprint Release | `[PR Placeholder]`                                 | `[Planned]`   | `[Planned]`  |
| **Issue 26** | `feature/26-final-submission-artifacts` | Final Release Hardening & Submission Artifacts  | `[PR Placeholder]`                                 | `[Planned]`   | `[Planned]`  |

---

## 2. Issue 18: Engineering Contract & Specification Evidence

### 2.1 Specification Deliverables Audit

| Specification File                                 | Purpose & Contents                                                                                                                 | Verification Status |
| :------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :-----------------: |
| [`docs/lab-04/specification.md`](specification.md) | Sprint Goal, FR-01..12, BR-01..10, Roles Matrix, Resolution Gate architecture, Relational Model, Product DoD                       |    **Verified**     |
| [`docs/lab-04/api-spec.md`](api-spec.md)           | REST API endpoints, envelopes, `expectedUpdatedAt` concurrency token, server identity derivation, boundary matrix, error codes     |    **Verified**     |
| [`docs/lab-04/ui-spec.md`](ui-spec.md)             | Zen Green design tokens, role-based control visibility (requester read-only), 409 conflict dialog, dashboard layouts               |    **Verified**     |
| [`docs/lab-04/tests.md`](tests.md)                 | Multi-tiered test pyramid, AC-to-Test mapping, FR/BR traceability matrices, 7 Resolution Gate boundary test cases, regression plan |    **Verified**     |
| [`docs/lab-04/ai-use.md`](ai-use.md)               | AI assistance disclosure, prompt log for Issue 18, and student reflection placeholder                                              |    **Verified**     |

### 2.2 Git Commit Timestamp Proof

To fulfill the Spec-Driven Development (Spec DD) grading criterion proving specifications existed prior to code implementation:

- **Branch:** `feature/18-lab4-spec-docs`
- **Initial Documentation Commit:** `cfa9bf0af5491173e91323f09461111beb21ab99`
- **Commit Timestamp:** `Thu Oct 8 17:51:09 2026 +0700`
- **Files Established:** All core specifications in `docs/lab-04/` committed before any schema migrations or application code changes.

---

## 3. Automated Test Execution Evidence (Issues 19–24 Verified; Issue 25 Planned)

### 3.1 Database Migration & Seed Verification (Issue 19)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/migration-verification.test.ts`
- **Verification Status:** **Verified (8/8 passing, 295/295 full suite passing)**
- **Prisma Migration Status:** `npx --prefix server prisma migrate status` reports 6 migrations applied (`20261011000000_add_action_taken`), database schema up to date.
- **Model & Schema Constraints:** `ActionTaken` table verified via `information_schema` with mandatory fields `id`, `ticketId`, `performedById`, `actionDateTime`, `description` (VarChar 2000), `result` (VarChar 2000), `followUpRequired` (Boolean), nullable `followUpNote` (VarChar 1000) / `attachmentNotes` (VarChar 1000), `timeSpentMinutes`, `actionType` (VarChar 50), `performedAt`, `createdAt`, `updatedAt`.
- **Referential Integrity & User Protection:** `performedById` enforces `ON DELETE RESTRICT` (preserving user deactivation rule BR-15); `ticketId` enforces `ON DELETE CASCADE`.
- **Seed Script Idempotency & Error Handling:** Verified by running `npm --prefix server run db:seed` twice consecutively from project root with exit code 0 and zero record duplication (exactly 19 actions). If migrations have not been applied, the seed script explicitly raises an error and terminates with exit code 1 instead of silently succeeding. Required IT Staff performers are strictly validated.
- **Seed Coverage:** Realistic ticket actions seeded covering 0 actions (unassigned & new tickets), 1 action, and multiple actions across assigned and unassigned tickets.
- **Isolated Connection & Data Preservation Verification:** To prevent connection-pool drift and avoid risking accidental DDL execution against the `public` schema, the migration verification test wraps schema creation, `SET LOCAL search_path`, and migration execution inside a single dedicated Prisma interactive transaction (`prisma.$transaction(async (tx) => ...)`). Pre-existing records (Users, Tickets, Comments, Attachments) are populated independently without invoking `seedDatabase()`, proving 100% data preservation and equality before and after migration.

#### Terminal Execution Logs (Executed from Project Root)

**Log 1: Prisma Migration Status**

```text
$ npx --prefix server prisma migrate status
Environment variables loaded from .env
Prisma schema loaded from server/prisma/schema.prisma
Datasource "db": PostgreSQL database "toktickit", schema "public" at "localhost:5432"

6 migrations found in prisma/migrations

Database schema is up to date!
```

**Log 2: Seed Script Idempotency Verification (Consecutive Runs)**

```text
$ npm --prefix server run db:seed (Run 1)
> toktickit-server@1.0.0 db:seed
> tsx prisma/seed.ts

Successfully seeded categories: Account and Access, Hardware, Software, Network
Successfully seeded related systems: Corporate Laptop, Campus Wi-Fi, VPN, Email, LEB2 App, Grade Submission App
Successfully seeded 10 users: Sarah Connor, John Doe, Jennifer Anderson, Michael Brown, Kyle Reese, David Lee, Alex Morgan, Chris Taylor, Kevin Patel, System Admin
Successfully seeded 16 realistic tickets for Jennifer Anderson.
Successfully seeded 19 realistic actions taken across assigned and unassigned tickets.
[Process Exit Code: 0]

$ npm --prefix server run db:seed (Run 2 - Idempotency Assertion)
> toktickit-server@1.0.0 db:seed
> tsx prisma/seed.ts

Successfully seeded categories: Account and Access, Hardware, Software, Network
Successfully seeded related systems: Corporate Laptop, Campus Wi-Fi, VPN, Email, LEB2 App, Grade Submission App
Successfully seeded 10 users: Sarah Connor, John Doe, Jennifer Anderson, Michael Brown, Kyle Reese, David Lee, Alex Morgan, Chris Taylor, Kevin Patel, System Admin
Successfully seeded 16 realistic tickets for Jennifer Anderson.
Successfully seeded 19 realistic actions taken across assigned and unassigned tickets.
[Process Exit Code: 0 - Clean idempotent execution with zero duplicate records]
```

**Log 3: Test Suite Execution (tests/lab-04/migration-verification.test.ts)**

```text
$ npm --prefix server run test -- tests/lab-04/migration-verification.test.ts
> toktickit-server@1.0.0 test
> vitest run tests/lab-04/migration-verification.test.ts

 ✓ tests/lab-04/migration-verification.test.ts (8)
   ✓ Issue 19 — Database Schema Evolution & Seed Verification (8)
     ✓ Part 1: Non-Destructive Migration & Pre-existing Data Integrity (5)
       ✓ verifies the physical migration SQL file exists, only extends schema, and contains zero destructive commands
       ✓ verifies ActionTaken column types, nullability, and VarChar character_maximum_length via information_schema
       ✓ verifies foreign key constraints enforce onDelete rules (RESTRICT on user, CASCADE on ticket)
       ✓ verifies all pre-existing tables and columns from Labs 1–3 remain completely intact
       ✓ executes migration on a populated Lab 3 baseline schema and proves pre-existing data remains 100% unaltered
     ✓ Part 2: Seed Script Execution, Data Coverage & Error Handling (3)
       ✓ verifies seed data contains realistic tickets covering 0 actions, 1 action, and multiple actions across assigned and unassigned tickets
       ✓ verifies seed script idempotency across multiple consecutive executions
       ✓ verifies seed script checks ActionTaken table existence and does not swallow schema absence

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  15:05:21
   Duration  705ms
```

**Log 4: Full Server Test Suite Execution (Regression Verification)**

```text
$ npm --prefix server run test
> toktickit-server@1.0.0 test
> vitest run

 Test Files  18 passed (18)
      Tests  295 passed (295)
   Start at  00:45:11
   Duration  12.82s
```

### 3.2 Actions Taken & Concurrency Control API Tests (Issue 20)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/actions-taken.api.test.ts`
- **Verification Status:** **Verified (37/37 passing, 295/295 full server suite passing)**
- **Endpoints Implemented & Hardened:**
  - `GET /api/tickets/:ticketId/actions`: Chronological listing (`actionDateTime ASC`), requester ownership scoping, anti-leakage 403 on foreign ticket, IT Staff queue access across tickets.
  - `POST /api/tickets/:ticketId/actions`: IT Staff / Admin action recording, server-derived `performedById = req.user.id`, terminal ticket guard (`CLOSED`, `CANCELLED` $\to$ 422), mandatory `result` field validation (1–2,000 characters, rejecting missing or empty submissions with 422 `VALIDATION_ERROR`), strict `followUpRequired` boolean validation (rejecting non-booleans with 422), strict `followUpNote` string/null validation (rejecting non-string types with 422), mandatory `followUpNote` when `followUpRequired=true`, mandatory `timeSpentMinutes` integer validation (1–1440 min, rejecting omitted, null, or invalid values with 422 `VALIDATION_ERROR`), strict future timestamp rejection (`performedAt <= now()` without any 60-second tolerance $\to$ 422 `VALIDATION_ERROR`), `ACTION_TAKEN_ADDED` audit activity logging.
  - `PUT /api/tickets/:ticketId/actions/:actionId`: True atomic conditional database update (`tx.actionTaken.updateMany({ where: { id: actionId, ticketId, updatedAt: expectedDate } })`) checking `id` and `expectedUpdatedAt` in a single database query to prevent TOCTOU race conditions. Concurrency token strictly advances on every successful update (`nextUpdatedAt = new Date(Math.max(Date.now(), expectedDate.getTime() + 1))`), guaranteeing token change even if executed within the same millisecond and preventing token replay. Strict field validation on updates (validating `followUpRequired` as boolean, `followUpNote <= 1000 chars`, validating `timeSpentMinutes` 1–1440 min while rejecting null, allowing omission for partial update, and strictly rejecting future timestamps $\to$ 422). If no row matches, returns 409 `STALE_ACTION_CONFLICT` with current record state and fresh `currentUpdatedAt`.
  - **IT Staff Access Scope (Aligned with Lab 3):** IT Staff can collaborate and record actions on any workable ticket in the queue (unassigned or assigned to peer staff). Inactive staff accounts (`isActive: false`) reject with 401 `ACCOUNT_DEACTIVATED`, and accounts requiring password reset (`mustChangePassword: true`) reject with 403 `PASSWORD_CHANGE_REQUIRED`.

#### Terminal Execution Logs (Executed from Project Root)

```text
$ npm --prefix server run test -- tests/lab-04/actions-taken.api.test.ts
> toktickit-server@1.0.0 test
> vitest run tests/lab-04/actions-taken.api.test.ts

 ✓ tests/lab-04/actions-taken.api.test.ts (37)
   ✓ Issue 20 — Actions Taken REST API Suite (actions-taken.api.test.ts) (37)
     ✓ ACT-API-01: Valid Action Creation & Server-Derived Performer Identity (2)
       ✓ creates an action successfully when called by IT Staff and derives performedById from session
       ✓ allows Administrator to create an action taken with session-derived identity
     ✓ ACT-API-02: Rejection of Requester Creation Attempts (2)
       ✓ rejects action creation by Requester with 403 Forbidden even on their own ticket
       ✓ rejects unauthenticated caller with 401 Unauthorized
     ✓ ACT-API-03: Field Validations & Follow-up Requirement (15)
       ✓ rejects with 422 VALIDATION_ERROR when result is omitted or empty
       ✓ rejects with 422 VALIDATION_ERROR when followUpRequired=true and followUpNote is missing
       ✓ rejects with 422 VALIDATION_ERROR when followUpRequired=true and followUpNote is empty whitespace
       ✓ accepts valid followUpNote when followUpRequired=true
       ✓ rejects with 422 when description is empty or missing
       ✓ rejects with 422 when timeSpentMinutes is non-positive or exceeds 1440
       ✓ rejects with 422 when performedAt is set in the future (even slightly by a few seconds)
       ✓ rejects PUT with 422 when followUpNote exceeds 1000 characters even if followUpRequired is false
       ✓ rejects PUT with 422 when performedAt is set in the near future
       ✓ rejects POST with 422 VALIDATION_ERROR when followUpRequired is non-boolean ('invalid', 123, null) and creates no record
       ✓ rejects PUT with 422 VALIDATION_ERROR when followUpRequired is non-boolean ('invalid', 123, null) and does not modify record or updatedAt
       ✓ rejects POST with 422 VALIDATION_ERROR when followUpNote is non-string (number, object) even if followUpRequired is false and creates no record
       ✓ rejects POST with 422 VALIDATION_ERROR when timeSpentMinutes is missing or null and creates no record
       ✓ rejects PUT with 422 VALIDATION_ERROR when timeSpentMinutes is null or invalid and preserves database state
       ✓ allows PUT to omit timeSpentMinutes and preserves original timeSpentMinutes
     ✓ ACT-API-04: Requester Query Boundaries & Role Access Scoping (8)
       ✓ allows Requester to view actions for their owned ticket (200 OK)
       ✓ rejects Requester with 403 Forbidden when attempting to view actions for another user's ticket
       ✓ returns 404 Not Found for non-existent ticket ID
       ✓ allows IT Staff to view actions for any ticket in the queue
       ✓ returns actions sorted chronologically by actionDateTime ASC
       ✓ rejects inactive IT Staff with 401 Unauthorized across actions endpoints (Lab 3 boundary)
       ✓ rejects IT Staff with mustChangePassword=true with 403 PASSWORD_CHANGE_REQUIRED (Lab 3 boundary)
       ✓ allows IT Staff to collaborate across ticket boundaries (unassigned or assigned to peer staff)
     ✓ ACT-API-05: Optimistic Concurrency Control (expectedUpdatedAt) (7)
       ✓ returns 400 Bad Request when expectedUpdatedAt is missing from PUT payload
       ✓ returns 409 Conflict with STALE_ACTION_CONFLICT when expectedUpdatedAt does not match server updatedAt
       ✓ successfully updates action and refreshes updatedAt when expectedUpdatedAt matches server timestamp
       ✓ proves ATOMIC concurrency: concurrent edits with same expectedUpdatedAt allow exactly one to succeed with 200 and one to fail with 409 STALE_ACTION_CONFLICT
       ✓ guarantees concurrency token advances strictly on every update, preventing replay of identical expectedUpdatedAt token
       ✓ deterministically guarantees token advancement and replay rejection when system clock equals expectedUpdatedAt
       ✓ rejects PUT by Requester with 403 Forbidden
     ✓ ACT-API-06: Terminal Status Check (CLOSED / CANCELLED Protection) (3)
       ✓ rejects action creation on CLOSED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE
       ✓ rejects action creation on CANCELLED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE
       ✓ rejects action update on CLOSED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE

 Test Files  1 passed (1)
      Tests  37 passed (37)
   Start at  01:00:31
   Duration  901ms
```

#### JSON Response Payloads for Error Envelopes

**1. 403 Forbidden Response Envelope (`FORBIDDEN_ROLE`):**

```json
{
  "error": {
    "code": "FORBIDDEN_ROLE",
    "message": "Forbidden: Requesters cannot record actions taken.",
    "correlationId": "req_8a3f910b2c1d",
    "details": {}
  }
}
```

**2. 403 Forbidden Response Envelope (`FORBIDDEN_TICKET_ACCESS`):**

```json
{
  "error": {
    "code": "FORBIDDEN_TICKET_ACCESS",
    "message": "Forbidden: You do not have permission to access actions for this ticket.",
    "correlationId": "req_7c8d9e0f1a2b",
    "details": {}
  }
}
```

**3. 422 Validation Error Response Envelope (`VALIDATION_ERROR`):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Follow-up note is required when follow-up is requested.",
    "correlationId": "req_1d2e3f4a5b6c",
    "details": {}
  }
}
```

**4. 422 Terminal Status Guard Envelope (`TICKET_NOT_IN_WORKABLE_STATE`):**

```json
{
  "error": {
    "code": "TICKET_NOT_IN_WORKABLE_STATE",
    "message": "Cannot record actions taken on tickets in terminal status (CLOSED).",
    "correlationId": "req_5e6f7a8b9c0d",
    "details": {}
  }
}
```

**5. 400 Bad Request Missing Concurrency Token (`MISSING_CONCURRENCY_TOKEN`):**

```json
{
  "error": {
    "code": "MISSING_CONCURRENCY_TOKEN",
    "message": "The 'expectedUpdatedAt' concurrency token is required to update an action record.",
    "correlationId": "req_9f8e7d6c5b4a",
    "details": {
      "actionId": 12,
      "requiredField": "expectedUpdatedAt"
    }
  }
}
```

**6. 409 Conflict Stale Action Conflict (`STALE_ACTION_CONFLICT`):**

```json
{
  "error": {
    "code": "STALE_ACTION_CONFLICT",
    "message": "The action record has been modified by another user since you loaded it. Please reload the latest version before applying changes.",
    "correlationId": "req_4b5c6d7e8f9a",
    "details": {
      "actionId": 12,
      "providedUpdatedAt": "2020-01-01T00:00:00.000Z",
      "currentUpdatedAt": "2026-10-12T13:41:12.890Z",
      "currentRecord": {
        "id": 12,
        "description": "Initial action entry for concurrency verification.",
        "actionType": "INVESTIGATION",
        "result": "Initial diagnostic complete.",
        "timeSpentMinutes": 30,
        "performedAt": "2026-10-12T13:41:12.890Z",
        "updatedAt": "2026-10-12T13:41:12.890Z",
        "performedBy": {
          "id": 4,
          "fullName": "IT Staff Morgan",
          "email": "actions_staff_1760276472000@toktickit.com",
          "role": "IT_STAFF"
        }
      }
    }
  }
}
```

**Log 2: Full Server Test Suite Execution (295/295 Passing — Zero Regressions)**

```text
$ npm --prefix server run test
> toktickit-server@1.0.0 test
> vitest run

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)
 ✓ tests/lab-02/attachments.api.test.ts (7)
 ✓ tests/lab-02/create-ticket.api.test.ts (13)
 ✓ tests/lab-02/my-tickets.api.test.ts (17)
 ✓ tests/lab-02/requesters.test.ts (5)
 ✓ tests/lab-02/ticket-detail.api.test.ts (20)
 ✓ tests/lab-04/actions-taken.api.test.ts (37)
 ✓ tests/lab-04/migration-verification.test.ts (8)
 ✓ tests/lab-03/auth.api.test.ts (20) 578ms
 ✓ tests/lab-03/authorization.api.test.ts (28)
 ✓ tests/lab-03/comments-notes.api.test.ts (16)
 ✓ tests/lab-03/jwt-password.test.ts (9)
 ✓ tests/lab-03/migration-verification.test.ts (3) 1848ms
 ✓ tests/lab-03/migration.test.ts (3) 1815ms
 ✓ tests/lab-03/staff-queue.api.test.ts (23)
 ✓ tests/lab-03/staff-ticket-detail.api.test.ts (54) 455ms
 ✓ tests/lab-03/users-admin.api.test.ts (30) 1383ms

 Test Files  18 passed (18)
      Tests  295 passed (295)
   Start at  00:45:11
   Duration  12.82s
```

### 3.3 Resolution Gate Boundary Suite (Issue 21)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/ticket-workflow.api.test.ts`
- **Verification Status:** **Verified (24/24 passing, 319/319 full server suite passing)**
- **Endpoints Implemented & Hardened:**
  - `PATCH /api/tickets/:id/status` (and `:ticketId`): Role-authorized endpoint (`IT_STAFF`, `ADMINISTRATOR`) requiring active account (`isActive: true`) and changed password (`mustChangePassword: false`). Validates state machine via pure TypeScript helper (`shared/ticketStateMachine.ts`).
  - **Resolution Gate:** Transitioning to `RESOLVED` enforces `actionsCount >= 1` in database. If zero actions exist, rejects with HTTP 422 `ACTION_TAKEN_REQUIRED_FOR_RESOLUTION`. Validates `resolutionSummary` length (10–1,000 chars).
  - **Atomic Compare-And-Swap (CAS):** Conditional update (`where: { id: ticket.id, status: ticket.status }`) within Prisma transaction. Rejects concurrent status shifts with HTTP 409 `TICKET_MODIFIED_CONCURRENTLY`.
  - **Activity Auditing:** Creates `TicketActivity` record (`STATUS_CHANGED`) atomically with ticket update.
  - **BR-05 Requester Advisory Preservation:** `POST /api/tickets/:id/confirm-resolved` strictly preserves `ticket.status` unaltered, setting only `resolutionIndicated: true`.
  - **Lab 3 Endpoint Preservation:** Legacy `PATCH /api/staff/tickets/:id/status` preserved unchanged, allowing resolutions without actions taken (preserving ST-06 test contract).

#### Terminal Execution Logs (Executed from Project Root)

**Log 1: Resolution Gate & Ticket Workflow Test Suite**

```text
$ npm --prefix server run test -- tests/lab-04/ticket-workflow.api.test.ts
> toktickit-server@1.0.0 test
> vitest run tests/lab-04/ticket-workflow.api.test.ts

 ✓ tests/lab-04/ticket-workflow.api.test.ts (24) 491ms
   ✓ Issue 21 — Ticket Workflow & Resolution Gate API Suite (ticket-workflow.api.test.ts) (24) 491ms
     ✓ Authentication and Authorization (PATCH /api/tickets/:id/status) (5)
       ✓ returns 401 UNAUTHORIZED when no session cookie is provided
       ✓ returns 401 UNAUTHORIZED when session cookie is tampered or invalid
       ✓ returns 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true
       ✓ returns 403 FORBIDDEN when user has role REQUESTER
       ✓ allows ADMINISTRATOR to transition status
     ✓ Validation & State Machine Errors (4)
       ✓ returns 404 TICKET_NOT_FOUND when ID is invalid or non-numeric
       ✓ returns 404 TICKET_NOT_FOUND when ticket does not exist
       ✓ returns 422 VALIDATION_ERROR when status is omitted from body
       ✓ returns 422 INVALID_STATUS_TRANSITION when transition is illegal in state machine (e.g. NEW -> RESOLVED)
     ✓ Resolution Gate Boundary Tests (AC-21-01 to AC-21-07) (7)
       ✓ Boundary 1 (AC-21-01): returns 422 VALIDATION_ERROR when resolutionSummary is missing or null
       ✓ Boundary 2 (AC-21-02): returns 422 VALIDATION_ERROR when resolutionSummary has fewer than 10 characters
       ✓ Boundary 3 (AC-21-03): succeeds with 200 OK when resolutionSummary is exactly 10 characters and actionsCount >= 1
       ✓ Boundary 4 (AC-21-04): succeeds with 200 OK when resolutionSummary is exactly 1,000 characters and actionsCount >= 1
       ✓ Boundary 5 (AC-21-05): returns 422 VALIDATION_ERROR when resolutionSummary exceeds 1,000 characters (1,001 chars)
       ✓ Boundary 6 (AC-21-06): returns 422 ACTION_TAKEN_REQUIRED_FOR_RESOLUTION when actionsCount === 0
       ✓ Boundary 7 (AC-21-07): succeeds with 200 OK when actionsCount >= 1, updating status to RESOLVED and creating TicketActivity audit
     ✓ Other Status Transitions Reason Validation (2)
       ✓ requires cancellationReason (10-500 chars) when transitioning to CANCELLED
       ✓ requires reopenReason (10-500 chars) when transitioning from RESOLVED to REOPENED
     ✓ BR-05 Requester Advisory Indication (AC-21-09) (3)
       ✓ sets resolutionIndicated = true and leaves ticket.status unaltered (IN_PROGRESS remains IN_PROGRESS)
       ✓ leaves ticket.status unaltered when called on WAITING_FOR_REQUESTER ticket
       ✓ proves requester advisory indication cannot bypass resolution gate (actionsCount === 0 still rejected)
     ✓ Concurrency & Conflict Handling (TICKET_MODIFIED_CONCURRENTLY) (2)
       ✓ proves deterministic CAS conflict rejection: returns 409 TICKET_MODIFIED_CONCURRENTLY when ticket status is modified concurrently during the transaction (updateMany count === 0)
       ✓ proves concurrent request integration: mutual exclusion allows exactly one winner and safely rejects competing attempt
     ✓ Lab 3 Endpoint Preservation (PATCH /api/staff/tickets/:id/status) (1)
       ✓ preserves Lab 3 behavior: allows resolving without ActionTaken on the legacy endpoint

 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  19:35:17
   Duration  1.25s (transform 165ms, setup 0ms, collect 424ms, tests 491ms, environment 0ms, prepare 69ms)
```

**Log 2: Full Server Test Suite Execution (Regression Verification)**

```text
$ npm --prefix server test
> toktickit-server@1.0.0 test
> vitest run

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)
 ✓ tests/lab-02/attachments.api.test.ts (7)
 ✓ tests/lab-02/create-ticket.api.test.ts (13)
 ✓ tests/lab-02/my-tickets.api.test.ts (17)
 ✓ tests/lab-02/requesters.test.ts (5)
 ✓ tests/lab-02/ticket-detail.api.test.ts (20)
 ✓ tests/lab-04/actions-taken.api.test.ts (37)
 ✓ tests/lab-04/migration-verification.test.ts (8)
 ✓ tests/lab-04/ticket-workflow.api.test.ts (24)
 ✓ tests/lab-03/auth.api.test.ts (20)
 ✓ tests/lab-03/authorization.api.test.ts (28)
 ✓ tests/lab-03/comments-notes.api.test.ts (16)
 ✓ tests/lab-03/jwt-password.test.ts (9)
 ✓ tests/lab-03/migration-verification.test.ts (3)
 ✓ tests/lab-03/migration.test.ts (3)
 ✓ tests/lab-03/staff-queue.api.test.ts (23)
 ✓ tests/lab-03/staff-ticket-detail.api.test.ts (54)
 ✓ tests/lab-03/users-admin.api.test.ts (30)

 Test Files  19 passed (19)
      Tests  319 passed (319)
   Start at  19:35:27
   Duration  20.75s
```

#### JSON Response Payloads for Resolution Gate & Concurrency Envelopes

**1. 422 Unprocessable Entity (`ACTION_TAKEN_REQUIRED_FOR_RESOLUTION`):**

```json
{
  "error": {
    "code": "ACTION_TAKEN_REQUIRED_FOR_RESOLUTION",
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

**2. 409 Conflict (`TICKET_MODIFIED_CONCURRENTLY`):**

```json
{
  "error": {
    "code": "TICKET_MODIFIED_CONCURRENTLY",
    "message": "Ticket status was modified concurrently by another request. Please reload the latest ticket state."
  }
}
```

### 3.4 Operational Dashboard API Tests (Issue 22)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/dashboard.api.test.ts`
- **Verification Status:** **Verified (22/22 passing, 91/91 Lab 4 suite passing)**
- **Endpoints Implemented & Hardened:**
  - `GET /api/staff/dashboard`: Role-authorized operational endpoint (`IT_STAFF`, `ADMINISTRATOR`) requiring active account (`isActive: true`) and changed password (`mustChangePassword: false`). Rejects Requesters with 403 `FORBIDDEN_ROLE` and unauthenticated requests with 401 `UNAUTHORIZED`. Verifies session security with official `toktickit_session` cookie name and cryptographic signature tampering rejection.
  - **Metrics Computation (AC-22-01, AC-22-02):** Aggregates `totalOpen` (`NEW`, `OPEN`), `inProgress` (`IN_PROGRESS`), `waitingForRequester` (`WAITING_FOR_REQUESTER`), `recentlyResolved` (rolling 7-day window on `status = 'RESOLVED'`), `unassignedCount` (`ownerId IS NULL` in active workable states), and `totalTimeSpentMinutes`.
  - **Deterministic Rolling-Window Boundary Enforcement (AC-22-02, FR-08):** Verified via system clock pinning (`vi.useFakeTimers`) that a ticket resolved exactly at `recentlyResolvedWindowStart` ($t = \text{now} - 7\text{d}$) is strictly **included**, while a ticket resolved just 1 second outside ($t = \text{now} - 7\text{d} - 1\text{s}$) is strictly **excluded**. Verified tickets with future timestamps satisfy contract lower-bound ($t \ge \text{windowStart}$) without calculation crash.
  - **Time Aggregation Rules & Zero/Null Fallback (AC-22-03):** Strictly aggregates `ActionTaken.timeSpentMinutes` for active workable tickets (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`) and recently resolved tickets ($\le 7$ days). Strictly excludes `CLOSED`, `CANCELLED`, and stale `RESOLVED` ($> 7$ days). Safely handles zero-duration actions (tested against real database records) and mocked null/undefined values via defensive fallback `action.timeSpentMinutes ?? 0` without producing `NaN`.
  - **Distribution Breakdowns (AC-22-04):**
    - `categoryBreakdown`: Non-terminal tickets (`status NOT IN ('CLOSED', 'CANCELLED')`) and action durations grouped by `categoryId ASC`, ensuring all categories from `Category` table are present with zero counts for empty categories.
    - `priorityBreakdown`: Non-terminal tickets grouped by effective priority (`COALESCE(itPriority, requestedPriority)`).
  - **Mathematical Invariant & Empty-Data Scenarios (AC-22-05):** Formally asserted and verified $\sum \text{categoryBreakdown}[i].\text{totalTimeSpentMinutes} \equiv \text{metrics.totalTimeSpentMinutes}$. Verified that tickets with multiple discrete actions across different categories aggregate without Cartesian duplication. Verified empty-data handling where all metrics evaluate to 0, total time spent evaluates to 0, all 4 priority keys are present with value 0, and the mathematical invariant ($0 \equiv 0$) holds. Returns valid ISO timestamps for `calculationTimestamp` and `recentlyResolvedWindowStart`, with `recentlyResolvedWindowDays: 7`.

#### Terminal Execution Logs (Executed from Project Root)

**Log 1: Operational Dashboard Test Suite**

```text
$ npm --prefix server run test -- tests/lab-04/dashboard.api.test.ts
> toktickit-server@1.0.0 test
> vitest run tests/lab-04/dashboard.api.test.ts

 ✓ tests/lab-04/dashboard.api.test.ts (22) 374ms
   ✓ Issue 22 — Operational Dashboard API Suite (dashboard.api.test.ts) (22) 374ms
     ✓ AC-22-06: Authorization and Authentication (7)
       ✓ returns 401 UNAUTHORIZED when no session cookie is provided
       ✓ returns 401 UNAUTHORIZED when session cookie is invalid or tampered
       ✓ returns 401 UNAUTHORIZED when user is inactive (isActive: false)
       ✓ returns 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true
       ✓ returns 403 FORBIDDEN when user has role REQUESTER
       ✓ allows IT_STAFF to access dashboard with 200 OK and expected structure
       ✓ allows ADMINISTRATOR to access dashboard with 200 OK
     ✓ AC-22-01: Core Queue State Aggregation (4)
       ✓ accurately reflects additions to totalOpen (NEW and OPEN)
       ✓ accurately tracks inProgress ticket count
       ✓ accurately tracks waitingForRequester ticket count
       ✓ accurately tracks unassignedCount for workable tickets and excludes assigned or terminal tickets
     ✓ AC-22-02 & FR-08: Rolling 7-Day Resolution Window (3)
       ✓ includes tickets resolved within rolling 7 days (t <= 7d) and excludes stale resolutions (t > 7d)
       ✓ deterministically enforces exact boundary at recentlyResolvedWindowStart and excludes tickets just outside the 7-day window
       ✓ handles tickets with future timestamps according to the rolling window lower-bound contract without calculation crash
     ✓ AC-22-03: Total Time Spent Minutes Aggregation Rules (2)
       ✓ aggregates actions on active workable tickets and recently resolved tickets, excluding closed/cancelled/stale
       ✓ safely handles zero-duration actions and null/undefined values via fallback without crashing or producing NaN
     ✓ AC-22-04: Category Breakdown & Priority Breakdown (2)
       ✓ groups non-terminal tickets by category and includes all categories in Category table
       ✓ groups non-terminal tickets by effective priority using COALESCE(itPriority, requestedPriority)
     ✓ AC-22-05: Mathematical Invariant and Metadata Assertions (4)
       ✓ guarantees mathematical invariant: sum of categoryBreakdown[].totalTimeSpentMinutes === metrics.totalTimeSpentMinutes
       ✓ guarantees duration invariant with multiple actions per ticket across multiple categories without Cartesian duplication
       ✓ returns correct metadata structure and rolling 7-day window boundary timestamps
       ✓ handles empty-data state with zero-valued metrics, zero action duration, and all priority breakdown keys at zero

 Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  22:00:19
   Duration  887ms
```

#### JSON Response Payload for Dashboard Overview (200 OK)

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
      "calculationTimestamp": "2026-10-14T14:00:00.000Z",
      "recentlyResolvedWindowDays": 7,
      "recentlyResolvedWindowStart": "2026-10-07T14:00:00.000Z"
    }
  }
}
```

### 3.5 Actions Taken UI Integration & Concurrency Conflict Dialog (Issue 23)

- **Target Commands:**
  - `npm --prefix client test tests/lab-04/` (Issue 23 component tests)
  - `npm --prefix client test` (Full client regression suite)
  - `npm --prefix client run build` (Production client build)
  - `npm --prefix server run test` (Full server regression suite)
  - `npx playwright test e2e/lab-04/responsive-actions-screenshots.spec.ts` (Responsive overflow & screenshot verification)
- **Verification Status:** **Verified (30/30 Lab 4 client tests passing, 141/141 full client suite passing, 341/341 full server suite passing, 2/2 e2e browser tests passing, 0 build errors)**
- **Components Implemented & Hardened:**
  - `ActionsTakenSection.tsx`: Timeline list container displaying action history with formatted badges (`actionType`), formatted timestamps, duration (`timeSpentMinutes`), description, result, follow-up notes, and performer metadata. Renders friendly empty state when no actions have been logged yet. Implements error alert with retry button on API failure.
  - **Role-Based Control Omission (AC-23-02, BR-02, BR-03):** When viewed by a Requester (`role === "REQUESTER"`), the work history timeline is fully accessible read-only, but mutation controls (`+ Log Action Taken` button, individual `Edit` buttons, and modal dialogs) are **completely omitted from the DOM** (not hidden via CSS display:none), preventing DOM inspection bypass or unauthorized trigger. When viewed on terminal tickets (`CLOSED`, `CANCELLED`), mutation controls are disabled and omitted.
  - `LogActionModal.tsx` (AC-23-03): Accessible modal dialog for staff/admin with default `INVESTIGATION` action type, quick-select preset duration buttons (15m, 30m, 45m, 60m), real-time character counters, dynamic conditional rendering for `followUpNote` only when `followUpRequired` is checked, client-side validation for minimum lengths (`description` >= 5, `result` >= 3, `followUpNote` >= 3), and strict rejection of future `performedAt` timestamps. Wires the authenticated user's actual name (`staffName={currentUser.fullName}`) into the "Performed By" field with fallback protection.
  - `EditActionModal.tsx` (AC-23-04, AC-23-05): Edit modal pre-filled with existing action data, sending `expectedUpdatedAt` concurrency token on update. Gracefully intercepts HTTP 409 `STALE_ACTION_CONFLICT` without crashing or losing user input, delegating directly to `ConcurrencyConflictDialog`.
  - `ConcurrencyConflictDialog.tsx` (AC-23-06): Accessible side-by-side comparison modal displaying server's latest version vs. user's unsaved local draft. Provides safe "Copy My Changes" (with safe Clipboard API error handling that avoids false success confirmations and renders a selectable fallback textarea if clipboard write is blocked), "Cancel", and "Reload Latest Version". When the server version is missing from conflict details, it fetches the latest record from the server, updates `expectedUpdatedAt`, and preserves the local draft with an inline alert if the reload fails.
  - **Responsive Design & DOM Safety (AC-23-07):** Timeline and conflict views implement responsive wrapping (`break-words`, `overflow-hidden`, flex-wrap) to support mobile (375px), tablet (768px), and desktop (1280px) viewports. Verified zero horizontal overflow in real Chromium browser via Playwright.

#### Terminal Execution Logs (Executed from Project Root)

**Log 1: Issue 23 Client Component Tests (4 Test Files, 30/30 Passing)**

```text
$ npm --prefix client test tests/lab-04/
> toktickit-client@1.0.0 test
> vitest run tests/lab-04/

 ✓ tests/lab-04/EditActionModal.test.tsx (5) 356ms
 ✓ tests/lab-04/ActionsTakenSection.test.tsx (7) 362ms
 ✓ tests/lab-04/ConcurrencyConflictDialog.test.tsx (8) 430ms
 ✓ tests/lab-04/LogActionModal.test.tsx (10) 411ms

 Test Files  4 passed (4)
      Tests  30 passed (30)
   Start at  16:55:36
   Duration  2.63s (transform 524ms, setup 1.64s, collect 845ms, tests 1.56s, environment 4.61s, prepare 399ms)
```

**Log 2: Full Client Regression Test Suite (16 Test Files, 141/141 Passing)**

```text
$ npm --prefix client test
> toktickit-client@1.0.0 test
> vitest run

 ✓ tests/lab-01/App.test.tsx (5)
 ✓ tests/lab-02/App.test.tsx (16) 1720ms
 ✓ tests/lab-02/AttachmentSection.test.tsx (9) 3320ms
 ✓ tests/lab-02/CreateTicket.test.tsx (7) 2823ms
 ✓ tests/lab-02/MyTickets.test.tsx (13) 2904ms
 ✓ tests/lab-02/RequesterHeader.test.tsx (6) 319ms
 ✓ tests/lab-02/RequesterTicketDetail.test.tsx (7) 1352ms
 ✓ tests/lab-03/ChangePassword.test.tsx (4) 368ms
 ✓ tests/lab-03/Login.test.tsx (8) 1414ms
 ✓ tests/lab-03/StaffTicketDetail.test.tsx (10) 1899ms
 ✓ tests/lab-03/StaffTicketQueue.test.tsx (19) 2569ms
 ✓ tests/lab-03/UserManagement.test.tsx (7) 1250ms
 ✓ tests/lab-04/ActionsTakenSection.test.tsx (7) 1811ms
 ✓ tests/lab-04/ConcurrencyConflictDialog.test.tsx (8) 772ms
 ✓ tests/lab-04/EditActionModal.test.tsx (5)
 ✓ tests/lab-04/LogActionModal.test.tsx (10) 515ms

 Test Files  16 passed (16)
      Tests  141 passed (141)
   Start at  16:55:44
   Duration  9.39s
```

**Log 3: Client Production Build Verification (Zero Type & Bundle Errors)**

```text
$ npm --prefix client run build
> toktickit-client@1.0.0 build
> tsc && vite build

vite v6.4.3 building for production...
✓ 70 modules transformed.
dist/index.html                   0.39 kB │ gzip:  0.27 kB
dist/assets/index-BpJaf12f.css  248.22 kB │ gzip: 34.84 kB
dist/assets/index-D5T90wxn.js   421.28 kB │ gzip: 99.78 kB
✓ built in 666ms
```

**Log 4: Full Server Regression Test Suite (20 Test Files, 341/341 Passing — Zero Regressions)**

```text
$ npm --prefix server run test
> toktickit-server@1.0.0 test
> vitest run

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)
 ✓ tests/lab-02/attachments.api.test.ts (7)
 ✓ tests/lab-02/create-ticket.api.test.ts (13)
 ✓ tests/lab-02/my-tickets.api.test.ts (17)
 ✓ tests/lab-02/requesters.test.ts (5)
 ✓ tests/lab-02/ticket-detail.api.test.ts (20)
 ✓ tests/lab-03/auth.api.test.ts (20) 1035ms
 ✓ tests/lab-03/authorization.api.test.ts (28) 333ms
 ✓ tests/lab-03/comments-notes.api.test.ts (16) 320ms
 ✓ tests/lab-03/jwt-password.test.ts (9) 450ms
 ✓ tests/lab-03/migration-verification.test.ts (3) 3080ms
 ✓ tests/lab-03/migration.test.ts (3) 3546ms
 ✓ tests/lab-03/staff-queue.api.test.ts (23) 332ms
 ✓ tests/lab-03/staff-ticket-detail.api.test.ts (54) 695ms
 ✓ tests/lab-03/users-admin.api.test.ts (30) 1767ms
 ✓ tests/lab-04/actions-taken.api.test.ts (37) 1713ms
 ✓ tests/lab-04/dashboard.api.test.ts (22) 467ms
 ✓ tests/lab-04/migration-verification.test.ts (8)
 ✓ tests/lab-04/ticket-workflow.api.test.ts (24) 358ms

 Test Files  20 passed (20)
      Tests  341 passed (341)
   Start at  15:27:05
   Duration  25.82s
```

**Log 5: Playwright Responsive Layout & Horizontal Overflow Verification (2/2 Passing)**

```text
$ npx playwright test e2e/lab-04/responsive-actions-screenshots.spec.ts

Running 2 tests using 1 worker

     1 …f Actions Timeline, Log Modal, and Concurrency Conflict across viewports
  ✓  1 …ns Timeline, Log Modal, and Concurrency Conflict across viewports (4.9s)
     2 …ead-Only View has no mutation controls in DOM and no horizontal overflow
  ✓  2 …y View has no mutation controls in DOM and no horizontal overflow (2.1s)

  2 passed (8.2s)
```

### 3.6 Operational Dashboard UI & Metric Drill-Down Navigation (Issue 24)

- **Target Commands:**
  - `npm --prefix client test tests/lab-04/` (Issue 24 component tests)
  - `npm --prefix client test` (Full client regression suite)
  - `npm --prefix client run build` (Production client build)
  - `npm --prefix server run test` (Full server regression suite)
  - `npx playwright test -c e2e/lab-04/playwright.config.ts e2e/lab-04/dashboard-screenshots.spec.ts` (Responsive overflow & screenshot verification)
- **Verification Status:** **Verified (69/69 Lab 4 client tests passing, 180/180 full client suite passing, 350/350 full server suite passing, 4/4 Playwright browser tests passing, 0 build errors)**
- **Components Implemented & Hardened:**
  - `RequesterDashboard.tsx` (AC-24-01, DSH-UI-01): User-facing helpdesk overview for Requesters. Aggregates the full requester dataset by assembling all pagination pages concurrently (`fetchAllRequesterPages`). Computes 4 real-time KPI cards using Zen Green tokens: **Total Open** (`NEW`, `OPEN`), **Action Needed** (`WAITING_FOR_REQUESTER`), **Recently Resolved** (strictly tickets in `RESOLVED` status updated within the rolling 7-day cutoff `updatedAt >= now - 7d`), and **Total Closed** (`CLOSED`). Implements atomic error handling: if any page fails to load, the dashboard displays an error alert with a "Try Again" retry action instead of presenting inaccurate partial data. Renders a Recent Service Requests table with status/priority badges and direct links to ticket detail, quick CTAs (`+ Create Ticket`, `View My Tickets`), and a clean empty state with a `+ Create First Ticket` button.
  - `StaffDashboard.tsx` (AC-24-02, DSH-UI-02): Operational command center for IT Staff and Administrators consuming `GET /api/staff/dashboard`. Renders 7 core KPI cards with Zen Green color-coded accents: **Unassigned**, **My Assigned**, **In Progress**, **Waiting Req.**, **Total Open**, **Recently Resolved**, and **Total Labor Time** (formatted in hours and minutes `Xh Ym`). Displays non-terminal workload distributions by Category (tickets and labor hours) and Priority (P0–P3 distribution bars with effective priority).
  - **P0 Urgent Tickets Immediate Attention Section (Effective Priority Resolution):** Renders a dedicated alert section (`data-testid="staff-urgent-tickets-card"`) displaying non-terminal P0 urgent tickets requiring immediate staff intervention with count badge, ticket rows, direct ticket link, and deep link to queue (`priority=P0_URGENT`). Uses effective priority evaluation (`COALESCE(itPriority, requestedPriority) = 'P0_URGENT'`) across both client and server (`GET /api/staff/tickets?priority=P0_URGENT`), correctly retrieving staff-upgraded P0 tickets (`itPriority=P0_URGENT`, `requestedPriority=P2_MEDIUM`) while strictly excluding staff-downgraded P3 tickets (`itPriority=P3_LOW`, `requestedPriority=P0_URGENT`). When no P0 tickets exist, renders an accessible empty state (`staff-empty-urgent-tickets`) with a CheckCircle icon and message: *"No urgent P0 tickets currently requiring immediate attention."*
  - **Administrator-Only Account Health Card (AC-24-03, DSH-UI-03):** Renders a dedicated summary card for `ADMINISTRATOR` users displaying system-wide user metrics: Total Users, Active Staff, Administrators, Active Requesters, and Password Reset Required accounts, with a direct CTA to `/admin/users`. For `IT_STAFF` users, this card is **completely omitted from the DOM** (not hidden via CSS display:none), preserving strict least-privilege role boundaries.
  - `StaffTicketQueue.tsx` & Drill-Down Consistency (AC-24-04, DSH-UI-04): Enhanced queue filter initialization from URL search parameters (`owner`, `status`, `categoryId`, `requestedPriority`, `priority`, `search`, `resolvedWithinDays`):
    - **Total Open Drill-Down Consistency:** `Total Open` KPI card links to `/staff/queue?status=NEW,OPEN`. Both backend `GET /api/staff/tickets` and client queue parsing support comma-separated statuses (`NEW,OPEN`), ensuring the queue returns both `NEW` and `OPEN` tickets exactly matching the dashboard metric.
    - **Recently Resolved Rolling Window Consistency:** `Recently Resolved` KPI card links to `/staff/queue?status=RESOLVED&resolvedWithinDays=7`. Backend accepts `resolvedWithinDays` and filters by `updatedAt >= now - 7d`, strictly restricting queue results to the rolling 7-day window. The queue displays an active filter badge (`Last 7 Days`) with a clear button to remove the window limit if desired.
    - **Effective Priority Drill-Down Consistency:** Urgent tickets deep links and Priority breakdown clicks navigate to `/staff/queue?priority=P0_URGENT`. `StaffTicketQueue` and backend `GET /api/staff/tickets` evaluate effective priority, returning tickets matching the selected priority regardless of whether it was set at request or overridden by IT Staff.
    - **Single `pushState` Browser History Safety:** `App.tsx` composes path and query parameters into a single string via `URLSearchParams` and calls `window.history.pushState` strictly once per navigation, eliminating duplicate history entries and ensuring browser Back/Forward navigation functions smoothly.
  - `Header.tsx` & `App.tsx` (AC-24-05, DSH-UI-05): Added role-based navigation links for `Dashboard` in both desktop header and mobile drawer menus. Highlights the active view using Zen Green design tokens (`rgba(255, 255, 255, 0.2)` background and subtle border) with `aria-current="page"`. Implements route guarding in `resolveAllowedView`: redirects unauthenticated users to `/login`, prevents Requesters from accessing `/staff/dashboard` and `/admin/users` (redirecting to `/my-tickets`), blocks IT Staff from `/admin/users` (redirecting to `/staff/queue`), and allows Admin access to both.
  - **Responsive Design & DOM Safety (AC-24-06):** Dashboards feature responsive card wrapping and fluid gutters (`g-2 g-md-3`, `p-3 p-md-4`) ensuring zero horizontal overflow (`scrollWidth <= innerWidth`) across Mobile (375px), Tablet (768px), and Desktop (1280px). Verified via Playwright automation.

#### Terminal Execution Logs (Executed from Project Root)

**Log 1: Lab 4 Client Tests (7 Test Files, 69/69 Passing)**

```text
$ npm --prefix client test tests/lab-04/
> toktickit-client@1.0.0 test
> vitest run tests/lab-04/

 ✓ tests/lab-04/ActionsTakenSection.test.tsx (7)
 ✓ tests/lab-04/ConcurrencyConflictDialog.test.tsx (8)
 ✓ tests/lab-04/DashboardRouting.test.tsx (23)
 ✓ tests/lab-04/EditActionModal.test.tsx (5)
 ✓ tests/lab-04/LogActionModal.test.tsx (10)
 ✓ tests/lab-04/RequesterDashboard.test.tsx (6)
 ✓ tests/lab-04/StaffDashboard.test.tsx (10)

 Test Files  7 passed (7)
      Tests  69 passed (69)
```

**Log 2: Full Client Regression Test Suite (19 Test Files, 180/180 Passing)**

```text
$ npm --prefix client test
> toktickit-client@1.0.0 test
> vitest run

 ✓ tests/lab-01/App.test.tsx (5)
 ✓ tests/lab-02/App.test.tsx (16)
 ✓ tests/lab-02/AttachmentSection.test.tsx (9)
 ✓ tests/lab-02/CreateTicket.test.tsx (7)
 ✓ tests/lab-02/MyTickets.test.tsx (13)
 ✓ tests/lab-02/RequesterHeader.test.tsx (6)
 ✓ tests/lab-02/RequesterTicketDetail.test.tsx (7)
 ✓ tests/lab-03/ChangePassword.test.tsx (4)
 ✓ tests/lab-03/Login.test.tsx (8)
 ✓ tests/lab-03/StaffTicketDetail.test.tsx (10)
 ✓ tests/lab-03/StaffTicketQueue.test.tsx (19)
 ✓ tests/lab-03/UserManagement.test.tsx (7)
 ✓ tests/lab-04/ActionsTakenSection.test.tsx (7)
 ✓ tests/lab-04/ConcurrencyConflictDialog.test.tsx (8)
 ✓ tests/lab-04/DashboardRouting.test.tsx (23)
 ✓ tests/lab-04/EditActionModal.test.tsx (5)
 ✓ tests/lab-04/LogActionModal.test.tsx (10)
 ✓ tests/lab-04/RequesterDashboard.test.tsx (6)
 ✓ tests/lab-04/StaffDashboard.test.tsx (10)

 Test Files  19 passed (19)
      Tests  180 passed (180)
```

**Log 3: Client Production Build Verification (Zero Type & Bundle Errors)**

```text
$ npm --prefix client run build
> toktickit-client@1.0.0 build
> tsc && vite build

vite v6.4.3 building for production...
✓ 72 modules transformed.
dist/index.html                   0.39 kB │ gzip:   0.27 kB
dist/assets/index-BpJaf12f.css  248.22 kB │ gzip:  34.84 kB
dist/assets/index-C67JRZlb.js   462.66 kB │ gzip: 106.07 kB
✓ built in 913ms
```

**Log 4: Full Server Regression Test Suite (20 Test Files, 350/350 Passing — Zero Regressions)**

```text
$ npm --prefix server run test
> toktickit-server@1.0.0 test
> vitest run

 ✓ tests/lab-01/categories.test.ts (1)
 ✓ tests/lab-01/health.test.ts (1)
 ✓ tests/lab-02/attachments.api.test.ts (7)
 ✓ tests/lab-02/create-ticket.api.test.ts (13)
 ✓ tests/lab-02/my-tickets.api.test.ts (17)
 ✓ tests/lab-02/requesters.test.ts (5)
 ✓ tests/lab-02/ticket-detail.api.test.ts (20)
 ✓ tests/lab-04/actions-taken.api.test.ts (37)
 ✓ tests/lab-04/dashboard.api.test.ts (29)
 ✓ tests/lab-04/migration-verification.test.ts (8)
 ✓ tests/lab-04/ticket-workflow.api.test.ts (24)
 ✓ tests/lab-03/auth.api.test.ts (20)
 ✓ tests/lab-03/authorization.api.test.ts (28)
 ✓ tests/lab-03/comments-notes.api.test.ts (16)
 ✓ tests/lab-03/jwt-password.test.ts (9)
 ✓ tests/lab-03/migration-verification.test.ts (3)
 ✓ tests/lab-03/migration.test.ts (3)
 ✓ tests/lab-03/staff-queue.api.test.ts (25)
 ✓ tests/lab-03/staff-ticket-detail.api.test.ts (54)
 ✓ tests/lab-03/users-admin.api.test.ts (30)

 Test Files  20 passed (20)
      Tests  350 passed (350)
```

**Log 5: Playwright Responsive Dashboard Layout & Screenshot Verification (4/4 Passing)**

```text
$ npx playwright test -c e2e/lab-04/playwright.config.ts e2e/lab-04/dashboard-screenshots.spec.ts

Running 4 tests using 1 worker

     1 …creenshots › 1. Requester Dashboard visual verification across viewports
  ✓  1 …ots › 1. Requester Dashboard visual verification across viewports (2.6s)
     2 …ots › 2. Staff Dashboard visual verification across viewports (IT Staff)
  ✓  2 …. Staff Dashboard visual verification across viewports (IT Staff) (1.9s)
     3 …ds UI & Screenshots › 3. Admin Dashboard with User Accounts Summary Card
  ✓  3 … Screenshots › 3. Admin Dashboard with User Accounts Summary Card (1.4s)
     4 …ards UI & Screenshots › 4. Metric Drill-Down Navigation to Queue Filters
  ✓  4 …& Screenshots › 4. Metric Drill-Down Navigation to Queue Filters (742ms)

  4 passed (10.4s)
```

### 3.7 Playwright Multi-Persona E2E & Regression Suite (Issue 25)

- **Target Command:** `npm run test:e2e`
- **Status:** Pending implementation in Issue 25.

---

## 4. UI Visual Verification & Screenshot Inventory

Screenshots systematically captured across 3 standard viewports (Desktop $1280 \times 900$, Tablet $768 \times 1024$, Mobile $375 \times 812$):

| View Category                                      | Screenshot Target Folder                               |    Responsive Check Status    | Captured Artifact Files                                                                                               |
| :------------------------------------------------- | :----------------------------------------------------- | :---------------------------: | :-------------------------------------------------------------------------------------------------------------------- |
| Staff Ticket Detail Actions Timeline               | `artifacts/lab-04/screenshots/actions-timeline/`       | **Verified (1280, 768, 375)** | `actions-timeline-staff-1280.png`<br>`actions-timeline-staff-768.png`<br>`actions-timeline-staff-375.png`             |
| Requester Read-Only Work History                   | `artifacts/lab-04/screenshots/requester-actions-view/` | **Verified (1280, 768, 375)** | `actions-timeline-requester-1280.png`<br>`actions-timeline-requester-768.png`<br>`actions-timeline-requester-375.png` |
| Role Authorization Comparison (Staff vs Requester) | `artifacts/lab-04/screenshots/`                        |  **Verified (Side-by-Side)**  | `role-comparison-staff-vs-requester.png`                                                                              |
| Log Action Modal & Form Validation                 | `artifacts/lab-04/screenshots/log-action-modal/`       |   **Verified (1280, 375)**    | `log-action-modal-1280.png`<br>`log-action-modal-375.png`                                                             |
| 409 Concurrency Conflict Dialog                    | `artifacts/lab-04/screenshots/concurrency-conflict/`   |   **Verified (1280, 375)**    | `concurrency-conflict-1280.png`<br>`concurrency-conflict-375.png`                                                     |
| Requester Helpdesk Dashboard                       | `artifacts/lab-04/screenshots/dashboards/`             | **Verified (1280, 768, 375)** | `requester-dashboard-1280.png`<br>`requester-dashboard-768.png`<br>`requester-dashboard-375.png`                       |
| Staff Operational Dashboard                        | `artifacts/lab-04/screenshots/dashboards/`             | **Verified (1280, 768, 375)** | `staff-dashboard-1280.png`<br>`staff-dashboard-768.png`<br>`staff-dashboard-375.png`                                 |
| Administrator User Accounts Summary Card           | `artifacts/lab-04/screenshots/dashboards/`             |   **Verified (1280, 375)**    | `admin-dashboard-1280.png`<br>`admin-dashboard-375.png`                                                               |
| Dashboard Metric Drill-Down to Queue               | `artifacts/lab-04/screenshots/dashboards/`             |       **Verified (1280)**     | `dashboard-drilldown-queue-1280.png`                                                                                  |
| Resolution Gate Warning (0 Actions)                | `artifacts/lab-04/screenshots/resolution-gate/`        |            Planned            | Planned for Issue 25                                                                                                  |

---

## 5. Non-Destructive Database Evolution & Regression Verification

- **Historical Data Retention:** All pre-existing records (Users, Tickets, Comments, Activities, Attachments) from Labs 1, 2, and 3 must remain completely intact.
- **Seed Idempotency:** The enhanced database seed populates baseline action records without duplications on repeated executions.
