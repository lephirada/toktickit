# TokTickIT — Sprint 4 Final Submission Package (9 Parts)

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Semester:** 1/2026  
**Lab Assignment:** Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression (Score: 60)  
**Repository:** `lephirada/toktickit`  
**Author:** Phirada Lekpaeng — 67070503491 (`@lephirada`)  
**Peer Reviewer:** Penwatsa Saengyenpan — 67070503431 (`@Phenwatsa`)  
**Integration Branch:** `feature/26-final-submission-artifacts` → `lab4-staging` → `main`  
**Status:** Verification & Submission Hardening Complete

---

## Answer Part 1: Git Use with Engineering Workflow (10 Points)

### 1.1 Git Commit History & Branching Discipline
Sprint 4 strictly enforces a staged Git Flow branching discipline where feature isolation branches are created sequentially per GitHub Issue, verified through automated CI, reviewed by the designated peer reviewer, and merged into `lab4-staging` via Pull Requests.

```text
main (Production / Final Release Baseline)
 ^
 |-- lab4-staging (Sprint 4 Staged Integration Branch)
 |    ^
 |    |-- feature/18-lab4-spec-docs          (Issue 18: Sprint 4 Specifications & Test Plan)    [PR #50 - Merged: 1c7e825]
 |    |-- feature/19-database-migration-actions (Issue 19: ActionTaken Schema & Seed Migration) [PR #51 - Merged: 4da1b6a]
 |    |-- feature/20-actions-taken-backend   (Issue 20: Actions Taken REST API & Concurrency)   [PR #52 - Merged: dbab303]
 |    |-- feature/21-ticket-resolution-gate  (Issue 21: Server-Enforced Resolution Gate)        [PR #53 - Merged: c4c6c36]
 |    |-- feature/22-dashboard-backend-apis  (Issue 22: Operational Dashboard Metrics API)      [PR #55 - Merged: 6c72332]
 |    |-- feature/23-actions-taken-ui        (Issue 23: Actions Taken UI & Concurrency Modal)   [PR #56 - Merged: 7a4a42b]
 |    |-- feature/24-role-dashboards-ui      (Issue 24: Operational Dashboard UI & Layouts)     [PR #57 - Merged: 728e580]
 |    |-- feature/25-e2e-regression-hardening (Issue 25: Full Multi-Persona E2E & Hardening)    [PR #58 - Merged: 6c8345f]
 |    `-- feature/26-final-submission-artifacts (Issue 26: Final Release & Submission Artifacts)[PR #... - Ready for Review]
 |
 |-- lab3-staging (Sprint 3 Release Baseline) [PR #40 - Merged into main: 1322a89]
 |-- lab2-staging (Sprint 2 Release Baseline) [PR #23 - Merged: 524e8d5]
 `-- lab1-staging (Sprint 1 Release Baseline) [PR #12 - Merged: 126bed7]
```

#### Authentic Git Merge Proof (Commit Log from `lab4-staging`)
```text
6c8345f Merge pull request #58 from lephirada/feature/25-e2e-regression-hardening
728e580 Merge pull request #57 from lephirada/feature/24-role-dashboards-ui
7a4a42b Merge pull request #56 from lephirada/feature/23-actions-taken-ui
6c72332 Merge pull request #55 from lephirada/feature/22-dashboard-backend-apis
a88e436 Merge pull request #54 from lephirada/docs/lab4-contract-alignment
c4c6c36 Merge pull request #53 from lephirada/feature/21-ticket-resolution-gate
dbab303 Merge pull request #52 from lephirada/feature/20-actions-taken-backend
4da1b6a Merge pull request #51 from lephirada/feature/19-database-migration-actions
1c7e825 Merge pull request #50 from lephirada/feature/18-lab4-spec-docs
```

> **Git Governance Note:** Per release engineering rules, the merge from `lab4-staging` into `main` is gated until all acceptance criteria and peer reviews are completed.

### 1.2 GitHub Project / Kanban Board Evidence
All sprint activities (Issues 18 through 26) were decomposed and managed via GitHub Projects with standard Kanban states (`Todo` → `In Progress` → `Review` → `Done`):
- **Issues 18–25:** Closed / Done upon peer reviewer approval and PR merge into `lab4-staging`.
- **Issue 26 (#49):** In Progress for final documentation, screenshot compilation, and submission package validation.

### 1.3 Peer Review Records
Peer review interactions, critiques, and author responses are fully preserved in [`docs/lab-04/reviewer.md`](reviewer.md):
- **Author:** Phirada Lekpaeng (`@lephirada`, 67070503491)
- **Peer Reviewer:** Penwatsa Saengyenpan (`@Phenwatsa`, 67070503431)
- **PRs Reviewed by Partner:** PR #50 (Issue 18), PR #51 (Issue 19), PR #52 (Issue 20), PR #53 (Issue 21), PR #55 (Issue 22), PR #56 (Issue 23), PR #57 (Issue 24), PR #58 (Issue 25).
- **PRs Author Reviewed for Partner:** PR #59 (Issue 20), PR #60 (Issue 21), PR #61 (Issue 22), PR #62 (Issue 23), PR #63 (Issue 24), Issue 25.
- **Review Rigor Demonstrated:** Changes requested on PR #50 (Resolution Gate boundary cases), PR #52 (optimistic concurrency atomicity), PR #53 (error code standardization), and PR #58 (Admin password state isolation across E2E runs), all followed by explicit author responses, verified code fixes, and subsequent approvals.

### 1.4 README & Repository Hygiene
- **Root README:** [`README.md`](../../README.md) updated with complete Lab 4 architecture, seed execution, REST API reference tables, test commands, and screenshot mapping.
- **`.gitignore` Hygiene:** Strictly excludes `node_modules/`, `dist/`, build artifacts, `.env` files, temporary execution logs, and binary attachments.
- **Repository Structure:** Conforms to Lab 4 requirements (`docs/lab-04/`, `server/tests/lab-04/`, `client/tests/lab-04/`, `e2e/lab-04/`, `artifacts/lab-04/screenshots/`).

---

## Answer Part 2: Spec DD (5 Points)

- **Deliverable Path:** [`docs/lab-04/specification.md`](specification.md)
- **Companion Specifications:** [`docs/lab-04/api-spec.md`](api-spec.md) and [`docs/lab-04/ui-spec.md`](ui-spec.md)

### 2.1 Specification Deliverables & Core Rules
1. **Numbered Functional Requirements:** FR-01 through FR-12 covering Actions Taken lifecycle, server identity authority, concurrency conflict detection, resolution gating, advisory requester indication, and operational dashboard analytics.
2. **Numbered Business Rules:** BR-01 through BR-10 defining parent-child relational integrity, workable ticket states, server performer derivation, resolution gates (`actionsCount >= 1`), optimistic concurrency tokens (`expectedUpdatedAt`), role visibility, and rolling 7-day dashboard metrics.
3. **Actions Taken & Ticket Transition Rules:** Explicit state transition matrix covering all 8 ticket states (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
4. **Resolution Gate Architecture:** Formal decoupling of pure structural transitions in `shared/ticketStateMachine.ts` from server-enforced database checks (`actionsCount >= 1` returning HTTP 422 `ACTION_TAKEN_REQUIRED_FOR_RESOLUTION`).
5. **Dashboard Calculations:** Formulae for rolling 7-day windows, priority breakdowns using effective priority `COALESCE(itPriority, requestedPriority)`, and the mathematical duration invariant $\sum \text{categoryBreakdown.totalTimeSpentMinutes} \equiv \text{metrics.totalTimeSpentMinutes}$.
6. **Acceptance Criteria & Definition of Done:** Observable, testable criteria (AC-18-01 through AC-25-07) and Product Definition of Done checklist.
7. **Database Migration Decisions:** Non-destructive evolution with `ActionTaken` table, `ON DELETE RESTRICT` for user preservation (BR-15), and `ON DELETE CASCADE` for ticket cleanups.

### 2.2 Proof of Spec Existence Before Implementation (Spec-Driven Development)
The specification was committed and merged into `lab4-staging` prior to any database schema migration or application code implementation:
- **Specification Commit:** `cfa9bf0` — `Thu Oct 8 17:51:09 2026 +0700`
- **Specification PR #50 Merged:** `1c7e825` — `Sun Oct 11 01:07:46 2026 +0700`
- **First Implementation PR #51 Merged:** `4da1b6a` — `Mon Oct 12 18:50:12 2026 +0700`

---

## Answer Part 3: Test DD and Traceability (10 Points)

- **Deliverable Path:** [`docs/lab-04/tests.md`](tests.md)
- **Companion Evidence:** [`docs/lab-04/evidence.md`](evidence.md)

### 3.1 Traceability Matrix
`docs/lab-04/tests.md` maps every Functional Requirement (FR-01..12), Business Rule (BR-01..10), and Acceptance Criterion (AC-18-01..AC-25-07) to dedicated automated test files, test identifiers, and execution assertions.

### 3.2 Automated Test Execution Summary (613/613 Passed — Zero Overlap / Zero Double-Counting)

The test pyramid consists of **613 distinct automated tests across 4 non-overlapping layers**. The table below distinguishes suites verified during the current verification session (`feature/26-final-submission-artifacts`) from historical regression runs verified and merged in PR #58 (`6c8345f` / `9c1a0c7`):

| Test Layer | Test Suite Location | Test Count | Pass Rate | Execution Command & Session |
| :--- | :--- | :---: | :---: | :--- |
| **Server Unit & Integration** | `server/tests/` (20 test files) | **351 / 351** | **100%** | `npm --prefix server test` (Current Session: 22.46s, exit 0) |
| **Client Component Tests** | `client/tests/` (19 test files) | **182 / 182** | **100%** | `npm --prefix client test` (Current Session: 11.03s, exit 0) |
| **Lab 4 Playwright E2E** | `e2e/lab-04/` (5 spec files) | **16 / 16** | **100%** | `npx playwright test --config e2e/lab-04/playwright.config.ts` (PR #58 / `6c8345f`) |
| **Lab 3 Playwright Regression**| `e2e/lab-03/` (7 spec files) | **64 / 64** | **100%** | `npx playwright test e2e/lab-03/` (PR #58 / `6c8345f`) |
| **Total Automated Tests** | **All 4 Layers Combined** | **613 / 613** | **100%** | Distinct suites across backend, frontend, and browser E2E |

### 3.3 TypeScript Static Analysis & Production Build
- **Client TypeScript Check:** `npx --prefix client tsc --noEmit` $\rightarrow$ **0 errors (Pass)**
- **Server TypeScript Check:** `npx --prefix server tsc --noEmit` $\rightarrow$ **0 errors (Pass)**
- **Client Production Build:** `npm --prefix client run build` $\rightarrow$ `vite build` generated production bundle in 1.06s with **0 errors**.
- **Server Production Build:** `npm --prefix server run build` $\rightarrow$ `tsc` compiled server bundle with **0 errors**.

```text
$ npm --prefix client test -- --run tests/lab-04/
 ✓ tests/lab-04/RequesterDashboard.test.tsx (6)
 ✓ tests/lab-04/LogActionModal.test.tsx (10)
 ✓ tests/lab-04/ActionsTakenSection.test.tsx (7)
 ✓ tests/lab-04/ConcurrencyConflictDialog.test.tsx (8)
 ✓ tests/lab-04/EditActionModal.test.tsx (5)
 ✓ tests/lab-04/StaffDashboard.test.tsx (11)
 ✓ tests/lab-04/DashboardRouting.test.tsx (24)
Test Files  7 passed (7)
     Tests  71 passed (71)
  Duration  3.72s

$ npm --prefix server test
Test Files  20 passed (20)
     Tests  351 passed (351)
  Duration  22.46s
```

---

## Answer Part 4: AI Use with Reflection (5 Points)

- **Deliverable Path:** [`docs/lab-04/ai-use.md`](ai-use.md)
- **Primary AI Agents:** Antigravity AI Coding Agent (Gemini 3.8 Flash) as coding assistant, paired with GPT for peer review analysis and detailed prompt preparation.
- **Key Prompts Documented:** 24 structured prompts covering Sprint 4 (Issues 18–25), documenting problem formulation, architectural constraints, boundary matrices, and verification protocols.

### 4.1 Student Reflection (from `ai-use.md`)

#### Where AI Helped
AI helped me in several parts of Sprint 4, including planning tasks, writing code, creating test cases, checking edge cases, reviewing pull requests, and preparing documentation. I used Gemini as my coding assistant and GPT to review pull requests and create detailed instructions for Gemini. Using both tools helped me approach problems from different perspectives and find issues that I might have missed.

#### Where Human Judgment Mattered
I learned that AI does not always understand the bigger picture of a task. Sometimes, Gemini completed the requested requirements but only at a surface level. It often followed the instructions exactly without exploring other related areas or checking whether the implementation was fully complete. When I asked GPT to review the work, it sometimes found deeper issues that were not included in the original instructions. This made me realize that writing clear and detailed instructions is very important. I also had to compare the results, decide which feedback was relevant, and make sure the final work actually met the requirements. Human judgment was still necessary throughout the process.

#### Key Takeaways
My main takeaway is that using AI does not mean I can simply give it a task and trust the result. AI can save time and help me solve problems, but its output still needs to be checked carefully. I also learned that a good prompt should explain not only what to do, but also what to inspect, what could go wrong, and how to verify the result. In future projects, I want to improve my instructions so that AI can work more thoroughly instead of only completing the listed tasks.

---

## Answer Part 5: Working IT Staff Dashboard UI (5 Points)

- **UI Component:** [`client/src/components/StaffDashboard.tsx`](../../client/src/components/StaffDashboard.tsx)
- **Backend API:** `GET /api/staff/dashboard` in [`server/src/app.ts`](../../server/src/app.ts)
- **Screenshot Directory:** [`artifacts/lab-04/screenshots/staff-dashboard/`](../../artifacts/lab-04/screenshots/staff-dashboard/)

### 5.1 Operational Metrics & Backend Consistency
1. **7 KPI Summary Cards:** Total Open, In Progress, Waiting for Requester, Recently Resolved ($\le 7$ days), Unassigned, Assigned to Me, and Total Time Spent (minutes).
2. **Database Query Consistency:** Backend calculates metrics directly from authoritative Prisma aggregations. Invariant verified:
   $$\sum_{i} \text{categoryBreakdown}[i].\text{totalTimeSpentMinutes} \equiv \text{metrics.totalTimeSpentMinutes}$$
3. **P0 Urgent Tickets Section:** Dedicated `staff-urgent-tickets-card` highlighting critical items with deep-link navigation to the queue. When 0 urgent tickets exist, displays `staff-empty-urgent-tickets` ("No urgent P0 tickets currently requiring immediate attention.").
4. **Recent Queue Activity:** Renders latest active tickets with quick view buttons, or `staff-empty-recent-tickets` when queue is empty.
5. **Interactive Drill-Down Navigation:** Clicking any KPI card opens `/staff/queue` pre-filtered with corresponding query parameters (`status=NEW,OPEN`, `resolvedWithinDays=7`, etc.).
6. **Role Boundary Enforcement:** Route guarded in `App.tsx` via `resolveAllowedView`; unauthorized Requester requests return `403 Forbidden` (`FORBIDDEN_ROLE`).

### 5.2 Screenshot Artifacts
- **Desktop (1280px):** [`staff-dashboard-1280.png`](../../artifacts/lab-04/screenshots/staff-dashboard/staff-dashboard-1280.png) ($2560 \times 2516$)
- **Tablet (768px):** [`staff-dashboard-768.png`](../../artifacts/lab-04/screenshots/staff-dashboard/staff-dashboard-768.png) ($1536 \times 3960$)
- **Mobile (375px):** [`staff-dashboard-375.png`](../../artifacts/lab-04/screenshots/staff-dashboard/staff-dashboard-375.png) ($750 \times 5260$)
- **Metric Drill-Down Queue:** [`dashboard-drilldown-queue-1280.png`](../../artifacts/lab-04/screenshots/staff-dashboard/dashboard-drilldown-queue-1280.png) ($2560 \times 1800$)
- **Empty State Demonstration (1280px):** [`staff-dashboard-empty.png`](../../artifacts/lab-04/screenshots/staff-dashboard/staff-dashboard-empty.png) ($2560 \times 2038$) — Non-destructive browser capture demonstrating `staff-empty-urgent-tickets` ("No urgent P0 tickets currently requiring immediate attention.") and `staff-empty-recent-tickets` ("No recent ticket activity found.") with 0 values across all KPI cards, executed via client API route response interception to protect PostgreSQL seed data integrity.

---

## Answer Part 6: Working Actions Taken UI (10 Points)

- **UI Components:**
  - [`ActionsTakenSection.tsx`](../../client/src/components/ActionsTakenSection.tsx) (Timeline & List)
  - [`LogActionModal.tsx`](../../client/src/components/LogActionModal.tsx) (Create Form)
  - [`EditActionModal.tsx`](../../client/src/components/EditActionModal.tsx) (Edit Form)
  - [`ConcurrencyConflictDialog.tsx`](../../client/src/components/ConcurrencyConflictDialog.tsx) (409 Conflict Dialog)
- **Backend API:** `/api/tickets/:id/actions` and `/api/actions/:id`
- **Screenshot Directory:** [`artifacts/lab-04/screenshots/actions-taken/`](../../artifacts/lab-04/screenshots/actions-taken/)

### 6.1 Features Demonstrated
1. **1:N Parent-Child Relationship:** Multiple discrete Actions Taken belong to a single Ticket. Verified on seed ticket `TKT-2026-00014` and dynamic test tickets.
2. **Action Logging (Create Mode):** Records Action Date/Time, Action Description, Result, Follow-up Required flag, Follow-up Note (conditionally required when `followUpRequired=true`), Attachment Notes, and Time Spent (minutes) with preset buttons.
3. **Server-Derived Performer Identity:** `performedById` is derived strictly from the authenticated session (`req.user.id`). Client-supplied identity overrides are ignored (BR-03).
4. **Optimistic Concurrency Control (HTTP 409):** Edits transmit `expectedUpdatedAt`. Stale submissions receive genuine HTTP 409 `STALE_ACTION_CONFLICT`, triggering `ConcurrencyConflictDialog` showing side-by-side server vs. draft comparison, safe clipboard copy, and server refresh reload.
5. **Role-Based DOM Security:** Requesters receive an informational read-only timeline. Create, Edit, and status mutation controls are completely omitted from the DOM (not hidden with CSS).

### 6.2 Screenshot Artifacts
- **Staff Actions Timeline (1280px):** [`actions-timeline-staff-1280.png`](../../artifacts/lab-04/screenshots/actions-taken/actions-timeline-staff-1280.png) ($2560 \times 4024$)
- **Staff Actions Timeline (768px):** [`actions-timeline-staff-768.png`](../../artifacts/lab-04/screenshots/actions-taken/actions-timeline-staff-768.png) ($1536 \times 4642$)
- **Staff Actions Timeline (375px):** [`actions-timeline-staff-375.png`](../../artifacts/lab-04/screenshots/actions-taken/actions-timeline-staff-375.png) ($750 \times 6504$)
- **Log Action Modal (1280px):** [`log-action-modal-1280.png`](../../artifacts/lab-04/screenshots/actions-taken/log-action-modal-1280.png) ($2560 \times 1800$)
- **Log Action Modal Mobile (375px):** [`log-action-modal-375.png`](../../artifacts/lab-04/screenshots/actions-taken/log-action-modal-375.png) ($750 \times 1624$)
- **409 Concurrency Conflict Dialog (1280px):** [`concurrency-conflict-1280.png`](../../artifacts/lab-04/screenshots/actions-taken/concurrency-conflict-1280.png) ($2560 \times 1800$)
- **409 Concurrency Conflict Mobile (375px):** [`concurrency-conflict-375.png`](../../artifacts/lab-04/screenshots/actions-taken/concurrency-conflict-375.png) ($750 \times 1624$)
- **Requester Read-Only Timeline (1280px):** [`actions-timeline-requester-1280.png`](../../artifacts/lab-04/screenshots/actions-taken/actions-timeline-requester-1280.png) ($2560 \times 3840$)
- **Requester Read-Only Mobile (375px):** [`actions-timeline-requester-375.png`](../../artifacts/lab-04/screenshots/actions-taken/actions-timeline-requester-375.png) ($750 \times 5762$)
- **Staff vs Requester Role Comparison:** [`role-comparison-staff-vs-requester.png`](../../artifacts/lab-04/screenshots/actions-taken/role-comparison-staff-vs-requester.png) ($1920 \times 1621$)

---

## Answer Part 7: Working Ticket Workflow (5 Points)

- **Workflow Implementation:** [`server/src/app.ts`](../../server/src/app.ts) (`PATCH /api/tickets/:id/status`)
- **State Machine Definition:** [`shared/ticketStateMachine.ts`](../../shared/ticketStateMachine.ts)
- **Automated Verification:** `server/tests/lab-04/ticket-workflow.api.test.ts` (24 tests) and `e2e/lab-04/ticket-resolution.spec.ts` (3 tests)

### 7.1 Server-Enforced Resolution Gate
1. **Gated Resolution:** Transitioning from `IN_PROGRESS` to `RESOLVED` requires at least one Action Taken (`actionsCount >= 1`) and a valid resolution summary (10–1,000 characters).
2. **Rejection Behavior:** Attempted resolution on a ticket with 0 actions returns HTTP 422 `ACTION_TAKEN_REQUIRED_FOR_RESOLUTION`. The UI renders an alert banner while keeping the modal open to preserve user input.
3. **Successful Transition:** Once a valid Action Taken is recorded, the same resolution transition returns HTTP 200, updates status to `RESOLVED`, advances `resolvedAt`, and records an immutable activity audit entry.
4. **Boundary Verification:** Automated tests assert $<10$ chars (422), $=10$ chars (200), $=1000$ chars (200), and $>1000$ chars (422).

### 7.2 Advisory Requester Resolution Semantics
- When a Requester clicks "Mark Resolved", the request updates `resolutionIndicated = true`.
- **Ticket status remains strictly unaltered** (`WAITING_FOR_REQUESTER` or `IN_PROGRESS`). Only authorized IT Staff can formally transition the ticket to `RESOLVED` after fulfilling the Resolution Gate.

---

## Answer Part 8: Working Requester Dashboard and Final Regression UI (5 Points)

- **UI Component:** [`client/src/components/RequesterDashboard.tsx`](../../client/src/components/RequesterDashboard.tsx)
- **Screenshot Directory:** [`artifacts/lab-04/screenshots/requester-dashboard/`](../../artifacts/lab-04/screenshots/requester-dashboard/)

### 8.1 Requester Dashboard Features & Ownership Isolation
1. **Personal Summary Cards:** Displays authenticated requester's personal metrics (My Open Tickets, In Progress, Resolved in last 7 days, and Closed).
2. **Recent Tickets Table:** Displays latest tickets with status badges, category, and date. When no tickets exist, displays `dashboard-empty-state` with CTA button to create ticket.
3. **Quick Action CTAs:** "Create Ticket" and "View My Tickets" shortcuts.
4. **Strict Data Isolation:** Backend enforces that Requesters only receive their own ticket data. Foreign ticket IDs and Staff dashboards return `403 Forbidden`.

### 8.2 Full Application Regression Coverage (Labs 1–3)
- **Authentication & Security:** Login, session cookie issuance, first-login password change gate, role navigation.
- **Requester Ticketing:** Create Ticket with attachments staging, dirty form guards, My Tickets search/filters, soft-removal of attachments with audit trail.
- **IT Staff Operations:** Queue filtering, ticket claims, reassignments, status transitions, and confidential internal notes.
- **Administrator Management:** User directory listing, account creation, role editing, password reset, and last-admin safety protections.

### 8.3 Screenshot Artifacts
- **Requester Dashboard (1280px):** [`requester-dashboard-1280.png`](../../artifacts/lab-04/screenshots/requester-dashboard/requester-dashboard-1280.png) ($2560 \times 1800$)
- **Requester Dashboard Tablet (768px):** [`requester-dashboard-768.png`](../../artifacts/lab-04/screenshots/requester-dashboard/requester-dashboard-768.png) ($1536 \times 2048$)
- **Requester Dashboard Mobile (375px):** [`requester-dashboard-375.png`](../../artifacts/lab-04/screenshots/requester-dashboard/requester-dashboard-375.png) ($750 \times 2440$)

---

## Answer Part 9: Zen Green UI, Responsive, Accessibility, and Final Polish (5 Points)

- **Design Specification:** [`docs/lab-04/ui-spec.md`](ui-spec.md)
- **Design Tokens & Theme:** [`client/src/index.css`](../../client/src/index.css)

### 9.1 Visual Design System Checklist (Zen Green)
- [x] **Primary Token Consistency:** Primary green `#006B3C` (`--zg-primary`), light mint `--zg-pale` (`#E6F4EA`), active accents, and clean white card backgrounds.
- [x] **Status Badges:** All 8 statuses verified with distinct text-backed badges and CSS token styling in `DesignSystemTokens.test.tsx`.
- [x] **Private vs. Shared Visual Cues:** Internal staff notes framed with amber callout border (`.zen-callout-warning`), clearly distinguished from public discussion comments.

### 9.2 Responsive Layout & Zero Overflow Verification
- [x] **Viewports Verified:** Tested across Desktop ($1280 \times 900$), Tablet ($768 \times 1024$), and Mobile ($375 \times 812$).
- [x] **Zero Page-Level Overflow:** Playwright automated assertions verify `document.documentElement.scrollWidth <= window.innerWidth` across all dashboard and detail views at 375px.
- [x] **Isolated Horizontal Scrolling:** Large tables are enclosed in `.table-responsive` containers with internal scrollbars, preventing page blowout.

### 9.3 Accessibility Compliance (WCAG 2.1 AA)
- [x] **Visible Keyboard Focus Rings:** Interactive elements and `role="button"` enforce `outline: 2px solid rgb(11, 122, 70)` with `outline-offset: 2px`.
- [x] **Color-Blind Friendly:** All status indicators pair color coding with clear textual labels (no status conveyed by color alone).
- [x] **Form Labels & Error Feedback:** Error banners and validation messages are placed directly above or adjacent to affected input controls.
- [x] **Touch Target Sizing:** Interactive buttons and pills satisfy minimum $\ge 44\text{px}$ touch targets on mobile viewports.
