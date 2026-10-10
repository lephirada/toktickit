# Lab 4 — Peer Review Record

**Author:** Phirada Lekpaeng — 67070503491 — GitHub: @lephirada  
**Peer reviewer:** Penwatsa Saengyenpan — 67070503431 — GitHub: @Phenwatsa

---

## Pull Requests I authored (reviewed by my partner)

| PR                      | Branch                         | Reviewer verdict                |
| :---------------------- | :----------------------------- | :------------------------------ |
| `[PR #50]`              | `feature/18-lab4-spec-docs`    | `[Request Changes -> Approved]` |
| `[PR #... Placeholder]` | `feature/19-actions-taken-db`  | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/20-actions-taken-api` | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/21-resolution-gate`   | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/22-dashboard-api`     | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/23-actions-taken-ui`  | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/24-dashboard-ui`      | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/25-integration-e2e`   | `[Planned]`                     |

---

## Pull Requests I reviewed for my partner

| PR                      | Branch | Reviewer verdict |
| :---------------------- | :----- | :--------------- |
| `[PR #... Placeholder]` | `...`  | `[...]`          |

---

### PR — Issue 18 (Sprint 4 Documentation and Engineering Contract)

- **Branch:** `feature/18-lab4-spec-docs`
- **Reviewer comment I received:**

  > I found a few specification issues that should be resolved before implementation:

  resolutionIndicated conflicts with the Acceptance Criteria

  The Acceptance Criteria states that resolutionIndicated = true is strictly advisory and must not alter the ticket status. However, the current specification says that POST /api/tickets/:id/confirm-resolved automatically transitions WAITING_FOR_REQUESTER -> IN_PROGRESS.

  Please align this behavior with the Acceptance Criteria and update the affected references consistently across specification.md, api-spec.md, and tests.md.

  performedAt validation is inconsistent

  BR-06 states that performedAt cannot be future-dated, while the API/UI specifications allow timestamps up to 5 minutes in the future.

  Please define one authoritative rule and apply it consistently across all three specifications before implementation.

  Resolution Gate test coverage needs boundary cases

  The specification requires resolutionSummary to be 10–1000 characters, but the test traceability does not explicitly cover all boundaries.

  Please add planned tests for:

  missing resolutionSummary
  fewer than 10 characters
  exactly 10 characters
  exactly 1000 characters
  more than 1000 characters
  actionsCount = 0
  valid resolution with at least one action
  Overall, the Sprint 4 documentation is comprehensive and covers the required FR/BR, API contracts, UI behavior, authorization, concurrency, and traceability well. However, the inconsistencies above should be resolved before approval so the specification provides a single, deterministic contract for implementation.

  Verdict: Request Changes

- **How I responded:**

  > Thank you so much for the thorough review! I have addressed all 3 points across the entire documentation suite:

  resolutionIndicated is strictly advisory

  Updated specification.md (FR-06, BR-05, Section 8.3), api-spec.md (Section 6.1), and tests.md (AC-21-09, Section 3, Section 4 BR-05) to strictly enforce that resolutionIndicated = true does NOT alter the ticket status under any circumstance (the current ticket status remains completely unchanged).

  performedAt authoritative rule

  Defined one single rule that performedAt cannot be in the future (performedAt <= now()), rejecting future timestamps with 422 VALIDATION_ERROR on the server and enforcing the max attribute on the UI date picker across specification.md, api-spec.md, ui-spec.md, and tests.md.

  Comprehensive Resolution Gate boundary tests

  Explicitly documented all 7 boundary cases in specification.md (AC-21), api-spec.md (Section 3.2), and tests.md (Section 3.1 & Matrix): missing summary, < 10 chars, = 10 chars, = 1000 chars, > 1000 chars, actionsCount = 0, and valid resolution with ≥ 1 action.

  All 4 specification files now provide a single, deterministic engineering contract ready for implementation.

- **Reviewer comment I received:**

  > Request Changes — Clarify Dashboard Metric Definitions

  The dashboard metric definitions would benefit from more explicit and consistent scope rules.

  Currently, totalTimeSpentMinutes sums action durations associated with active or recently resolved tickets, while categoryBreakdown aggregates non-terminal tickets and their action durations. Although these definitions may be intentional, the specification should clarify the exact ticket-status scope used for each metric to ensure consistent implementation and testing.

  Please explicitly define which ticket statuses and associated ActionTaken records are included in each metric, and ensure the definitions are consistent across api-spec.md and tests.md.

  This will help prevent different implementations from producing different results while still appearing to follow the specification.

- **How I responded:**

  > Thank you for the excellent suggestion! I completely agree that clarifying the exact ticket-status scopes for dashboard metrics is essential for ensuring consistent implementation and testing. I have updated the documentation suite to incorporate explicit definitions and mathematical consistency guarantees.

- **Reviewer comment I received:**

  > The latest revision addresses the previously identified concerns:

  resolutionIndicated is explicitly advisory and does not change the ticket status.
  performedAt validation consistently rejects future timestamps.
  Resolution Gate boundary cases are documented and mapped to the test plan.
  Dashboard metric scopes are now clearly defined, including ticket-status eligibility, ActionTaken duration aggregation, SQL examples, and the invariant that the sum of category durations equals totalTimeSpentMinutes.
  The updated documentation provides clearer and more consistent requirements for implementation and testing. I have no further blocking concerns regarding the previously identified issues.

  Recommendation: Approve.

- **How I responded:**

  > Thanks for the review! The file has been updated based on your comments. Ready to merge.

---

### PR — Issue 19 (Database Schema, Migration, and Seed)

- **Branch:** `feature/19-actions-taken-db`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->

---

### PR — Issue 20 (Actions Taken REST APIs & Concurrency Control)

- **Branch:** `feature/20-actions-taken-api`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->

---

### PR — Issue 21 (Server-Enforced Resolution Gate & State Machine)

- **Branch:** `feature/21-resolution-gate`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->

---

### PR — Issue 22 (Operational Dashboard & Analytics API)

- **Branch:** `feature/22-dashboard-api`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->

---

### PR — Issue 23 (Actions Taken Client UI & Concurrency Handling)

- **Branch:** `feature/23-actions-taken-ui`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->

---

### PR — Issue 24 (Operational Dashboard UI & Visualizations)

- **Branch:** `feature/24-dashboard-ui`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->

---

### PR — Issue 25 (Integration, Playwright E2E Testing & Sprint Release)

- **Branch:** `feature/25-integration-e2e`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->
