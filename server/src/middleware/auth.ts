import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";
import { createErrorEnvelope } from "../utils/errors.js";

export interface AuthenticatedRequest extends Request {
  requesterId?: number;
  requester?: {
    id: number;
    email: string;
    fullName: string;
    department: string;
    isActive: boolean;
  };
}

export async function requireRequesterAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requesterIdHeader = req.headers["x-requester-id"];

  if (!requesterIdHeader || Array.isArray(requesterIdHeader)) {
    res
      .status(403)
      .json(
        createErrorEnvelope(
          "FORBIDDEN_REQUESTER",
          "Valid active requester ID header (X-Requester-Id) is required."
        )
      );
    return;
  }

  const requesterId = parseInt(requesterIdHeader, 10);
  if (isNaN(requesterId) || requesterId <= 0 || String(requesterId) !== requesterIdHeader.trim()) {
    res
      .status(403)
      .json(
        createErrorEnvelope(
          "FORBIDDEN_REQUESTER",
          "Valid active requester ID header (X-Requester-Id) is required."
        )
      );
    return;
  }

  try {
    const requester = await getPrisma().requesterUser.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      res
        .status(403)
        .json(
          createErrorEnvelope(
            "FORBIDDEN_REQUESTER",
            "Requester is inactive or does not exist."
          )
        );
      return;
    }

    req.requesterId = requester.id;
    req.requester = requester;
    next();
  } catch (error) {
    res
      .status(500)
      .json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to authenticate requester."));
  }
}
