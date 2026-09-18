import { Request, Response, NextFunction } from "express";
import { User, UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { createErrorEnvelope } from "../utils/errors.js";
import { extractTokenFromRequest, verifySessionToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  user?: User;
  requesterId?: number;
  requester?: {
    id: number;
    email: string;
    fullName: string;
    department: string;
    isActive: boolean;
  };
  isLegacyRequesterHeader?: boolean;
}

/**
 * Authentication Middleware:
 * 1. Extracts signed JWT from 'toktickit_session' cookie.
 * 2. Verifies signature, expiration, and validates claims (sub, email, role).
 * 3. Queries database liveness (User.isActive === true).
 * 4. Fallback: Supports X-Requester-Id header for Lab 02 client & E2E regression tests prior to Issue 13.
 * 5. Aborts with 401 Unauthorized if missing/invalid (UNAUTHORIZED) or inactive (ACCOUNT_DEACTIVATED).
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      // Legacy header fallback for Lab 02 frontend & Playwright E2E regression
      const legacyHeader = req.headers["x-requester-id"];
      if (legacyHeader && !Array.isArray(legacyHeader)) {
        const reqId = parseInt(legacyHeader, 10);
        if (!isNaN(reqId) && reqId > 0 && String(reqId) === legacyHeader.trim()) {
          const user = await getPrisma().user.findUnique({
            where: { id: reqId },
          });

          if (!user || !user.isActive) {
            res
              .status(401)
              .json(createErrorEnvelope("ACCOUNT_DEACTIVATED", "Account has been deactivated."));
            return;
          }

          req.user = user;
          req.requesterId = user.id;
          req.requester = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            department: user.department ?? "",
            isActive: user.isActive,
          };
          req.isLegacyRequesterHeader = true;
          next();
          return;
        }
      }

      res
        .status(401)
        .json(createErrorEnvelope("UNAUTHORIZED", "Authentication required. Please log in."));
      return;
    }

    const payload = verifySessionToken(token);
    if (!payload || typeof payload.sub !== "number" || !payload.email || !payload.role) {
      res
        .status(401)
        .json(createErrorEnvelope("UNAUTHORIZED", "Invalid or expired session."));
      return;
    }

    const user = await getPrisma().user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      res
        .status(401)
        .json(createErrorEnvelope("UNAUTHORIZED", "User account not found."));
      return;
    }

    if (!user.isActive) {
      res
        .status(401)
        .json(createErrorEnvelope("ACCOUNT_DEACTIVATED", "Account has been deactivated."));
      return;
    }

    req.user = user;
    req.requesterId = user.id;
    req.requester = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      department: user.department ?? "",
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    res
      .status(500)
      .json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to authenticate session."));
  }
}

/**
 * Password-change Gate Middleware:
 * If user has mustChangePassword === true in database, blocks operational routes with 403 Forbidden (PASSWORD_CHANGE_REQUIRED).
 */
export function requirePasswordChanged(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Bypass password change gate if authenticated through legacy dev header (Lab 02 client without password UI)
  if (req.isLegacyRequesterHeader) {
    next();
    return;
  }

  if (req.user?.mustChangePassword) {
    res
      .status(403)
      .json(
        createErrorEnvelope(
          "PASSWORD_CHANGE_REQUIRED",
          "Password change required before accessing application features."
        )
      );
    return;
  }
  next();
}

/**
 * Role-based Authorization Middleware:
 * Enforces that req.user.role matches one of the allowed roles.
 * Returns 403 Forbidden (FORBIDDEN_ROLE) if unauthorized.
 */
export function requireRole(...allowedRoles: (UserRole | string)[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json(createErrorEnvelope("UNAUTHORIZED", "Authentication required."));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res
        .status(403)
        .json(
          createErrorEnvelope(
            "FORBIDDEN_ROLE",
            "Forbidden: You do not have permission to access this resource."
          )
        );
      return;
    }

    next();
  };
}
