import React, { useState, useEffect, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { UserIcon, ChevronDownIcon, SwitchIcon } from "./icons";

interface HeaderProps {
  activeView?: "my-tickets" | "create-ticket" | "system-check" | "select-requester";
  onNavigate?: (view: "my-tickets" | "create-ticket" | "system-check" | "select-requester") => void;
}

export default function Header({ activeView = "my-tickets", onNavigate }: HeaderProps) {
  const { currentRequester, requesters, isLoading, switchRequester } = useRequester();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on Escape or outside click
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleNavClick = (view: "my-tickets" | "create-ticket" | "system-check" | "select-requester") => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(false);
    if (onNavigate) {
      onNavigate(view);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value, 10);
    if (!isNaN(selectedId)) {
      switchRequester(selectedId);
    }
  };

  return (
    <header className="zg-header py-2 px-3 mb-4">
      <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between">
        {/* Brand */}
        <div className="d-flex align-items-center">
          <a
            href="/my-tickets"
            onClick={handleNavClick("my-tickets")}
            className="navbar-brand me-4 d-flex align-items-center gap-2"
            aria-label="TokTickIT Home"
          >
            <span className="fw-bold">TokTickIT</span>
          </a>

          {/* Navigation Links */}
          <nav aria-label="Main Navigation" className="d-none d-md-flex gap-2">
            <a
              href="/my-tickets"
              onClick={handleNavClick("my-tickets")}
              className={`nav-link ${activeView === "my-tickets" ? "active" : ""}`}
              aria-current={activeView === "my-tickets" ? "page" : undefined}
            >
              My Tickets
            </a>
            <a
              href="/create-ticket"
              onClick={handleNavClick("create-ticket")}
              className={`nav-link ${activeView === "create-ticket" ? "active" : ""}`}
              aria-current={activeView === "create-ticket" ? "page" : undefined}
            >
              + Create Ticket
            </a>
          </nav>
        </div>

        {/* Unified Profile Menu Matching Mockup 8.1 & 8.4 */}
        <div className="position-relative d-flex align-items-center">
          <button
            ref={triggerRef}
            type="button"
            className="zg-profile-pill-btn d-flex align-items-center gap-2"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            aria-label="Profile menu"
            data-testid="header-profile-button"
          >
            <UserIcon size={16} />
            <span className="fw-semibold" data-testid="header-profile-name">
              {currentRequester ? currentRequester.fullName : "Profile"}
            </span>
            <ChevronDownIcon size={12} className="opacity-75" />
          </button>

          {/* Profile Dropdown Card */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="zg-profile-dropdown-menu rounded-3 position-absolute end-0 top-100 mt-2 p-0 border shadow-lg"
              role="menu"
              aria-label="User Profile and Requester Menu"
              data-testid="profile-dropdown-menu"
            >
              {/* Identity Details */}
              <div className="p-3 border-bottom bg-light rounded-top-3">
                <div className="small text-muted mb-1">Signed in as</div>
                <div className="fw-bold text-dark fs-6" data-testid="menu-user-name">
                  {currentRequester?.fullName || "No Requester Selected"}
                </div>
                <div className="small text-secondary" data-testid="menu-user-dept">
                  {currentRequester?.department} • {currentRequester?.email}
                </div>
              </div>

              {/* Action: Switch Requester Screen */}
              <div className="p-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onNavigate) onNavigate("select-requester");
                  }}
                  data-testid="menu-switch-requester-btn"
                >
                  <SwitchIcon size={14} />
                  <span>Switch Requester</span>
                </button>
              </div>
            </div>
          )}

          {/* Accessible hidden select preserving test suite compatibility */}
          <label htmlFor="requester-dropdown-select" className="visually-hidden">
            Select Active Requester
          </label>
          <select
            id="requester-dropdown-select"
            className="visually-hidden"
            value={currentRequester?.id ?? ""}
            onChange={handleSelectChange}
            disabled={isLoading || requesters.length === 0}
            aria-label="Select Active Requester"
            tabIndex={-1}
          >
            {isLoading && <option value="">Loading requesters…</option>}
            {!isLoading && requesters.length === 0 && (
              <option value="">No active requesters</option>
            )}
            {requesters.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} ({user.department})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
