import { describe, it, expect } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  extractTokenFromRequest,
  getSessionCookieOptions,
  getClearCookieOptions,
  COOKIE_NAME,
  TOKEN_EXPIRY_SECONDS,
} from "../../src/utils/jwt.js";
import {
  validatePasswordPolicy,
  verifyPassword,
  hashPassword,
} from "../../src/utils/password.js";
import { createTestSessionCookie, createTestToken } from "../helpers/auth.js";
import type { Request } from "express";

describe("Issue 12 — Core Security Utilities (JWT & Password)", () => {
  describe("JWT Utilities", () => {
    it("signs and verifies a valid session token according to AC-12-04", () => {
      const payload = {
        sub: 42,
        email: "alice@toktickit.com",
        role: "IT_STAFF",
      };

      const token = signSessionToken(payload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // Standard 3-part JWT

      const decoded = verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(42);
      expect(decoded?.email).toBe("alice@toktickit.com");
      expect(decoded?.role).toBe("IT_STAFF");
      expect(decoded?.exp! - decoded?.iat!).toBe(TOKEN_EXPIRY_SECONDS); // Exactly 8 hours (28,800s)
    });

    it("rejects tampered and invalid tokens according to AC-12-05", () => {
      const validToken = signSessionToken({ sub: 1, email: "test@test.com", role: "REQUESTER" });
      const tamperedToken = validToken.slice(0, -5) + "abcde";

      expect(verifySessionToken("invalid.token.string")).toBeNull();
      expect(verifySessionToken(tamperedToken)).toBeNull();
      expect(verifySessionToken("")).toBeNull();
    });

    it("extracts session token from Request Cookie header", () => {
      const mockReqWithCookie = {
        headers: {
          cookie: `foo=bar; ${COOKIE_NAME}=my_secret_session_token; other=123`,
        },
      } as unknown as Request;

      const extracted = extractTokenFromRequest(mockReqWithCookie);
      expect(extracted).toBe("my_secret_session_token");

      const mockReqWithoutCookie = {
        headers: {},
      } as unknown as Request;
      expect(extractTokenFromRequest(mockReqWithoutCookie)).toBeNull();
    });

    it("returns correct session and clearing cookie options", () => {
      const sessionOpts = getSessionCookieOptions();
      expect(sessionOpts.httpOnly).toBe(true);
      expect(sessionOpts.sameSite).toBe("lax");
      expect(sessionOpts.path).toBe("/");
      expect(sessionOpts.maxAge).toBe(28800 * 1000);

      const clearOpts = getClearCookieOptions();
      expect(clearOpts.httpOnly).toBe(true);
      expect(clearOpts.sameSite).toBe("lax");
      expect(clearOpts.path).toBe("/");
      expect(clearOpts.maxAge).toBe(0);
      expect(clearOpts.expires).toEqual(new Date(0));
    });

    it("verifies test helper reuses the exact production JWT logic", () => {
      const cookieStr = createTestSessionCookie({ id: 99, email: "test@admin.com", role: "ADMINISTRATOR" });
      expect(cookieStr.startsWith(`${COOKIE_NAME}=`)).toBe(true);

      const token = cookieStr.replace(`${COOKIE_NAME}=`, "");
      const decoded = verifySessionToken(token);
      expect(decoded?.sub).toBe(99);
      expect(decoded?.email).toBe("test@admin.com");
      expect(decoded?.role).toBe("ADMINISTRATOR");
    });
  });

  describe("Password Utilities", () => {
    it("validates password policy correctly", () => {
      // Valid password (uppercase, lowercase, number, special char, >= 8 chars)
      expect(validatePasswordPolicy("ValidPass123!").isValid).toBe(true);
      expect(validatePasswordPolicy("Another#Secure99").isValid).toBe(true);

      // Too short (< 8 chars)
      const shortRes = validatePasswordPolicy("Sh0rt!");
      expect(shortRes.isValid).toBe(false);
      expect(shortRes.reason).toContain("at least 8 characters");

      // Too long (> 72 chars)
      const longRes = validatePasswordPolicy("A".repeat(70) + "a1!xyzABCDEF12345");
      expect(longRes.isValid).toBe(false);
      expect(longRes.reason).toContain("not exceed 72 characters");

      // Missing uppercase
      const noUpperRes = validatePasswordPolicy("all_lower_case_123!");
      expect(noUpperRes.isValid).toBe(false);
      expect(noUpperRes.reason).toContain("uppercase");

      // Missing lowercase
      const noLowerRes = validatePasswordPolicy("ALL_UPPER_CASE_123!");
      expect(noLowerRes.isValid).toBe(false);
      expect(noLowerRes.reason).toContain("lowercase");

      // Missing digit
      const noDigitRes = validatePasswordPolicy("NoDigitsHere!Special");
      expect(noDigitRes.isValid).toBe(false);
      expect(noDigitRes.reason).toContain("digit");

      // Missing special character
      const noSpecialRes = validatePasswordPolicy("NoSpecialCharacters123");
      expect(noSpecialRes.isValid).toBe(false);
      expect(noSpecialRes.reason).toContain("special character");
    });

    it("hashes and verifies passwords using bcrypt", async () => {
      const plain = "MySecretPass2026!";
      const hash = await hashPassword(plain);

      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
      expect(await verifyPassword(plain, hash)).toBe(true);
      expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
    });
  });
});
