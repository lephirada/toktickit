import bcrypt from "bcryptjs";

export interface PasswordValidationResult {
  isValid: boolean;
  reason?: string;
}

const BCRYPT_SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

/**
 * Validates password complexity against the Lab 3 password policy:
 * - 8 to 72 characters in length
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 numeric digit
 * - At least 1 special character (!@#$%^&*()_+-=[]{};':"|,.<>/?)
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      reason: "Password is required.",
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      isValid: false,
      reason: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      reason: "Password must contain at least one uppercase letter.",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      reason: "Password must contain at least one lowercase letter.",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      reason: "Password must contain at least one digit.",
    };
  }

  // Any non-alphanumeric character (or standard special characters)
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      isValid: false,
      reason: "Password must contain at least one special character.",
    };
  }

  return { isValid: true };
}

/**
 * Compares a plain password against a bcrypt hash.
 */
export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  if (!plainPassword || !hash) return false;
  try {
    return await bcrypt.compare(plainPassword, hash);
  } catch {
    return false;
  }
}

/**
 * Hashes a password using bcrypt with 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}
