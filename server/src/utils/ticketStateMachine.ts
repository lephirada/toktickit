import { TicketStatus } from "@prisma/client";

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN"],
  CANCELLED: [], // Terminal status
};

export interface StatusTransitionPayload {
  status: TicketStatus;
  resolutionSummary?: string;
  cancellationReason?: string;
  reopenReason?: string;
}

export interface TransitionValidationSuccess {
  isValid: true;
  cleanedPayload: {
    status: TicketStatus;
    resolutionSummary?: string;
    cancellationReason?: string;
    reopenReason?: string;
  };
}

export interface TransitionValidationFailure {
  isValid: false;
  statusCode: number;
  errorEnvelope: {
    error: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  };
}

export type TransitionValidationResult =
  | TransitionValidationSuccess
  | TransitionValidationFailure;

/**
 * Validates a requested ticket status transition according to the authoritative
 * 8-status state machine defined in docs/lab-03/specification.md.
 *
 * @param currentStatus Current status of the ticket
 * @param requestedStatus Target status
 * @param currentOwnerId Current assigned owner ID of the ticket
 * @param body Request body containing mandatory reason fields
 */
export function validateStatusTransition(
  currentStatus: TicketStatus,
  requestedStatus: TicketStatus,
  currentOwnerId: number | null,
  body: Record<string, unknown> = {}
): TransitionValidationResult {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  // 1. Enforce allowed transitions in state machine
  if (!allowed.includes(requestedStatus)) {
    return {
      isValid: false,
      statusCode: 422,
      errorEnvelope: {
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: "The requested status transition is not allowed.",
          details: {
            currentStatus,
            requestedStatus,
            allowedNextStatuses: allowed,
          },
        },
      },
    };
  }

  // 2. Business Rule BR-09: Transitioning NEW -> OPEN requires an assigned owner
  if (currentStatus === "NEW" && requestedStatus === "OPEN") {
    if (!currentOwnerId) {
      return {
        isValid: false,
        statusCode: 422,
        errorEnvelope: {
          error: {
            code: "OWNER_REQUIRED_FOR_OPEN",
            message: "Transitioning ticket from NEW to OPEN requires an assigned owner.",
            details: {
              currentStatus,
              requestedStatus,
              allowedNextStatuses: allowed,
            },
          },
        },
      };
    }
  }

  // 3. Mandatory reason field validation
  if (requestedStatus === "RESOLVED") {
    const rawSummary = body.resolutionSummary;
    if (
      typeof rawSummary !== "string" ||
      rawSummary.trim().length < 10 ||
      rawSummary.trim().length > 1000
    ) {
      return {
        isValid: false,
        statusCode: 422,
        errorEnvelope: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Resolution summary is required and must be between 10 and 1000 characters.",
            details: {
              fieldErrors: {
                resolutionSummary:
                  "Resolution summary is required and must be between 10 and 1000 characters.",
              },
            },
          },
        },
      };
    }
    return {
      isValid: true,
      cleanedPayload: {
        status: requestedStatus,
        resolutionSummary: rawSummary.trim(),
      },
    };
  }

  if (requestedStatus === "CANCELLED") {
    const rawReason = body.cancellationReason;
    if (
      typeof rawReason !== "string" ||
      rawReason.trim().length < 10 ||
      rawReason.trim().length > 500
    ) {
      return {
        isValid: false,
        statusCode: 422,
        errorEnvelope: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Cancellation reason is required and must be between 10 and 500 characters.",
            details: {
              fieldErrors: {
                cancellationReason:
                  "Cancellation reason is required and must be between 10 and 500 characters.",
              },
            },
          },
        },
      };
    }
    return {
      isValid: true,
      cleanedPayload: {
        status: requestedStatus,
        cancellationReason: rawReason.trim(),
      },
    };
  }

  if (requestedStatus === "REOPENED") {
    const rawReason = body.reopenReason;
    if (
      typeof rawReason !== "string" ||
      rawReason.trim().length < 10 ||
      rawReason.trim().length > 500
    ) {
      return {
        isValid: false,
        statusCode: 422,
        errorEnvelope: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Reopen reason is required and must be between 10 and 500 characters.",
            details: {
              fieldErrors: {
                reopenReason:
                  "Reopen reason is required and must be between 10 and 500 characters.",
              },
            },
          },
        },
      };
    }
    return {
      isValid: true,
      cleanedPayload: {
        status: requestedStatus,
        reopenReason: rawReason.trim(),
      },
    };
  }

  return {
    isValid: true,
    cleanedPayload: {
      status: requestedStatus,
    },
  };
}
