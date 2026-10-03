import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { AuthProvider, useAuth } from "../../src/context/AuthContext.js";
import Header from "../../src/components/Header.js";
import DirtyGuardModal from "../../src/components/DirtyGuardModal.js";

const mockRequesterUser: api.AuthUser = {
  id: 1,
  fullName: "Sarah Connor",
  email: "sarah.connor@toktickit.com",
  role: "REQUESTER",
  mustChangePassword: false,
};

const mockStaffUser: api.AuthUser = {
  id: 2,
  fullName: "John Doe",
  email: "john.doe@toktickit.com",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const mockAdminUser: api.AuthUser = {
  id: 3,
  fullName: "Admin Alice",
  email: "admin.alice@toktickit.com",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

function TestHeaderApp({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { isFormDirty, setFormDirty } = useAuth();

  return (
    <div>
      <Header onNavigate={onNavigate} />
      <DirtyGuardModal />
      <div data-testid="is-dirty">{isFormDirty ? "dirty" : "clean"}</div>
      <button onClick={() => setFormDirty(true)}>Make Form Dirty</button>
      <button onClick={() => setFormDirty(false)}>Clean Form</button>
    </div>
  );
}

describe("Issue 13 / Shared Application Header Component Tests (RequesterHeader.test.tsx)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("1. Renders authenticated Requester user with name, role badge, and requester links", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockRequesterUser);

    render(
      <AuthProvider>
        <TestHeaderApp />
      </AuthProvider>
    );

    // Wait for user to be loaded
    expect(await screen.findByTestId("header-profile-name")).toHaveTextContent("Sarah Connor");
    expect(screen.getByTestId("role-badge-requester")).toBeInTheDocument();
    expect(screen.getByTestId("role-badge-requester")).toHaveTextContent("Requester");

    // Requester navigation links must be visible on desktop
    expect(screen.getByTestId("nav-my-tickets")).toBeInTheDocument();
    expect(screen.getByTestId("nav-create-ticket")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-staff-queue")).not.toBeInTheDocument();
  });

  it("2. Renders role-specific navigation for IT_STAFF", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockStaffUser);

    render(
      <AuthProvider>
        <TestHeaderApp />
      </AuthProvider>
    );

    expect(await screen.findByTestId("header-profile-name")).toHaveTextContent("John Doe");
    expect(screen.getByTestId("role-badge-staff")).toBeInTheDocument();
    expect(screen.getByTestId("role-badge-staff")).toHaveTextContent("IT Staff");

    expect(screen.getByTestId("nav-staff-queue")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-my-tickets")).not.toBeInTheDocument();
  });

  it("3. Renders role-specific navigation for ADMINISTRATOR", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockAdminUser);

    render(
      <AuthProvider>
        <TestHeaderApp />
      </AuthProvider>
    );

    expect(await screen.findByTestId("header-profile-name")).toHaveTextContent("Admin Alice");
    expect(screen.getByTestId("role-badge-admin")).toBeInTheDocument();
    expect(screen.getByTestId("role-badge-admin")).toHaveTextContent("Admin");

    expect(screen.getByTestId("nav-admin-users")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-my-tickets")).not.toBeInTheDocument();
  });

  it("4. Profile dropdown opens and displays user email, role badge, Change Password, and Sign Out", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockRequesterUser);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestHeaderApp />
      </AuthProvider>
    );

    const profileTrigger = await screen.findByTestId("header-profile-button");
    await user.click(profileTrigger);

    expect(screen.getByTestId("header-user-dropdown")).toBeInTheDocument();
    expect(screen.getByText("sarah.connor@toktickit.com")).toBeInTheDocument();
    expect(screen.getByTestId("dropdown-change-password")).toBeInTheDocument();
    expect(screen.getByTestId("header-logout-btn")).toBeInTheDocument();
  });

  it("5. Clicking Sign Out in dropdown calls api.logout and updates session", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockRequesterUser);
    const logoutSpy = vi.spyOn(api, "logout").mockResolvedValue();
    const onNavigateMock = vi.fn();
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestHeaderApp onNavigate={onNavigateMock} />
      </AuthProvider>
    );

    const profileTrigger = await screen.findByTestId("header-profile-button");
    await user.click(profileTrigger);

    const logoutBtn = screen.getByTestId("header-logout-btn");
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
      expect(onNavigateMock).toHaveBeenCalledWith("login");
    });
  });

  it("6. Intercepts navigation with dirty guard modal and navigates only upon confirming discard", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockRequesterUser);
    const onNavigateMock = vi.fn();
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestHeaderApp onNavigate={onNavigateMock} />
      </AuthProvider>
    );

    await screen.findByTestId("header-profile-name");

    // Make form dirty
    await user.click(screen.getByRole("button", { name: /make form dirty/i }));
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");

    // Click My Tickets in header nav
    const myTicketsLink = screen.getByTestId("nav-my-tickets");
    await user.click(myTicketsLink);

    // Modal appears, navigation blocked
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onNavigateMock).not.toHaveBeenCalled();

    // Click Cancel on modal
    await user.click(screen.getByTestId("dirty-cancel-btn"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");
    expect(onNavigateMock).not.toHaveBeenCalled();

    // Click navigation link again
    await user.click(myTicketsLink);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click Discard Changes
    await user.click(screen.getByTestId("dirty-discard-btn"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("clean");
    expect(onNavigateMock).toHaveBeenCalledWith("my-tickets");
  });
});
