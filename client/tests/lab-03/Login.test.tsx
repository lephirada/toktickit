import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import LoginScreen from "../../src/components/LoginScreen.js";
import App from "../../src/App.js";

describe("Issue 13 — LoginScreen Component & Auth Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, "", "/login");
    vi.restoreAllMocks();
  });

  it("validates empty email and empty password upon submission without calling api.login", async () => {
    const loginSpy = vi.spyOn(api, "login");

    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    const submitBtn = screen.getByTestId("login-submit-btn");
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId("login-email-error")).toHaveTextContent(
      "Email address is required."
    );
    expect(screen.getByTestId("login-password-error")).toHaveTextContent(
      "Password is required."
    );
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("validates invalid email format upon submission", async () => {
    const loginSpy = vi.spyOn(api, "login");

    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByTestId("login-submit-btn"));

    expect(await screen.findByTestId("login-email-error")).toHaveTextContent(
      "Please enter a valid email address."
    );
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("displays loading spinner and disables submit button during authentication", async () => {
    let resolveLogin: (val: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    vi.spyOn(api, "login").mockReturnValue(loginPromise as any);

    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "sarah.connor@toktickit.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "Password123!" },
    });

    const submitBtn = screen.getByTestId("login-submit-btn");
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Signing In…/i)).toBeInTheDocument();

    // Clean up
    resolveLogin!({
      data: {
        id: 1,
        email: "sarah.connor@toktickit.com",
        fullName: "Sarah Connor",
        role: "REQUESTER",
        mustChangePassword: false,
      },
    });
  });

  it("displays clear error banner when invalid credentials (401) are returned", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError("Invalid email or password.", "INVALID_CREDENTIALS", undefined, 401)
    );

    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "WrongPass123!" },
    });

    fireEvent.click(screen.getByTestId("login-submit-btn"));

    expect(await screen.findByTestId("login-error-banner")).toHaveTextContent(
      "Invalid email or password."
    );
  });

  it("displays specific error banner when inactive account returns authentication error", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError("Your account is inactive. Please contact your administrator.", "ACCOUNT_INACTIVE", undefined, 401)
    );

    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "inactive@test.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByTestId("login-submit-btn"));

    expect(await screen.findByTestId("login-error-banner")).toHaveTextContent(
      "Your account is inactive. Please contact your administrator."
    );
  });

  it("displays server unavailable error banner when API is unreachable", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("Network error"));

    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByTestId("login-submit-btn"));

    expect(await screen.findByTestId("login-error-banner")).toHaveTextContent(
      "Network error"
    );
  });

  it("successful login updates auth state and redirects to My Tickets for normal users", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(null);
    vi.spyOn(api, "login").mockResolvedValue({
      data: {
        id: 1,
        email: "sarah.connor@toktickit.com",
        fullName: "Sarah Connor",
        role: "REQUESTER",
        mustChangePassword: false,
      },
    });
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1, hasNext: false, hasPrev: false },
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);

    render(<App />);

    // Initial state: login screen
    expect(await screen.findByTestId("login-screen")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "sarah.connor@toktickit.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByTestId("login-submit-btn"));

    // Navigates to My Tickets
    expect(await screen.findByTestId("my-tickets-section")).toBeInTheDocument();
    expect(screen.getByTestId("header-profile-name")).toHaveTextContent("Sarah Connor");
    expect(screen.getByTestId("role-badge-requester")).toHaveTextContent("Requester");
  });

  it("successful login with mustChangePassword=true redirects to Change Password and blocks normal navigation", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(null);
    vi.spyOn(api, "login").mockResolvedValue({
      data: {
        id: 2,
        email: "john.doe@toktickit.com",
        fullName: "John Doe",
        role: "REQUESTER",
        mustChangePassword: true,
      },
    });

    render(<App />);

    expect(await screen.findByTestId("login-screen")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "john.doe@toktickit.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "InitialPass123!" },
    });

    fireEvent.click(screen.getByTestId("login-submit-btn"));

    // Forced change password screen
    expect(await screen.findByTestId("change-password-screen")).toBeInTheDocument();
    expect(screen.getByTestId("change-password-notice")).toBeInTheDocument();
    expect(screen.queryByTestId("my-tickets-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nav-my-tickets")).not.toBeInTheDocument();
  });
});
