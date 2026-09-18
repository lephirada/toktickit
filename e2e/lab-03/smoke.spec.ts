import { test, expect } from "@playwright/test";

test.describe("Lab 03 E2E Integration Smoke Suite", () => {
  test("verifies server health and public taxonomy endpoints are reachable", async ({ request }) => {
    const healthRes = await request.get("http://localhost:3000/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("ok");

    const categoriesRes = await request.get("http://localhost:3000/api/categories");
    expect(categoriesRes.status()).toBe(200);
  });

  test("enforces Zero Trust: rejects client-supplied X-Requester-Id header without session cookie", async ({
    request,
  }) => {
    const res = await request.get("http://localhost:3000/api/tickets", {
      headers: {
        "x-requester-id": "1",
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("protects authenticated endpoints from unauthenticated requests", async ({ request }) => {
    const meRes = await request.get("http://localhost:3000/api/auth/me");
    expect(meRes.status()).toBe(401);
    const meBody = await meRes.json();
    expect(meBody.error.code).toBe("UNAUTHORIZED");

    const ticketsRes = await request.get("http://localhost:3000/api/tickets");
    expect(ticketsRes.status()).toBe(401);
    const ticketsBody = await ticketsRes.json();
    expect(ticketsBody.error.code).toBe("UNAUTHORIZED");
  });
});
