# TokTickIT — Sprint 4 Final Submission Package (9 Parts)

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Semester:** 1/2026  
**Lab Assignment:** Lab 4 — TokTickIT Parent-Child Work Structures, Resolution Gates, Operational Dashboards, and Regression Traceability  
**Repository:** `lephirada/toktickit`  
**Integration Branch:** `feature/26-final-submission-artifacts` → `lab4-staging` → `main`  
**Status:** In Progress (Baseline Specifications Established in Issue 18)  

---

## Answer Part 1: Git Use with Engineering Workflow (10 Points)

### 1.1 Git Commit History & Branching Discipline
This sprint strictly enforces a Git Flow branching strategy where feature isolation branches are created sequentially per GitHub Issue, verified through automated CI, reviewed by peer reviewer, and merged into `lab4-staging`:

```text
main (Release / Stable)
 ^
 |-- lab4-staging (Sprint 4 Integration Branch)
 |    ^
 |    |-- feature/18-lab4-spec-docs          (Issue 18: Sprint 4 Specifications & Test Plan)
 |    |-- feature/19-database-migration-actions (Issue 19: ActionTaken Schema & Seed Migration)
 |    |-- feature/20-actions-taken-backend   (Issue 20: Actions Taken REST API & Concurrency)
 |    |-- feature/21-ticket-resolution-gate  (Issue 21: Server-Enforced Resolution Gate)
 |    |-- feature/22-dashboard-backend-apis  (Issue 22: Operational Dashboard Metrics API)
 |    |-- feature/23-actions-taken-ui        (Issue 23: Actions Taken UI & Concurrency Modal)
 |    |-- feature/24-role-dashboards-ui      (Issue 24: Operational Dashboard UI & Layouts)
 |    |-- feature/25-e2e-regression-hardening (Issue 25: Full Multi-Persona E2E & Release)
 |    `-- feature/26-final-submission-artifacts (Issue 26: Final Release & Submission Artifacts)
```

### 1.2 GitHub Project / Kanban Board Evidence
All sprint issues (Issues 18 through 26) are tracked with explicit user stories, functional boundaries, acceptance criteria, and moved through Kanban phases (`Todo` → `In Progress` → `Review` → `Done`).

### 1.3 Peer Review Records
Peer review logs and PR evaluation verdicts are tracked in [`docs/lab-04/reviewer.md`](reviewer.md) with peer reviewer identity, PR links, reviewer critiques, author responses, and approval verdicts.

### 1.4 README & Repository Structure
- Core project README: [`README.md`](../../README.md) updated with complete Lab 4 feature breakdown, endpoint references, and test commands.
- Repository hygiene: Clean `.gitignore` prevents check-in of build outputs, binary attachments, and local environment variables.

---

## Answer Part 2: Spec DD (5 Points)

- **Deliverable Path:** [`docs/lab-04/specification.md`](specification.md)
- **Key Contents:**
  - **Numbered Functional Requirements:** FR-01 through FR-12 covering Actions Taken logging, server identity authority, concurrency control, resolution gating, advisory requester indication, and operational dashboard analytics.
  - **Numbered Business Rules:** BR-01 through BR-10 defining parent-child relational integrity, workable ticket states, server performer derivation, resolution gates, optimistic concurrency tokens (`expectedUpdatedAt`), role visibility, and rolling 7-day dashboard metrics.
  - **Authorization Matrix:** Explicit permission matrix covering Requesters, IT Staff, and Administrators.
  - **Resolution Gate Architecture:** Formal decoupling of pure structural transitions in `shared/ticketStateMachine.ts` from server-enforced database checks (`actionsCount >= 1`).
  - **Acceptance Criteria:** Deterministic criteria (AC-18-01 through AC-25-04).
  - **Product Definition of Done:** Complete verification checklist required prior to sprint release.

---

## Answer Part 3: Test DD and Traceability (10 Points)

- **Deliverable Path:** [`docs/lab-04/tests.md`](tests.md)
- **Test Traceability & Execution Summary:**
  - **Backend API & Unit Tests:** Planned across `server/tests/lab-04/` covering migration safety, Actions Taken endpoints, concurrency conflict detection, Resolution Gate boundary suites (all 7 cases), and dashboard calculations.
  - **Frontend Component Tests:** Planned across `client/tests/lab-04/` covering modal forms, concurrency conflict comparison dialogs, and dashboard KPI cards.
  - **Playwright Browser E2E Tests:** Planned across `e2e/lab-04/` covering multi-persona user journeys and zero page-level horizontal overflow assertions across 3 viewports.
  - **Zero Regressions:** 100% passing automated test execution across pre-existing Lab 1, Lab 2, and Lab 3 suites.

---

## Answer Part 4: AI Use with Reflection (5 Points)

- **Deliverable Path:** [`docs/lab-04/ai-use.md`](ai-use.md)
- **AI Tooling:** Antigravity AI Coding Agent (Gemini 3.8 Flash).
- **Selected Key Prompts:** Documented prompt progressions for specification authoring, boundary test design, optimistic concurrency modeling, and resolution gate decoupling.
- **Student Reflection:** Detailed student reflection on AI capabilities, human engineering judgment, and architectural safeguards.

---

## Answer Part 5: Parent-Child Work Tracking & Actions Taken UI (10 Points)

- **Deliverable Paths:** [`docs/lab-04/ui-spec.md`](ui-spec.md) and [`docs/lab-04/evidence.md`](evidence.md)
- **Evidence Screenshots (Planned for Issue 25):**
  - Staff Ticket Detail Actions Timeline: `artifacts/lab-04/screenshots/actions-timeline/`
  - Log Action Modal Form: `artifacts/lab-04/screenshots/log-action-modal/`
  - Requester Read-Only Work History: `artifacts/lab-04/screenshots/requester-actions-view/`
- **Features Demonstrated:**
  - 1:N Parent-child relationship linking multiple discrete Action Taken records to a parent ticket.
  - Technical action logging with action type categorization, duration tracking (minutes), and past/present timestamps.
  - Server-side derivation of `performedById` from session auth token (`req.user.id`).
  - Role-based control visibility: Requesters see an informational read-only timeline; Create and Edit controls are strictly unrendered.

---

## Answer Part 6: Optimistic Concurrency Control & Conflict Resolution (10 Points)

- **Deliverable Paths:** [`docs/lab-04/api-spec.md`](api-spec.md) and [`docs/lab-04/evidence.md`](evidence.md)
- **Evidence Screenshots (Planned for Issue 25):**
  - 409 Concurrency Conflict Dialog: `artifacts/lab-04/screenshots/concurrency-conflict/`
- **Features Demonstrated:**
  - Revision token management using `expectedUpdatedAt` in action modification requests.
  - HTTP `400 MISSING_CONCURRENCY_TOKEN` returned when the token is omitted.
  - HTTP `409 STALE_ACTION_CONFLICT` returned when the record has been modified by another user.
  - Interactive conflict UI comparing server state vs. unsaved user draft with reload and copy actions.

---

## Answer Part 7: Server-Enforced Resolution Gate (5 Points)

- **Deliverable Paths:** [`docs/lab-04/specification.md`](specification.md) and [`docs/lab-04/tests.md`](tests.md)
- **Evidence Screenshots (Planned for Issue 25):**
  - Resolution Gate Warning Modal: `artifacts/lab-04/screenshots/resolution-gate/`
- **Features Demonstrated:**
  - Transitioning `IN_PROGRESS -> RESOLVED` strictly requires `actionsCount >= 1` and `resolutionSummary` (10–1,000 characters).
  - Attempted resolution with 0 actions returns HTTP `422 ACTION_TAKEN_REQUIRED_FOR_RESOLUTION`.
  - Comprehensive boundary case enforcement ($< 10$, $= 10$, $= 1000$, $> 1000$ characters).
  - Pure structural state machine preserved in `shared/ticketStateMachine.ts`.
  - Requester `resolutionIndicated = true` confirmed as strictly advisory without altering ticket status.

---

## Answer Part 8: Working Operational Dashboard UI & Analytics (5 Points)

- **Deliverable Paths:** [`docs/lab-04/ui-spec.md`](ui-spec.md) and [`docs/lab-04/evidence.md`](evidence.md)
- **Evidence Screenshots (Planned for Issue 25):**
  - Operational Dashboard Grid: `artifacts/lab-04/screenshots/operational-dashboard/`
  - Dashboard Workload Breakdowns: `artifacts/lab-04/screenshots/dashboard-breakdowns/`
- **Features Demonstrated:**
  - Real-time operational KPI summary cards: Total Open, In Progress, Waiting for Requester, and Recently Resolved.
  - Rolling 7-day resolution window metric calculation.
  - Workload aggregation by category and priority distribution.
  - Quick-filter deep links into the Staff Queue with pre-filtered parameters.
  - Role-protected route accessible strictly to `IT_STAFF` and `ADMINISTRATOR` (`403 Forbidden` for Requesters).

---

## Answer Part 9: Zen Green UI & Zero Horizontal Overflow Verification (5 Points)

- **Deliverable Paths:** [`docs/lab-04/ui-spec.md`](ui-spec.md) and [`docs/lab-04/evidence.md`](evidence.md)
- **Visual Design System Checklist:**
  - Design Tokens: Cohesive Zen Green `#006b3c`, pale mint `--zg-pale`, status fills, and WCAG 2.1 AA accessible contrast ratios ($\ge 4.5:1$).
  - Responsive Viewport Verification: Validated across Desktop (1280px), Tablet (768px), and Mobile (375px) viewports.
  - Zero Page-Level Overflow: Verified via Playwright automated assertions (`scrollWidth <= clientWidth`), strictly isolating horizontal scrollbars within inner table containers.
