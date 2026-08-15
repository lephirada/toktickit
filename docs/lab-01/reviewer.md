# Lab 1 — Peer Review Record

**Author:** Phirada Lekpaeng — 67070503491 — GitHub: @lephirada
**Peer reviewer:** Penwatsa Saengyenpan — 67070503431 — GitHub: @Phenwatsa

## Pull Requests I authored (reviewed by my partner)

| PR  | Branch                       | Reviewer verdict            |
| --- | ---------------------------- | --------------------------- |
| #5  | feature/1-project-foundation | Approved                    |
| #6  | feature/2-health-check       | Request Changes -> Approved |
| #8  | feature/3-category-seed      | Approved                    |
| #9  | feature/4-category-list      | Approved                    |

### PR #5 — Issue 1 (Project Foundation)

- **Reviewer comment I received:** "The client and server builds are passing in CI, and the main setup looks good. React, TypeScript, Vite, Bootstrap, Express, Prisma, Vitest, and Supertest are all configured. The .gitignore and .env.example files are also included, and the README has the basic setup instructions. One small suggestion for a next update in the next issue: it would be nice to run npm test and check the PostgreSQL/Prisma connection in CI as well. Looks good to me. Nice work!"
- **How I responded:** Thank you for approving! I will make sure to add npm test and PostgreSQL/Prisma connection checks to CI in the upcoming issues.

### PR #6 — Issue 2 (API Health Check)

- **Reviewer comment I received:** "Overall, the implementation looks good. The health endpoint and the frontend status/error handling are working as expected based on the acceptance criteria. One thing is still missing: a Supertest test for GET /api/health. I can see the React tests were added, but I don't see a server-side test that actually verifies the endpoint returns 200 with the expected status and service values. Please add the Supertest test for this endpoint, and I think this should be ready for approval."
- **How I responded:** Added the Supertest test for GET /api/health as requested. Ready for another review.

### PR #8 — Issue 3 (Create and Seed Categories)

- **Reviewer comment I received:** "Checked the PR against the acceptance criteria, and everything looks good. Everything looks good. Approve!!"
- **How I responded:** Thank you for your review and I have updated issue 3 of docs/lab-01/reviewer.md ,you can merging this PR into lab1-staging

### PR #9 — Issue 4 (Display Category List)

- **Reviewer comment I received:** "Checked the PR against the acceptance criteria and everything looks good. The API retrieves categories through Prisma with a predictable order, and the Supertest covers the response correctly. The React page now displays the categories from the API instead of hard-coded values, with loading/error states and Vitest coverage for the category list. All acceptance criteria are covered."
- **How I responded:** Thank you for the review and approval, I have updated reviewer.md , ai_use.md, testes.md of docs/lab-01 . You can merging this PR into lab1-staging now.

## Pull Requests I reviewed for my partner

### PR #5 — Issue 1 (Project Foundation)

- **My comment:** "I reviewed this PR against the Acceptance Criteria for Issue 1, and overall everything is implemented as expected. The frontend and backend can build and start successfully, Bootstrap is installed and used in the frontend, the Prisma/PostgreSQL foundation is set up, and Vitest/Supertest are configured for testing. I also checked the .gitignore, .env.example, and README. No secrets or node_modules are committed, and the README provides the necessary setup instructions. The Health Check and Category API do not need to be implemented in this PR since they are part of the following issues. I see docs/lab-01/reviewer.md still contains placeholder-style formatting such as <your ...>. This should be cleaned up before merging na ka. Overall, this PR meets the scope and requirements of Issue 1 and is ready to merge."
- **Partner's response:** Thank you for the review! I have cleaned up the placeholder formatting in docs/lab-01/reviewer.md and pushed the updated documentation.

### PR #6 — Issue 2 (API Health Check)

- **My comment:** "Reviewed against the acceptance criteria. The /api/health endpoint returns HTTP 200 with the required JSON response, and the Supertest test verifies both fields. The React UI also calls the real health endpoint and correctly shows Online/Offline states with an error message when the backend is unavailable and CI is passing. Overall acceptance criteria are met so I approved this."
- **Partner's response:** Thanks for the review!

### PR #8 — Issue 3 (Create and Seed Categories)

- **My comment:** "Reviewed against the Issue 3 acceptance criteria. The Category model, migration, and seed script are implemented correctly. The seed includes all four required categories and uses upsert to prevent duplicates when run multiple times. Database credentials are also excluded from Git through .gitignore. CI is passing. All acceptance criteria are met. Approved."
- **Partner's response:** Thank you for the review and approval! I have updated docs/lab-01/reviewer.md with your review record and you can merging this PR into lab1-staging now.

### PR #9 — Issue 4 (Display Category List)

- **My comment:** "The /api/categories endpoint and Supertest coverage are implemented correctly, and the React UI uses categories returned from the API with success/error states covered by Vitest. However, I don't see a test verifying that the loading state is displayed while waiting for the API response. Please add a Vitest test for the loading state before approval."
- **Partner's response:** Thank you for the review! I have added a Vitest test to verify the loading state (asserting that the button displays "Loading…" and is disabled while waiting for the API response). All 4 Vitest UI tests are passing now.
