# Lab 1 — Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.

## Test Execution Summary

| # | Tool | Test Description | Test File | Test ID | Result |
|---|------|------------------|-----------|---------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | `server/tests/lab-01/health.test.ts` | API-01 | Passed |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | `server/tests/lab-01/categories.test.ts` | API-02 | Passed |
| 3 | Vitest | TokTickIT heading renders | `client/tests/lab-01/App.test.tsx` | UI-01 | Passed |
| 4 | Vitest | Success state shows Online + category list | `client/tests/lab-01/App.test.tsx` | UI-02 | Passed |
| 5 | Vitest | Error state shows Offline + message | `client/tests/lab-01/App.test.tsx` | UI-03 | Passed |

---

## Terminal Test Execution Evidence

### 1. Server API Tests (Supertest)

```text
> toktickit-server@1.0.0 test
> vitest run

 RUN  v2.1.9 /Users/peta/Downloads/toktickit/server

 ✓ tests/lab-01/health.test.ts (1 test) 33ms
 ✓ tests/lab-01/categories.test.ts (1 test) 112ms

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  02:43:14
   Duration  1.78s (transform 186ms, setup 0ms, collect 1.23s, tests 146ms, environment 1ms, prepare 493ms)
```

### 2. Client UI Tests (Vitest)

```text
> toktickit-client@1.0.0 test
> vitest run

 RUN  v2.1.9 /Users/peta/Downloads/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests) 111ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  02:43:09
   Duration  1.50s (transform 95ms, setup 120ms, collect 143ms, tests 111ms, environment 463ms, prepare 129ms)
```
