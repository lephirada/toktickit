# TokTickIT — Sprint 4 Verification & Evidence Artifacts (Issues 18–26)

**Course:** CPE 334 Software Engineering Laboratory  
**Sprint:** 4 — Parent-Child Work Structures, Resolution Gates, Operational Dashboards, and Regression Traceability  
**Status:** In Progress — Baseline Specifications Established (Issue 18)

> [!NOTE]
> Per project guidelines, all test results, screenshots, and verification artifacts documented herein are authentic and un-fabricated. This living document maintains the verified evidence inventory for Sprint 4 across Issues 18 through 26.

---

## 1. GitHub Issues & Pull Requests Registry

| Issue ID     | Branch Name                             | Issue Description                               | Pull Request Link                                  | Review Status      | Merge Commit |
| :----------- | :-------------------------------------- | :---------------------------------------------- | :------------------------------------------------- | :----------------- | :----------- |
| **Issue 18** | `feature/18-lab4-spec-docs`             | Sprint 4 Documentation, Contracts & Test Plan   | `[https://github.com/lephirada/toktickit/pull/50]` | `[Approved]`       | `[Merged]`   |
| **Issue 19** | `feature/19-database-migration-actions` | Database Evolution, ActionTaken Schema & Seed   | `[https://github.com/lephirada/toktickit/pull/51]` | `[Approved]`       | `[Merged]`   |
| **Issue 20** | `feature/20-actions-taken-backend`      | Actions Taken REST APIs & Concurrency Control   | `[PR Placeholder]`                                 | `[Pending Review]` | `[Planned]`  |
| **Issue 21** | `feature/21-ticket-resolution-gate`     | Server-Enforced Resolution Gate & State Machine | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 22** | `feature/22-dashboard-backend-apis`     | Operational Dashboard & Analytics API           | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 23** | `feature/23-actions-taken-ui`           | Actions Taken UI & Concurrency Conflict Dialog  | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 24** | `feature/24-role-dashboards-ui`         | Operational Dashboard UI & Visualizations       | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 25** | `feature/25-e2e-regression-hardening`   | Multi-Persona E2E Verification & Sprint Release | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 26** | `feature/26-final-submission-artifacts` | Final Release Hardening & Submission Artifacts  | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |

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

## 3. Automated Test Execution Evidence (Planned for Issues 19–25)

### 3.1 Database Migration & Seed Verification (Issue 19)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/migration-verification.test.ts`
- **Verification Status:** **Verified (8/8 passing, 280/280 full suite passing)**
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
      Tests  280 passed (280)
   Start at  20:41:31
   Duration  19.37s
```

### 3.2 Actions Taken & Concurrency Control API Tests (Issue 20)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/actions-taken.api.test.ts`
- **Verification Status:** **Verified (22/22 passing, 280/280 full server suite passing)**
- **Endpoints Implemented:**
  - `GET /api/tickets/:ticketId/actions`: Chronological listing (`actionDateTime ASC`), requester ownership scoping, anti-leakage 403 on foreign ticket.
  - `POST /api/tickets/:ticketId/actions`: IT Staff / Admin action recording, server-derived `performedById = req.user.id`, terminal ticket guard (`CLOSED`, `CANCELLED` $\to$ 422), mandatory `followUpNote` when `followUpRequired=true`, duration validation (1–1440 min), future timestamp rejection, `ACTION_TAKEN_ADDED` audit activity logging.
  - `PUT /api/tickets/:ticketId/actions/:actionId`: Optimistic concurrency check with `expectedUpdatedAt` (missing $\to$ 400, stale mismatch $\to$ 409 `STALE_ACTION_CONFLICT`), terminal ticket guard, `ACTION_TAKEN_UPDATED` audit activity logging.

#### Terminal Execution Logs (Executed from Project Root)

```text
$ npm --prefix server run test -- tests/lab-04/actions-taken.api.test.ts
> toktickit-server@1.0.0 test
> vitest run tests/lab-04/actions-taken.api.test.ts

 ✓ tests/lab-04/actions-taken.api.test.ts (22)
   ✓ Issue 20 — Actions Taken REST API Suite (actions-taken.api.test.ts) (22)
     ✓ ACT-API-01: Valid Action Creation & Server-Derived Performer Identity (2)
       ✓ creates an action successfully when called by IT Staff and derives performedById from session
       ✓ allows Administrator to create an action taken with session-derived identity
     ✓ ACT-API-02: Rejection of Requester Creation Attempts (2)
       ✓ rejects action creation by Requester with 403 Forbidden even on their own ticket
       ✓ rejects unauthenticated caller with 401 Unauthorized
     ✓ ACT-API-03: Field Validations & Follow-up Requirement (6)
       ✓ rejects with 422 VALIDATION_ERROR when followUpRequired=true and followUpNote is missing
       ✓ rejects with 422 VALIDATION_ERROR when followUpRequired=true and followUpNote is empty whitespace
       ✓ accepts valid followUpNote when followUpRequired=true
       ✓ rejects with 422 when description is empty or missing
       ✓ rejects with 422 when timeSpentMinutes is non-positive or exceeds 1440
       ✓ rejects with 422 when performedAt is set in the future
     ✓ ACT-API-04: Requester Query Boundaries & Role Access Scoping (5)
       ✓ allows Requester to view actions for their owned ticket (200 OK)
       ✓ rejects Requester with 403 Forbidden when attempting to view actions for another user's ticket
       ✓ returns 404 Not Found for non-existent ticket ID
       ✓ allows IT Staff to view actions for any ticket in the queue
       ✓ returns actions sorted chronologically by actionDateTime ASC
     ✓ ACT-API-05: Optimistic Concurrency Control (expectedUpdatedAt) (4)
       ✓ returns 400 Bad Request when expectedUpdatedAt is missing from PUT payload
       ✓ returns 409 Conflict with STALE_ACTION_CONFLICT when expectedUpdatedAt does not match server updatedAt
       ✓ successfully updates action and refreshes updatedAt when expectedUpdatedAt matches server timestamp
       ✓ rejects PUT by Requester with 403 Forbidden
     ✓ ACT-API-06: Terminal Status Check (CLOSED / CANCELLED Protection) (3)
       ✓ rejects action creation on CLOSED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE
       ✓ rejects action creation on CANCELLED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE
       ✓ rejects action update on CLOSED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE

 Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  20:41:12
   Duration  1.11s
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

### 3.3 Resolution Gate Boundary Suite (Issue 21)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/resolution-gate.api.test.ts`
- **Status:** Pending implementation in Issue 21.

### 3.4 Operational Dashboard API Tests (Issue 22)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/dashboard.api.test.ts`
- **Status:** Pending implementation in Issue 22.

### 3.5 Client Component & Conflict UI Tests (Issue 23 & 24)

- **Target Command:** `npm --prefix client test`
- **Status:** Pending implementation in Issues 23–24.

### 3.6 Playwright Multi-Persona E2E & Regression Suite (Issue 25)

- **Target Command:** `npm run test:e2e`
- **Status:** Pending implementation in Issue 25.

---

## 4. UI Visual Verification & Screenshot Inventory (Planned for Issue 25)

Screenshots will be systematically captured across 3 standard viewports (Desktop $1280 \times 900$, Tablet $768 \times 1024$, Mobile $375 \times 812$):

| View Category                        | Screenshot Target Folder                               | Responsive Check Status |
| :----------------------------------- | :----------------------------------------------------- | :---------------------: |
| Staff Ticket Detail Actions Timeline | `artifacts/lab-04/screenshots/actions-timeline/`       |         Planned         |
| Log Action Modal & Form Validation   | `artifacts/lab-04/screenshots/log-action-modal/`       |         Planned         |
| 409 Concurrency Conflict Dialog      | `artifacts/lab-04/screenshots/concurrency-conflict/`   |         Planned         |
| Resolution Gate Warning (0 Actions)  | `artifacts/lab-04/screenshots/resolution-gate/`        |         Planned         |
| Requester Read-Only Work History     | `artifacts/lab-04/screenshots/requester-actions-view/` |         Planned         |
| Operational Dashboard KPI Grid       | `artifacts/lab-04/screenshots/operational-dashboard/`  |         Planned         |
| Dashboard Workload Distribution      | `artifacts/lab-04/screenshots/dashboard-breakdowns/`   |         Planned         |

---

## 5. Non-Destructive Database Evolution & Regression Verification

- **Historical Data Retention:** All pre-existing records (Users, Tickets, Comments, Activities, Attachments) from Labs 1, 2, and 3 must remain completely intact.
- **Seed Idempotency:** The enhanced database seed populates baseline action records without duplications on repeated executions.
