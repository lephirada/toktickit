# Lab 3 — Peer Review Record

**Author:** Phirada Lekpaeng — 67070503491 — GitHub: @lephirada  
**Peer reviewer:** Penwatsa Saengyenpan — 67070503431 — GitHub: @Phenwatsa

---

## Pull Requests I authored (reviewed by my partner)

| PR                      | Branch                                    | Reviewer verdict                |
| :---------------------- | :---------------------------------------- | :------------------------------ |
| `[PR #32]`              | `feature/10-lab3-documentation`           | `[Approved]`                    |
| `[PR #33]`              | `feature/11-database-migration`           | `[Request Changes -> Approved]` |
| `[PR #34]`              | `feature/12-authentication-authorization` | `[Request Changes -> Approved]` |
| `[PR #... Placeholder]` | `feature/13-client-auth-shell`            | `[Pending]`                     |
| `[PR #... Placeholder]` | `feature/14-staff-queue`                  | `[Pending]`                     |
| `[PR #... Placeholder]` | `feature/15-staff-ticket-operations`      | `[Pending]`                     |
| `[PR #... Placeholder]` | `feature/16-user-management`              | `[Pending]`                     |
| `[PR #... Placeholder]` | `feature/17-integration-e2e`              | `[Pending]`                     |

---

### PR — Issue 10 (Documentation and Engineering Contract)

- **Branch:** `feature/10-lab3-documentation`
- **Reviewer comment I received:**

  > Reviewed the latest changes against the Lab 03 acceptance criteria. The required documentation is complete, FR-01 to FR-15 are consistent, and the API, UI, testing, migration, and evidence specifications are properly documented. The previous logout ambiguity has also been clarified. No blocking issues found.

- **How I responded:**
  > Thank you for your careful review Ka! You can merge this PR into lab3-staging as the documentation foundation is now complete and aligned with all acceptance criteria.

---

### PR — Issue 11 (Database Schema, Migration, and Seed)

- **Branch:** `feature/11-database-migration`
- **Reviewer comment I received:**

  > Request Changes
  > I found two issues that should be fixed before approval:
  >
  > 1. mustChangePassword is set to false by default in both schema.prisma and the migration, but the acceptance criteria require the default to be true.
  > 2. migration.test.ts tests a locally duplicated runSeed() implementation instead of executing the actual server/prisma/seed.ts. Therefore, it does not fully verify the real seed script's idempotency and password-state preservation required by AC-11-05 and AC-11-08.
  >    Please fix these issues and update the migration tests accordingly.

- **How I responded:**

  > Thank you for the feedback Ka. I have reviewed and addressed both concerns. Please check the PR again.

- **Reviewer comment I received:**

  > Reviewed the latest changes against the Lab 03 acceptance criteria.
  > The previous issues have been addressed:
  >
  > - mustChangePassword now defaults to true in both the Prisma schema and migration.
  > - migration.test.ts now executes the actual server/prisma/seed.ts and verifies seed idempotency and credential preservation.
  > - The migration, schema changes, seed logic, and verification tests are consistent with the requirements. CI is also passing.
  > - No blocking issues found.

- **How I responded:**
  > Thank you for the review and approval Ka, I have updated reviewer.md of docs/lab-03. You can merging this PR into lab2-staging now.

---

### PR — Issue 12 (Authentication and Authorization)

- **Branch:** `feature/12-authentication-authorization`
- **Reviewer comment I received:**

  > I found two issues that should be fixed before approval:
  >
  > JWT verification does not require iat and exp
  > verifySessionToken() only validates sub, email, and role.
  > A correctly signed token without iat/exp could still pass verification, which does not fully match the required JWT contract and could allow a token without expiration.
  >
  > JWT_SECRET is not validated at application startup
  > getJwtSecret() exits the process for a missing/weak secret only when the function is called.
  > The server can therefore start in production without a valid JWT_SECRET, contrary to the requirement that production must fail to start when the secret is missing or weak.
  >
  > Please fix these two issues before approval.

- **How I responded:**

  > Thanks for pointing these out. Both issues have been fixed

- **Reviewer comment I received:**

  > Reviewed the latest changes against the Issue 12 acceptance criteria. All required authentication, JWT/session handling, role-based authorization, requester ownership isolation, password-change gate, discussion endpoints, CORS configuration, and test coverage are implemented as required.
  >
  > The two issues from the previous review have also been addressed:
  >
  > iat and exp are now required during JWT verification.
  > JWT_SECRET is now validated at application startup in production.
  > No blocking issues found.

  > Approve.

---

### PR — Issue 13 (Client Authentication and Shared Application Shell)

- **Branch:** `feature/13-client-auth-shell`
- **Reviewer comment I received:**

  > `[Placeholder: Partner review comments for Issue 13 PR]`

- **How I responded:**
  > `[Placeholder: Author response to partner feedback]`

---

### PR — Issue 14 (Staff Queue)

- **Branch:** `feature/14-staff-queue`
- **Reviewer comment I received:**

  > `[Placeholder: Partner review comments for Issue 14 PR]`

- **How I responded:**
  > `[Placeholder: Author response to partner feedback]`

---

### PR — Issue 15 (Staff Ticket Operations)

- **Branch:** `feature/15-staff-ticket-operations`
- **Reviewer comment I received:**

  > `[Placeholder: Partner review comments for Issue 15 PR]`

- **How I responded:**
  > `[Placeholder: Author response to partner feedback]`

---

### PR — Issue 16 (User Management)

- **Branch:** `feature/16-user-management`
- **Reviewer comment I received:**

  > `[Placeholder: Partner review comments for Issue 16 PR]`

- **How I responded:**
  > `[Placeholder: Author response to partner feedback]`

---

### PR — Issue 17 (Integration, End-to-End Testing, Responsive UI, and Final Verification)

- **Branch:** `feature/17-integration-e2e`
- **Reviewer comment I received:**

  > `[Placeholder: Partner review comments for Issue 17 PR]`

- **How I responded:**
  > `[Placeholder: Author response to partner feedback]`

---

## Pull Requests I reviewed for my partner

### PR — Issue 12 (Sprint 3 Engineering Contracts, Specification & Test Plan (Spec DD))

- **My comment:**

  > Request changes for these small documentation updates. I found two small documentation clarifications that would improve consistency: AC-20 covers attachment upload, download, and soft-delete ownership isolation, but the current API continuity section and API-21 description do not explicitly define or test the attachment download operation. Please add the download endpoint/authorization behavior and include it in API-21. AC-03 covers both requester ticket-list isolation and unauthorized ticket-detail access, but API-06 currently focuses mainly on a client-supplied requesterId. Please clarify that API-06 also verifies that a requester cannot access another user's ticket detail and that ownership is always derived from req.user.id. The remaining items, including the planned status of tests and the pending living-document sections, are appropriate for this documentation stage. Please address these minor traceability clarifications before merging PR #42 into lab3-staging.

- **Partner's response:**

  > Hi @lephirada, I have updated the documentation based on your review (added attachment download in AC-20/API-21, clarified req.user.id ticket detail ownership in AC-03/API-06, and explicitly referenced Lab 2 contracts). Please re-check and approve PR #42 when you have a moment. Thanks!

- **My response:**

  > Reviewed the updates. The required Lab 3 specifications and previous requested clarifications are now included. The acceptance criteria are met. Approved Ka.

- **Partner's response:**
  > Thank you so much for reviewing and approving PR #42! Proceeding to merge into lab3-staging.

---

### PR — Issue 13 (Database Migration, Seed Data & Authentication Foundation (Backend API))

- **My comment:**

  > Please make a few updates before approval:
  > Set the seeded Administrator’s mustChangePassword to true, as required by the acceptance criteria.
  > Add evidence that the migration completed without data loss.
  > Include the actual test output to confirm that the required tests pass.
  > After these updates, I can review the PR again.

- **Partner's response:**

  > Hi @lephirada, thank you for the review! I have updated PR #43 to address all requested items:

  > Seeded Admin Password Flag: Set mustChangePassword: true for the seeded Administrator (admin@toktickit.local) in server/prisma/seed.ts.
  > Zero-Data-Loss Evidence: Documented complete migration verification evidence in docs/lab-03/reviewer.md and docs/lab-03/specification.md:
  > RequesterUser → User 1:1 preservation and FK integrity intact.
  > itPriority backfilled from requestedPriority for all existing tickets.
  > Legacy ticketOwner mapped to ticketOwnerId, with unmatched legacy values preserved in \_LegacyTicketOwnerAudit table and appended to ticket description.
  > Categories, RelatedSystems, and Attachments 100% preserved.
  > Actual Test Runner Output: Confirmed that all 64 server tests pass cleanly:
  > ✓ tests/lab-01/categories.test.ts (1)
  > ✓ tests/lab-01/health.test.ts (1)
  > ✓ tests/lab-02/attachments.api.test.ts (9)
  > ✓ tests/lab-02/create-ticket.api.test.ts (8)
  > ✓ tests/lab-02/my-tickets.api.test.ts (7)
  > ✓ tests/lab-02/requesters.api.test.ts (2)
  > ✓ tests/lab-02/ticket-detail.api.test.ts (4)
  > ✓ tests/lab-03/auth.api.test.ts (8)
  > ✓ tests/lab-03/authorization.api.test.ts (7)
  > ✓ tests/lab-03/unit/password-policy.unit.test.ts (7)
  > ✓ tests/lab-03/unit/role-auth.unit.test.ts (5)
  > ✓ tests/lab-03/unit/token-version.unit.test.ts (5)
  > Test Files 12 passed (12)
  > Tests 64 passed (64)
  > Duration 4.53s

- **My response:**

  > Thanks for addressing the previous feedback. The required scope and acceptance criteria are now covered. All reported tests are passing. Approved.

- **Partner's response:**
  > Thank you so much for reviewing and approving PR #43! Everything is in place and verified. You can go ahead and merge this PR into lab3-staging whenever you're ready.

---

### PR — Issue 14 (Authentication & First-Login Password Change UI (Frontend UI))

- **My comment:**

  > Reviewed the latest updates against the acceptance criteria. The mock requester selector has been removed, authentication state and route guards are implemented, mandatory password change is handled, and role-based navigation and logout are working as required.
  > Approved.

- **Partner's response:**
  > Thank you so much @lephirada for reviewing and approving PR #44! All acceptance criteria and tests have been confirmed. You can go ahead and merge this PR into lab3-staging whenever you're ready.

---

### PR — Issue 15 (IT Staff Ticket Queue (API & UI))

- **My comment:**

  > I reviewed the latest changes against the acceptance criteria.

  > The backend implementation is generally well structured, and the role restriction, query support, pagination metadata, and error handling are covered. The CI check is also passing.

  > Before approval, I found two items that should be addressed:

  > Requested Priority filter is missing from the UI. The API supports requestedPriority, but StaffTicketQueue.tsx currently exposes filters for status, category, IT priority, and owner only. Please add Requested Priority to both the desktop filter bar and mobile filter modal, including reset handling, active filter count, and the API request.

  > Responsive table may still require horizontal scrolling. The desktop table uses minWidth: "1190px" together with overflowX: "auto", while it is displayed from the md breakpoint. This may cause horizontal scrolling on tablet-sized viewports, which does not match the requirement for a responsive layout without horizontal scroll. Please adjust the breakpoint or layout so the tablet view remains usable without horizontal scrolling.

  > Once these two points are fixed and the relevant tests still pass, I can review the PR again.

- **Partner's response:**
  > `[Placeholder: Partner's response]`

---

### PR — Issue 16 (SIT Staff Ticket Operations, Public Comments & Internal Notes (Full-Stack))

- **My comment:**

  > `[Placeholder: My review comment for partner's Issue 14 PR]`

- **Partner's response:**
  > `[Placeholder: Partner's response]`

---

### PR — Issue 17 (Minimalist Administrator User Management (Full-Stack))

- **My comment:**

  > `[Placeholder: My review comment for partner's Issue 15 PR]`

- **Partner's response:**
  > `[Placeholder: Partner's response]`

---

### PR — Issue 18 (End-to-End Testing, Responsive Audit & Visual Inspection)

- **My comment:**

  > `[Placeholder: My review comment for partner's Issue 16 PR]`

- **Partner's response:**
  > `[Placeholder: Partner's response]`

---

### PR — Issue 19 (Release Integration, Peer Review Consolidation & Sprint Documentation)

- **My comment:**

  > `[Placeholder: My review comment for partner's Issue 17 PR]`

- **Partner's response:**
  > `[Placeholder: Partner's response]`
