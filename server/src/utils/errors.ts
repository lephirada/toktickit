import { randomUUID } from "node:crypto";

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    correlationId: string;
    fieldErrors?: FieldError[];
    details: Record<string, any>;
  };
}

export function createErrorEnvelope(
  code: string,
  message: string,
  fieldErrors?: FieldError[],
  details?: Record<string, any>,
  correlationId?: string
): ErrorEnvelope {
  const cId = correlationId || `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const mergedDetails: Record<string, any> = { ...(details || {}) };
  if (fieldErrors && fieldErrors.length > 0) {
    mergedDetails.fieldErrors = fieldErrors;
  }
  return {
    error: {
      code,
      message,
      correlationId: cId,
      ...(fieldErrors && fieldErrors.length > 0 ? { fieldErrors } : {}),
      details: mergedDetails,
    },
  };
}
