import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.js";
import { changePassword, ApiError } from "../api.js";
import { AlertTriangleIcon, CheckCircleIcon } from "./icons/index.js";
import PasswordToggleButton from "./PasswordToggleButton.js";

interface ChangePasswordScreenProps {
  onSuccess?: () => void;
  onNavigate?: (route: string) => void;
}

export default function ChangePasswordScreen({ onSuccess, onNavigate }: ChangePasswordScreenProps) {
  const { updatePasswordChanged } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Real-time password policy validation checks (aligned with Issue 12: 8-72 chars, upper, lower, digit, special)
  const rules = useMemo(() => {
    const hasMinLength = newPassword.length >= 8 && newPassword.length <= 72;
    const hasUpperLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const hasNumberAndSpecial = /\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

    return {
      hasMinLength,
      hasUpperLower,
      hasNumberAndSpecial,
      passwordsMatch,
      allPassed: hasMinLength && hasUpperLower && hasNumberAndSpecial && passwordsMatch,
    };
  }, [newPassword, confirmPassword]);

  const canSubmit = rules.allPassed && currentPassword.trim().length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      updatePasswordChanged();
      setSuccessMessage("Password changed successfully! Redirecting…");
      if (onSuccess) {
        onSuccess();
      } else if (onNavigate) {
        onNavigate("my-tickets");
      } else {
        window.history.pushState({}, "", "/my-tickets");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to change password. Please check your inputs.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-5 px-3"
      style={{ backgroundColor: "var(--zg-bg)" }}
      data-testid="change-password-screen"
    >
      <div
        className="card border shadow-lg rounded-4 w-100 p-4 p-sm-5"
        style={{
          maxWidth: 500,
          backgroundColor: "var(--zg-surface)",
          borderColor: "#EAECF0",
          borderRadius: "16px",
          boxShadow: "0 12px 32px -4px rgba(16, 24, 40, 0.08), 0 4px 12px -2px rgba(16, 24, 40, 0.04)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-3">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm"
            style={{
              width: 52,
              height: 52,
              backgroundColor: "var(--zg-pale)",
              color: "var(--zg-primary)",
              border: "1px solid #A6F4C5",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "var(--zg-primary)", letterSpacing: "-0.01em" }}>
            Change Your Password
          </h1>
          <p className="text-secondary small mb-0" style={{ color: "#475467" }}>
            Set a new secure password to activate and protect <br/>your account.
          </p>
        </div>

        {/* Mandatory context banner */}
          <div
            className="p-3 mb-4 rounded-3 d-flex align-items-start gap-3 shadow-sm overflow-hidden"
            style={{
              backgroundColor: "#F0FDF4",
              border: "1px solid #DCFCE7",
              borderLeft: "4px solid #006B3C",
            }}
            role="note"
            data-testid="change-password-notice"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#006B3C"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0"
              style={{ marginTop: "2px" }}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>

            <div className="d-flex flex-column gap-1">
              <div className="fw-semibold" style={{ color: "#006B3C", fontSize: "0.95rem", lineHeight: "20px" }}>
                Password Update Required
              </div>
              <div style={{ color: "#166534", fontSize: "0.85rem", lineHeight: 1.55 }}>
                You are signing in with an initial password. Please set a new password to secure your account before continuing.
              </div>
            </div>
          </div>
          
        {/* Error Alert */}
        {errorMessage && (
          <div
            className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm"
            style={{ borderColor: "#FECDCA", backgroundColor: "#FEF3F2" }}
            role="alert"
            data-testid="change-password-error-banner"
          >
            <div className="d-flex align-items-center gap-2">
              <AlertTriangleIcon size={18} className="text-danger flex-shrink-0" />
              <span className="small fw-medium text-danger">{errorMessage}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setErrorMessage("")}
            ></button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            className="alert alert-success d-flex align-items-center gap-2 p-3 mb-4 rounded-3 shadow-sm"
            style={{ borderColor: "#A6F4C5", backgroundColor: "#ECFDF3" }}
            role="alert"
            data-testid="change-password-success-banner"
          >
            <CheckCircleIcon size={18} className="text-success flex-shrink-0" />
            <span className="small fw-semibold text-success">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Current Password */}
          <div className="mb-3">
            <label
              htmlFor="current-password-input"
              className="form-label small fw-semibold text-dark mb-1"
            >
              Current (Temporary) Password <span className="text-danger">*</span>
            </label>
            <div className="input-group" style={{ height: "46px" }}>
              <input
                id="current-password-input"
                type={showCurrentPassword ? "text" : "password"}
                className="form-control"
                style={{
                  height: "46px",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  borderColor: "#D0D5DD",
                  fontSize: "0.875rem",
                }}
                placeholder="Enter current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                data-testid="current-password-input"
              />
              <PasswordToggleButton
                isVisible={showCurrentPassword}
                onToggle={() => setShowCurrentPassword((prev) => !prev)}
                height="46px"
                testId="toggle-current-password-visibility"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="mb-3">
            <label htmlFor="new-password-input" className="form-label small fw-semibold text-dark mb-1">
              New Password <span className="text-danger">*</span>
            </label>
            <div className="input-group" style={{ height: "46px" }}>
              <input
                id="new-password-input"
                type={showNewPassword ? "text" : "password"}
                className="form-control"
                style={{
                  height: "46px",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  borderColor: "#D0D5DD",
                  fontSize: "0.875rem",
                }}
                placeholder="Enter new secure password"
                autoComplete="new-password"
                maxLength={72}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                data-testid="new-password-input"
              />
              <PasswordToggleButton
                isVisible={showNewPassword}
                onToggle={() => setShowNewPassword((prev) => !prev)}
                height="46px"
                testId="toggle-new-password-visibility"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <label
              htmlFor="confirm-password-input"
              className="form-label small fw-semibold text-dark mb-1"
            >
              Confirm New Password <span className="text-danger">*</span>
            </label>
            <div className="input-group" style={{ height: "46px" }}>
              <input
                id="confirm-password-input"
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                style={{
                  height: "46px",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  borderColor: "#D0D5DD",
                  fontSize: "0.875rem",
                }}
                placeholder="Re-enter new secure password"
                autoComplete="new-password"
                maxLength={72}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                data-testid="confirm-password-input"
              />
              <PasswordToggleButton
                isVisible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((prev) => !prev)}
                height="46px"
                testId="toggle-confirm-password-visibility"
              />
            </div>
            {confirmPassword.length > 0 && !rules.passwordsMatch && (
              <div className="text-danger small mt-1" data-testid="password-mismatch-error">
                Passwords do not match.
              </div>
            )}
          </div>

          {/* Real-time Checklist */}
          <div
            className="p-3 mb-4 rounded-3 border"
            style={{ backgroundColor: "#FAFCFB", borderColor: "#EAECF0", borderRadius: "10px" }}
            data-testid="password-checklist"
          >
            <div className="fw-semibold small mb-2 text-secondary" style={{ fontSize: "0.8rem", color: "#475467" }}>
              Password Requirements:
            </div>
            <ul className="list-unstyled mb-0 d-flex flex-column gap-1 small" style={{ fontSize: "0.82rem" }}>
              <li
                className={`d-flex align-items-center gap-2 ${
                  rules.hasMinLength ? "text-success fw-medium" : "text-muted"
                }`}
                data-testid="rule-min-length"
              >
                <span className="fw-bold">{rules.hasMinLength ? "✓" : "○"}</span>
                <span>8 to 72 characters</span>
              </li>
              <li
                className={`d-flex align-items-center gap-2 ${
                  rules.hasUpperLower ? "text-success fw-medium" : "text-muted"
                }`}
                data-testid="rule-upper-lower"
              >
                <span className="fw-bold">{rules.hasUpperLower ? "✓" : "○"}</span>
                <span>Includes uppercase and lowercase letters</span>
              </li>
              <li
                className={`d-flex align-items-center gap-2 ${
                  rules.hasNumberAndSpecial ? "text-success fw-medium" : "text-muted"
                }`}
                data-testid="rule-number-special"
              >
                <span className="fw-bold">{rules.hasNumberAndSpecial ? "✓" : "○"}</span>
                <span>Includes a number and a special character</span>
              </li>
              <li
                className={`d-flex align-items-center gap-2 ${
                  rules.passwordsMatch ? "text-success fw-medium" : "text-muted"
                }`}
                data-testid="rule-passwords-match"
              >
                <span className="fw-bold">{rules.passwordsMatch ? "✓" : "○"}</span>
                <span>Passwords match</span>
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-success w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
            style={{
              height: "48px",
              borderRadius: "8px",
              backgroundColor: "var(--zg-primary)",
              borderColor: "var(--zg-primary)",
              fontSize: "0.95rem",
              transition: "all 0.15s ease-in-out",
            }}
            disabled={!canSubmit}
            data-testid="change-password-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Saving New Password…</span>
              </>
            ) : (
              <span>Save & Continue</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
