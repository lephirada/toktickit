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

---

## Reflection

### Where AI Helped

> <!-- TODO: Student personal reflection on where AI helped during Sprint 4 -->

### Where Human Judgment Mattered

> <!-- TODO: Student personal reflection on where human judgment mattered during Sprint 4 -->

### Key Takeaways

> <!-- TODO: Student personal reflection on key takeaways and lessons learned during Sprint 4 -->
