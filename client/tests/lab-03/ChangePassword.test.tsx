import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import ChangePasswordScreen from "../../src/components/ChangePasswordScreen.js";
import App from "../../src/App.js";

describe("Issue 13 — ChangePasswordScreen Component Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("evaluates real-time password policy checklist dynamically as input changes", async () => {
    render(
      <AuthProvider>
        <ChangePasswordScreen />
      </AuthProvider>
    );

    const newPassInput = screen.getByTestId("new-password-input");
    const confirmPassInput = screen.getByTestId("confirm-password-input");
    const submitBtn = screen.getByTestId("change-password-submit-btn");

    // Initially submit is disabled
    expect(submitBtn).toBeDisabled();

    // 1. Min length (< 8)
    fireEvent.change(newPassInput, { target: { value: "Abc1!" } });
    expect(screen.getByTestId("rule-min-length")).toHaveClass("text-muted");
    expect(screen.getByTestId("rule-upper-lower")).toHaveClass("text-success");
    expect(screen.getByTestId("rule-number-special")).toHaveClass("text-success");
    expect(screen.getByTestId("rule-passwords-match")).toHaveClass("text-muted");
    expect(submitBtn).toBeDisabled();

    // 2. Add characters to reach >= 8
    fireEvent.change(newPassInput, { target: { value: "Abcdef1!" } });
    expect(screen.getByTestId("rule-min-length")).toHaveClass("text-success");
    expect(screen.getByTestId("rule-passwords-match")).toHaveClass("text-muted");
    expect(submitBtn).toBeDisabled();

    // 3. Confirm password mismatch
    fireEvent.change(confirmPassInput, { target: { value: "Mismatch123!" } });
    expect(screen.getByTestId("rule-passwords-match")).toHaveClass("text-muted");
    expect(submitBtn).toBeDisabled();

    // 4. Confirm password matches
    fireEvent.change(confirmPassInput, { target: { value: "Abcdef1!" } });
    expect(screen.getByTestId("rule-passwords-match")).toHaveClass("text-success");

    // Still disabled because current password is empty
    expect(submitBtn).toBeDisabled();

    // 5. Fill current password -> enabled!
    fireEvent.change(screen.getByTestId("current-password-input"), {
      target: { value: "OldPassword123!" },
    });
    expect(submitBtn).not.toBeDisabled();
  });

  it("displays error banner when change-password API fails", async () => {
    vi.spyOn(api, "changePassword").mockRejectedValue(
      new api.ApiError("Incorrect current password.", "INVALID_CURRENT_PASSWORD", undefined, 400)
    );

    render(
      <AuthProvider>
        <ChangePasswordScreen />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId("current-password-input"), {
      target: { value: "WrongOldPass123!" },
    });
    fireEvent.change(screen.getByTestId("new-password-input"), {
      target: { value: "NewValidPass123!" },
    });
    fireEvent.change(screen.getByTestId("confirm-password-input"), {
      target: { value: "NewValidPass123!" },
    });

    fireEvent.click(screen.getByTestId("change-password-submit-btn"));

    expect(await screen.findByTestId("change-password-error-banner")).toHaveTextContent(
      "Incorrect current password."
    );
  });

  it("handles successful password change, updates auth state, and allows continuation", async () => {
    vi.spyOn(api, "changePassword").mockResolvedValue({
      data: {
        message: "Password changed successfully",
        mustChangePassword: false,
      },
    });

    const onSuccessMock = vi.fn();
    const onNavigateMock = vi.fn();

    render(
      <AuthProvider>
        <ChangePasswordScreen onSuccess={onSuccessMock} onNavigate={onNavigateMock} />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId("current-password-input"), {
      target: { value: "OldPassword123!" },
    });
    fireEvent.change(screen.getByTestId("new-password-input"), {
      target: { value: "NewValidPass123!" },
    });
    fireEvent.change(screen.getByTestId("confirm-password-input"), {
      target: { value: "NewValidPass123!" },
    });

    fireEvent.click(screen.getByTestId("change-password-submit-btn"));

    expect(await screen.findByTestId("change-password-success-banner")).toHaveTextContent(
      "Password changed successfully! Redirecting…"
    );
    expect(onSuccessMock).toHaveBeenCalled();
  });
});
