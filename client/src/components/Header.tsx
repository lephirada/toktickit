import React from "react";
import { useRequester } from "../context/RequesterContext.js";

interface HeaderProps {
  activeView?: "my-tickets" | "create-ticket" | "system-check";
  onNavigate?: (view: "my-tickets" | "create-ticket" | "system-check") => void;
}

export default function Header({ activeView = "my-tickets", onNavigate }: HeaderProps) {
  const { currentRequester, requesters, isLoading, switchRequester } = useRequester();

  const handleNavClick = (view: "my-tickets" | "create-ticket" | "system-check") => (e: React.MouseEvent) => {
    e.preventDefault();
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
            <span>TokTickIT</span>
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

        {/* Requester Selection Dropdown */}
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="requester-dropdown-select" className="visually-hidden">
            Select Active Requester
          </label>
          <select
            id="requester-dropdown-select"
            className="zg-requester-select form-select form-select-sm"
            value={currentRequester?.id ?? ""}
            onChange={handleSelectChange}
            disabled={isLoading || requesters.length === 0}
            aria-label="Select Active Requester"
          >
            {isLoading && <option value="">Loading requesters…</option>}
            {!isLoading && requesters.length === 0 && <option value="">No active requesters</option>}
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
