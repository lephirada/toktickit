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

### PR #18 — Issue 5 (Define sprint specifications and test plan

)

- **Reviewer comment I received:**

  > checked the documentation against the acceptance criteria. The required specs are all included: functional requirements, business rules, acceptance criteria, DoD, API specifications, UI/design guidelines, planned tests, and the traceability matrix.
  > Everything looks good. Once this PR is peer-reviewed and merged into lab2-staging, the final acceptance criterion will be fully satisfied.

  > I Approved.

- **How I responded:**
  > Thank you for merging.

---

## Pull Requests I reviewed for my partner

### PR #26 — Issue 5 (Sprint Specification and Test Plan (Spec DD)

)

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
