import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AdminUserItem,
  CreateAdminUserDTO,
  UpdateAdminUserDTO,
  UserRole,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserInitialPassword,
  ApiError,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";
import PasswordToggleButton from "./PasswordToggleButton.js";
import {
  UserIcon,
  SearchIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
} from "./icons/index.js";

export function renderUserRoleBadge(role: UserRole) {
  switch (role) {
    case "REQUESTER":
      return (
        <span
          className="badge px-2 py-1 rounded-pill"
          style={{
            backgroundColor: "#EFF8FF",
            color: "#175CD3",
            border: "1px solid #B2DDFF",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
          data-testid="role-badge-requester"
        >
          Requester
        </span>
      );
    case "IT_STAFF":
      return (
        <span
          className="badge px-2 py-1 rounded-pill"
          style={{
            backgroundColor: "var(--zg-pale, #EAF6EF)",
            color: "var(--zg-primary, #006B3C)",
            border: "1px solid #A6F4C5",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
          data-testid="role-badge-staff"
        >
          IT Staff
        </span>
      );
    case "ADMINISTRATOR":
      return (
        <span
          className="badge px-2 py-1 rounded-pill"
          style={{
            backgroundColor: "#F4EBFF",
            color: "#5925DC",
            border: "1px solid #D8B4FE",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
          data-testid="role-badge-admin"
        >
          Administrator
        </span>
      );
    default:
      return <span className="badge bg-secondary">{role}</span>;
  }
}

export function formatDate(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserItem | null>(null);

  // Load users
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminUsers({
        search: searchInput,
        role: roleFilter,
      });
      setUsers(res.data);
    } catch (err: any) {
      setError(err?.message || "Failed to load users. Please check permissions and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [searchInput, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle successful actions
  const showSuccess = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => {
      setSuccessBanner((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  return (
    <div className="w-100" data-testid="user-management-container">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="h3 fw-bold text-dark mb-0 tracking-tight" data-testid="user-management-title">
              User Management
            </h1>
            <span
              className="badge rounded-pill bg-light text-secondary border px-2 py-1 fw-semibold"
              style={{ fontSize: "0.8rem" }}
              data-testid="users-count-badge"
            >
              {users.length} {users.length === 1 ? "User" : "Users"}
            </span>
          </div>
          <p className="text-secondary small mb-0">
            Maintain user accounts, assign system roles, manage active status, and provision initial credentials.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 px-3 py-2 fw-semibold rounded-2"
            onClick={loadUsers}
            disabled={isLoading}
            data-testid="admin-users-refresh-button"
            aria-label="Refresh user list"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isLoading ? "spin" : ""}
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-sm fw-semibold d-flex align-items-center gap-2 px-3 py-2 text-white rounded-2 shadow-sm"
            style={{ backgroundColor: "var(--zg-primary, #006B3C)" }}
            onClick={() => setIsCreateOpen(true)}
            data-testid="create-user-button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create User
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm mb-4"
          role="alert"
          data-testid="admin-users-success-banner"
          style={{
            backgroundColor: "#EDFDF5",
            borderColor: "#A6F4C5",
            color: "#05603A",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <CheckCircleIcon size={20} color="#05603A" />
            <span className="fw-medium">{successBanner}</span>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setSuccessBanner(null)}
          ></button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm mb-4"
          role="alert"
          data-testid="admin-users-error"
          style={{ backgroundColor: "#FEF3F2", borderColor: "#FECDCA", color: "#B42318" }}
        >
          <div className="d-flex align-items-center gap-2">
            <AlertTriangleIcon size={20} color="#B42318" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm fw-semibold px-2 py-1"
            onClick={loadUsers}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div
        className="card border-0 shadow-sm p-3 mb-4 rounded-3"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #EAECF0" }}
      >
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-7 col-lg-8">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted ps-3">
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-1"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="admin-users-search-input"
                aria-label="Search users by name or email"
                style={{ fontSize: "0.9rem" }}
              />
              {searchInput && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0 border-end"
                  onClick={() => setSearchInput("")}
                  title="Clear search"
                  style={{ borderColor: "#D0D5DD" }}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          <div className="col-12 col-md-5 col-lg-4 d-flex align-items-center gap-2">
            <label htmlFor="role-filter-select" className="small fw-semibold text-secondary text-nowrap mb-0">
              Role:
            </label>
            <select
              id="role-filter-select"
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              data-testid="admin-users-role-filter"
              style={{ fontSize: "0.9rem" }}
            >
              <option value="ALL">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && users.length === 0 && (
        <div
          className="card border-0 shadow-sm p-5 text-center my-4 rounded-3"
          data-testid="admin-users-loading"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <div className="spinner-border text-success mx-auto mb-3" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
            <span className="visually-hidden">Loading users...</span>
          </div>
          <div className="fw-semibold text-dark">Loading user accounts...</div>
          <div className="small text-muted">Retrieving directory from TokTickIT service desk</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && users.length === 0 && (
        <div
          className="card border-0 shadow-sm p-5 text-center my-4 rounded-3"
          data-testid="admin-users-empty-state"
          style={{ backgroundColor: "#FFFFFF", border: "1px dashed #D0D5DD" }}
        >
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle p-3 mx-auto mb-3"
            style={{ backgroundColor: "#F4EBFF", width: 56, height: 56 }}
          >
            <UserIcon size={28} color="#5925DC" />
          </div>
          <h3 className="h5 fw-bold text-dark mb-1">No users found</h3>
          <p className="text-secondary small mb-3" style={{ maxWidth: 420, margin: "0 auto" }}>
            {searchInput || roleFilter !== "ALL"
              ? "No user accounts match your search or filter criteria. Try adjusting or clearing your filters."
              : "No user accounts currently exist in the system."}
          </p>
          {(searchInput || roleFilter !== "ALL") && (
            <div>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2 rounded-2"
                onClick={() => {
                  setSearchInput("");
                  setRoleFilter("ALL");
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Desktop & Tablet Table View (>= 768px) */}
      {users.length > 0 && (
        <div className="d-none d-md-block">
          <div
            className="card border-0 shadow-sm rounded-3 overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #EAECF0" }}
          >
            <div className="table-responsive" style={{ maxHeight: "calc(100vh - 280px)" }}>
              <table className="table table-hover align-middle mb-0" data-testid="admin-users-table">
                <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #EAECF0" }}>
                  <tr className="text-secondary text-uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                    <th scope="col" className="py-3 px-3 fw-bold" style={{ width: "9%" }}>User ID</th>
                    <th scope="col" className="py-3 px-3 fw-bold" style={{ width: "20%" }}>Display Name</th>
                    <th scope="col" className="py-3 px-3 fw-bold" style={{ width: "21%" }}>Email</th>
                    <th scope="col" className="py-3 px-3 fw-bold" style={{ width: "8%" }}>Role</th>
                    <th scope="col" className="py-3 px-3 fw-bold" style={{ width: "8%" }}>Status</th>
                    <th scope="col" className="py-3 px-3 fw-bold d-none d-lg-table-cell" style={{ width: "12%" }}>Created</th>
                    <th scope="col" className="py-3 px-3 fw-bold d-none d-xl-table-cell" style={{ width: "12%" }}>Updated</th>
                    <th scope="col" className="py-3 px-3 fw-bold text-end" style={{ width: "11%", minWidth: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} data-testid={`user-row-${u.id}`}>
                        <td className="py-3 px-3 fw-mono text-muted small" data-testid={`user-id-${u.id}`}>
                          #{u.id}
                        </td>
                        <td className="py-3 px-3" data-testid={`user-name-${u.id}`}>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-dark">{u.fullName}</span>
                            {isSelf && (
                              <span
                                className="badge bg-light text-dark border px-2 py-0 fw-normal"
                                style={{ fontSize: "0.68rem" }}
                              >
                                You
                              </span>
                            )}
                          </div>
                          {u.mustChangePassword && (
                            <span
                              className="badge px-1 py-0 text-warning bg-warning-subtle fw-normal"
                              style={{ fontSize: "0.68rem" }}
                              title="User must change password at next login"
                            >
                              Password reset required
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-secondary small font-monospace" data-testid={`user-email-${u.id}`}>
                          {u.email}
                        </td>
                        <td className="py-3 px-3" data-testid={`user-role-${u.id}`}>
                          {renderUserRoleBadge(u.role)}
                        </td>
                        <td className="py-3 px-3" data-testid={`user-status-${u.id}`}>
                          {u.isActive ? (
                            <span
                              className="badge px-2 py-1 rounded-pill"
                              style={{
                                backgroundColor: "#ECFDF3",
                                color: "#027A48",
                                border: "1px solid #A6F4C5",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                              data-testid={`user-status-active-${u.id}`}
                            >
                              Active
                            </span>
                          ) : (
                            <span
                              className="badge px-2 py-1 rounded-pill"
                              style={{
                                backgroundColor: "#F2F4F7",
                                color: "#344054",
                                border: "1px solid #D0D5DD",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                              data-testid={`user-status-inactive-${u.id}`}
                            >
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted small d-none d-lg-table-cell" data-testid={`user-created-${u.id}`}>
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="py-3 px-3 text-muted small d-none d-xl-table-cell" data-testid={`user-updated-${u.id}`}>
                          {formatDate(u.updatedAt)}
                        </td>
                        <td className="py-3 px-3 text-end" data-testid={`user-actions-${u.id}`}>
                          <div className="d-inline-flex gap-1 justify-content-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm px-2 py-1 rounded-2 fw-semibold"
                              style={{ fontSize: "0.8rem" }}
                              onClick={() => setEditingUser(u)}
                              data-testid={`edit-user-btn-${u.id}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm px-2 py-1 rounded-2 fw-semibold"
                              style={{ fontSize: "0.8rem" }}
                              onClick={() => setResetPasswordUser(u)}
                              data-testid={`reset-pwd-btn-${u.id}`}
                              title="Reset initial password"
                            >
                              Reset Pwd
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Card Layout (< 768px) */}
      {users.length > 0 && (
        <div className="d-md-none d-flex flex-column gap-3" data-testid="admin-users-mobile-list">
          {users.map((u) => {
            const isSelf = currentUser?.id === u.id;
            return (
              <div
                key={u.id}
                className="card border-0 shadow-sm p-3 rounded-3"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid #EAECF0" }}
                data-testid={`user-card-${u.id}`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold text-dark">{u.fullName}</span>
                      {isSelf && (
                        <span className="badge bg-light text-dark border px-2 py-0" style={{ fontSize: "0.68rem" }}>
                          You
                        </span>
                      )}
                    </div>
                    <div className="small text-muted font-monospace">{u.email}</div>
                  </div>
                  <span className="text-muted small fw-mono">#{u.id}</span>
                </div>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <div>{renderUserRoleBadge(u.role)}</div>
                  {u.isActive ? (
                    <span
                      className="badge px-2 py-1 rounded-pill"
                      style={{
                        backgroundColor: "#ECFDF3",
                        color: "#027A48",
                        border: "1px solid #A6F4C5",
                        fontSize: "0.75rem",
                      }}
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className="badge px-2 py-1 rounded-pill"
                      style={{
                        backgroundColor: "#F2F4F7",
                        color: "#344054",
                        border: "1px solid #D0D5DD",
                        fontSize: "0.75rem",
                      }}
                    >
                      Inactive
                    </span>
                  )}
                  {u.mustChangePassword && (
                    <span className="badge px-2 py-1 text-warning bg-warning-subtle" style={{ fontSize: "0.72rem" }}>
                      Must change pwd
                    </span>
                  )}
                </div>

                <div className="small text-muted mb-3">
                  <div>Created: {formatDate(u.createdAt)}</div>
                  <div>Updated: {formatDate(u.updatedAt)}</div>
                </div>

                <div className="d-flex gap-2 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm flex-fill fw-semibold py-1 rounded-2"
                    onClick={() => setEditingUser(u)}
                    data-testid={`mobile-edit-user-btn-${u.id}`}
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm flex-fill fw-semibold py-1 rounded-2"
                    onClick={() => setResetPasswordUser(u)}
                    data-testid={`mobile-reset-pwd-btn-${u.id}`}
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <CreateUserModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(created) => {
            setIsCreateOpen(false);
            showSuccess(`User "${created.fullName}" created successfully.`);
            loadUsers();
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          currentUserId={currentUser?.id}
          onClose={() => setEditingUser(null)}
          onSuccess={(updated) => {
            setEditingUser(null);
            showSuccess(`User "${updated.fullName}" updated successfully.`);
            loadUsers();
          }}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => {
            setResetPasswordUser(null);
            showSuccess(`Initial password reset successfully for "${resetPasswordUser.fullName}".`);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

// ========================================================
// Create User Modal Component
// ========================================================
interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: (user: AdminUserItem) => void;
}

function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("REQUESTER");
  const [initialPassword, setInitialPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick checks
    if (!fullName.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Email address is required.");
      return;
    }
    if (!initialPassword) {
      setErrorMessage("Initial password is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createAdminUser({
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        initialPassword,
      });
      onSuccess(res.data);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(16, 24, 40, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1050,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      data-testid="create-user-modal"
    >
      <div
        className="card border-0 shadow-lg rounded-3 w-100"
        style={{ maxWidth: 540, maxHeight: "90vh", overflowY: "auto", backgroundColor: "#FFFFFF" }}
      >
        <div className="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
          <div>
            <h2 className="h5 fw-bold text-dark mb-1">Create New User</h2>
            <div className="small text-muted">Provision a new account with active access and initial password.</div>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            disabled={isSubmitting}
            onClick={onClose}
          ></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body p-4">
            {/* Informational notice */}
            <div
              className="p-3 rounded-2 mb-4 d-flex align-items-start gap-2"
              style={{ backgroundColor: "#F0F9FF", border: "1px solid #B9E6FE", color: "#026AA2" }}
            >
              <ShieldIcon size={18} className="flex-shrink-0 mt-1" />
              <div className="small">
                <strong>Active Account Notice:</strong> New users are created in an <strong>Active</strong> state and will be prompted to change their temporary initial password upon their first login.
              </div>
            </div>

            {errorMessage && (
              <div
                className="alert alert-danger p-3 rounded-2 small mb-4 d-flex align-items-center gap-2"
                role="alert"
                data-testid="create-user-error"
                style={{ backgroundColor: "#FEF3F2", borderColor: "#FECDCA", color: "#B42318" }}
              >
                <AlertTriangleIcon size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Full Name */}
            <div className="mb-3">
              <label htmlFor="create-fullname" className="form-label small fw-semibold text-dark">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                id="create-fullname"
                type="text"
                className="form-control"
                placeholder="e.g. Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                required
                data-testid="create-user-fullname-input"
              />
            </div>

            {/* Email Address */}
            <div className="mb-3">
              <label htmlFor="create-email" className="form-label small fw-semibold text-dark">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                id="create-email"
                type="email"
                className="form-control"
                placeholder="e.g. jane.doe@toktickit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="create-user-email-input"
              />
              <div className="form-text text-muted small">
                Case-insensitive. Must be unique across all system users.
              </div>
            </div>

            {/* Role */}
            <div className="mb-3">
              <label htmlFor="create-role" className="form-label small fw-semibold text-dark">
                System Role <span className="text-danger">*</span>
              </label>
              <select
                id="create-role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                data-testid="create-user-role-select"
              >
                <option value="REQUESTER">Requester — Ticket creation & personal tracking</option>
                <option value="IT_STAFF">IT Staff — Ticket queue processing, notes, status</option>
                <option value="ADMINISTRATOR">Administrator — Full operations & user management</option>
              </select>
            </div>

            {/* Initial Password */}
            <div className="mb-2">
              <label htmlFor="create-password" className="form-label small fw-semibold text-dark">
                Initial Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Temporary password for first login"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  required
                  data-testid="create-user-password-input"
                  style={{ borderRight: 0 }}
                />
                <PasswordToggleButton
                  isVisible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  testId="create-user-password-toggle"
                />
              </div>
              <div className="form-text text-muted small mt-1">
                Must be 8–72 characters, with at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character.
              </div>
            </div>
          </div>

          <div className="card-footer bg-light border-top p-3 d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2 rounded-2"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="create-user-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm fw-semibold px-4 py-2 text-white rounded-2"
              style={{ backgroundColor: "var(--zg-primary, #006B3C)" }}
              disabled={isSubmitting}
              data-testid="create-user-submit-btn"
            >
              {isSubmitting ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              ) : null}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// Safety Alert Interception Dialog Component
// ========================================================
interface SafetyAlertDialogProps {
  type: "self-deactivation" | "last-admin";
  title: string;
  message: string;
  onDismiss: () => void;
}

export function SafetyAlertDialog({
  type,
  title,
  message,
  onDismiss,
}: SafetyAlertDialogProps) {
  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(16, 24, 40, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1100,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-dialog-title"
      data-testid="safety-alert-dialog"
      data-dialog-type={type}
    >
      <div
        className="card border-0 shadow-lg rounded-3 w-100"
        style={{ maxWidth: 440, backgroundColor: "#FFFFFF" }}
      >
        <div className="card-body p-4 text-center">
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: 56, height: 56, backgroundColor: "#FEF3F2", color: "#D92D20" }}
          >
            <AlertTriangleIcon size={28} />
          </div>
          <h3
            id="safety-dialog-title"
            className="h5 fw-bold text-dark mb-2"
            data-testid="safety-dialog-title"
          >
            {title}
          </h3>
          <p
            className="text-secondary small mb-4 px-2"
            data-testid="safety-dialog-message"
          >
            {message}
          </p>
          <div className="d-flex justify-content-center">
            <button
              type="button"
              className="btn btn-primary btn-sm fw-semibold px-4 py-2 rounded-2"
              onClick={onDismiss}
              data-testid="safety-dialog-ok-btn"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// Edit User Modal Component
// ========================================================
interface EditUserModalProps {
  user: AdminUserItem;
  currentUserId?: number;
  onClose: () => void;
  onSuccess: (user: AdminUserItem) => void;
}

function EditUserModal({ user, currentUserId, onClose, onSuccess }: EditUserModalProps) {
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState<boolean>(user.isActive);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Safety alert dialog state (interception for self-deactivation & last-admin protection)
  const [safetyDialog, setSafetyDialog] = useState<{
    type: "self-deactivation" | "last-admin";
    title: string;
    message: string;
  } | null>(null);

  const isSelf = currentUserId === user.id;
  const isSelfDeactivationAttempt = isSelf && !isActive;

  const handleToggleActive = (checked: boolean) => {
    if (isSelf && !checked) {
      setSafetyDialog({
        type: "self-deactivation",
        title: "Cannot Deactivate Account",
        message: "Administrators cannot deactivate their own account.",
      });
      setIsActive(false);
      return;
    }
    setIsActive(checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Full name cannot be empty.");
      return;
    }

    if (isSelfDeactivationAttempt) {
      setSafetyDialog({
        type: "self-deactivation",
        title: "Cannot Deactivate Account",
        message: "Administrators cannot deactivate their own account.",
      });
      setErrorMessage("Administrators cannot deactivate their own account.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updateAdminUser(user.id, {
        fullName: fullName.trim(),
        role,
        isActive,
      });
      onSuccess(res.data);
    } catch (err: any) {
      if (err?.code === "CANNOT_DEACTIVATE_SELF") {
        setSafetyDialog({
          type: "self-deactivation",
          title: "Cannot Deactivate Account",
          message: "Administrators cannot deactivate their own account.",
        });
        setErrorMessage("Administrators cannot deactivate their own account.");
      } else if (err?.code === "LAST_ADMIN_PROTECTED") {
        setSafetyDialog({
          type: "last-admin",
          title: "Last Administrator Protected",
          message: "This account cannot be deactivated or demoted because it is the last active Administrator.",
        });
        setErrorMessage("Cannot deactivate or demote the last remaining active Administrator.");
      } else {
        setErrorMessage(err?.message || "Failed to update user profile.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(16, 24, 40, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 1050,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
        data-testid="edit-user-modal"
      >
        <div
          className="card border-0 shadow-lg rounded-3 w-100"
          style={{ maxWidth: 540, maxHeight: "90vh", overflowY: "auto", backgroundColor: "#FFFFFF" }}
        >
          <div className="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h5 fw-bold text-dark mb-1">Edit User Profile</h2>
              <div className="small text-muted">Update details for #{user.id} — {user.fullName}</div>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              disabled={isSubmitting}
              onClick={onClose}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="card-body p-4">
              {errorMessage && (
                <div
                  className="alert alert-danger p-3 rounded-2 small mb-4 d-flex align-items-center gap-2"
                  role="alert"
                  data-testid="edit-user-error"
                  style={{ backgroundColor: "#FEF3F2", borderColor: "#FECDCA", color: "#B42318" }}
                >
                  <AlertTriangleIcon size={16} className="flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Read-only Email Field */}
              <div className="mb-3">
                <label htmlFor="edit-email-readonly" className="form-label small fw-semibold text-secondary">
                  Email Address (Read-only)
                </label>
                <input
                  id="edit-email-readonly"
                  type="text"
                  className="form-control bg-light font-monospace"
                  value={user.email}
                  disabled
                  readOnly
                  data-testid="edit-user-email-readonly"
                  style={{ cursor: "not-allowed" }}
                />
                <div className="form-text text-muted small">
                  Email addresses are immutable and cannot be modified after account creation.
                </div>
              </div>

              {/* Full Name */}
              <div className="mb-3">
                <label htmlFor="edit-fullname" className="form-label small fw-semibold text-dark">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-fullname"
                  type="text"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                  required
                  data-testid="edit-user-fullname-input"
                />
              </div>

              {/* Role */}
              <div className="mb-4">
                <label htmlFor="edit-role" className="form-label small fw-semibold text-dark">
                  System Role <span className="text-danger">*</span>
                </label>
                <select
                  id="edit-role"
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  data-testid="edit-user-role-select"
                >
                  <option value="REQUESTER">Requester</option>
                  <option value="IT_STAFF">IT Staff</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </select>
                {isSelf && role !== "ADMINISTRATOR" && (
                  <div className="form-text text-warning small mt-1 fw-medium">
                    ⚠️ Note: Demoting your own account will immediately revoke Administrator privileges on your current session.
                  </div>
                )}
              </div>

              {/* Account Status Toggle Switch */}
              <div className="p-3 rounded-2 border" style={{ backgroundColor: "#F9FAFB", borderColor: "#EAECF0" }}>
                <div className="form-check form-switch d-flex align-items-center gap-3 ps-0 mb-0">
                  <input
                    className="form-check-input ms-0 mt-0 flex-shrink-0"
                    type="checkbox"
                    role="switch"
                    id="edit-active-toggle"
                    checked={isActive}
                    onChange={(e) => handleToggleActive(e.target.checked)}
                    data-testid="edit-user-active-toggle"
                    style={{ width: "2.4em", height: "1.25em", cursor: "pointer" }}
                  />
                  <label className="form-check-label d-flex flex-column" htmlFor="edit-active-toggle" style={{ cursor: "pointer" }}>
                    <span className="fw-semibold text-dark" style={{ fontSize: "0.9rem" }}>
                      Account Status: {isActive ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}
                    </span>
                    <span className="small text-muted" style={{ fontSize: "0.8rem" }}>
                      {isActive
                        ? "User can authenticate and perform role-permitted desk actions."
                        : "User is blocked from logging in and cannot be assigned to tickets."}
                    </span>
                  </label>
                </div>

                {isSelfDeactivationAttempt && (
                  <div
                    className="alert alert-warning p-2 mt-3 mb-0 small rounded-2 d-flex align-items-center gap-2"
                    data-testid="edit-user-self-deactivate-warning"
                  >
                    <AlertTriangleIcon size={16} className="text-warning flex-shrink-0" />
                    <span>Administrators cannot deactivate their own account.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-footer bg-light border-top p-3 d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2 rounded-2"
                onClick={onClose}
                disabled={isSubmitting}
                data-testid="edit-user-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm fw-semibold px-4 py-2 text-white rounded-2"
                style={{ backgroundColor: "var(--zg-primary, #006B3C)" }}
                disabled={isSubmitting || isSelfDeactivationAttempt}
                data-testid="edit-user-save-btn"
              >
                {isSubmitting ? (
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                ) : null}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {safetyDialog && (
        <SafetyAlertDialog
          type={safetyDialog.type}
          title={safetyDialog.title}
          message={safetyDialog.message}
          onDismiss={() => setSafetyDialog(null)}
        />
      )}
    </>
  );
}

// ========================================================
// Reset Password Modal Component
// ========================================================
interface ResetPasswordModalProps {
  user: AdminUserItem;
  onClose: () => void;
  onSuccess: () => void;
}

function ResetPasswordModal({ user, onClose, onSuccess }: ResetPasswordModalProps) {
  const [initialPassword, setInitialPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!initialPassword) {
      setErrorMessage("New initial password is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      await resetAdminUserInitialPassword(user.id, initialPassword);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to reset initial password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(16, 24, 40, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1050,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      data-testid="reset-password-modal"
    >
      <div
        className="card border-0 shadow-lg rounded-3 w-100"
        style={{ maxWidth: 480, maxHeight: "90vh", overflowY: "auto", backgroundColor: "#FFFFFF" }}
      >
        <div className="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
          <div>
            <h2 className="h5 fw-bold text-dark mb-1">Reset Initial Password</h2>
            <div className="small text-muted">Provision a new password for {user.fullName}</div>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            disabled={isSubmitting}
            onClick={onClose}
          ></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body p-4">
            <div
              className="p-3 rounded-2 mb-4 d-flex align-items-start gap-2"
              style={{ backgroundColor: "#F9FAFB", border: "1px solid #EAECF0", color: "#344054" }}
            >
              <ShieldIcon size={18} className="flex-shrink-0 mt-1 text-secondary" />
              <div className="small">
                This sets a temporary initial password and enforces a mandatory password change on the user's next login. The user's active/inactive state remains unchanged.
              </div>
            </div>

            {errorMessage && (
              <div
                className="alert alert-danger p-3 rounded-2 small mb-4 d-flex align-items-center gap-2"
                role="alert"
                data-testid="reset-password-error"
                style={{ backgroundColor: "#FEF3F2", borderColor: "#FECDCA", color: "#B42318" }}
              >
                <AlertTriangleIcon size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="reset-initial-password" className="form-label small fw-semibold text-dark">
                New Initial Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="reset-initial-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Enter new temporary password"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  required
                  data-testid="reset-password-input"
                  style={{ borderRight: 0 }}
                />
                <PasswordToggleButton
                  isVisible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  testId="reset-password-toggle"
                />
              </div>
              <div className="form-text text-muted small mt-1">
                Must be 8–72 characters, containing uppercase, lowercase, digit, and special character.
              </div>
            </div>
          </div>

          <div className="card-footer bg-light border-top p-3 d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2 rounded-2"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="reset-password-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm fw-semibold px-4 py-2 text-white rounded-2"
              style={{ backgroundColor: "var(--zg-primary, #006B3C)" }}
              disabled={isSubmitting}
              data-testid="reset-password-submit-btn"
            >
              {isSubmitting ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              ) : null}
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
