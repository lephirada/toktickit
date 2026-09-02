# Lab 2 — Peer Review Record

**Author:** Phirada Lekpaeng — 67070503491 — GitHub: @lephirada  
**Peer reviewer:** Penwatsa Saengyenpan — 67070503431 — GitHub: @Phenwatsa

---

## Pull Requests I authored (reviewed by my partner)

| PR  | Branch                         | Reviewer verdict         |
| :-- | :----------------------------- | :----------------------- |
| #18 | `feature/5-spec-docs`          | Approved                 |
| —   | `ffeature/6-requester-context` | _Pending Implementation_ |
| —   | `feature/7-create-ticket`      | _Pending Implementation_ |
| —   | `feature/8-my-tickets`         | _Pending Implementation_ |
| —   | `feature/9-ticket-detail`      | _Pending Implementation_ |

---

### PR #18 — Issue 5 (Define sprint specifications and test plan)

- **Reviewer comment I received:**

  > checked the documentation against the acceptance criteria. The required specs are all included: functional requirements, business rules, acceptance criteria, DoD, API specifications, UI/design guidelines, planned tests, and the traceability matrix.
  > Everything looks good. Once this PR is peer-reviewed and merged into lab2-staging, the final acceptance criterion will be fully satisfied.

  > I Approved.

- **How I responded:**
  > Thank you for merging.

### PR #19 — Issue 6 (Implement development requester context and seed data)

- **Reviewer comment I received:**

  > I checked the PR against the acceptance criteria, and everything looks good.

  > Prisma models and relationships are set up correctly.
  > Seed data is complete and idempotent, with CI verifying 4 active requesters, 1 inactive requester, 4 categories, and 6 related systems.
  > GET /api/requesters retrieves active requesters from PostgreSQL.
  > The requester selection, localStorage persistence, header display, and requester switching flow are implemented.
  > Dirty form changes are handled with a confirmation dialog, and tickets are reloaded for the selected requester.
  > Both frontend and backend tests are run in CI.
  > All acceptance criteria are covered. Approve

- **How I responded:**
  > Thank you for the review and approval, I have updated reviewer.md , ai_use.md of docs/lab-02 . You can merging this PR into lab2-staging now.

### PR #20 — Issue 7 (Create IT support tickets with pre-upload attachments)

- **Reviewer comment I received:**

  > Overall, the implementation looks good and most of the acceptance criteria are covered. The API, ticket creation flow, validation, UI states, and tests are all in place.

  > One thing to fix is the client-side attachment MIME validation. Currently, a file can pass validation if its extension is allowed even when its MIME type is not. Since the requirement specifies allowed MIME types (JPG, PNG, WEBP, PDF), the client should validate the MIME type directly as well.

  > Once this is fixed, I think the PR should be ready to approve

- **How I responded:**
  > Updated! Added direct file.type MIME validation alongside extension checks in CreateTicketForm.tsx, and added unit tests covering invalid MIME rejection on the client. All tests are passing green. You can merging this PR into lab2-staging now.

---

## Pull Requests I reviewed for my partner

### PR #26 — Issue 5 (Sprint Specification and Test Plan (Spec DD))

- **My comment:**

  > Overall, this PR meets the acceptance criteria. The required specification and test-plan documents are present and cover the requested FRs, BRs, ACs, UI rules, API contracts, and AC-to-test traceability. I only noticed a couple of minor documentation consistency issues: FR-07 mentions IT Priority filtering, but this is not reflected in the API/UI filter specifications, and the AI collaboration guide contains local file:/// links. These are not blockers for this PR, but I recommend aligning them before the related implementation issues.

  > specification.md mentions filtering by IT Priority in FR-07, but api-spec.md does not define an itPriority query parameter for GET /api/tickets, and the UI filter specification does not include an IT Priority filter either. Please consider aligning these specifications before implementing the My Tickets feature.

- **Partner's response:**
  > Thank you for the thorough review and helpful suggestions! I have resolved both consistency items:
  > Updated docs/lab-02/api-spec.md (GET /api/tickets query parameters) and docs/lab-02/ui-spec.md (Filter Bar section) to explicitly include the itPriority filter parameter and UI dropdown, aligning them with FR-07 and the ticket list specification.
  > Replaced all absolute file:/// paths in docs/lab-02/ai-collaboration-guide.md with standard relative markdown links (./specification.md, ./ui-spec.md, etc.)

### PR #27 — Issue 6 (Development Requester Context & Seed Data)

- **My comment:**

  > Reviewed against all acceptance criteria. Everything looks good, the Prisma models/relations, idempotent seed data, active requester API, requester selection UI, global context, and Change Requester flow are all implemented as expected. The required Supertest and Vitest tests are also included and passing.
  > Approved Ka.

- **Partner's response:**
  > Thank you for the review and approval! I have updated docs/lab-02/tests.md and docs/lab-02/reviewer.md with the peer review record. You can merge this PR into lab2-staging now.

### PR #28 — Issue 7 (Ticket Creation & Zen Green Form Foundation)

- **My comment:**

  > Reviewed against all acceptance criteria. The API, Create Ticket UI, validation, attachment constraints, loading/error handling, and requester context are all implemented as expected. The required Supertest and Vitest tests are included and passing.

- **Partner's response:**
  > Thank you for the review and approval! I have updated the peer review record in reviewer.md. PR #28 is ready to be merged into lab2-staging now ka

### PR #29 — Issue 8 (My Tickets Screen (Search, Filter, Sort, Pagination))

- **My comment:**

  > Reviewed the changes against the acceptance criteria. Everything looks good requester isolation, filtering, sorting, pagination, My Tickets UI, and the different UI states are all implemented correctly. The Supertest and Vitest tests are also included and passing, including the multi-user isolation and requester switching cases. So approved ka.

- **Partner's response:**
  > Thank you for the review and approval! I have updated the peer review record in reviewer.md. PR #29 is ready to be merged into lab2-staging
