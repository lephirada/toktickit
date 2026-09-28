import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import UserManagement from "../../src/components/UserManagement.js";

const mockAdminUser: api.AuthUser = {
  id: 1,
  email: "admin@toktickit.com",
  fullName: "Admin Tester",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

const mockUserList: api.AdminUserItem[] = [
  {
    id: 1,
    fullName: "Admin Tester",
    email: "admin@toktickit.com",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
  },
  {
    id: 2,
    fullName: "Staff John",
    email: "staff.john@toktickit.com",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-02-02T10:00:00.000Z",
    updatedAt: "2026-02-02T10:00:00.000Z",
  },
  {
    id: 3,
    fullName: "Requester Jane",
    email: "jane.req@toktickit.com",
    role: "REQUESTER",
    isActive: false,
    mustChangePassword: true,
    createdAt: "2026-02-03T10:00:00.000Z",
    updatedAt: "2026-02-03T10:00:00.000Z",
  },
];

describe("Issue 16 — UserManagement Component Suite (UserManagement.test.tsx)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockAdminUser);
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({ data: [...mockUserList] });
  });

  const renderComponent = () =>
    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

  // 1. Table columns rendering on desktop
  it("Scenario 1: renders 8-column table with users and badges", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("admin-users-table")).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText("User ID")).toBeInTheDocument();
    expect(screen.getByText("Display Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();

    // Check user rows
    expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-name-1")).toHaveTextContent("Admin Tester");
    expect(screen.getByTestId("user-email-1")).toHaveTextContent("admin@toktickit.com");
    expect(screen.getByTestId("user-status-active-1")).toHaveTextContent("Active");

    expect(screen.getByTestId("user-row-3")).toBeInTheDocument();
    expect(screen.getByTestId("user-status-inactive-3")).toHaveTextContent("Inactive");
  });

  // 2. Filters & Search interaction
  it("Scenario 2: filters users by role and search input", async () => {
    const fetchSpy = vi.spyOn(api, "fetchAdminUsers");
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("admin-users-table")).toBeInTheDocument();
    });

    // Change role filter
    const roleSelect = screen.getByTestId("admin-users-role-filter");
    fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ role: "IT_STAFF" })
      );
    });

    // Enter search term
    const searchInput = screen.getByTestId("admin-users-search-input");
    fireEvent.change(searchInput, { target: { value: "John" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ search: "John" })
      );
    });
  });

  // 3. Empty state display
  it("Scenario 3: displays empty state when user list is empty", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({ data: [] });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("admin-users-empty-state")).toBeInTheDocument();
    });
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  // 4. Create User Modal interaction & submission
  it("Scenario 4: opens Create User modal, toggles password visibility, and submits payload", async () => {
    const createSpy = vi.spyOn(api, "createAdminUser").mockResolvedValue({
      data: {
        id: 4,
        fullName: "New Tech",
        email: "tech@toktickit.com",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
        createdAt: "2026-02-04T10:00:00.000Z",
        updatedAt: "2026-02-04T10:00:00.000Z",
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("create-user-button")).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByTestId("create-user-button"));
    expect(screen.getByTestId("create-user-modal")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByTestId("create-user-fullname-input"), {
      target: { value: "New Tech" },
    });
    fireEvent.change(screen.getByTestId("create-user-email-input"), {
      target: { value: "tech@toktickit.com" },
    });
    fireEvent.change(screen.getByTestId("create-user-role-select"), {
      target: { value: "IT_STAFF" },
    });
    fireEvent.change(screen.getByTestId("create-user-password-input"), {
      target: { value: "InitialPass123!" },
    });

    // Toggle password visibility
    const pwdInput = screen.getByTestId("create-user-password-input") as HTMLInputElement;
    expect(pwdInput.type).toBe("password");
    fireEvent.click(screen.getByTestId("create-user-password-toggle"));
    expect(pwdInput.type).toBe("text");

    // Submit
    fireEvent.click(screen.getByTestId("create-user-submit-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        fullName: "New Tech",
        email: "tech@toktickit.com",
        role: "IT_STAFF",
        initialPassword: "InitialPass123!",
      });
    });

    // Modal closed and success banner displayed
    await waitFor(() => {
      expect(screen.queryByTestId("create-user-modal")).not.toBeInTheDocument();
      expect(screen.getByTestId("admin-users-success-banner")).toBeInTheDocument();
    });
  });

  // 5. Edit User Modal & Self-Deactivation Guard
  it("Scenario 5: edits user profile and enforces self-deactivation guardrail", async () => {
    const updateSpy = vi.spyOn(api, "updateAdminUser").mockResolvedValue({
      data: {
        id: 2,
        fullName: "Staff John Updated",
        email: "staff.john@toktickit.com",
        role: "IT_STAFF",
        isActive: false,
        mustChangePassword: false,
        createdAt: "2026-02-02T10:00:00.000Z",
        updatedAt: "2026-02-02T10:00:00.000Z",
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-2")).toBeInTheDocument();
    });

    // 1. Edit User 2 (not self)
    fireEvent.click(screen.getByTestId("edit-user-btn-2"));
    expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();

    // Verify email is read-only
    const emailField = screen.getByTestId("edit-user-email-readonly") as HTMLInputElement;
    expect(emailField.disabled).toBe(true);
    expect(emailField.value).toBe("staff.john@toktickit.com");

    // Toggle status to inactive
    fireEvent.click(screen.getByTestId("edit-user-active-toggle"));

    // Save changes
    fireEvent.click(screen.getByTestId("edit-user-save-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(2, {
        fullName: "Staff John",
        role: "IT_STAFF",
        isActive: false,
      });
    });

    // 2. Edit User 1 (self) and test self-deactivation guard
    await waitFor(() => {
      expect(screen.queryByTestId("edit-user-modal")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-user-btn-1"));
    expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();

    // Attempt to toggle active to false on self
    const activeToggle = screen.getByTestId("edit-user-active-toggle");
    fireEvent.click(activeToggle); // uncheck active

    // Guard warning is shown and save button is disabled
    expect(screen.getByTestId("edit-user-self-deactivate-warning")).toBeInTheDocument();
    const saveBtn = screen.getByTestId("edit-user-save-btn") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  // 6. Reset Password Modal interaction
  it("Scenario 6: resets initial password through modal", async () => {
    const resetSpy = vi.spyOn(api, "resetAdminUserInitialPassword").mockResolvedValue({
      data: { message: "Initial password updated successfully." },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("reset-pwd-btn-3")).toBeInTheDocument();
    });

    // Open reset modal for user 3
    fireEvent.click(screen.getByTestId("reset-pwd-btn-3"));
    expect(screen.getByTestId("reset-password-modal")).toBeInTheDocument();

    // Enter password
    fireEvent.change(screen.getByTestId("reset-password-input"), {
      target: { value: "NewTempSecret123!" },
    });

    // Submit
    fireEvent.click(screen.getByTestId("reset-password-submit-btn"));

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith(3, "NewTempSecret123!");
    });

    await waitFor(() => {
      expect(screen.queryByTestId("reset-password-modal")).not.toBeInTheDocument();
      expect(screen.getByTestId("admin-users-success-banner")).toBeInTheDocument();
    });
  });
});
