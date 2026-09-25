import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchStaffTickets,
  fetchCategories,
  Category,
  StaffTicketItem,
  PaginationMeta,
  StaffTicketQueryParams,
} from "../api.js";
import {
  SearchIcon,
  TicketIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BoltIcon,
  ChevronDownIcon,
  FilterIcon,
} from "./icons/index.js";
import { formatTicketDate } from "./MyTicketsDashboard.js";

export function renderCompactTicketDate(isoString: string) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const datePart = `${month} ${day}, ${year}`;
    const timePart = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
    return (
      <div className="d-flex flex-column align-items-center text-center text-nowrap" style={{ fontSize: "0.78rem", lineHeight: 1.25 }}>
        <span className="text-dark fw-medium">{datePart}</span>
        <span className="text-muted" style={{ fontSize: "0.7rem" }}>{timePart}</span>
      </div>
    );
  } catch {
    return isoString;
  }
}

export function renderStaffPriorityBadge(priority: string | null | undefined, labelPrefix?: string) {
  if (!priority) {
    return (
      <span
        className="badge bg-light text-muted border text-nowrap"
        style={{ fontSize: "0.7rem", fontWeight: 500, whiteSpace: "nowrap" }}
        data-testid="priority-badge-not-set"
      >
        {labelPrefix ? `${labelPrefix}: ` : ""}Not Set
      </span>
    );
  }

  switch (priority) {
    case "P0_URGENT":
      return (
        <span
          className="badge zg-priority-p0 d-inline-flex align-items-center gap-1 text-nowrap"
          data-testid="priority-badge-p0"
          style={{ whiteSpace: "nowrap" }}
        >
          <BoltIcon size={11} />
          <span>{labelPrefix ? `${labelPrefix}: ` : ""}P0 Urgent</span>
        </span>
      );
    case "P1_HIGH":
      return (
        <span
          className="badge zg-priority-p1 d-inline-flex align-items-center gap-1 text-nowrap"
          data-testid="priority-badge-p1"
          style={{ whiteSpace: "nowrap" }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 4 22 20 2 20" />
          </svg>
          <span>{labelPrefix ? `${labelPrefix}: ` : ""}P1 High</span>
        </span>
      );
    case "P2_MEDIUM":
      return (
        <span
          className="badge zg-priority-p2 d-inline-flex align-items-center gap-1 text-nowrap"
          data-testid="priority-badge-p2"
          style={{ whiteSpace: "nowrap" }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span>{labelPrefix ? `${labelPrefix}: ` : ""}P2 Medium</span>
        </span>
      );
    case "P3_LOW":
      return (
        <span
          className="badge zg-priority-p3 d-inline-flex align-items-center gap-1 text-nowrap"
          data-testid="priority-badge-p3"
          style={{ whiteSpace: "nowrap" }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 20 2 4 22 4" />
          </svg>
          <span>{labelPrefix ? `${labelPrefix}: ` : ""}P3 Low</span>
        </span>
      );
    default:
      return (
        <span className="badge bg-secondary text-nowrap" style={{ whiteSpace: "nowrap" }} data-testid="priority-badge-default">
          {labelPrefix ? `${labelPrefix}: ` : ""}{priority}
        </span>
      );
  }
}

export function renderStaffStatusBadge(status: string) {
  switch (status) {
    case "NEW":
      return <span className="badge zg-status-new zg-status-badge">NEW</span>;
    case "OPEN":
      return <span className="badge zg-status-open zg-status-badge">OPEN</span>;
    case "IN_PROGRESS":
      return <span className="badge zg-status-in-progress zg-status-badge">IN PROGRESS</span>;
    case "WAITING_FOR_REQUESTER":
      return <span className="badge zg-status-waiting zg-status-badge">WAITING FOR REQUESTER</span>;
    case "RESOLVED":
      return <span className="badge zg-status-resolved zg-status-badge">RESOLVED</span>;
    case "CLOSED":
      return <span className="badge zg-status-closed zg-status-badge">CLOSED</span>;
    case "REOPENED":
      return <span className="badge zg-status-reopened zg-status-badge">REOPENED</span>;
    case "CANCELLED":
      return <span className="badge zg-status-cancelled zg-status-badge">CANCELLED</span>;
    default:
      return <span className="badge bg-secondary zg-status-badge">{status}</span>;
  }
}

function TableSortIndicator({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  const upColor = active && order === "asc" ? "var(--zg-primary)" : "#cbd5e1";
  const downColor = active && order === "desc" ? "var(--zg-primary)" : "#cbd5e1";

  return (
    <svg width="9" height="13" viewBox="0 0 9 13" fill="none" className="flex-shrink-0 ms-1" aria-hidden="true">
      <path d="M4.5 1.5L1.5 5.5H7.5L4.5 1.5Z" fill={upColor} />
      <path d="M4.5 11.5L7.5 7.5H1.5L4.5 11.5Z" fill={downColor} />
    </svg>
  );
}

interface StaffTicketQueueProps {
  onViewTicket?: (ticketId: number) => void;
}

export default function StaffTicketQueue({ onViewTicket }: StaffTicketQueueProps = {}) {
  const handleTicketClick = (ticketId: number) => {
    if (onViewTicket) {
      onViewTicket(ticketId);
    } else {
      window.history.pushState({}, "", `/staff/tickets/${ticketId}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };
  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search state & debounce
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedReqPriority, setSelectedReqPriority] = useState<string>("ALL");
  const [selectedItPriority, setSelectedItPriority] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedOwner, setSelectedOwner] = useState<"ALL" | "UNASSIGNED" | "MY_TICKETS">("ALL");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // Sorting state (Strictly whitelisted columns)
  const [sortBy, setSortBy] = useState<"createdAt" | "itPriority" | "status" | "updatedAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Stale request guard
  const requestSequenceRef = useRef<number>(0);

  // Load categories on mount
  useEffect(() => {
    let isMounted = true;
    fetchCategories()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch(() => {
        // Permissive fallback
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch queue data
  const loadQueue = useCallback(async () => {
    const currentSeq = ++requestSequenceRef.current;
    setLoading(true);
    setError(null);

    const queryParams: StaffTicketQueryParams = {
      search: debouncedSearch || undefined,
      categoryId: selectedCategory !== "ALL" ? parseInt(selectedCategory, 10) : undefined,
      requestedPriority: selectedReqPriority !== "ALL" ? selectedReqPriority : undefined,
      itPriority: selectedItPriority !== "ALL" ? selectedItPriority : undefined,
      status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      owner: selectedOwner !== "ALL" ? selectedOwner : undefined,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };

    try {
      const response = await fetchStaffTickets(queryParams);
      if (currentSeq === requestSequenceRef.current) {
        setTickets(response.data);
        setPagination(response.pagination);
      }
    } catch (err: any) {
      if (currentSeq === requestSequenceRef.current) {
        setError(err.message || "Failed to load staff ticket queue. Please try again.");
      }
    } finally {
      if (currentSeq === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [
    debouncedSearch,
    selectedCategory,
    selectedReqPriority,
    selectedItPriority,
    selectedStatus,
    selectedOwner,
    sortBy,
    sortOrder,
    page,
    pageSize,
  ]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Handlers for filter mutations (reset to page 1)
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const handleReqPriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReqPriority(e.target.value);
    setPage(1);
  };

  const handleItPriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedItPriority(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
    setPage(1);
  };

  const handleOwnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOwner(e.target.value as "ALL" | "UNASSIGNED" | "MY_TICKETS");
    setPage(1);
  };

  const handleSortToggle = (column: "createdAt" | "itPriority" | "status" | "updatedAt") => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedCategory("ALL");
    setSelectedReqPriority("ALL");
    setSelectedItPriority("ALL");
    setSelectedStatus("ALL");
    setSelectedOwner("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    selectedCategory !== "ALL" ||
    selectedReqPriority !== "ALL" ||
    selectedItPriority !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedOwner !== "ALL";

  const activeDropdownCount =
    (selectedCategory !== "ALL" ? 1 : 0) +
    (selectedStatus !== "ALL" ? 1 : 0) +
    (selectedItPriority !== "ALL" ? 1 : 0) +
    (selectedReqPriority !== "ALL" ? 1 : 0);

  return (
    <div className="w-100" data-testid="staff-ticket-queue-view">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="h3 fw-bold text-dark m-0" data-testid="staff-queue-title">
              Staff Ticket Queue
            </h1>
            <span
              className="badge px-2 py-1 rounded-pill"
              style={{
                backgroundColor: "var(--zg-pale)",
                color: "var(--zg-primary)",
                border: "1px solid #A6F4C5",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
              data-testid="queue-count-badge"
            >
              {pagination?.totalItems ?? 0} Tickets
            </span>
          </div>
          <p className="text-muted small m-0">
            Triage, monitor, and oversee tickets across all university departments.
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div
        className="card border shadow-sm mb-4"
        style={{
          borderRadius: "12px",
          backgroundColor: "#FFFFFF",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)",
        }}
        data-testid="queue-filter-toolbar"
      >
        <div className="card-body p-3 p-md-3">
          {/* Main Toolbar Flex Container */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* 1. Search Input (flex-grow-1, order-1) */}
            <div className="flex-grow-1 position-relative order-1 zg-queue-search-col">
              <label htmlFor="queue-search" className="visually-hidden">
                Search Tickets
              </label>
              <input
                id="queue-search"
                type="text"
                className="form-control ps-4"
                placeholder="Ticket No or summary..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="queue-search-input"
                style={{
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  height: "38px",
                  borderColor: "#D0D5DD",
                  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
                  paddingLeft: "34px",
                }}
              />
              <span
                className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted d-flex align-items-center justify-content-center"
                style={{ pointerEvents: "none", marginTop: "0px", lineHeight: 0, width: 16, height: 16 }}
              >
                <SearchIcon size={15} />
              </span>
              {searchInput && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted position-absolute top-50 end-0 translate-middle-y me-1 p-1 text-decoration-none"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search input"
                >
                  ×
                </button>
              )}
            </div>

            {/* 2. Mobile/Tablet Collapsible Filter Drawer Button (order-2, d-lg-none) */}
            <button
              type="button"
              className={`btn btn-sm d-lg-none d-inline-flex align-items-center justify-content-center gap-2 order-2 zg-filter-toggle-btn ${
                isFilterDrawerOpen ? "is-active" : ""
              } ${activeDropdownCount > 0 ? "has-filters" : ""}`}
              onClick={() => setIsFilterDrawerOpen((prev) => !prev)}
              aria-expanded={isFilterDrawerOpen}
              aria-label="Toggle filter dropdowns"
              data-testid="queue-filter-drawer-toggle"
            >
              <FilterIcon size={14} />
              <span>Filters (4)</span>
              {activeDropdownCount > 0 && (
                <span
                  className="badge rounded-pill text-white ms-1"
                  style={{
                    backgroundColor: "var(--zg-primary)",
                    fontSize: "0.68rem",
                    padding: "0.15rem 0.4rem",
                  }}
                  data-testid="queue-filter-active-count"
                >
                  {activeDropdownCount}
                </span>
              )}
              <ChevronDownIcon
                size={13}
                style={{
                  transform: isFilterDrawerOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>

            {/* 3. Dropdowns Container: Inline on Desktop (order-lg-2), Collapsible Drawer Box on Tablet/Mobile (order-4) */}
            <div
              className={`order-4 order-lg-2 zg-filter-drawer-box ${
                isFilterDrawerOpen ? "d-flex" : "d-none d-lg-flex"
              } flex-wrap align-items-center gap-2`}
              data-testid="queue-filter-drawer"
            >
              {/* Category Dropdown */}
              <div className="zg-filter-drawer-item">
                <label htmlFor="queue-category-select" className="visually-hidden">
                  Category
                </label>
                <select
                  id="queue-category-select"
                  className="form-select form-select-sm w-100"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  data-testid="queue-category-filter"
                  style={{
                    borderRadius: "8px",
                    height: "38px",
                    fontSize: "0.85rem",
                    borderColor: "#D0D5DD",
                    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
                  }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="zg-filter-drawer-item">
                <label htmlFor="queue-status-select" className="visually-hidden">
                  Status
                </label>
                <select
                  id="queue-status-select"
                  className="form-select form-select-sm w-100"
                  value={selectedStatus}
                  onChange={handleStatusChange}
                  data-testid="queue-status-filter"
                  style={{
                    borderRadius: "8px",
                    height: "38px",
                    fontSize: "0.85rem",
                    borderColor: "#D0D5DD",
                    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="REOPENED">Reopened</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* IT Priority Dropdown */}
              <div className="zg-filter-drawer-item">
                <label htmlFor="queue-it-priority-select" className="visually-hidden">
                  IT Priority
                </label>
                <select
                  id="queue-it-priority-select"
                  className="form-select form-select-sm w-100"
                  value={selectedItPriority}
                  onChange={handleItPriorityChange}
                  data-testid="queue-it-priority-filter"
                  style={{
                    borderRadius: "8px",
                    height: "38px",
                    fontSize: "0.85rem",
                    borderColor: "#D0D5DD",
                    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
                  }}
                >
                  <option value="ALL">All IT Priorities</option>
                  <option value="P0_URGENT">P0 Urgent</option>
                  <option value="P1_HIGH">P1 High</option>
                  <option value="P2_MEDIUM">P2 Medium</option>
                  <option value="P3_LOW">P3 Low</option>
                </select>
              </div>

              {/* Requested Priority Dropdown */}
              <div className="zg-filter-drawer-item">
                <label htmlFor="queue-req-priority-select" className="visually-hidden">
                  Req Priority
                </label>
                <select
                  id="queue-req-priority-select"
                  className="form-select form-select-sm w-100"
                  value={selectedReqPriority}
                  onChange={handleReqPriorityChange}
                  data-testid="queue-req-priority-filter"
                  style={{
                    borderRadius: "8px",
                    height: "38px",
                    fontSize: "0.85rem",
                    borderColor: "#D0D5DD",
                    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
                  }}
                >
                  <option value="ALL">All Req Priorities</option>
                  <option value="P0_URGENT">P0 Urgent</option>
                  <option value="P1_HIGH">P1 High</option>
                  <option value="P2_MEDIUM">P2 Medium</option>
                  <option value="P3_LOW">P3 Low</option>
                </select>
              </div>
            </div>

            {/* 4. Assignment & Ghost Reset Button (Row 2, order-3) */}
            <div
              className="order-3 order-lg-3 w-100 d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 mt-2 border-top"
              style={{ borderColor: "#F2F4F7" }}
            >
              <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-1 gap-sm-2">
                <span className="small fw-semibold text-secondary" style={{ fontSize: "0.8rem" }}>
                  Assignment:
                </span>
                <div
                  className="d-inline-flex p-1 rounded-pill zg-assignment-capsule"
                  role="group"
                  aria-label="Ticket Owner Scope"
                >
                  <button
                    type="button"
                    className="btn btn-sm rounded-pill fw-semibold transition-all zg-assignment-pill-btn"
                    style={{
                      border: "none",
                      ...(selectedOwner === "ALL"
                        ? {
                            backgroundColor: "var(--zg-primary)",
                            color: "#FFFFFF",
                            boxShadow: "0 1px 2px rgba(0, 107, 60, 0.18)",
                          }
                        : {
                            backgroundColor: "transparent",
                            color: "#475467",
                          }),
                    }}
                    onClick={() => {
                      setSelectedOwner("ALL");
                      setPage(1);
                    }}
                    data-testid="queue-owner-all"
                  >
                    All Tickets
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm rounded-pill fw-semibold transition-all zg-assignment-pill-btn"
                    style={{
                      border: "none",
                      ...(selectedOwner === "UNASSIGNED"
                        ? {
                            backgroundColor: "var(--zg-primary)",
                            color: "#FFFFFF",
                            boxShadow: "0 1px 2px rgba(0, 107, 60, 0.18)",
                          }
                        : {
                            backgroundColor: "transparent",
                            color: "#475467",
                          }),
                    }}
                    onClick={() => {
                      setSelectedOwner("UNASSIGNED");
                      setPage(1);
                    }}
                    data-testid="queue-owner-unassigned"
                  >
                    Unassigned
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm rounded-pill fw-semibold transition-all zg-assignment-pill-btn"
                    style={{
                      border: "none",
                      ...(selectedOwner === "MY_TICKETS"
                        ? {
                            backgroundColor: "var(--zg-primary)",
                            color: "#FFFFFF",
                            boxShadow: "0 1px 2px rgba(0, 107, 60, 0.18)",
                          }
                        : {
                            backgroundColor: "transparent",
                            color: "#475467",
                          }),
                    }}
                    onClick={() => {
                      setSelectedOwner("MY_TICKETS");
                      setPage(1);
                    }}
                    data-testid="queue-owner-my-tickets"
                  >
                    Assigned to Me
                  </button>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-secondary d-inline-flex align-items-center gap-1 text-decoration-none px-2 py-1 rounded-2 zg-ghost-reset-btn"
                  style={{
                    fontSize: "0.8rem",
                    color: "#667085",
                    border: "none",
                    background: "transparent",
                  }}
                  onClick={handleResetFilters}
                  data-testid="queue-clear-filters-btn"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span className="fw-medium">Reset Filters</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-3 mb-4 shadow-sm"
          role="alert"
          data-testid="queue-error-alert"
        >
          <div className="d-flex align-items-center gap-2">
            <AlertTriangleIcon size={20} color="#B42318" />
            <span className="small fw-semibold">{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-danger fw-semibold px-3"
            onClick={loadQueue}
            data-testid="queue-retry-btn"
          >
            Retry
          </button>
        </div>
      )}

      {/* Data Presentation */}
      {loading ? (
        <div className="card border shadow-sm p-4 text-center rounded-3 bg-white" data-testid="queue-loading-skeleton">
          <div className="d-flex flex-column gap-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="placeholder-glow w-100 py-3 px-2 border-bottom d-flex align-items-center justify-content-between"
              >
                <span className="placeholder col-2 rounded" style={{ height: "18px" }}></span>
                <span className="placeholder col-4 rounded" style={{ height: "18px" }}></span>
                <span className="placeholder col-2 rounded" style={{ height: "18px" }}></span>
                <span className="placeholder col-2 rounded" style={{ height: "18px" }}></span>
              </div>
            ))}
          </div>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty / No-Results State */
        <div
          className="card border shadow-sm p-5 text-center rounded-3 bg-white"
          data-testid={hasActiveFilters ? "queue-no-results-state" : "queue-empty-state"}
        >
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle p-3 mb-3 mx-auto"
            style={{ backgroundColor: "var(--zg-pale)" }}
          >
            <TicketIcon size={36} color="var(--zg-primary)" />
          </div>
          <h2 className="h5 fw-bold text-dark mb-2">
            {hasActiveFilters ? "No matching tickets found" : "No tickets in the queue"}
          </h2>
          <p className="text-muted small mb-4" style={{ maxWidth: 440, margin: "0 auto" }}>
            {hasActiveFilters
              ? "We couldn't find any tickets matching your filter criteria. Try adjusting or clearing your filters."
              : "There are currently no tickets submitted to the IT Helpdesk."}
          </p>
          {hasActiveFilters && (
            <div>
              <button
                type="button"
                className="btn btn-sm btn-outline-success fw-semibold px-3 py-2 rounded-2"
                style={{ color: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
                onClick={handleResetFilters}
                data-testid="queue-no-results-reset-btn"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View (>= 768px, bounded horizontal scroll on tablet) */}
          <div className="d-none d-md-block">
            <div className="zg-table-container mb-4" style={{ borderRadius: "12px", border: "1px solid #EAECF0", overflow: "hidden" }}>
              <div className="table-responsive w-100" style={{ overflowX: "auto" }}>
                <table
                  className="table table-hover align-middle mb-0 zg-table-fixed"
                  style={{ width: "100%", minWidth: "1140px" }}
                  data-testid="staff-ticket-table"
                >
                  <colgroup>
                    <col style={{ width: "9.5%", minWidth: "110px" }} />
                    <col style={{ width: "15%", minWidth: "160px" }} />
                    <col style={{ width: "8%", minWidth: "120px" }} />
                    <col style={{ width: "9%", minWidth: "90px" }} />
                    <col style={{ width: "8%", minWidth: "90px" }} />
                    <col style={{ width: "9%", minWidth: "85px" }} />
                    <col style={{ width: "9%", minWidth: "85px" }} />
                    <col style={{ width: "9%", minWidth: "100px" }} />
                    <col style={{ width: "8.5%", minWidth: "90px" }} />
                    <col style={{ width: "7%", minWidth: "75px" }} />
                    <col style={{ width: "8%", minWidth: "75px" }} />
                  </colgroup>
                  <thead style={{ backgroundColor: "#F9FAFB" }}>
                    <tr>
                      {/* 1. Ticket No (Non-sortable) */}
                      <th scope="col" className="py-3 ps-3 pe-2 small fw-bold text-secondary" data-testid="col-ticket-no">
                        Ticket No
                      </th>
                      {/* 2. Summary (Non-sortable) */}
                      <th scope="col" className="py-3 px-2 small fw-bold text-secondary" data-testid="col-summary">
                        Summary
                      </th>
                      {/* 3. Requester (Non-sortable) */}
                      <th scope="col" className="py-3 px-2 small fw-bold text-secondary" data-testid="col-requester">
                        Requester
                      </th>
                      {/* 4. Category (Non-sortable) */}
                      <th scope="col" className="py-3 px-2 small fw-bold text-secondary text-center" data-testid="col-category">
                        Category
                      </th>
                      {/* 5. Related System (Non-sortable) */}
                      <th scope="col" className="py-3 px-2 small fw-bold text-secondary text-center" data-testid="col-system">
                        Related System
                      </th>
                      {/* 6. Req Priority (Non-sortable) */}
                      <th scope="col" className="py-3 px-2 small fw-bold text-secondary text-center" data-testid="col-req-priority">
                        Req Priority
                      </th>
                      {/* 7. IT Priority (Sortable) */}
                      <th
                        scope="col"
                        className="py-3 px-2 small fw-bold text-secondary text-center user-select-none"
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        aria-sort={sortBy === "itPriority" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                        onClick={() => handleSortToggle("itPriority")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSortToggle("itPriority");
                          }
                        }}
                        data-testid="sort-column-itPriority"
                      >
                        <div className="d-inline-flex align-items-center justify-content-center">
                          <span>IT Priority</span>
                          <TableSortIndicator active={sortBy === "itPriority"} order={sortOrder} />
                        </div>
                      </th>
                      {/* 8. Status (Sortable) */}
                      <th
                        scope="col"
                        className="py-3 px-2 small fw-bold text-secondary text-center user-select-none"
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        aria-sort={sortBy === "status" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                        onClick={() => handleSortToggle("status")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSortToggle("status");
                          }
                        }}
                        data-testid="sort-column-status"
                      >
                        <div className="d-inline-flex align-items-center justify-content-center">
                          <span>Status</span>
                          <TableSortIndicator active={sortBy === "status"} order={sortOrder} />
                        </div>
                      </th>
                      {/* 9. Assigned Owner (Non-sortable) */}
                      <th scope="col" className="py-3 px-2 small fw-bold text-secondary text-center" data-testid="col-owner">
                        Assigned Owner
                      </th>
                      {/* 10. Created Date (Sortable) */}
                      <th
                        scope="col"
                        className="py-3 px-2 small fw-bold text-secondary text-center user-select-none"
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        aria-sort={sortBy === "createdAt" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                        onClick={() => handleSortToggle("createdAt")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSortToggle("createdAt");
                          }
                        }}
                        data-testid="sort-column-createdAt"
                      >
                        <div className="d-inline-flex align-items-center justify-content-center">
                          <span>Created Date</span>
                          <TableSortIndicator active={sortBy === "createdAt"} order={sortOrder} />
                        </div>
                      </th>
                      {/* 11. Updated Date (Sortable) */}
                      <th
                        scope="col"
                        className="py-3 px-2 small fw-bold text-secondary text-center user-select-none"
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        aria-sort={sortBy === "updatedAt" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                        onClick={() => handleSortToggle("updatedAt")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSortToggle("updatedAt");
                          }
                        }}
                        data-testid="sort-column-updatedAt"
                      >
                        <div className="d-inline-flex align-items-center justify-content-center">
                          <span>Updated Date</span>
                          <TableSortIndicator active={sortBy === "updatedAt"} order={sortOrder} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        data-testid={`ticket-row-${t.id}`}
                        onClick={() => handleTicketClick(t.id)}
                        style={{ cursor: "pointer" }}
                      >
                        {/* 1. Ticket No */}
                        <td className="ps-3 pe-2 py-3 text-nowrap" data-testid="queue-ticket-no">
                          <span className="fw-bold font-monospace text-dark" style={{ fontSize: "0.78rem", letterSpacing: "-0.01em" }}>
                            {t.ticketNo}
                          </span>
                        </td>
                        {/* 2. Summary & Resolution Indicator */}
                        <td className="px-2 py-3" style={{ minWidth: 140 }} data-testid="queue-summary">
                          <div className="fw-semibold text-dark text-truncate" title={t.summary} style={{ fontSize: "0.825rem" }}>
                            {t.summary}
                          </div>
                          {t.resolutionIndicated && (
                            <span
                              className="badge rounded-pill d-inline-flex align-items-center gap-1 mt-1"
                              style={{
                                backgroundColor: "var(--zg-pale)",
                                color: "var(--zg-primary)",
                                border: "1px solid #12B76A",
                                fontSize: "0.62rem",
                                padding: "0.15rem 0.35rem",
                                fontWeight: 600,
                              }}
                              data-testid="requester-confirmed-resolved-badge"
                            >
                              <CheckCircleIcon size={9} className="text-success" />
                              <span>Requester Confirmed Resolved</span>
                            </span>
                          )}
                        </td>
                        {/* 3. Requester */}
                        <td className="px-2 py-3" style={{ maxWidth: 125 }} data-testid="queue-requester">
                          <div className="small fw-semibold text-dark text-truncate" style={{ fontSize: "0.8rem" }}>{t.requester.fullName}</div>
                          <div className="text-muted text-truncate" style={{ fontSize: "0.7rem", maxWidth: 115 }}>
                            {t.requester.email}
                          </div>
                        </td>
                        {/* 4. Category */}
                        <td className="px-2 py-3 text-center" data-testid="queue-category">
                          <span className="badge bg-light text-dark border px-2 py-1 text-wrap" style={{ fontSize: "0.7rem", lineHeight: 1.25 }}>
                            {t.category.name}
                          </span>
                        </td>
                        {/* 5. Related System */}
                        <td className="px-2 py-3 text-center" data-testid="queue-system">
                          <span className="small text-secondary d-inline-block text-wrap" style={{ fontSize: "0.75rem", lineHeight: 1.25 }}>
                            {t.relatedSystem ? t.relatedSystem.name : "—"}
                          </span>
                        </td>
                        {/* 6. Requested Priority */}
                        <td className="px-2 py-3 text-center" data-testid="queue-req-priority">
                          {renderStaffPriorityBadge(t.requestedPriority)}
                        </td>
                        {/* 7. IT Priority */}
                        <td className="px-2 py-3 text-center" data-testid="queue-it-priority">
                          {renderStaffPriorityBadge(t.itPriority)}
                        </td>
                        {/* 8. Status */}
                        <td className="px-2 py-3 text-center" data-testid="queue-status">
                          {renderStaffStatusBadge(t.status)}
                        </td>
                        {/* 9. Assigned Owner */}
                        <td className="px-2 py-3 text-center" data-testid="queue-owner">
                          {t.owner ? (
                            <span className="small fw-semibold text-dark d-inline-block text-wrap" style={{ fontSize: "0.78rem", lineHeight: 1.25 }}>
                              {t.owner.fullName}
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border px-2 py-1 text-wrap" style={{ fontSize: "0.7rem" }}>
                              Unassigned
                            </span>
                          )}
                        </td>
                        {/* 10. Created Date */}
                        <td className="px-2 py-3 text-center text-nowrap text-secondary" data-testid="queue-created-at">
                          {renderCompactTicketDate(t.createdAt)}
                        </td>
                        {/* 11. Updated Date */}
                        <td className="px-2 py-3 text-center text-nowrap text-secondary" data-testid="queue-updated-at">
                          {renderCompactTicketDate(t.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="d-md-none mb-4" data-testid="staff-ticket-cards">
            <div className="row g-3">
              {tickets.map((t) => (
                <div key={t.id} className="col-12">
                  <div
                    className="card border shadow-sm p-3 h-100"
                    style={{ borderRadius: "12px", borderColor: "#EAECF0", cursor: "pointer" }}
                    data-testid="mobile-ticket-card"
                    onClick={() => handleTicketClick(t.id)}
                  >
                    {/* Card Header: Ticket No & Status */}
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold font-monospace text-dark" style={{ fontSize: "0.9rem" }}>
                        {t.ticketNo}
                      </span>
                      {renderStaffStatusBadge(t.status)}
                    </div>

                    {/* Resolution Indicator */}
                    {t.resolutionIndicated && (
                      <div className="mb-2">
                        <span
                          className="badge rounded-pill d-inline-flex align-items-center gap-1"
                          style={{
                            backgroundColor: "var(--zg-pale)",
                            color: "var(--zg-primary)",
                            border: "1px solid #12B76A",
                            fontSize: "0.65rem",
                            padding: "0.2rem 0.45rem",
                            fontWeight: 600,
                          }}
                          data-testid="requester-confirmed-resolved-badge"
                        >
                          <CheckCircleIcon size={9} className="text-success" />
                          <span>Requester Confirmed Resolved</span>
                        </span>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="fw-semibold text-dark mb-2" style={{ fontSize: "0.925rem" }}>
                      {t.summary}
                    </div>

                    {/* Taxonomy */}
                    <div className="small text-muted mb-2 d-flex flex-wrap align-items-center gap-2">
                      <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: "0.72rem" }}>
                        {t.category.name}
                      </span>
                      <span className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                        • System: <span className="text-dark fw-medium">{t.relatedSystem ? t.relatedSystem.name : "—"}</span>
                      </span>
                    </div>

                    {/* Requester & Owner */}
                    <div className="d-flex flex-wrap justify-content-between gap-1 small mb-2 pt-2 border-top">
                      <div>
                        <span className="text-muted">Requester: </span>
                        <span className="fw-medium text-dark">{t.requester.fullName}</span>
                      </div>
                      <div>
                        <span className="text-muted">Owner: </span>
                        <span className="fw-medium text-dark">{t.owner ? t.owner.fullName : "Unassigned"}</span>
                      </div>
                    </div>

                    {/* Priorities */}
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2 pt-2 border-top">
                      <div>{renderStaffPriorityBadge(t.itPriority, "IT")}</div>
                      <div>{renderStaffPriorityBadge(t.requestedPriority, "Req")}</div>
                    </div>

                    {/* Timestamps: 2-Row Key-Value Layout */}
                    <div className="d-flex flex-column gap-1 text-muted pt-2 border-top" style={{ fontSize: "0.75rem" }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-secondary" style={{ fontSize: "0.74rem" }}>Created:</span>
                        <span className="fw-medium text-dark" style={{ fontSize: "0.74rem" }}>{formatTicketDate(t.createdAt)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-secondary" style={{ fontSize: "0.74rem" }}>Updated:</span>
                        <span className="fw-medium text-dark" style={{ fontSize: "0.74rem" }}>{formatTicketDate(t.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Footer */}
          {pagination && (
            <div
              className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 pt-3 border-top"
              data-testid="queue-pagination-footer"
            >
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted">Rows per page:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "70px", borderRadius: "6px" }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  data-testid="page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="small text-muted ms-2" data-testid="pagination-range-text">
                  Showing {pagination.totalItems === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, pagination.totalItems)} of {pagination.totalItems} tickets
                </span>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3"
                  style={{ borderRadius: "6px" }}
                  disabled={!pagination.hasPrev || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  data-testid="prev-page-btn"
                >
                  Previous
                </button>
                <span className="small fw-semibold px-2" data-testid="current-page-text">
                  Page {page} of {Math.max(1, pagination.totalPages)}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3"
                  style={{ borderRadius: "6px" }}
                  disabled={!pagination.hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="next-page-btn"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
