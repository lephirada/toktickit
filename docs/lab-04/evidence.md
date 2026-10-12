# TokTickIT — Sprint 4 Verification & Evidence Artifacts (Issues 18–25)

**Course:** CPE 334 Software Engineering Laboratory  
**Sprint:** 4 — Parent-Child Work Structures, Resolution Gates, Operational Dashboards, and Regression Traceability  
**Status:** In Progress — Baseline Specifications Established (Issue 18)

> [!NOTE]
> Per project guidelines, all test results, screenshots, and verification artifacts documented herein are authentic and un-fabricated. This living document maintains the verified evidence inventory for Sprint 4 across Issues 18 through 25.

---

## 1. GitHub Issues & Pull Requests Registry

| Issue ID     | Branch Name                    | Issue Description                               | Pull Request Link                                  | Review Status      | Merge Commit |
| :----------- | :----------------------------- | :---------------------------------------------- | :------------------------------------------------- | :----------------- | :----------- |
| **Issue 18** | `feature/18-lab4-spec-docs`    | Sprint 4 Documentation, Contracts & Test Plan   | `[https://github.com/lephirada/toktickit/pull/50]` | `[Approved]`       | `[Merged]`   |
| **Issue 19** | `feature/19-database-migration-actions` | Database Evolution, ActionTaken Schema & Seed   | `[https://github.com/lephirada/toktickit/pull/51]` | `[Pending Review]` | `[Planned]`  |
| **Issue 20** | `feature/20-actions-taken-api`          | Actions Taken REST APIs & Concurrency Control   | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 21** | `feature/21-resolution-gate`            | Server-Enforced Resolution Gate & State Machine | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 22** | `feature/22-dashboard-api`              | Operational Dashboard & Analytics API           | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 23** | `feature/23-actions-taken-ui`           | Actions Taken UI & Concurrency Conflict Dialog  | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 24** | `feature/24-dashboard-ui`               | Operational Dashboard UI & Visualizations       | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |
| **Issue 25** | `feature/25-integration-e2e`            | Multi-Persona E2E Verification & Sprint Release | `[PR Placeholder]`                                 | `[Planned]`        | `[Planned]`  |

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
- **Verification Status:** **Verified (8/8 passing, 258/258 full suite passing)**
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

 Test Files  17 passed (17)
      Tests  258 passed (258)
   Start at  15:07:07
   Duration  17.84s
```

### 3.2 Actions Taken & Concurrency Control API Tests (Issue 20)

- **Target Command:** `npm --prefix server run test -- tests/lab-04/actions-taken.api.test.ts`
- **Status:** Pending implementation in Issue 20.

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
