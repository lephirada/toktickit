# Lab 4 — Peer Review Record

**Author:** Phirada Lekpaeng — 67070503491 — GitHub: @lephirada  
**Peer reviewer:** Penwatsa Saengyenpan — 67070503431 — GitHub: @Phenwatsa

---

## Pull Requests I authored (reviewed by my partner)

| PR                      | Branch                                  | Reviewer verdict                |
| :---------------------- | :-------------------------------------- | :------------------------------ |
| `[PR #50]`              | `feature/18-lab4-spec-docs`             | `[Request Changes -> Approved]` |
| `[PR #51]`              | `feature/19-database-migration-actions` | `[Approved]`                    |
| `[PR #52]`              | `feature/20-actions-taken-backend`      | `[Request Changes -> Approved]` |
| `[PR #53]`              | `feature/21-ticket-resolution-gate`     | `[Request Changes]`             |
| `[PR #... Placeholder]` | `feature/22-dashboard-backend-apis`     | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/23-actions-taken-ui`           | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/24-role-dashboards-ui`         | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/25-e2e-regression-hardening`   | `[Planned]`                     |
| `[PR #... Placeholder]` | `feature/26-final-submission-artifacts` | `[Planned]`                     |

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

- **Branch:** `feature/19-database-migration-actions`
- **Reviewer comment I received:**

  > The PR satisfies the core acceptance criteria for Issue 19:

  The ActionTaken model includes the required fields and string-length constraints.
  The migration adds the new table, indexes, and foreign keys without introducing destructive changes to existing tables.
  The foreign-key deletion rules preserve the intended behavior: ON DELETE CASCADE for tickets and ON DELETE RESTRICT for users, consistent with BR-15.
  The seed implementation uses existing-record checks and upserts to support repeatable execution and covers tickets with zero, one, and multiple actions.
  The added verification tests cover schema constraints, referential integrity, migration data preservation, and seed behavior.
  I found no blocking issues in the reviewed diff. The reported test results are documented in the PR, although I have not independently rerun the migration or test suite during this review.

Recommendation: Approve.

- **How I responded:**
  > Thanks for the review! The file has been updated based on your comments. Ready to merge.

---

### PR — Issue 20 (Actions Taken REST APIs & Concurrency Control)

- **Branch:** `feature/20-actions-taken-backend`
- **Reviewer comment I received:**

  > The PR implements the core Actions Taken API endpoints and covers the main acceptance criteria, including session-derived performedById, Requester ownership restrictions, role authorization, terminal-ticket guards, validation, and atomic conditional updates for optimistic concurrency control.

Before approval, I recommend addressing the following issues:

Optimistic concurrency token reliability: The update handler explicitly sets updatedAt to new Date(). If the new timestamp equals the previous value at the database's timestamp precision, a stale expectedUpdatedAt token may still match, undermining the guarantee that concurrent edits result in exactly one success and one 409 STALE_ACTION_CONFLICT. Please guarantee that the concurrency token changes on every successful update and add a test for same-timestamp updates.

PUT follow-up note validation: The update handler does not consistently validate followUpNote length when followUpRequired is false. An oversized value may reach the database and result in a 500 instead of a validation response. Please validate the field whenever it is supplied and add a corresponding API test.

Future timestamp boundary: The current validation allows timestamps up to 60 seconds in the future, despite the PR description stating that future timestamps are rejected. Please align the implementation and tests with the authoritative specification.

Verification evidence consistency: docs/lab-04/evidence.md reports different full-suite totals (280/280 and 285/285). Please reconcile these values with the actual test output.

The existing API test suite provides broad coverage, but I have not independently rerun the tests or build during this review.

Recommendation: Request Changes until the concurrency-token guarantee and validation gaps are addressed.

- **How I responded:**

  > Thanks for the detailed review! I’ve updated the concurrency token handling to ensure updatedAt advances on successful updates, added validation for followUpNote when it is provided, tightened future timestamp validation, and reconciled the test counts in the evidence document.

  I’ll verify the regression tests and the latest CI results before requesting another review. Thanks for helping me catch these issues!

- **Reviewer comment I received:**

  > Reviewed the implementation against the Lab 4 API specification.

  > - **`actionType` validation:** The implementation uses a `String` field with a maximum length of 50 characters, consistent with the API specification. An enum whitelist is not explicitly required.
  > - **`performedAt` updates:** The PUT endpoint supports updating `performedAt`, as documented in the API specification. Future timestamps must be rejected.
  > - **IT Staff ticket access:** Access to tickets in the queue is consistent with the documented authorization scope; access is not limited to tickets personally assigned to the IT Staff member.
  >
  > I found no blocking issues in these three areas. **Recommend approval**, provided the latest CI checks pass and the remaining acceptance criteria are satisfied.

- **How I responded:**

  > Thanks for approving the PR! I have already updated docs/lab-04/reviewer.md with the latest comment. You can merge this PR.

---

### PR — Issue 21 (Server-Enforced Resolution Gate & State Machine)

- **Branch:** `feature/21-ticket-resolution-gate`
- **Reviewer comment I received:**

  > Request Changes — Resolution Gate error contract

The Resolution Gate correctly checks the ActionTaken count and returns HTTP 422 when no action has been recorded. However, the error code does not match the Acceptance Criteria in Issue #44.

Expected: ACTION_TAKEN_REQUIRED_FOR_RESOLUTION
Current: RESOLUTION_ACTION_REQUIRED
Please align the error code across the server response, automated tests, and docs/lab-04/evidence.md, including the example JSON response. This is an API contract mismatch that should be fixed before approval.

Also, Issue #44 specifies server/tests/lab-04/ticket-workflow.api.test.ts, while this PR adds server/tests/lab-04/resolution-gate.api.test.ts. Please align the filename with the specified deliverable, or update the issue if the alternative filename is intentional.

The core resolution-gate logic and requester advisory behavior otherwise appear consistent with the stated requirements based on the reviewed PR details. Please rerun the relevant tests after making these changes.

- **How I responded:**

  > Thanks for the feedback! I have aligned the Resolution Gate error code to `ACTION_TAKEN_REQUIRED_FOR_RESOLUTION` across `server/src/app.ts`, `docs/lab-04/evidence.md`, and the automated tests. I also renamed the test file to `server/tests/lab-04/ticket-workflow.api.test.ts` as specified in Issue #44, and verified all 24/24 targeted tests and 319/319 full server regression tests pass. Ready for re-review!

---

### PR — Issue 22 (Operational Dashboard & Analytics API)

- **Branch:** `feature/22-dashboard-backend-apis`
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

- **Branch:** `feature/24-role-dashboards-ui`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->

---

### PR — Issue 25 (Integration, Playwright E2E Testing & Sprint Release)

- **Branch:** `feature/25-e2e-regression-hardening`
- **Reviewer comment I received:**

  > <!-- Placeholder for partner review comments -->

- **How I responded:**
  > <!-- Placeholder for author response -->

## Pull Requests I reviewed for my partner

### PR - Issue 20 : Sprint 4 Engineering Contracts, Specification & Test Plan (Spec DD)

- **My comment:**

> The documentation is well structured and covers the main Lab 4 requirements, including Actions Taken, the resolution gate, concurrency handling, role-based dashboards, and responsive UI specifications. Before approval, I think a few points need clarification to ensure the specifications are consistent and safe to use for implementation. Authentication contract: api-spec.md specifies JWT Bearer authentication. Please reconcile this with the existing Lab 3 authentication mechanism and explicitly document the approved approach so the new APIs remain compatible with the existing application. Acceptance criteria and test traceability: Please review the AC-to-test mappings in tests.md, especially the shared AC-15 and AC-19 entries. Separate criteria where they represent distinct behaviors, and ensure each criterion has clear, testable coverage. Follow-up validation consistency: BR-04 requires at least three non-whitespace characters in the follow-up note, but the UI validation description does not explicitly reflect the same minimum length. Please align the API, UI, and planned tests. Concurrency scope: Please clarify whether optimistic concurrency protection applies only to ticket status transitions or also to edits of other records, including Actions Taken. Migration recovery and seed coverage: Please document the migration rollback or recovery strategy and its planned verification. Also, explicitly map the required seed scenarios ticket statuses, priorities, assigned and unassigned ownership, zero/one/multiple Actions Taken, and zero/non-zero dashboard metrics to the planned tests. These changes would make the engineering contract more consistent and reduce ambiguity for the subsequent implementation issues. I recommend revising these points before approval.

---

> Thanks for addressing the previous review feedback. The authentication contract, separated dashboard acceptance criteria, UI follow-up validation, concurrency scope, and seed scenario mapping are much clearer now. I still recommend a few final clarifications before approval: Follow-up validation consistency: BR-04 requires at least 3 non-whitespace characters, but FR-04, AC-02, and the planned tests still primarily describe blank or whitespace-only values. Please align the FR, AC, API error messages, and Unit/API/UI test cases to cover notes shorter than 3 characters as well. Migration rollback and recovery: In specification.md 7.3, prisma migrate resolve --rolled-back changes Prisma's migration history state; it does not itself reverse the schema changes. Please document a valid rollback/recovery sequence and ensure MIG-01 verifies both schema recovery and preservation of legacy data. Seed test assertions: Please make SEED-01 explicitly verify the required scenarios and idempotency after repeated seed runs, including all statuses and priorities, assigned/unassigned tickets, 0/1/multiple Actions Taken, and zero/non-zero dashboard metrics. Once these details are aligned across the specifications and planned tests, I think the documentation will be in a much stronger position for approval.

---

> Thanks for addressing the previous review feedback. The updated specifications are much more consistent now, especially the follow-up note validation, migration recovery plan, seed scenario coverage, authentication contract, and AC-to-test traceability. I reviewed the documentation against the acceptance criteria. The required specification files are present, the planned tests cover the defined acceptance criteria, and the PR remains within the documentation-only scope. I approved. One minor documentation improvement would be to replace the phrase 1:1 for AC-to-test mapping with complete traceability, since some acceptance criteria are covered by multiple test suites. Overall, the documentation is ready to serve as the engineering contract for the subsequent implementation issues.

- **Partner's response:**
  > Thank you for the review and approval! I have updated the documentation in specification.md §9 to replace the phrase '1:1' with 'complete traceability' to accurately reflect our multi-tier test coverage across the acceptance criteria. With all feedback addressed and specifications finalized, PR #59 is ready to merge into lab4-staging.

### PR - Issue 21 : Database Migration, Seed Data & Actions Taken Backend Foundation

- **My comment:**

  > The Prisma migration, seed data, and Actions Taken APIs look good to me. The required role restrictions and follow-up validation are implemented, and the backend tests and CI checks pass. I approved.

- **Partner's response:**
  > Thank you for the review and approval! All review comments, type safety enhancements, and negative test suites covering boolean types, note boundaries, and ISO-8601 UTC date formats are in place. All 35 Actions Taken API tests, 43 total Lab 4 tests, and 152 regression tests pass cleanly. PR #60 is ready to merge into lab4-staging.
