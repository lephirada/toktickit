# Lab 1 — Peer Review Record

**Author:** Phirada Lekpaeng — 67070503491 — GitHub: @lephirada
**Peer reviewer:** Penwatsa Saengyenpan — 67070503431 — GitHub: @Phenwatsa

## Pull Requests I authored (reviewed by my partner)

| PR  | Branch                       | Reviewer verdict            |
| --- | ---------------------------- | --------------------------- |
| #5  | feature/1-project-foundation | Approved                    |
| #6  | feature/2-health-check       | Request Changes -> Approved |
|     | feature/3-category-seed      |                             |
|     | feature/4-category-list      |                             |

### PR #5 — Issue 1 (Project Foundation)
- **Reviewer comment I received:** "The client and server builds are passing in CI, and the main setup looks good. React, TypeScript, Vite, Bootstrap, Express, Prisma, Vitest, and Supertest are all configured. The .gitignore and .env.example files are also included, and the README has the basic setup instructions. One small suggestion for a next update in the next issue: it would be nice to run npm test and check the PostgreSQL/Prisma connection in CI as well. Looks good to me. Nice work!"
- **How I responded:** Thank you for approving! I will make sure to add npm test and PostgreSQL/Prisma connection checks to CI in the upcoming issues.

### PR #6 — Issue 2 (API Health Check)
- **Reviewer comment I received:** "Overall, the implementation looks good. The health endpoint and the frontend status/error handling are working as expected based on the acceptance criteria. One thing is still missing: a Supertest test for GET /api/health. I can see the React tests were added, but I don't see a server-side test that actually verifies the endpoint returns 200 with the expected status and service values. Please add the Supertest test for this endpoint, and I think this should be ready for approval."
- **How I responded:** Added the Supertest test for GET /api/health as requested. Ready for another review.

## Pull Requests I reviewed for my partner

### PR #5 — Issue 1 (Project Foundation)
- **My comment:** "I reviewed this PR against the Acceptance Criteria for Issue 1, and overall everything is implemented as expected. The frontend and backend can build and start successfully, Bootstrap is installed and used in the frontend, the Prisma/PostgreSQL foundation is set up, and Vitest/Supertest are configured for testing. I also checked the .gitignore, .env.example, and README. No secrets or node_modules are committed, and the README provides the necessary setup instructions. The Health Check and Category API do not need to be implemented in this PR since they are part of the following issues. I see docs/lab-01/reviewer.md still contains placeholder-style formatting such as <your ...>. This should be cleaned up before merging na ka. Overall, this PR meets the scope and requirements of Issue 1 and is ready to merge."
- **Partner's response:** Thank you for the review! I have cleaned up the placeholder formatting in docs/lab-01/reviewer.md and pushed the updated documentation.

### PR #6 — Issue 2 (API Health Check)
- **My comment:** "Reviewed against the acceptance criteria. The /api/health endpoint returns HTTP 200 with the required JSON response, and the Supertest test verifies both fields. The React UI also calls the real health endpoint and correctly shows Online/Offline states with an error message when the backend is unavailable and CI is passing. Overall acceptance criteria are met so I approved this."
- **Partner's response:** Thanks for the review!
