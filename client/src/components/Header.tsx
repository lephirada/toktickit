import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../api.js";
import { UserIcon } from "./icons/index.js";

interface HeaderProps {
  activeView?: string;
  currentScreen?: string;
  onNavigate?: (view: string) => void;
}

export function renderRoleBadge(role: UserRole) {
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
            backgroundColor: "var(--zg-pale)",
            color: "var(--zg-primary)",
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
          Admin
        </span>
      );
    default:
      return <span className="badge bg-secondary">{role}</span>;
  }
}

export default function Header({ activeView = "my-tickets", currentScreen, onNavigate }: HeaderProps) {
  const { user, mustChangePassword, logout, requestNavigationWithGuard } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentView = currentScreen || activeView;

  const handleNavClick = (view: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    if (onNavigate) {
      requestNavigationWithGuard(() => onNavigate(view));
    }
  };

  const handleLogoutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
    if (onNavigate) {
      onNavigate("login");
    } else {
      window.history.pushState({}, "", "/login");
    }
  };

  return (
    <header
      className="shadow-sm sticky-top zg-header-bar"
      style={{ backgroundColor: "var(--zg-primary)", height: "64px", minHeight: "64px", zIndex: 1030 }}
      data-testid="app-header"
    >
      <div className="container-fluid px-3 px-md-4 h-100 d-flex align-items-center justify-content-between">
        {/* Left Side: Brand Logo & Navigation */}
        <div className="d-flex align-items-center gap-2 gap-md-3 gap-lg-4">
          {user && !mustChangePassword && (
            <button
              type="button"
              className="btn btn-sm btn-outline-light d-md-none border-0 p-1 text-white"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              data-testid="mobile-menu-toggle"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) {
                requestNavigationWithGuard(() => onNavigate("my-tickets"));
              }
            }}
            className="d-flex align-items-center gap-2 text-white text-decoration-none"
            data-testid="header-brand-link"
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-2"
              style={{
                width: 32,
                height: 32,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.35)",
              }}
              aria-hidden="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="fw-bold fs-5 tracking-tight" style={{ letterSpacing: "-0.02em" }}>TokTickIT</span>
          </a>

          {/* Desktop & Tablet Navigation Links */}
          {user && !mustChangePassword && (
            <nav aria-label="Main Navigation" className="d-none d-md-flex align-items-center gap-1">
              {user.role === "REQUESTER" && (
                <>
                  <a
                    href="/my-tickets"
                    onClick={handleNavClick("my-tickets")}
                    className={`nav-link text-white px-3 py-1 rounded-2 transition-all d-flex align-items-center gap-1 ${
                      currentView === "my-tickets"
                        ? "fw-bold shadow-sm"
                        : "opacity-85 hover-opacity-100"
                    }`}
                    style={{
                      backgroundColor: currentView === "my-tickets" ? "rgba(255, 255, 255, 0.2)" : "transparent",
                      border: currentView === "my-tickets" ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid transparent",
                      fontSize: "0.875rem",
                    }}
                    aria-current={currentView === "my-tickets" ? "page" : undefined}
                    data-testid="nav-my-tickets"
                  >
                    My Tickets
                  </a>
                  <a
                    href="/create-ticket"
                    onClick={handleNavClick("create-ticket")}
                    className={`nav-link text-white px-3 py-1 rounded-2 transition-all d-flex align-items-center gap-1 ${
                      currentView === "create-ticket"
                        ? "fw-bold shadow-sm"
                        : "opacity-85 hover-opacity-100"
                    }`}
                    style={{
                      backgroundColor: currentView === "create-ticket" ? "rgba(255, 255, 255, 0.2)" : "transparent",
                      border: currentView === "create-ticket" ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid transparent",
                      fontSize: "0.875rem",
                    }}
                    aria-current={currentView === "create-ticket" ? "page" : undefined}
                    data-testid="nav-create-ticket"
                  >
                    + Create Ticket
                  </a>
                </>
              )}

              {user.role === "IT_STAFF" && (
                <a
                  href="/staff/queue"
                  onClick={handleNavClick("staff-queue")}
                  className={`nav-link text-white px-3 py-1 rounded-2 transition-all ${
                    currentView === "staff-queue" ? "fw-bold shadow-sm" : "opacity-85 hover-opacity-100"
                  }`}
                  style={{
                    backgroundColor: currentView === "staff-queue" ? "rgba(255, 255, 255, 0.2)" : "transparent",
                    border: currentView === "staff-queue" ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid transparent",
                    fontSize: "0.875rem",
                  }}
                  data-testid="nav-staff-queue"
                >
                  Ticket Queue
                </a>
              )}

              {user.role === "ADMINISTRATOR" && (
                <>
                  <a
                    href="/staff/queue"
                    onClick={handleNavClick("staff-queue")}
                    className={`nav-link text-white px-3 py-1 rounded-2 transition-all ${
                      currentView === "staff-queue" ? "fw-bold shadow-sm" : "opacity-85 hover-opacity-100"
                    }`}
                    style={{
                      backgroundColor: currentView === "staff-queue" ? "rgba(255, 255, 255, 0.2)" : "transparent",
                      border: currentView === "staff-queue" ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid transparent",
                      fontSize: "0.875rem",
                    }}
                    data-testid="nav-admin-queue"
                  >
                    Ticket Queue
                  </a>
                  <a
                    href="/admin/users"
                    onClick={handleNavClick("admin-users")}
                    className={`nav-link text-white px-3 py-1 rounded-2 transition-all ${
                      currentView === "admin-users" ? "fw-bold shadow-sm" : "opacity-85 hover-opacity-100"
                    }`}
                    style={{
                      backgroundColor: currentView === "admin-users" ? "rgba(255, 255, 255, 0.2)" : "transparent",
                      border: currentView === "admin-users" ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid transparent",
                      fontSize: "0.875rem",
                    }}
                    data-testid="nav-admin-users"
                  >
                    User Management
                  </a>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right Section: User Profile Pill & Dropdown / Mobile Toggle */}
        <div className="d-flex align-items-center gap-2 position-relative">
          {user && (
            <>
              {/* Profile button (toggle dropdown) */}
              <div className="position-relative">
                <button
                  type="button"
                  className="btn btn-sm d-flex align-items-center gap-2 text-white shadow-sm border-0"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.16)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    padding: "0.35rem 0.8rem 0.35rem 0.3rem",
                    borderRadius: "9999px",
                    transition: "all 0.15s ease-in-out",
                  }}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-expanded={dropdownOpen}
                  aria-label="User Profile Menu"
                  data-testid="header-profile-button"
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: "rgba(255, 255, 255, 0.25)",
                      fontSize: "0.75rem",
                    }}
                    aria-hidden="true"
                  >
                    {user.fullName ? user.fullName[0].toUpperCase() : <UserIcon size={14} />}
                  </div>
                  <span className="fw-semibold d-none d-sm-inline" style={{ fontSize: "0.875rem" }} data-testid="header-profile-name">
                    {user.fullName}
                  </span>
                  {renderRoleBadge(user.role)}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`ms-1 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    className="dropdown-menu dropdown-menu-end show border shadow-lg mt-1 end-0"
                    style={{
                      minWidth: 240,
                      position: "absolute",
                      zIndex: 1050,
                      borderRadius: "12px",
                      borderColor: "#EAECF0",
                      boxShadow: "0 12px 28px -4px rgba(16, 24, 40, 0.12), 0 4px 8px -2px rgba(16, 24, 40, 0.06)",
                    }}
                    data-testid="header-user-dropdown"
                  >
                    <div className="px-3 pb-2 border-bottom bg-light bg-opacity-50" style={{ borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
                      <div className="fw-bold small text-dark">{user.fullName}</div>
                      <div className="text-muted small text-truncate" style={{ fontSize: "0.8rem" }}>{user.email}</div>
                    </div>
                    <div className="p-1">
                      <a
                        href="/change-password"
                        className="dropdown-item py-2 px-3 small d-flex align-items-center gap-2 text-dark rounded-2"
                        onClick={handleNavClick("change-password")}
                        data-testid="dropdown-change-password"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Change Password</span>
                      </a>
                      <div className="dropdown-divider my-1"></div>
                      <button
                        type="button"
                        className="dropdown-item px-3 small d-flex align-items-center gap-2 text-danger rounded-2"
                        onClick={handleLogoutClick}
                        data-testid="header-logout-btn"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span className="fw-semibold">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Drawer Navigation (< 768px) */}
      {mobileMenuOpen && user && !mustChangePassword && (
        <div
          className="d-md-none position-absolute w-100 start-0 top-100 shadow-lg py-3 px-4 border-top"
          style={{ backgroundColor: "var(--zg-primary)", zIndex: 1040 }}
          data-testid="mobile-nav-drawer"
        >
          <div className="d-flex flex-column gap-2">
            {user.role === "REQUESTER" && (
              <>
                <a
                  href="/my-tickets"
                  onClick={handleNavClick("my-tickets")}
                  className={`text-white text-decoration-none py-2 px-3 rounded-2 ${
                    currentView === "my-tickets" ? "bg-black bg-opacity-25 fw-bold" : ""
                  }`}
                >
                  My Tickets
                </a>
                <a
                  href="/create-ticket"
                  onClick={handleNavClick("create-ticket")}
                  className={`text-white text-decoration-none py-2 px-3 rounded-2 ${
                    currentView === "create-ticket" ? "bg-black bg-opacity-25 fw-bold" : ""
                  }`}
                >
                  + Create Ticket
                </a>
              </>
            )}

            {user.role === "IT_STAFF" && (
              <a
                href="/staff/queue"
                onClick={handleNavClick("staff-queue")}
                className={`text-white text-decoration-none py-2 px-3 rounded-2 ${
                  currentView === "staff-queue" ? "bg-black bg-opacity-25 fw-bold" : ""
                }`}
              >
                Ticket Queue
              </a>
            )}

            {user.role === "ADMINISTRATOR" && (
              <>
                <a
                  href="/staff/queue"
                  onClick={handleNavClick("staff-queue")}
                  className={`text-white text-decoration-none py-2 px-3 rounded-2 ${
                    currentView === "staff-queue" ? "bg-black bg-opacity-25 fw-bold" : ""
                  }`}
                >
                  Ticket Queue
                </a>
                <a
                  href="/admin/users"
                  onClick={handleNavClick("admin-users")}
                  className={`text-white text-decoration-none py-2 px-3 rounded-2 ${
                    currentView === "admin-users" ? "bg-black bg-opacity-25 fw-bold" : ""
                  }`}
                >
                  User Management
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
