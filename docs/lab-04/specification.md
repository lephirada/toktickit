# TokTickIT — Sprint 4 Engineering Specification (Issue 18)

**Course:** CPE 334 Software Engineering Laboratory  
**Sprint:** 4 — Parent-Child Work Structures, Resolution Gates, Operational Dashboards, and Regression Traceability  
**Design System:** Zen Green Palette  
**Status:** Authoritative Specification  

---

## 1. Sprint Goal

Establish the operational maturity of TokTickIT for Sprint 4 by introducing formal parent-child work tracking (`Ticket 1:N ActionTaken`), enforcing server-side quality gates before ticket resolution, implementing an operational performance dashboard, and guaranteeing zero regression across all pre-existing Lab 1, Lab 2, and Lab 3 capabilities.

By the end of Issues 18–25, the application provides:
* **Parent-Child Work Tracking:** A structured 1:N relationship allowing IT Staff and Administrators to record discrete, auditable actions taken on tickets with time tracking.
* **Optimistic Concurrency Control:** Safe concurrent updates to action records using server-managed revision tokens (`expectedUpdatedAt`), preventing silent overwrite conflicts.
* **Server-Enforced Resolution Gate:** A mandatory quality gate requiring both a detailed resolution summary (10–1,000 characters) and at least one documented action taken (`actionsCount >= 1`) before a ticket can enter `RESOLVED` status, while preserving the structural state machine in `shared/ticketStateMachine.ts`.
* **Advisory Requester Resolution Indication:** Clarifying that Requester problem resolution indication (`resolutionIndicated = true`) is purely advisory and cannot alter ticket status or bypass the Resolution Gate.
* **Operational Dashboard & Metrics:** An interactive operational dashboard for IT Staff and Administrators calculating key metrics, including a rolling 7-day recently resolved window.
* **Role-Based UI Enforcement:** Strict presentation filtering ensuring Requesters have read-only visibility into actions taken on their own tickets, with create and edit controls completely hidden.
* **Comprehensive Regression & E2E Verification:** Automated verification proving 100% preservation of all prior sprint contracts and responsive presentation with zero horizontal page overflow.

---

## 2. Stakeholder Request & Operational Context

The enterprise IT Service Desk requires operational accountability, transparent workload tracking, and reliable resolution standards. Prior to Sprint 4, tickets could be marked resolved without recording the actual technical labor performed, leading to incomplete audit histories and untracked staff hours.

Stakeholders mandate that:
1. Every resolved ticket must document what technical actions were performed and how much time was spent.
2. Concurrent edits by multiple technicians working on the same ticket actions must be detected and resolved without data loss.
3. Requesters must be able to view work performed on their requests for transparency, but must never be permitted to tamper with technical work logs.
4. IT Supervisors and Staff must have access to real-time operational metrics to monitor queue health, active workloads, and recent resolution throughput.
5. Requesters confirming that a problem appears solved must not prematurely mark a ticket as resolved; formal resolution remains an authoritative staff action.
6. All existing functionality—including ticket creation, attachments, public comments, internal notes, staff queue triage, and administrator user management—must continue to operate without regression.

---

## 3. Scope Boundaries

### 3.1 In-Scope (Included in Issues 18–25)

1. **Documentation and Engineering Contracts (Issue 18):**
   * Authoritative specification documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`).
   * Explicit requirement and business rule numbering (FR-01..12, BR-01..10).
   * Requirement-to-test and acceptance-criteria traceability matrices.
2. **Database Evolution and Seed Migration (Issue 19):**
   * Relational model for `ActionTaken` linked 1:N to `Ticket` and N:1 to `User` (`performedBy`).
   * Timestamp fields (`createdAt`, `updatedAt`) supporting concurrency control.
   * Non-destructive migration preserving existing database records (users, tickets, comments, activities, attachments).
   * Idempotent database seed populating historical action records for baseline tickets.
3. **Actions Taken REST APIs & Concurrency Control (Issue 20):**
   * REST endpoints: `GET /api/tickets/:id/actions`, `POST /api/tickets/:id/actions`, `PUT /api/tickets/:id/actions/:actionId`.
   * Server-side derivation of `performedById` from session auth token (`req.user.id`).
   * Optimistic concurrency control via `expectedUpdatedAt`: returning `409 STALE_ACTION_CONFLICT` on timestamp mismatch and `400 MISSING_CONCURRENCY_TOKEN` if omitted.
   * Atomic audit logging in `TicketActivity` for action creation and updates.
4. **Server-Enforced Resolution Gate & State Machine (Issue 21):**
   * Server-side resolution gate: `IN_PROGRESS -> RESOLVED` transition rejected with `422 Unprocessable Entity` (`RESOLUTION_ACTION_REQUIRED`) if `actionsCount === 0`.
   * Preservation of pure structural status transitions in `shared/ticketStateMachine.ts`.
   * Clarification that Requester `POST /api/tickets/:id/confirm-resolved` sets `resolutionIndicated = true` but is strictly advisory and cannot alter status to `RESOLVED` or bypass the gate.
5. **Operational Dashboard & Metrics API (Issue 22):**
   * Metric calculation endpoint: `GET /api/staff/dashboard`.
   * Metrics: Total Open, In Progress, Waiting for Requester, Recently Resolved (rolling 7-day window), Unassigned Tickets, Total Time Spent, Category Distribution, and Priority Breakdown.
   * Clear separation between Lab Sheet core requirements and project design decisions.
6. **Actions Taken Client UI & Concurrency Handling (Issue 23):**
   * Staff Ticket Detail integration: chronological Actions Taken list, Log Action form/modal, and Edit Action modal.
   * Optimistic concurrency conflict UI: visual alert on 409 conflict, displaying server state vs. user edits with reload/review options.
   * Role-based control visibility: Requesters view actions taken in read-only mode with Create and Edit controls hidden.
7. **Operational Dashboard Client UI (Issue 24):**
   * Responsive Zen Green dashboard interface for IT Staff and Administrators.
   * Summary KPI metric cards, category workload breakdown, and quick-filter deep links to Staff Queue.
   * Responsive layout adapting across Desktop ($\ge 992$px), Tablet ($768$px–$991$px), and Mobile ($< 768$px) with zero horizontal page overflow.
8. **Integration, E2E Testing, Responsive Audit & Sprint Documentation (Issue 25):**
   * Playwright end-to-end multi-persona test journeys verifying work logging, concurrency conflicts, resolution gating, and dashboard metrics.
   * Full regression verification of Labs 1, 2, and 3 test suites.
   * Responsive screenshot collection across Desktop, Tablet, and Mobile viewports.
   * Sprint documentation completion (`reviewer.md`, `evidence.md`, `ai-use.md`, `submission-package.md`, `README.md`).

### 3.2 Out-of-Scope (Explicitly Excluded per Lab Sheet)

The following capabilities are **strictly excluded** from Sprint 4:
* Formal SLA breach timers, countdown widgets, and automated escalation workers.
* External SMS, email, or webhook notifications.
* Hardware asset inventory management, equipment barcodes, and physical item check-out.
* Public customer self-service portal (external unauthenticated users).
* Physical deletion of tickets or actions taken records (soft deletion or immutability is standard).
* Real-time WebSocket subscriptions (HTTP polling and optimistic UI updates are standard).
* Multi-tenant organizational billing or cross-company licensing.

---

## 4. Issue Ownership Model (Issues 18 to 25)

To maintain strict sequential delivery and prevent boundary drift, each issue has an explicit, singular technical scope:

| Issue | Title | Branch Name | Primary Ownership |
| :---: | :--- | :--- | :--- |
| **18** | Sprint 4 Documentation & Contract | `feature/18-lab4-spec-docs` | Authoritative specifications only (`docs/lab-04/*.md`). Zero code or migrations. |
| **19** | Database Schema, Migration & Seed | `feature/19-actions-taken-db` | `ActionTaken` model, relations, non-destructive migration, and idempotent seed script. |
| **20** | Actions Taken REST APIs & Concurrency | `feature/20-actions-taken-api` | Actions Taken endpoints (`GET`, `POST`, `PUT`), `expectedUpdatedAt` concurrency control, server auth identity derivation, and audit logging. |
| **21** | Resolution Gate & State Machine | `feature/21-resolution-gate` | Server-enforced Resolution Gate (`actionsCount >= 1`), decoupling from `shared/ticketStateMachine.ts`, and advisory Requester confirmation. |
| **22** | Operational Dashboard API | `feature/22-dashboard-api` | `GET /api/staff/dashboard` metrics computation, rolling 7-day resolution window, and role protection. |
| **23** | Actions Taken UI & Concurrency Handling | `feature/23-actions-taken-ui` | Staff detail actions list, modals, 409 conflict handling UI, and Requester read-only view. |
| **24** | Operational Dashboard UI | `feature/24-dashboard-ui` | Zen Green KPI cards, distribution charts, quick-filter links, and responsive viewports. |
| **25** | Integration, E2E Testing & Verification | `feature/25-integration-e2e` | Multi-persona Playwright journeys, regression suites, responsive screenshots, and sprint documentation. |

---

## 5. Numbered Functional Requirements (FR-01..12)

- **FR-01 (Actions Taken Logging & Association):** The system shall allow authorized IT Staff and Administrators to record discrete Actions Taken (`POST /api/tickets/:id/actions`) associated with a parent ticket. Each action record captures action description, category/action type, time spent in minutes, and the performed timestamp.
- **FR-02 (Authenticated Performer Authority):** The system shall populate `performedById` server-side strictly from the authenticated session (`req.user.id`). Any client-supplied `performedById` or `performerId` in the request body shall be discarded or rejected (`400 Bad Request`).
- **FR-03 (Actions Taken Query & Retrieval):** The system shall provide `GET /api/tickets/:id/actions` returning chronological actions taken for the ticket. IT Staff and Administrators can view all actions; Requesters can view actions taken for their owned tickets in read-only mode (`requesterId === req.user.id`), while foreign ticket access returns `404 Not Found`.
- **FR-04 (Action Taken Modification & Optimistic Concurrency):** Authorized IT Staff and Administrators shall be able to update an existing Action Taken record (`PUT /api/tickets/:id/actions/:actionId`). The request body must include `expectedUpdatedAt` (ISO-8601 timestamp) matching the current record timestamp. Mismatches return `409 Conflict` (`STALE_ACTION_CONFLICT`), while omissions return `400 Bad Request` (`MISSING_CONCURRENCY_TOKEN`).
- **FR-05 (Server-Enforced Resolution Gate):** Transitioning a ticket from `IN_PROGRESS` to `RESOLVED` (`PATCH /api/tickets/:id/status`) shall enforce the server-side Resolution Gate: the request must provide a valid `resolutionSummary` (10–1,000 characters) AND the ticket must have at least one recorded Action Taken (`actionsCount >= 1`). If `actionsCount === 0`, the server rejects the transition with `422 Unprocessable Entity` (`RESOLUTION_ACTION_REQUIRED`). Pure structural state machine transitions in `shared/ticketStateMachine.ts` remain decoupled from database queries.
- **FR-06 (Advisory Requester Resolution Indication):** When an authenticated Requester indicates resolution (`POST /api/tickets/:id/confirm-resolved`), the system sets `resolutionIndicated = true`, posts an automated public comment, and logs an activity record. This indication is strictly advisory and shall not alter the ticket status under any circumstances (the existing ticket status remains completely unchanged), nor can it bypass the resolution gate.
- **FR-07 (Operational Dashboard Metrics):** The system shall expose `GET /api/staff/dashboard` returning aggregated operational metrics for IT Staff and Administrators: Total Open Tickets, In Progress Tickets, Waiting for Requester Tickets, Recently Resolved Tickets (rolling 7-day window), Unassigned Tickets count, Total Time Spent (minutes), and breakdown by category and priority.
- **FR-08 (Dashboard Calculation Specification Separation):** The operational metrics API shall compute values according to clear formal criteria, distinguishing Lab Sheet core mandates (active queue counts, category distribution, time totals) from project design decisions (`recentlyResolved` uses a rolling 7-day window from `now() - 7 days`, clamping negative/overflow calculations).
- **FR-09 (Role-Based Action UI Controls):** In the client UI, IT Staff and Administrators shall see interactive controls to "Log Action" and "Edit Action". In Requester ticket views, all Action Taken creation and edit controls shall be completely hidden, rendering an accessible read-only timeline of performed actions.
- **FR-10 (Optimistic Concurrency Conflict UI Handling):** When an Action Taken update fails with `409 STALE_ACTION_CONFLICT`, the UI shall display a clear conflict warning modal or inline alert, present the updated data from the server, and provide options to reload the latest version or review differences before re-applying changes.
- **FR-11 (Operational Dashboard Visualizations & Responsiveness):** The client shall provide an Operational Dashboard view styled with Zen Green tokens featuring metric summary KPI cards, status distribution pills, category workload charts/bars, and quick-filter deep links to the Staff Queue. The layout must adapt gracefully across Desktop ($\ge 992$px), Tablet ($768$px–$991$px), and Mobile ($< 768$px) viewports with zero horizontal page overflow.
- **FR-12 (Audit Logging for Actions Taken):** Every Action Taken creation and update shall generate a persistent audit record in `TicketActivity` (`ACTION_TAKEN_ADDED`, `ACTION_TAKEN_UPDATED`) detailing the actor, action description snippet, and time spent.

### 5.1 Non-Functional & Presentation Requirements (NFR)

- **NFR-01 (Responsive Presentation & Zero Horizontal Page Overflow):** All views (Staff Queue, Ticket Detail, Operational Dashboard) shall adapt cleanly across Desktop ($\ge 992$px), Tablet ($768$px–$991$px), and Mobile ($< 768$px). Horizontal scrolling is strictly confined within isolated table wrappers (`overflow-x: auto`); the root page/document must strictly have zero horizontal page overflow.
- **NFR-02 (API Performance & Dashboard Latency):** Dashboard metrics aggregation and Actions Taken endpoints shall execute within 250ms under standard database conditions through indexed queries on `ticketId`, `status`, and `createdAt`.
- **NFR-03 (Accessibility Compliance):** All UI elements, modal forms, and dashboard KPI cards shall adhere to WCAG 2.1 AA contrast requirements ($\ge 4.5:1$ for normal text, $\ge 3:1$ for graphic UI elements) and maintain complete keyboard focus accessibility.

---

## 6. Numbered Business Rules (BR-01..10)

| Rule ID | Rule Name | Description | Enforcement Point |
| :--- | :--- | :--- | :--- |
| **BR-01** | **Parent-Child Relational Integrity** | Every Action Taken record must belong to exactly one existing parent `Ticket` (`ticketId` foreign key). Orphaned actions are prohibited. Physical deletion of tickets is not supported; database cascade ensures referential safety. | Database Foreign Key & API Controller |
| **BR-02** | **Workable State for Action Logging** | Actions Taken can only be created or modified while the parent ticket is in an active operational state (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`). Attempting to log or edit an action on an unworkable ticket (`NEW`, `RESOLVED`, `CLOSED`, `CANCELLED`) returns `422 Unprocessable Entity` (`TICKET_NOT_IN_WORKABLE_STATE`). | Server Controller (`POST/PUT /api/tickets/:id/actions`) |
| **BR-03** | **Server Authority for Performer Identity** | The `performedById` foreign key is strictly determined by the authenticated session (`req.user.id`). Any client-supplied identity parameters are ignored or rejected (`400 Bad Request`). Staff cannot attribute work to other users. | Server Auth Middleware & Controller |
| **BR-04** | **Mandatory Resolution Gate** | Transitioning a ticket from `IN_PROGRESS` to `RESOLVED` strictly requires: (1) `actionsCount >= 1` (at least one Action Taken record for the ticket), and (2) `resolutionSummary` between 10 and 1,000 characters. If `actionsCount === 0`, return `422 Unprocessable Entity` (`RESOLUTION_ACTION_REQUIRED`). If `resolutionSummary` is missing or out of bounds ($< 10$ or $> 1000$ characters), return `422 Unprocessable Entity` (`VALIDATION_ERROR`). | Server Controller (`PATCH /api/tickets/:id/status`) |
| **BR-05** | **Advisory Requester Resolution Limitation** | When a Requester indicates problem resolution (`POST /api/tickets/:id/confirm-resolved`), the ticket records `resolutionIndicated = true`, appends a public comment, and logs an activity record. It is strictly advisory and **must not alter the ticket status** (the existing ticket status remains completely unchanged, including for tickets in `WAITING_FOR_REQUESTER` or `IN_PROGRESS`). It cannot set status to `RESOLVED` or `CLOSED` and cannot bypass the Resolution Gate. | Server Controller & State Machine |
| **BR-06** | **Action Field Validation & Time Constraints** | `description` must be between 10 and 2,000 characters (trimmed). `timeSpentMinutes` must be a positive integer between 1 and 1,440 minutes (24 hours). `performedAt` must be a valid past or present ISO-8601 timestamp and **cannot be in the future** (`performedAt <= now()`). Any timestamp where `performedAt > now()` (future server time) is strictly rejected with `422 Unprocessable Entity` (`VALIDATION_ERROR`). | Server Validation Layer (`422 Unprocessable Entity`) |
| **BR-07** | **Optimistic Concurrency Control Token** | Updating an Action Taken record requires `expectedUpdatedAt`. The update proceeds only if `ActionTaken.updatedAt` equals `expectedUpdatedAt`. Mismatches return `409 Conflict` (`STALE_ACTION_CONFLICT`). Missing tokens return `400 Bad Request` (`MISSING_CONCURRENCY_TOKEN`). | Server Update Controller (`PUT /api/tickets/:id/actions/:actionId`) |
| **BR-08** | **Role-Based Action Management Permissions** | Only active users with role `IT_STAFF` or `ADMINISTRATOR` may create or edit Actions Taken. Requesters have read-only access strictly for their own tickets (`requesterId === req.user.id`); requests for unowned tickets return `404 Not Found` (anti-enumeration). | Server RBAC Middleware & Controller |
| **BR-09** | **Dashboard Authorization & Metric Window Rule** | Operational dashboard metrics (`GET /api/staff/dashboard`) are restricted strictly to `IT_STAFF` and `ADMINISTRATOR` (`403 Forbidden` for Requesters). The `recentlyResolved` metric strictly uses a rolling 7-day window ($t \ge \text{now}() - 7 \text{ days}$). | Server Controller & Aggregation Service |
| **BR-10** | **Decoupled State Machine Architecture** | The transition topology in `shared/ticketStateMachine.ts` remains pure and synchronous, validating allowed next states and text formats. The Resolution Gate check for database entities (`actionsCount >= 1`) is enforced at the server orchestration layer prior to committing the status transition. | Server Controller & `shared/ticketStateMachine.ts` |

---

## 7. Roles and Permissions Matrix (Authorization Matrix)

| Capability / Action | Requester | IT Staff | Administrator | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :--- |
| **Log in / Log out / Session Me** | Yes | Yes | Yes | Session cookie auth (`/api/auth/*`) |
| **Create Ticket** | Yes | No | No | `requireRole('REQUESTER')` |
| **View Own Tickets (Dashboard)** | Yes | No (uses queue) | No (uses queue) | Scoped to `requesterId === req.user.id` |
| **View Staff Ticket Queue** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Claim / Reassign Ticket** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Update IT Operational Priority** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Transition Ticket Status** | No | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Indicate Problem Resolved (Advisory)** | Yes (own tickets) | No | No | `POST /api/tickets/:id/confirm-resolved` |
| **Post Public Comment** | Yes (own tickets) | Yes (authorized) | Yes (authorized) | `POST /api/tickets/:id/comments` |
| **View Public Comments** | Yes (own tickets) | Yes | Yes | `GET /api/tickets/:id/comments` |
| **Post / View Internal Notes** | No (strictly hidden) | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **View Actions Taken** | Yes (own tickets, read-only) | Yes | Yes | Scoped by ownership / role |
| **Create Action Taken** | No (hidden in UI) | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **Edit Action Taken** | No (hidden in UI) | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **View Operational Dashboard** | No (403 Forbidden) | Yes | Yes | `requireRole('IT_STAFF', 'ADMINISTRATOR')` |
| **User Administration (CRUD/Reset)** | No | No | Yes | `requireRole('ADMINISTRATOR')` |

---

## 8. Ticket Lifecycle, State Machine & Resolution Gate Architecture

### 8.1 Status Lifecycle Diagram

```
[NEW] ──(Claim / Assign)──> [OPEN] ──(Start Work)──> [IN_PROGRESS] ──(Resolution Gate)──> [RESOLVED] ──(Close)──> [CLOSED]
  │                           │                            ▲  │                                │                     │
  │                           │             Wait for Req   │  │                                │                     │
  │ (Cancel)                  │ (Cancel)           ┌───────┘  │ (Cancel)                       │ (Reopen)            │ (Reopen)
  │                           │                    │          ▼                                │                     │
  ▼                           ▼                    [WAITING_FOR_REQUESTER]                     ▼                     ▼
[CANCELLED] <─────────────────┴───────────────────────────────┴────────────────────────────> [REOPENED] ──────────> [OPEN]
```

### 8.2 Architectural Decoupling: State Machine vs. Resolution Gate

To maintain clean architecture and ensure code reusability between client and server:

1. **Pure Structural State Machine (`shared/ticketStateMachine.ts`):**
   * Remains a pure, synchronous TypeScript module without database or asynchronous dependencies.
   * Validates state transition topology (`ALLOWED_STATUS_TRANSITIONS`).
   * Validates text format and character bounds for transition reasons (`resolutionSummary`: 10–1,000 chars, `cancellationReason`: 10–500 chars, `reopenReason`: 10–500 chars).
   * Validates that `NEW -> OPEN` transitions possess an assigned `ownerId`.
   * Can be safely executed in client form validation without database access.

2. **Server-Enforced Resolution Gate (API Controller / Service Layer):**
   * Executes as an asynchronous transactional check on the server before invoking database updates.
   * Queries child action records: `const actionsCount = await prisma.actionTaken.count({ where: { ticketId } })`.
   * Enforces that `IN_PROGRESS -> RESOLVED` transitions satisfy `actionsCount >= 1`.
   * If `actionsCount === 0`, rejects the request immediately:
     ```json
     {
       "error": {
         "code": "RESOLUTION_ACTION_REQUIRED",
         "message": "At least one action taken must be recorded before resolving this ticket.",
         "details": {
           "ticketId": 42,
           "currentStatus": "IN_PROGRESS",
           "requestedStatus": "RESOLVED",
           "actionsCount": 0
         }
       }
     }
     ```

### 8.3 Advisory Requester Resolution Clarification

* When an authenticated Requester invokes `POST /api/tickets/:id/confirm-resolved`, the application:
  1. Sets `ticket.resolutionIndicated = true`.
  2. Leaves `ticket.status` completely unchanged (no automatic status transition occurs; the ticket retains its existing status).
  3. Appends an automated public comment indicating the Requester's confirmation.
  4. Records a `TicketActivity` entry (`REQUESTER_CONFIRMED_RESOLVED`).
* **Critical Boundary Rule:** `resolutionIndicated = true` is strictly advisory and **must not alter the ticket status** under any circumstances (including for tickets in `WAITING_FOR_REQUESTER` or `IN_PROGRESS`). It cannot transition status to `RESOLVED` or `CLOSED`, nor can it bypass the Resolution Gate. Formal resolution is strictly reserved for IT Staff and Administrators after ensuring `actionsCount >= 1`, providing a compliant `resolutionSummary` (10–1,000 characters), and submitting `PATCH /api/tickets/:id/status`.

---

## 9. Domain Models & Relational Architecture

### 9.1 Relational Architecture Diagram

```
┌───────────────────────────┐            ┌─────────────────────────────────────────┐
│           User            │ 1        N │                 Ticket                  │
├───────────────────────────┤────────────├─────────────────────────────────────────┤
│ id: Int (PK)              │            │ id: Int (PK)                            │
│ email: String (Unique)    │            │ ticketNo: String (Unique)               │
│ fullName: String          │            │ summary: String(100)                    │
│ role: UserRole            │            │ description: String(2000)               │
│ isActive: Boolean         │            │ requestedPriority: Priority             │
└─────────────┬─────────────┘            │ itPriority: Priority?                   │
              │                          │ status: TicketStatus                    │
              │ 1                        │ resolutionIndicated: Boolean            │
              │                          │ resolutionSummary: String(2000)?        │
              │                          │ ownerId: Int? (FK -> User.id)           │
              │                          │ requesterId: Int (FK -> User.id)        │
              │                          │ createdAt: DateTime                     │
              │                          │ updatedAt: DateTime                     │
              │                          └────────────────────┬────────────────────┘
              │                                               │ 1
              │                                               │
              │ N                                             │ N
┌─────────────┴───────────────────────────────────────────────┴────────────────────┐
│                                   ActionTaken                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ id: Int (PK, autoincrement)                                                      │
│ ticketId: Int (FK -> Ticket.id, Cascade)                                         │
│ performedById: Int (FK -> User.id, Restrict)                                     │
│ description: String(2000) (Non-empty, 10..2000 chars)                           │
│ actionType: String(50) (e.g., INVESTIGATION, CONFIGURATION, REPAIR, CLIENT_COMM) │
│ timeSpentMinutes: Int (1..1440)                                                  │
│ performedAt: DateTime (Past or present ISO timestamp)                            │
│ createdAt: DateTime (default: now())                                             │
│ updatedAt: DateTime (@updatedAt, concurrency token)                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Prisma Model Schema (`ActionTaken`)

```prisma
model ActionTaken {
  id               Int      @id @default(autoincrement())
  ticketId         Int
  ticket           Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedById    Int
  performedBy      User     @relation("PerformedActions", fields: [performedById], references: [id], onDelete: Restrict)
  description      String   @db.VarChar(2000)
  actionType       String   @default("INVESTIGATION") @db.VarChar(50)
  timeSpentMinutes Int
  performedAt      DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([ticketId])
  @@index([performedById])
  @@index([performedAt])
}
```

---

## 10. Sprint 4 Issue Acceptance Criteria (Issues 18 to 25)

### Issue 18 — Sprint 4 Documentation, Contracts, and Test Plan
* **AC-18-01:** `docs/lab-04/specification.md` defines numbered Functional Requirements (FR-01 through FR-12) and Business Rules (BR-01 through BR-10), including parent-child `Ticket 1:N ActionTaken` rules (BR-01, BR-02).
* **AC-18-02:** `docs/lab-04/specification.md` explicitly defines the server-enforced Resolution Gate: `IN_PROGRESS -> RESOLVED` requires `resolutionSummary` (10–1000 chars) and `actionsCount >= 1`, while preserving pure structural transitions in `shared/ticketStateMachine.ts`.
* **AC-18-03:** `docs/lab-04/specification.md` specifies that Requester `resolutionIndicated = true` is strictly advisory and cannot alter ticket status.
* **AC-18-04:** `docs/lab-04/api-spec.md` defines `expectedUpdatedAt` for optimistic concurrency control on Action Taken updates, returning `409 STALE_ACTION_CONFLICT` on mismatch and `400 MISSING_CONCURRENCY_TOKEN` if omitted.
* **AC-18-05:** `docs/lab-04/api-spec.md` specifies that `performedById` is populated server-side from session auth and client-provided IDs are ignored/rejected.
* **AC-18-06:** `docs/lab-04/api-spec.md` documents dashboard metric calculations, distinguishing Lab Sheet mandates from project design decisions (`recentlyResolved` uses a rolling 7-day window).
* **AC-18-07:** `docs/lab-04/ui-spec.md` specifies that Requester views hide Create and Edit controls for Actions Taken.
* **AC-18-08:** `docs/lab-04/tests.md` contains a complete Requirement → Acceptance Criterion → Test → Evidence traceability matrix covering ALL Lab 4 Functional Requirements (FR-01 through FR-12), ALL Business Rules (BR-01 through BR-10), and the Acceptance Criteria defined across Issues #18–#25.

### Issue 19 — Database Schema, Relational Evolution & Seed Migration
* **AC-19-01:** `ActionTaken` model created in Prisma schema with all mandatory fields and foreign key relations to `Ticket` and `User`.
* **AC-19-02:** Migration runs non-destructively; all pre-existing Lab 3 records (users, tickets, comments, activities, attachments) are 100% preserved.
* **AC-19-03:** Seed script populates historical actions taken for existing tickets idempotently without duplicating records on re-run.

### Issue 20 — Actions Taken REST APIs & Concurrency Control
* **AC-20-01:** `POST /api/tickets/:id/actions` records a new action taken, validating description (10–2000 chars), `timeSpentMinutes` (1–1440), and `performedAt`.
* **AC-20-02:** `performedById` is populated server-side from authenticated session (`req.user.id`); client-provided IDs are discarded or rejected.
* **AC-20-03:** `GET /api/tickets/:id/actions` returns chronological actions taken with performer details.
* **AC-20-04:** `PUT /api/tickets/:id/actions/:actionId` requires `expectedUpdatedAt`; returns `409 STALE_ACTION_CONFLICT` on mismatch and `400 MISSING_CONCURRENCY_TOKEN` if omitted.
* **AC-20-05:** Action creation and updates emit atomic audit log entries in `TicketActivity`.

### Issue 21 — Server-Enforced Resolution Gate & State Machine Enforcement
* **AC-21-01:** Transitioning `IN_PROGRESS -> RESOLVED` without recorded actions (`actionsCount === 0`) returns `422 Unprocessable Entity` (`RESOLUTION_ACTION_REQUIRED`).
* **AC-21-02:** Transitioning `IN_PROGRESS -> RESOLVED` enforces full boundary validation on `resolutionSummary`:
  - Missing `resolutionSummary` (undefined/null/empty) returns `422 Unprocessable Entity` (`VALIDATION_ERROR`).
  - Fewer than 10 characters (e.g. 9 chars or whitespace-only) returns `422 Unprocessable Entity` (`VALIDATION_ERROR`).
  - Exactly 10 characters (valid lower boundary) with `actionsCount >= 1` succeeds (`200 OK`, status set to `RESOLVED`).
  - Exactly 1,000 characters (valid upper boundary) with `actionsCount >= 1` succeeds (`200 OK`, status set to `RESOLVED`).
  - More than 1,000 characters (e.g. 1,001 chars) returns `422 Unprocessable Entity` (`VALIDATION_ERROR`).
* **AC-21-03:** Valid resolution with `actionsCount >= 1` and a compliant 10–1,000 character `resolutionSummary` transitions ticket to `RESOLVED` and logs `TicketActivity`.
* **AC-21-04:** `shared/ticketStateMachine.ts` retains pure structural validation logic decoupled from database queries.
* **AC-21-05:** Requester `POST /api/tickets/:id/confirm-resolved` sets `resolutionIndicated = true` and logs activity, but is strictly advisory and **must not alter the ticket status** under any circumstance.

### Issue 22 — Operational Dashboard & Analytics API
* **AC-22-01:** `GET /api/staff/dashboard` returns aggregated counts for Total Open, In Progress, Waiting for Requester, and Unassigned tickets.
* **AC-22-02:** `recentlyResolved` metric is accurately calculated using a rolling 7-day window.
* **AC-22-03:** Metric calculations distinguish Lab Sheet mandates from project design decisions.
* **AC-22-04:** Endpoint is restricted strictly to `IT_STAFF` and `ADMINISTRATOR` (`403 Forbidden` for Requesters).

### Issue 23 — Actions Taken Client UI & Concurrency Handling
* **AC-23-01:** Staff Ticket Detail displays chronological Actions Taken timeline with author name, timestamp, and duration badges.
* **AC-23-02:** Staff can log new actions via interactive modal form with validation feedback.
* **AC-23-03:** Staff can edit actions; optimistic concurrency conflicts (409) display a conflict dialog comparing changes with reload options.
* **AC-23-04:** Requester views hide Create and Edit controls for Actions Taken, rendering a clean read-only view.

### Issue 24 — Operational Dashboard Client UI & Visualizations
* **AC-24-01:** Operational Dashboard renders KPI summary cards with Zen Green tokens.
* **AC-24-02:** Workload distribution by category and priority is clearly visualized.
* **AC-24-03:** Quick-filter links deep link into Staff Queue with pre-selected filters.
* **AC-24-04:** Dashboard adapts across Desktop, Tablet, and Mobile viewports with zero horizontal page overflow.

### Issue 25 — Integration, E2E Testing, Responsive Audit & Sprint Documentation
* **AC-25-01:** Multi-role Playwright E2E journey tests logging actions, concurrency conflicts, resolution gating, and dashboard metrics.
* **AC-25-02:** 100% passing test execution across server unit/integration, client unit, and E2E suites with zero regressions.
* **AC-25-03:** Complete set of responsive screenshots captured across Desktop (1280px), Tablet (768px), and Mobile (375px).
* **AC-25-04:** Sprint documentation completed (`reviewer.md`, `evidence.md`, `ai-use.md`, `submission-package.md`, `README.md`).

---

## 11. Product Definition of Done

Sprint 4 is complete only when all of the following conditions are verified:
- [ ] Issues 18–25 are implemented and merged sequentially into `lab4-staging`.
- [ ] All four authoritative engineering documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) are complete and consistent.
- [ ] `ActionTaken` model exists in PostgreSQL schema with foreign keys to `Ticket` and `User`.
- [ ] Non-destructive migration preserves 100% of legacy data from Labs 1, 2, and 3.
- [ ] Idempotent seed script populates sample action data.
- [ ] Actions Taken endpoints (`GET`, `POST`, `PUT`) strictly enforce role permissions and optimistic concurrency (`expectedUpdatedAt`).
- [ ] `performedById` is populated server-side from session auth tokens.
- [ ] Server-enforced Resolution Gate rejects `IN_PROGRESS -> RESOLVED` if `actionsCount === 0`.
- [ ] `shared/ticketStateMachine.ts` remains pure, decoupled from database queries.
- [ ] Requester resolution confirmation is strictly advisory and cannot alter status to `RESOLVED`.
- [ ] Operational dashboard API calculates metrics correctly with a rolling 7-day `recentlyResolved` window.
- [ ] Client UI hides Action Taken Create and Edit controls from Requesters.
- [ ] Client UI handles 409 concurrency conflicts with user-friendly conflict resolution options.
- [ ] Responsive layouts adapt cleanly across Desktop, Tablet, and Mobile viewports with zero horizontal page overflow.
- [ ] 100% of automated tests (unit, integration, E2E) pass with zero skipped or todo tests.
- [ ] Production client and server build commands succeed without errors.
- [ ] Peer review completed and signed off in `docs/lab-04/reviewer.md`.
