import jwt, { SignOptions } from "jsonwebtoken";
import { Request, CookieOptions } from "express";

export const COOKIE_NAME = "toktickit_session";
export const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours (28,800s)
export const TOKEN_EXPIRY_MS = TOKEN_EXPIRY_SECONDS * 1000; // 28,800,000ms

export interface JWTSessionPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: JWT_SECRET environment variable is missing or shorter than 32 characters in production.");
      process.exit(1);
    }
    // Safe developer & test default
    return "toktickit_dev_secret_key_at_least_32_characters_long_2026!";
  }
  return secret.trim();
}

/**
 * Signs a session JWT using HS256 algorithm with 8-hour lifetime.
 */
export function signSessionToken(payload: { sub: number; email: string; role: string }): string {
  const secret = getJwtSecret();
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRY_SECONDS,
  };

  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    secret,
    options
  );
}

/**
 * Verifies and decodes a session JWT. Returns decoded payload or null if invalid or expired.
 */
export function verifySessionToken(token: string): JWTSessionPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as unknown as JWTSessionPayload;

    if (!decoded || typeof decoded.sub !== "number" || !decoded.email || !decoded.role) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extracts session token from Cookie header ('toktickit_session').
 */
export function extractTokenFromRequest(req: Request): string | null {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";");
    for (const c of cookies) {
      const [rawKey, ...rawVal] = c.trim().split("=");
      if (rawKey === COOKIE_NAME) {
        const val = rawVal.join("=");
        try {
          return decodeURIComponent(val);
        } catch {
          return val;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Standard cookie configuration for toktickit_session.
 */
export function getSessionCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: TOKEN_EXPIRY_MS,
  };
}

/**
 * Clearing cookie configuration for logout (Max-Age=0, expired date).
 */
export function getClearCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  };
}
