import { signSessionToken, COOKIE_NAME } from "../../src/utils/jwt.js";

export interface TestUserPayload {
  id: number;
  email?: string;
  role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR" | string;
}

/**
 * Creates a valid session token using the production JWT signing function.
 */
export function createTestToken(user: TestUserPayload): string {
  return signSessionToken({
    sub: user.id,
    email: user.email || `user_${user.id}@toktickit.com`,
    role: user.role || "REQUESTER",
  });
}

/**
 * Creates a valid session cookie string for Supertest .set("Cookie", ...) headers.
 * Format: "toktickit_session=<signed_jwt>"
 */
export function createTestSessionCookie(user: TestUserPayload): string {
  const token = createTestToken(user);
  return `${COOKIE_NAME}=${token}`;
}
