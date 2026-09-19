import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { ApiError, AuthUser } from "../api.js";
import { AlertTriangleIcon } from "./icons/index.js";
import PasswordToggleButton from "./PasswordToggleButton.js";

interface LoginScreenProps {
  onSuccess?: (user: AuthUser) => void;
  onNavigate?: (route: string) => void;
}

export default function LoginScreen({ onSuccess, onNavigate }: LoginScreenProps) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Top alert error banner
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    setEmailError("");
    setPasswordError("");
    setErrorMessage("");

    if (!email.trim()) {
      setEmailError("Email address is required.");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      onSuccess?.(user);

      if (user.mustChangePassword) {
        if (onNavigate) {
          onNavigate("change-password");
        } else {
          window.history.pushState({}, "", "/change-password");
        }
      } else {
        if (onNavigate) {
          onNavigate("my-tickets");
        } else {
          window.history.pushState({}, "", "/my-tickets");
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage(err.message || "Invalid email or password. Please try again.");
        } else {
          setErrorMessage(err.message || "Unable to complete login. Please try again.");
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message || "Unable to connect to the server. Please try again later.");
      } else {
        setErrorMessage("Unable to connect to the server. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-5 px-3"
      style={{ backgroundColor: "var(--zg-bg)" }}
      data-testid="login-screen"
    >
      <div
        className="card border shadow-lg rounded-4 w-100 p-4 p-sm-5"
        style={{
          maxWidth: 420,
          backgroundColor: "var(--zg-surface)",
          borderColor: "#EAECF0",
          borderRadius: "16px",
          boxShadow: "0 12px 32px -4px rgba(16, 24, 40, 0.08), 0 4px 12px -2px rgba(16, 24, 40, 0.04)",
        }}
      >
        {/* Brand Header */}
        <div className="text-center mb-4 pb-2">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm"
            style={{
              width: 58,
              height: 58,
              backgroundColor: "var(--zg-pale)",
              color: "var(--zg-primary)",
              border: "1px solid #A6F4C5",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "var(--zg-primary)", letterSpacing: "-0.01em" }}>
            TokTickIT
          </h1>
          <p className="text-secondary small mb-0" style={{ color: "#475467" }}>
            Sign in to your enterprise IT service desk
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm"
            style={{ borderColor: "#FECDCA", backgroundColor: "#FEF3F2" }}
            role="alert"
            data-testid="login-error-banner"
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

        <form onSubmit={handleSubmit} noValidate>
          {/* Email Address */}
          <div className="mb-3">
            <label htmlFor="login-email-input" className="form-label small fw-semibold text-dark mb-1">
              Email Address <span className="text-danger">*</span>
            </label>
            <input
              id="login-email-input"
              type="email"
              className={`form-control ${emailError ? "is-invalid" : ""}`}
              style={{
                height: "48px",
                borderRadius: "8px",
                borderColor: emailError ? undefined : "#D0D5DD",
                fontSize: "0.875rem",
              }}
              placeholder="name@company.com"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              disabled={loading}
              data-testid="login-email-input"
            />
            {emailError && (
              <div className="invalid-feedback d-block small mt-1" data-testid="login-email-error">
                {emailError}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="login-password-input" className="form-label small fw-semibold text-dark mb-0">
                Password <span className="text-danger">*</span>
              </label>
            </div>
            <div className="input-group" style={{ height: "48px" }}>
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                className={`form-control ${passwordError ? "is-invalid" : ""}`}
                style={{
                  height: "48px",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  borderColor: passwordError ? undefined : "#D0D5DD",
                  fontSize: "0.875rem",
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                disabled={loading}
                data-testid="login-password-input"
              />
              <PasswordToggleButton
                isVisible={showPassword}
                onToggle={() => setShowPassword((prev) => !prev)}
                height="48px"
                borderColor={passwordError ? undefined : "#D0D5DD"}
                testId="toggle-password-visibility"
              />
            </div>
            {passwordError && (
              <div className="invalid-feedback d-block small mt-1" data-testid="login-password-error">
                {passwordError}
              </div>
            )}
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
            disabled={loading}
            data-testid="login-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Signing In…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
