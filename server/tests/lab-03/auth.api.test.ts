import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { COOKIE_NAME } from "../../src/utils/jwt.js";
import { hashPassword } from "../../src/utils/password.js";

describe("Issue 12 — Authentication Integration Test Suite (auth.api.test.ts)", () => {
  const prisma = getPrisma();

  let testUserId: number;
  let testUserEmail: string;
  let inactiveUserId: number;

  beforeAll(async () => {
    // Ensure clean test user with known password
    testUserEmail = `auth_test_${Date.now()}@toktickit.com`;
    const passwordHash = await hashPassword("ValidPass123!");

    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        fullName: "Auth Test User",
        department: "Testing",
        role: "REQUESTER",
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });
    testUserId = user.id;

    const inactiveUser = await prisma.user.create({
      data: {
        email: `inactive_test_${Date.now()}@toktickit.com`,
        fullName: "Inactive Test User",
        department: "Testing",
        role: "REQUESTER",
        passwordHash,
        mustChangePassword: false,
        isActive: false,
      },
    });
    inactiveUserId = inactiveUser.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (inactiveUserId) {
      await prisma.user.delete({ where: { id: inactiveUserId } }).catch(() => {});
    }
  });

  describe("POST /api/auth/login", () => {
    it("logs in successfully with valid credentials, sets cookie, and returns safe profile (AC-12-01 & AC-12-04)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUserEmail,
          password: "ValidPass123!",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data.id).toBe(testUserId);
      expect(res.body.data.email).toBe(testUserEmail);
      expect(res.body.data.fullName).toBe("Auth Test User");
      expect(res.body.data.role).toBe("REQUESTER");
      expect(res.body.data.mustChangePassword).toBe(true);
      expect(res.body.data).not.toHaveProperty("passwordHash");

      // Verify Set-Cookie header
      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
      expect(cookieStr).toContain(`${COOKIE_NAME}=`);
      expect(cookieStr).toContain("HttpOnly");
      expect(cookieStr.toLowerCase()).toContain("samesite=lax");
      expect(cookieStr).toContain("Max-Age=28800");
    });

    it("rejects invalid password with 401 Unauthorized without exposing details (AC-12-02)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUserEmail,
          password: "WrongPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toContain("Invalid email or password");
    });

    it("rejects inactive users with 401 Unauthorized (AC-12-03)", async () => {
      const inactiveUser = await prisma.user.findUnique({ where: { id: inactiveUserId } });
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: inactiveUser!.email,
          password: "ValidPass123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("rejects non-existent email with 401 Unauthorized (AC-12-02 anti-enumeration)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent.user@toktickit.com",
          password: "ValidPass123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns 400 Bad Request when email or password is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUserEmail,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears session cookie on logout (AC-12-09)", async () => {
      const cookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Successfully logged out");

      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
      expect(cookieStr).toContain(`${COOKIE_NAME}=;`);
      expect(cookieStr).toContain("Max-Age=0");
    });

    it("is idempotent and succeeds even without an active session (Section 2.2 contract)", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Successfully logged out");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns authenticated user profile when cookie is valid", async () => {
      const cookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testUserId);
      expect(res.body.data.email).toBe(testUserEmail);
      expect(res.body.data.role).toBe("REQUESTER");
      expect(res.body.data.mustChangePassword).toBe(true);
    });

    it("returns 401 Unauthorized when session cookie is missing (AC-12-05)", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when session cookie is malformed (AC-12-05)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `${COOKIE_NAME}=malformed_non_jwt_string_%%$$`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when session cookie has tampered signature (AC-12-05)", async () => {
      const validCookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });
      const tamperedCookie = validCookie.slice(0, -5) + "abcde";

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", tamperedCookie);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when session token is expired", async () => {
      const secret = process.env.JWT_SECRET || "toktickit_dev_secret_key_at_least_32_characters_long_2026!";
      const expiredToken = jwt.sign(
        { sub: testUserId, email: testUserEmail, role: "REQUESTER" },
        secret,
        { expiresIn: -10 }
      );

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `${COOKIE_NAME}=${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when token is missing required claims (sub, email, or role)", async () => {
      const secret = process.env.JWT_SECRET || "toktickit_dev_secret_key_at_least_32_characters_long_2026!";

      // Missing sub
      const tokenNoSub = jwt.sign({ email: testUserEmail, role: "REQUESTER" }, secret);
      const resNoSub = await request(app).get("/api/auth/me").set("Cookie", `${COOKIE_NAME}=${tokenNoSub}`);
      expect(resNoSub.status).toBe(401);
      expect(resNoSub.body.error.code).toBe("UNAUTHORIZED");

      // Missing email
      const tokenNoEmail = jwt.sign({ sub: testUserId, role: "REQUESTER" }, secret);
      const resNoEmail = await request(app).get("/api/auth/me").set("Cookie", `${COOKIE_NAME}=${tokenNoEmail}`);
      expect(resNoEmail.status).toBe(401);
      expect(resNoEmail.body.error.code).toBe("UNAUTHORIZED");

      // Missing role
      const tokenNoRole = jwt.sign({ sub: testUserId, email: testUserEmail }, secret);
      const resNoRole = await request(app).get("/api/auth/me").set("Cookie", `${COOKIE_NAME}=${tokenNoRole}`);
      expect(resNoRole.status).toBe(401);
      expect(resNoRole.body.error.code).toBe("UNAUTHORIZED");
    });

    it("immediately invalidates access for deactivated user on next request (AC-12-06)", async () => {
      // Create user, generate token, then deactivate in DB
      const tempUser = await prisma.user.create({
        data: {
          email: `temp_deact_${Date.now()}@toktickit.com`,
          fullName: "Temp Deactivated",
          role: "REQUESTER",
          passwordHash: "dummy",
          isActive: true,
        },
      });

      const activeCookie = createTestSessionCookie({ id: tempUser.id, email: tempUser.email, role: tempUser.role });

      // Deactivate user in database
      await prisma.user.update({
        where: { id: tempUser.id },
        data: { isActive: false },
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", activeCookie);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("ACCOUNT_DEACTIVATED");

      await prisma.user.delete({ where: { id: tempUser.id } }).catch(() => {});
    });
  });

  describe("Password-change Gate (requirePasswordChanged)", () => {
    it("blocks operational routes with 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true in database", async () => {
      // testUser was seeded with mustChangePassword = true
      const cookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });

      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
      expect(res.body.error.message).toContain("Password change required");
    });

    it("allows access to exempt endpoints (/api/auth/me, /api/auth/logout, /api/auth/change-password) even when mustChangePassword is true", async () => {
      const cookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);
      expect(meRes.status).toBe(200);

      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookie);
      expect(logoutRes.status).toBe(200);
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("updates password hash and sets mustChangePassword to false upon valid password submission (AC-12-07)", async () => {
      const cookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .send({
          currentPassword: "ValidPass123!",
          newPassword: "BrandNewSecure2026!",
          confirmPassword: "BrandNewSecure2026!",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("successfully");
      expect(res.body.data.mustChangePassword).toBe(false);

      // Verify database updated
      const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(updatedUser?.mustChangePassword).toBe(false);

      // Verify new password works on login
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUserEmail,
          password: "BrandNewSecure2026!",
        });
      expect(loginRes.status).toBe(200);
    });

    it("rejects wrong current password with 400 Bad Request", async () => {
      const cookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .send({
          currentPassword: "WrongCurrentPassword123!",
          newPassword: "AnotherNewPass2026!",
          confirmPassword: "AnotherNewPass2026!",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    });

    it("rejects new password matching current password with 422", async () => {
      const cookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .send({
          currentPassword: "BrandNewSecure2026!",
          newPassword: "BrandNewSecure2026!",
          confirmPassword: "BrandNewSecure2026!",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects password policy violations with 422 Unprocessable Entity", async () => {
      const cookie = createTestSessionCookie({ id: testUserId, email: testUserEmail, role: "REQUESTER" });

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .send({
          currentPassword: "BrandNewSecure2026!",
          newPassword: "weak",
          confirmPassword: "weak",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
