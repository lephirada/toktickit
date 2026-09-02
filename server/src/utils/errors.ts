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
  };
}

export function createErrorEnvelope(
  code: string,
  message: string,
  fieldErrors?: FieldError[],
  correlationId?: string
): ErrorEnvelope {
  const cId = correlationId || `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  return {
    error: {
      code,
      message,
      correlationId: cId,
      ...(fieldErrors && fieldErrors.length > 0 ? { fieldErrors } : {}),
    },
  };
}
