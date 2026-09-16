# Lab 3 — Peer Review Record

**Author:** Phirada Lekpaeng — 67070503491 — GitHub: @lephirada  
**Peer reviewer:** Penwatsa Saengyenpan — 67070503431 — GitHub: @Phenwatsa

---

## Pull Requests I authored (reviewed by my partner)

| PR                      | Branch                                    | Reviewer verdict   |
| :---------------------- | :---------------------------------------- | :----------------- |
| `[PR #... Placeholder]` | `feature/10-lab3-documentation`           | `[Pending Review]` |
| `[PR #... Placeholder]` | `feature/11-database-migration`           | `[Pending]`        |
| `[PR #... Placeholder]` | `feature/12-authentication-authorization` | `[Pending]`        |
| `[PR #... Placeholder]` | `feature/13-client-auth-shell`            | `[Pending]`        |
| `[PR #... Placeholder]` | `feature/14-staff-queue`                  | `[Pending]`        |
| `[PR #... Placeholder]` | `feature/15-staff-ticket-operations`      | `[Pending]`        |
| `[PR #... Placeholder]` | `feature/16-user-management`              | `[Pending]`        |
| `[PR #... Placeholder]` | `feature/17-integration-e2e`              | `[Pending]`        |

---

### PR — Issue 10 (Documentation and Engineering Contract)

- **Branch:** `feature/10-lab3-documentation`
- **Reviewer comment I received:**

  > `[Placeholder: Partner review comments for Issue 10 PR]`

- **How I responded:**
  > `[Placeholder: Author response to partner feedback]`

---

### PR — Issue 11 (Database Schema, Migration, and Seed)

- **Branch:** `feature/11-database-migration`
- **Reviewer comment I received:**

  > `[Placeholder: Partner review comments for Issue 11 PR]`

- **How I responded:**
  > `[Placeholder: Author response to partner feedback]`

---

### PR — Issue 12 (Authentication and Authorization)

- **Branch:** `feature/12-authentication-authorization`
- **Reviewer comment I received:**

  > `[Placeholder: Partner review comments for Issue 12 PR]`

- **How I responded:**
  > `[Placeholder: Author response to partner feedback]`

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

  > `[Placeholder: My review comment for partner's Issue 11 PR]`

- **Partner's response:**
  > `[Placeholder: Partner's response]`

---

### PR — Issue 14 (Authentication & First-Login Password Change UI (Frontend UI))

- **My comment:**

  > `[Placeholder: My review comment for partner's Issue 12 PR]`

- **Partner's response:**
  > `[Placeholder: Partner's response]`

---

### PR — Issue 15 (IT Staff Ticket Queue (API & UI))

- **My comment:**

  > `[Placeholder: My review comment for partner's Issue 13 PR]`

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
