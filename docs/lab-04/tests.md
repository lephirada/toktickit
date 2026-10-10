# TokTickIT — Sprint 4 Test Engineering Specification (Issue 18)

**Project:** TokTickIT Enterprise IT Helpdesk  
**Sprint:** 4 — Parent-Child Work Structures, Resolution Gates, and Operational Dashboards  
**Frameworks:** Vitest (Frontend & Unit), Supertest (Express API Integration), Playwright (End-to-End E2E)  
**Status:** Authoritative Specification  

---

## 1. Test Engineering Strategy & Architecture

TokTickIT implements a rigorous multi-tiered automated testing pyramid ensuring strict contract adherence, server-enforced role authorization, parent-child relational integrity, optimistic concurrency protection, and zero regression across all historical sprints.

```text
       / \
      / E2E \       Playwright (e2e/lab-04/): Multi-persona E2E journeys & responsive screenshot audit
     /-------\
    /   API   \     Supertest + Vitest (server/tests/lab-04/): Actions Taken, Concurrency, Gate, Dashboard
   /-----------\
  / UI & Unit   \   React Testing Library + Vitest (client/tests/lab-04/): Forms, Modals, 409 Conflict, Dashboard
 /---------------\
/  DB Migration  \  Vitest DB Test (server/tests/lab-04/migration-verification.test.ts): 1:N Schema & Seed
-------------------
```

1. **Database Schema & Seed Tests (`server/tests/lab-04/migration-verification.test.ts`):**  
   Validates the PostgreSQL relational schema for `ActionTaken`. Asserts that foreign key cascades to `Ticket` work correctly, foreign key restrictions to `User` protect performer records, and that historical data from Labs 1–3 (users, tickets, comments, activities, attachments) remains 100% intact. Confirms seed script idempotency across repeated executions.
2. **Backend API Integration Tests (`server/tests/lab-04/*.api.test.ts`):**  
   Uses **Vitest** and **Supertest** against an isolated PostgreSQL instance. Tests:
   * Actions Taken creation and retrieval endpoints with role permissions.
   * Server derivation of `performedById` from session auth tokens.
   * Optimistic concurrency control via `expectedUpdatedAt` (returning 409 on mismatch, 400 when missing).
   * Server-enforced Resolution Gate: asserting `422 RESOLUTION_ACTION_REQUIRED` when `actionsCount === 0`.
   * Advisory Requester confirmation: asserting that `resolutionIndicated = true` never changes ticket status to `RESOLVED`.
   * Operational dashboard metrics: calculating counts and rolling 7-day resolution window.
3. **Frontend Component & Unit Tests (`client/tests/lab-04/*.test.tsx`):**  
   Uses **Vitest** and **React Testing Library** with `@testing-library/user-event`. Tests:
   * Action logging modal validation (character bounds, positive minutes).
   * Requester view control hiding (ensuring Create and Edit buttons are absent from DOM).
   * Concurrency conflict UI modal triggering on 409 responses with reload options.
   * Resolution modal warning banner and action link when `actionsCount === 0`.
   * Operational dashboard KPI cards and category distribution rendering.
4. **End-to-End (E2E) Browser Tests (`e2e/lab-04/*.spec.ts`):**  
   Uses **Playwright** to execute comprehensive browser journeys across multiple personas (Requester, IT Staff, Admin). Covers logging actions, triggering and resolving concurrency conflicts, testing the Resolution Gate block and release, and verifying dashboard metrics. Captures responsive screenshots across Desktop ($1280 \times 900$), Tablet ($768 \times 1024$), and Mobile ($375 \times 812$) viewports with zero horizontal page overflow.
5. **Full Sprint Regression Verification (`server/tests/lab-01..03/`, `client/tests/lab-01..03/`):**  
   All existing unit, API integration, and component tests from Labs 1, 2, and 3 must execute and pass with 100% success rate, guaranteeing zero regression.

---

## 2. Issue Acceptance Criteria to Planned Automated Tests (Issues 18–25)

| Issue ID | Acceptance Criterion | Test Target File | Test Method / Type |
| :--- | :--- | :--- | :--- |
| **AC-18-01** | Specification defines FR-01..12 and BR-01..10, including parent-child `Ticket 1:N ActionTaken` rules | `docs/lab-04/specification.md` | Static Specification Audit |
| **AC-18-02** | Specification defines server-enforced Resolution Gate (`actionsCount >= 1`), decoupling from state machine | `docs/lab-04/specification.md` | Static Architecture Audit |
| **AC-18-03** | Specification specifies Requester `resolutionIndicated = true` is strictly advisory and does not alter ticket status | `docs/lab-04/specification.md` | Static Contract Audit |
| **AC-18-04** | API spec defines `expectedUpdatedAt` for optimistic concurrency (409 conflict, 400 missing token) | `docs/lab-04/api-spec.md` | Static API Contract Audit |
| **AC-18-05** | API spec specifies server derivation of `performedById` from session auth token | `docs/lab-04/api-spec.md` | Static Security Audit |
| **AC-18-06** | API spec documents dashboard calculations, distinguishing mandates from 7-day rolling window | `docs/lab-04/api-spec.md` | Static Metric Contract Audit |
| **AC-18-07** | UI spec specifies Requester views hide Create and Edit controls for Actions Taken | `docs/lab-04/ui-spec.md` | Static UI Spec Audit |
| **AC-18-08** | Complete Requirement → AC → Test → Evidence traceability matrix covering FR-01..12, BR-01..10, Issues 18–25 | `docs/lab-04/tests.md` | Traceability Matrix Review |
| **AC-19-01** | `ActionTaken` model schema with mandatory fields and foreign keys | `server/tests/lab-04/migration-verification.test.ts` | Prisma DB Test |
| **AC-19-02** | Non-destructive migration preserving existing Lab 1–3 records | `server/tests/lab-04/migration-verification.test.ts` | Prisma DB Test |
| **AC-19-03** | Idempotent seed script populating historical action records | `server/tests/lab-04/migration-verification.test.ts` | Seed Script Test |
| **AC-20-01** | `POST /api/tickets/:id/actions` creates action with validation (duration, past/present timestamp) | `server/tests/lab-04/actions-taken.api.test.ts` | Supertest API |
| **AC-20-02** | `performedById` populated server-side; client overrides rejected/ignored | `server/tests/lab-04/actions-taken.api.test.ts` | Supertest API |
| **AC-20-03** | `GET /api/tickets/:id/actions` lists actions with role scoping | `server/tests/lab-04/actions-taken.api.test.ts` | Supertest API |
| **AC-20-04** | `PUT /api/tickets/:id/actions/:actionId` enforces `expectedUpdatedAt` (409 / 400) | `server/tests/lab-04/actions-taken.api.test.ts` | Supertest API |
| **AC-20-05** | Action creation and update emit `TicketActivity` audit records | `server/tests/lab-04/actions-taken.api.test.ts` | Supertest API |
| **AC-21-01** | Transitioning `IN_PROGRESS -> RESOLVED` with `actionsCount = 0` returns 422 `RESOLUTION_ACTION_REQUIRED` | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API |
| **AC-21-02** | Transitioning with missing `resolutionSummary` returns 422 `VALIDATION_ERROR` | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API |
| **AC-21-03** | Transitioning with `resolutionSummary` $< 10$ characters returns 422 `VALIDATION_ERROR` | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API |
| **AC-21-04** | Transitioning with exactly 10 characters and $\ge 1$ action succeeds (200 OK, status `RESOLVED`) | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API |
| **AC-21-05** | Transitioning with exactly 1,000 characters and $\ge 1$ action succeeds (200 OK, status `RESOLVED`) | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API |
| **AC-21-06** | Transitioning with `resolutionSummary` $> 1,000$ characters returns 422 `VALIDATION_ERROR` | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API |
| **AC-21-07** | Valid resolution with $\ge 1$ action and valid summary transitions to `RESOLVED` and logs activity | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API |
| **AC-21-08** | `shared/ticketStateMachine.ts` retains pure structural validation logic decoupled from database | `server/tests/lab-04/ticket-state-machine.test.ts` | Vitest Unit Test |
| **AC-21-09** | Requester `POST /confirm-resolved` sets flag without altering ticket status (status unchanged) | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API |
| **AC-22-01** | `GET /api/staff/dashboard` returns aggregated counts for queue states | `server/tests/lab-04/dashboard.api.test.ts` | Supertest API |
| **AC-22-02** | `recentlyResolved` metric accurately calculated using rolling 7-day window | `server/tests/lab-04/dashboard.api.test.ts` | Supertest API |
| **AC-22-03** | Dashboard calculations distinguish mandates from design decisions | `server/tests/lab-04/dashboard.api.test.ts` | Supertest API |
| **AC-22-04** | Dashboard restricted to `IT_STAFF` and `ADMINISTRATOR` (403 for Requesters) | `server/tests/lab-04/dashboard.api.test.ts` | Supertest API |
| **AC-23-01** | Staff Ticket Detail displays Actions Taken timeline with duration badges | `client/tests/lab-04/ActionsTakenSection.test.tsx` | RTL / Vitest |
| **AC-23-02** | Staff can log new actions via interactive modal with validation | `client/tests/lab-04/LogActionModal.test.tsx` | RTL / Vitest |
| **AC-23-03** | Optimistic concurrency conflict dialog renders on 409 with reload option | `client/tests/lab-04/EditActionModal.test.tsx` | RTL / Vitest |
| **AC-23-04** | Requester views hide Create and Edit controls for Actions Taken | `client/tests/lab-04/RequesterTicketDetail.test.tsx`| RTL / Vitest |
| **AC-24-01** | Operational Dashboard renders KPI cards with Zen Green tokens | `client/tests/lab-04/OperationalDashboard.test.tsx` | RTL / Vitest |
| **AC-24-02** | Category and priority workload distribution visualized | `client/tests/lab-04/OperationalDashboard.test.tsx` | RTL / Vitest |
| **AC-24-03** | Quick-filter links deep link to Staff Queue with pre-selected filters | `client/tests/lab-04/OperationalDashboard.test.tsx` | RTL / Vitest |
| **AC-24-04** | Dashboard layout adapts across viewports with zero horizontal overflow | `client/tests/lab-04/OperationalDashboard.test.tsx` | RTL / Vitest |
| **AC-25-01** | Multi-persona Playwright E2E journey tests actions, gate, and dashboard | `e2e/lab-04/full-journey.spec.ts` | Playwright E2E |
| **AC-25-02** | 100% passing test execution across all suites with zero regressions | `server/tests/` & `client/tests/` | CI Test Suite Runner |
| **AC-25-03** | Screenshot collection across Desktop, Tablet, and Mobile viewports | `e2e/lab-04/capture-screenshots.spec.ts` | Playwright E2E |
| **AC-25-04** | Sprint documentation completed and signed off in `reviewer.md` | `docs/lab-04/*.md` | Documentation Audit |

---

## 3. Requirement-to-Test Traceability Matrix (FR-01 through FR-12)

This matrix establishes end-to-end traceability from each numbered Functional Requirement to its governing Acceptance Criteria, planned automated test files, test methods, expected assertions, and verification evidence artifacts.

| Req ID | Requirement Summary | Governing AC | Target Test File | Test Method / Type | Expected Assertion | Evidence Artifact |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| **FR-01** | Actions Taken Logging & Parent-Child Association | AC-20-01<br>AC-23-02 | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/LogActionModal.test.tsx` | Supertest API<br>RTL Component | Status 201 Created; record linked to `ticketId`; valid description and duration saved. | `artifacts/lab-04/evidence.md`<br>API Response Logs |
| **FR-02** | Authenticated Performer Identity Authority | AC-20-02 | `server/tests/lab-04/actions-taken.api.test.ts` | Supertest API | Status 201; `performedById === req.user.id`; client-provided ID ignored/rejected. | Supertest Assertions |
| **FR-03** | Actions Taken Query & Role-Based Access | AC-20-03<br>AC-23-04 | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/RequesterTicketDetail.test.tsx` | Supertest API<br>RTL Component | Status 200 array; Requesters see only owned tickets; unowned returns 404; controls hidden. | API Response Logs<br>DOM Snapshot |
| **FR-04** | Action Taken Modification & Concurrency Control | AC-20-04<br>AC-23-03 | `server/tests/lab-04/actions-taken.api.test.ts`<br>`client/tests/lab-04/EditActionModal.test.tsx` | Supertest API<br>RTL Component | Returns 409 `STALE_ACTION_CONFLICT` on stale token; 400 on missing token; 200 on match. | Concurrency Conflict Logs |
| **FR-05** | Server-Enforced Resolution Gate | AC-21-01..<br>AC-21-07 | `server/tests/lab-04/resolution-gate.api.test.ts`<br>`client/tests/lab-04/StatusTransitionModal.test.tsx` | Supertest API<br>RTL Component | Full boundary validation: missing summary, $< 10$ chars, $= 10$ chars, $= 1000$ chars, $> 1000$ chars, `actionsCount = 0`, and valid resolution with $\ge 1$ action. | Resolution Gate Boundary Logs |
| **FR-06** | Advisory Requester Resolution Indication | AC-21-09 | `server/tests/lab-04/resolution-gate.api.test.ts` | Supertest API | `resolutionIndicated = true`; ticket status strictly unaltered (remains unchanged); does not set `RESOLVED`. | Audit & Status Logs |
| **FR-07** | Operational Dashboard Metrics API | AC-22-01<br>AC-22-02 | `server/tests/lab-04/dashboard.api.test.ts` | Supertest API | Status 200; `totalOpen`, `inProgress`, `recentlyResolved` (7 days) counts verified. | Dashboard Metrics JSON |
| **FR-08** | Metric Calculation Specification Separation | AC-22-03 | `server/tests/lab-04/dashboard.api.test.ts` | Supertest API | Rolling 7-day boundary test ($t = \text{now} - 6\text{d}$ included, $t = \text{now} - 8\text{d}$ excluded). | Boundary Test Assertions |
| **FR-09** | Role-Based Action UI Controls Visibility | AC-23-04 | `client/tests/lab-04/RequesterTicketDetail.test.tsx`<br>`e2e/lab-04/full-journey.spec.ts` | RTL Component<br>Playwright E2E | `queryByText('+ Log Action') === null`; edit buttons absent for Requester persona. | Responsive Screenshot Evidence |
| **FR-10** | Optimistic Concurrency Conflict UI Handling | AC-23-03<br>AC-25-01 | `client/tests/lab-04/EditActionModal.test.tsx`<br>`e2e/lab-04/full-journey.spec.ts` | RTL Component<br>Playwright E2E | Conflict alert renders with server diff; "Reload Latest" fetches updated revision. | Screenshot of 409 Dialog |
| **FR-11** | Operational Dashboard UI & Responsiveness | AC-24-01<br>AC-24-04 | `client/tests/lab-04/OperationalDashboard.test.tsx`<br>`e2e/lab-04/responsive-overflow.spec.ts` | RTL Component<br>Playwright E2E | KPI cards render; zero horizontal page overflow across 1280px, 768px, 375px viewports. | Responsive Screenshot Catalog |
| **FR-12** | Audit Logging for Actions Taken | AC-20-05 | `server/tests/lab-04/actions-taken.api.test.ts` | Supertest API | `TicketActivity` entries created for `ACTION_TAKEN_ADDED` and `ACTION_TAKEN_UPDATED`. | Activity Timeline Audit |

### 3.1 Resolution Gate Comprehensive Boundary Test Cases

The Resolution Gate test suite (`server/tests/lab-04/resolution-gate.api.test.ts`) must explicitly cover all 7 deterministic boundary conditions:

1. **Missing `resolutionSummary`:** Payload omitting `resolutionSummary` or submitting `null` $\to$ rejected with HTTP **`422 Unprocessable Entity`** (`VALIDATION_ERROR`).
2. **Fewer than 10 Characters:** `resolutionSummary` with 9 characters (or whitespace-padded $< 10$ non-whitespace chars) $\to$ rejected with HTTP **`422 Unprocessable Entity`** (`VALIDATION_ERROR`).
3. **Exactly 10 Characters (Lower Boundary):** `resolutionSummary` with exactly 10 characters and $\ge 1$ recorded action $\to$ succeeds with HTTP **`200 OK`**, transitioning ticket status to `RESOLVED`.
4. **Exactly 1,000 Characters (Upper Boundary):** `resolutionSummary` with exactly 1,000 characters and $\ge 1$ recorded action $\to$ succeeds with HTTP **`200 OK`**, transitioning ticket status to `RESOLVED`.
5. **More than 1,000 Characters:** `resolutionSummary` with 1,001 characters $\to$ rejected with HTTP **`422 Unprocessable Entity`** (`VALIDATION_ERROR`).
6. **Zero Actions Taken (`actionsCount = 0`):** Valid `resolutionSummary` (e.g. 50 characters) submitted on a ticket with no `ActionTaken` records $\to$ rejected with HTTP **`422 Unprocessable Entity`** (`RESOLUTION_ACTION_REQUIRED`).
7. **Valid Resolution with At Least One Action (`actionsCount >= 1`):** Valid `resolutionSummary` submitted on a ticket with $\ge 1$ `ActionTaken` records $\to$ succeeds with HTTP **`200 OK`**, status set to `RESOLVED`, and activity logged.

---

## 4. Business Rules Traceability Matrix (BR-01 through BR-10)

This matrix maps every numbered Business Rule to its enforcement layer, verifying test scenarios, and expected outcomes.

| Rule ID | Rule Name | Enforcement Layer | Target Test File | Verification Scenario | Expected Outcome |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **BR-01** | Parent-Child Relational Integrity | DB Schema & API | `server/tests/lab-04/migration-verification.test.ts` | Attempt creating action with non-existent `ticketId`; assert foreign key cascade. | Database foreign key error; cascade deletes child actions on ticket drop. |
| **BR-02** | Workable State for Action Logging | Server Controller | `server/tests/lab-04/actions-taken.api.test.ts` | Attempt `POST /actions` on ticket in `NEW`, `RESOLVED`, `CLOSED`, or `CANCELLED`. | Rejection with `422 Unprocessable Entity` (`TICKET_NOT_IN_WORKABLE_STATE`). |
| **BR-03** | Server Authority for Performer Identity | Server Controller | `server/tests/lab-04/actions-taken.api.test.ts` | Client submits body containing `"performedById": 999` while authenticated as User 6. | Server inserts `performedById = 6`; ignores client spoof. |
| **BR-04** | Mandatory Resolution Gate | Server Controller | `server/tests/lab-04/resolution-gate.api.test.ts` | Test all 7 boundary cases: missing summary, $< 10$ chars, $= 10$ chars, $= 1000$ chars, $> 1000$ chars, `actionsCount = 0`, and valid resolution with $\ge 1$ action. | 422 `VALIDATION_ERROR` for invalid text bounds; 422 `RESOLUTION_ACTION_REQUIRED` when `actionsCount = 0`; 200 OK when bounds and action count are satisfied. |
| **BR-05** | Advisory Requester Resolution Limitation | Server Controller | `server/tests/lab-04/resolution-gate.api.test.ts` | Requester calls `POST /confirm-resolved` on ticket in `WAITING_FOR_REQUESTER` or `IN_PROGRESS`. | `resolutionIndicated` set to `true`; ticket status is **strictly unaltered** (remains unchanged; does not alter status to `IN_PROGRESS`, `RESOLVED`, or `CLOSED`). |
| **BR-06** | Action Validation & Time Constraints | Validation Layer | `server/tests/lab-04/actions-taken.api.test.ts` | Description $< 10$ or $> 2000$ chars; duration $\le 0$ or $> 1440$; timestamp set in the future (`performedAt > now()`). | Rejection with `422 Unprocessable Entity` (`VALIDATION_ERROR`), confirming future timestamps are strictly disallowed. |
| **BR-07** | Optimistic Concurrency Control Token | Server Controller | `server/tests/lab-04/actions-taken.api.test.ts` | `PUT /actions/:id` called with stale timestamp vs. omitted token. | Returns `409 STALE_ACTION_CONFLICT` on mismatch; `400 MISSING_CONCURRENCY_TOKEN` if omitted. |
| **BR-08** | Role-Based Action Permissions | RBAC Middleware | `server/tests/lab-04/actions-taken.api.test.ts` | Requester calls `POST` or `PUT /actions`; calls `GET /actions` on foreign ticket. | `403 Forbidden` for create/update; `404 Not Found` for unowned query. |
| **BR-09** | Dashboard Authorization & 7-Day Window | Server Controller | `server/tests/lab-04/dashboard.api.test.ts` | Requester calls `GET /dashboard`; ticket resolved 6 days ago vs. 8 days ago. | Requester receives 403; 6-day ticket counted in `recentlyResolved`, 8-day excluded. |
| **BR-10** | Decoupled State Machine Architecture | Shared Module & API | `server/tests/lab-04/ticket-state-machine.test.ts` | Pure `validateStatusTransition` function tested synchronously without database. | State machine evaluates pure structural transitions without DB dependencies. |

---

## 5. Regression Test Plan (Labs 1, 2, and 3 Preservation)

To guarantee that Sprint 4 enhancements do not degrade prior functionality, TokTickIT executes complete regression test suites across all earlier sprint features:

### 5.1 Lab 1 Foundation Regression (`server/tests/lab-01/`)
* Category retrieval (`GET /api/categories`) returns baseline categories.
* System health check (`GET /api/health`) responds `200 OK`.

### 5.2 Lab 2 Requester Experience Regression (`server/tests/lab-02/`, `client/tests/lab-02/`)
* Requester ticket creation with pre-upload attachment staging tokens.
* Attachment upload quota enforcement (max 5 active files, 5MB each).
* Soft-removal modal requiring deletion reason; subsequent downloads return `410 Gone`.
* My Tickets dashboard filtering by status, priority, and ticket number.

### 5.3 Lab 3 Auth, RBAC, Queue, and Admin Regression (`server/tests/lab-03/`, `client/tests/lab-03/`)
* Cookie-based session authentication (`toktickit_session`) with HS256 JWT.
* First-login mandatory password change gate blocking operational routes with 403.
* Staff ticket queue multi-filter queries, sorting, and pagination.
* Ticket claim (`NEW -> OPEN`) and reassignment controls.
* Confidential internal notes strictly filtered from Requester endpoints.
* Admin user management guardrails (self-deactivation prevention, last-admin protection).

---

## 6. End-to-End (E2E) Test Plan & Multi-Persona Journeys

Playwright E2E browser automation validates real user workflows across three persona journeys:

### 6.1 Journey 1: Staff Logs Actions and Passes Resolution Gate (`e2e/lab-04/resolution-gate-flow.spec.ts`)
1. IT Staff (`david.lee@toktickit.com`) logs in and navigates to an assigned ticket in `IN_PROGRESS` with zero recorded actions.
2. Staff clicks `[ Resolve Ticket ]`; modal displays the blocked warning: `"Resolution Blocked: At least one Action Taken must be recorded"`.
3. Staff clicks `[ + Log Action Now ]`; logs an investigation action (20 mins, "Investigated switch port flap").
4. Action Taken appears in timeline; staff re-opens resolution modal; warning is replaced with green checkmark.
5. Staff enters resolution summary (25 chars) and confirms; ticket successfully transitions to `RESOLVED`.

### 6.2 Journey 2: Concurrent Action Edits Trigger 409 Conflict (`e2e/lab-04/concurrency-conflict.spec.ts`)
1. IT Staff A (`david.lee@toktickit.com`) opens an Action Taken edit modal.
2. IT Staff B (`alex.morgan@toktickit.com`) modifies and saves the same action taken via API.
3. IT Staff A clicks `Save Changes`; server rejects with `409 STALE_ACTION_CONFLICT`.
4. Client UI displays the Concurrency Conflict Modal showing Staff B's latest text vs. Staff A's unsaved draft.
5. Staff A clicks `[ Reload Latest Version ]`; the modal updates with Staff B's latest data and new timestamp token.

### 6.3 Journey 3: Requester Read-Only View & Operational Dashboard (`e2e/lab-04/dashboard-and-requester.spec.ts`)
1. Requester (`sarah.connor@toktickit.com`) logs in and views their ticket detail.
2. Actions Taken timeline is visible showing work history, but `[ + Log Action ]` and `[ Edit ]` buttons are absent from DOM.
3. Requester attempts to navigate directly to `/staff/dashboard`; route guard redirects or denies access.
4. Administrator (`admin@toktickit.com`) logs in and accesses `/staff/dashboard`; KPI cards render accurately with rolling 7-day `recentlyResolved` count.

### 6.4 Responsive Screenshot Capture Suite (`e2e/lab-04/capture-screenshots.spec.ts`)
* Captures high-fidelity PNG screenshots for each view across 3 standard viewports:
  - **Desktop:** $1280 \times 900$px
  - **Tablet:** $768 \times 1024$px
  - **Mobile:** $375 \times 812$px
* Asserts that `document.documentElement.scrollWidth <= window.innerWidth` across all captures, proving zero horizontal page overflow.
