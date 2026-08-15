# Lab 1 — AI Use and Reflection

**LLM/agent used:** Antigravity AI Coding Agent (Gemini 3.6 Flash)

## Selected Key Prompts (6–10)

| #   | Prompt (summarised)                                                                                                                                                                                  | What I did with the result                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Plan Lab 1 Implementation:** Analyze TokTickIT Lab 1 requirements, break down the 4 GitHub Issues, their dependencies, and required automated tests without writing code.                          | Reviewed the roadmap breakdown, aligned with peer reviewer, and set up the GitHub Project Kanban board.                                                                   |
| 2   | **Set Up Project Foundation (Issue 1):** Check full-stack project setup, verify Bootstrap integration, `.gitignore`, `.env.example`, and write initial setup instructions in `README.md`.            | Verified frontend/backend structure, added setup instructions to `README.md`, and added `"noEmit": true` to `client/tsconfig.json`.                                       |
| 3   | **Implement API Health Check (Issue 2):** Implement `GET /api/health` returning `{ status: "ok", service: "TokTickIT API" }`, write Supertest test, and connect React UI status state.               | Verified Supertest test suite passed and updated React `checkSystem()` API function for health check.                                                                     |
| 4   | **Create and Seed Categories (Issue 3):** Define Prisma `Category` model (`id`, `name`, `createdAt`), generate migration, and write an idempotent seed script using `upsert`.                        | Created Prisma migration `init`, executed seed for the 4 categories (`Account and Access`, `Hardware`, `Software`, `Network`), and verified idempotency by seeding twice. |
| 5   | **Configure GitHub Actions CI:** Update `.github/workflows/ci.yml` for Issue 3 with a PostgreSQL service container, Prisma generate, migration deploy, and seed idempotency checks.                  | Inspected workflow diff, tested Prisma commands locally, and verified CI build and test pipeline.                                                                         |
| 6   | **Display Category List & Finalize UI (Issue 4):** Implement `GET /api/categories` ordered by ID asc, update React UI to render category list dynamically, and write Vitest UI tests with mock data. | Ran client and server test suites (all 5 tests passed), verified client production build, and updated test plan evidence in `docs/lab-01/tests.md`.                       |

---

## Reflection

I found that the agent worked better when I gave it clear acceptance criteria, file paths, and specific requirements. For example, telling it to use upsert for the seed helped make sure the seed could be run multiple times without creating duplicates. I also had to guide the agent when updating the README.md so that the PostgreSQL setup steps were clear and easy to follow. Another part I worked on was the GitHub Actions CI, especially making sure the client Vitest tests could run correctly with the PostgreSQL service.
