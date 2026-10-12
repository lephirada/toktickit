# Lab 4 — AI Use and Reflection

**LLM/agent used:** Antigravity AI Coding Agent (Gemini 3.8 Flash)

---

## Selected Key Prompts (Sprint 4 / Issues 18–25)

| #   | Prompt (summarised) | What I did with the result |
| :-- | :------------------ | :------------------------- |
| 1   | **Establish Sprint 4 Baseline Engineering Contract & Specifications (Issue 18):** Formulate the complete engineering contract across the documentation suite (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) incorporating 12 Functional Requirements (FR-01..12), 10 Business Rules (BR-01..10), parent-child `Ticket 1:N ActionTaken` relational architecture, optimistic concurrency contracts (`expectedUpdatedAt`), server-enforced Resolution Gate, advisory Requester confirmation semantics, operational dashboard calculations (rolling 7-day window), and Product Definition of Done. | Reviewed architectural scope against Lab 4 guidelines, verified all 12 FRs and 10 BRs, ensured strict role separation between Requesters and IT Staff, and established deterministic Acceptance Criteria across Issues 18–25. |
| 2   | **Align Advisory Requester Resolution Semantics (Issue 18):** Resolve specification conflict regarding `resolutionIndicated = true`. Ensure `POST /api/tickets/:id/confirm-resolved` is strictly advisory and does not alter the ticket status under any circumstances across `specification.md`, `api-spec.md`, and `tests.md`. | Verified that ticket status remains completely unchanged (preserving `WAITING_FOR_REQUESTER` or `IN_PROGRESS`), ensuring formal resolution remains an authoritative staff action gated by `actionsCount >= 1`. |
| 3   | **Standardize `performedAt` Timestamp Validation Rule (Issue 18):** Define one authoritative validation rule for `performedAt` timestamps across `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`, eliminating contradictory clock skew allowances. | Enforced strict past-or-present validation (`performedAt <= now()`), rejecting future timestamps with `422 Unprocessable Entity` (`VALIDATION_ERROR`) and setting the HTML `max` attribute on client datetime inputs. |
| 4   | **Enumerate Comprehensive Resolution Gate Boundary Cases (Issue 18):** Expand Resolution Gate specifications and test matrices to explicitly cover all 7 boundary cases: missing summary, $< 10$ chars, exactly 10 chars, exactly 1,000 chars, $> 1,000$ chars, `actionsCount = 0`, and valid resolution with $\ge 1$ action. | Detailed the boundary validation table in `api-spec.md` and added explicit test cases and assertions to `tests.md` and `specification.md`. |
| 5   | **Clarify Operational Dashboard Metric Status Scopes & Action Duration Criteria (Issue 18):** Explicitly define which ticket statuses apply to ticket counting metrics (`totalOpen`, `inProgress`, `waitingForRequester`, `recentlyResolved`, `unassignedCount`, `categoryBreakdown.ticketCount`, `priorityBreakdown`) versus which ticket statuses qualify for Action Taken duration aggregation (`totalTimeSpentMinutes` and `categoryBreakdown.totalTimeSpentMinutes`), establishing the mathematical invariant $\sum \text{categoryBreakdown.totalTimeSpentMinutes} = \text{totalTimeSpentMinutes}$. | Updated `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with explicit side-by-side comparative matrices, SQL query definitions, and deterministic boundary test cases. |
| 6   | **Execute Non-Destructive Database Evolution & Idempotent Seed Implementation (Issue 19):** Implement the `ActionTaken` model in `schema.prisma` with mandatory fields, indexes, and referential constraints (`ticketId` cascade, `performedById` restrict preserving BR-15). Generate migration `20261011000000_add_action_taken`, deploy cleanly, update `seed.ts` with realistic actions covering 0, 1, and multiple actions across assigned and unassigned tickets, and assert idempotency across consecutive runs. | Applied migration via `prisma migrate deploy`, validated schema integrity, verified seed idempotency with exit code 0 on repeated executions, and added comprehensive verification suite in `tests/lab-04/migration-verification.test.ts`. |
| 7   | **Implement Actions Taken REST APIs & Optimistic Concurrency Control (Issue 20):** Implement secure REST API endpoints for Actions Taken (`GET`, `POST`, `PUT`), enforcing session-derived `performedById` (`req.user.id`), Requester ownership access boundaries (403 Forbidden on foreign tickets and create/edit attempts), terminal status protection (`CLOSED` and `CANCELLED` rejected with 422), mandatory `followUpNote` validation when `followUpRequired=true`, and optimistic concurrency control (`expectedUpdatedAt` check returning 409 `STALE_ACTION_CONFLICT` on mismatch, 400 when omitted). Implement automated integration tests in `server/tests/lab-04/actions-taken.api.test.ts`. | Implemented endpoints in `server/src/app.ts`, verified zero-trust identity derivation, validated all 22 test cases in `actions-taken.api.test.ts` (100% pass), verified regression across the full server suite (280/280 pass), and recorded terminal logs and JSON error envelopes in `evidence.md`. |

---

## Reflection

### Where AI Helped

> <!-- TODO: Student personal reflection on where AI helped during Sprint 4 -->

### Where Human Judgment Mattered

> <!-- TODO: Student personal reflection on where human judgment mattered during Sprint 4 -->

### Key Takeaways

> <!-- TODO: Student personal reflection on key takeaways and lessons learned during Sprint 4 -->
