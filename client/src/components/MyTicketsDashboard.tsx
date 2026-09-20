import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BoltIcon, SearchIcon, TicketIcon, AlertTriangleIcon, CheckCircleIcon } from "./icons/index.js";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchTickets,
  fetchCategories,
  Category,
  TicketItem,
  PaginationMeta,
  TicketQueryParams,
} from "../api.js";

interface MyTicketsDashboardProps {
  onCreateTicket?: () => void;
  onViewTicket?: (ticketId: number) => void;
  successBanner?: string | null;
  successMessage?: string | null;
  onClearBanner?: () => void;
  onDismissSuccessBanner?: () => void;
}

export function formatTicketDate(isoString: string): string {
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
    hours = hours % 12 || 12;
    const strHours = String(hours).padStart(2, "0");
    return `${month} ${day}, ${year} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return isoString;
  }
}

export function formatTicketDateParts(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: isoString, time: "" };
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
    hours = hours % 12 || 12;
    const strHours = String(hours).padStart(2, "0");
    return {
      date: `${month} ${day}, ${year}`,
      time: `${strHours}:${minutes} ${ampm}`,
    };
  } catch {
    return { date: isoString, time: "" };
  }
}

export function renderPriorityBadge(priority: string) {
  switch (priority) {
    case "P0_URGENT":
      return (
        <span
          className="badge zg-priority-p0"
          data-testid="priority-badge"
          style={{ maxWidth: "100%", justifyContent: "center" }}
        >
          <BoltIcon size={12} />
          <span>P0 Urgent</span>
        </span>
      );
    case "P1_HIGH":
      return (
        <span
          className="badge zg-priority-p1"
          data-testid="priority-badge"
          style={{ maxWidth: "100%", justifyContent: "center" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 4 22 20 2 20" />
          </svg>
          <span>P1 High</span>
        </span>
      );
    case "P2_MEDIUM":
      return (
        <span
          className="badge zg-priority-p2"
          data-testid="priority-badge"
          style={{ maxWidth: "100%", justifyContent: "center" }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span>P2 Medium</span>
        </span>
      );
    case "P3_LOW":
      return (
        <span
          className="badge zg-priority-p3"
          data-testid="priority-badge"
          style={{ maxWidth: "100%", justifyContent: "center" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 20 2 4 22 4" />
          </svg>
          <span>P3 Low</span>
        </span>
      );
    default:
      return <span className="badge bg-secondary" style={{ maxWidth: "100%", justifyContent: "center" }}>{priority}</span>;
  }
}

export function renderStatusBadge(status: string) {
  switch (status) {
    case "NEW":
      return <span className="badge zg-status-new zg-status-badge">NEW</span>;
    case "OPEN":
      return <span className="badge zg-status-open zg-status-badge">OPEN</span>;
    case "IN_PROGRESS":
      return <span className="badge zg-status-in-progress zg-status-badge">IN PROGRESS</span>;
    case "WAITING_FOR_REQUESTER":
      return (
        <span
          className="badge zg-status-badge"
          style={{
            backgroundColor: "var(--zg-status-waiting-bg)",
            color: "var(--zg-status-waiting-text)",
            border: "1px solid #FEDF89",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: "0.66rem",
          }}
          title="WAITING FOR REQUESTER"
        >
          WAITING FOR REQUESTER
        </span>
      );
    case "RESOLVED":
      return <span className="badge zg-status-resolved zg-status-badge">RESOLVED</span>;
    case "CLOSED":
      return <span className="badge zg-status-closed zg-status-badge">CLOSED</span>;
    case "REOPENED":
      return (
        <span
          className="badge zg-status-badge"
          style={{
            backgroundColor: "var(--zg-status-reopened-bg)",
            color: "var(--zg-status-reopened-text)",
            border: "1px solid #E879F9",
          }}
        >
          REOPENED
        </span>
      );
    case "CANCELLED":
    case "REJECTED":
      return <span className="badge zg-status-rejected zg-status-badge">CANCELLED</span>;
    default:
      return <span className="badge bg-secondary zg-status-badge">{status}</span>;
  }
}

function TableSortIndicator({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  const upColor = active && order === "asc" ? "var(--zg-primary)" : "#cbd5e1";
  const downColor = active && order === "desc" ? "var(--zg-primary)" : "#cbd5e1";

  return (
    <svg
      width="9"
      height="13"
      viewBox="0 0 9 13"
      fill="none"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M4.5 1.5L1.5 5.5H7.5L4.5 1.5Z" fill={upColor} />
      <path d="M4.5 11.5L7.5 7.5H1.5L4.5 11.5Z" fill={downColor} />
    </svg>
  );
}

export default function MyTicketsDashboard({
  onCreateTicket,
  onViewTicket,
  successBanner,
  successMessage,
  onClearBanner,
  onDismissSuccessBanner,
}: MyTicketsDashboardProps) {
  const { user } = useAuth();

  const [banner, setBanner] = useState<string | null>(successBanner || successMessage || null);

  useEffect(() => {
    if (successBanner !== undefined) {
      setBanner(successBanner);
    } else if (successMessage !== undefined) {
      setBanner(successMessage);
    }
  }, [successBanner, successMessage]);

  const handleDismissBanner = useCallback(() => {
    setBanner(null);
    onClearBanner?.();
    onDismissSuccessBanner?.();
  }, [onClearBanner, onDismissSuccessBanner]);

  // Auto-dismiss 5-second timer
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => {
      handleDismissBanner();
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [banner, handleDismissBanner]);

  // Categories list
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter & Search states
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Sorting state
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Data & loading states
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // Navigate to ticket detail route /tickets/:id
  const handleTicketClick = (ticketId: number) => {
    window.history.pushState({}, "", `/tickets/${ticketId}`);
    if (onViewTicket) {
      onViewTicket(ticketId);
    }
  };

  // Load categories once
  useEffect(() => {
    let isMounted = true;
    async function loadCats() {
      try {
        const data = await fetchCategories();
        if (isMounted) setCategories(data);
      } catch (e) {
        console.error("Failed to load categories:", e);
      }
    }
    loadCats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch tickets function
  const loadTickets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    const params: TicketQueryParams = {
      page,
      pageSize,
      sortBy,
      sortOrder,
    };

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }
    if (selectedCategory !== "ALL") {
      params.categoryId = parseInt(selectedCategory, 10);
    }
    if (selectedPriority !== "ALL") {
      params.priority = selectedPriority;
    }
    if (selectedStatus !== "ALL") {
      params.status = selectedStatus;
    }

    try {
      const res = await fetchTickets(params);
      const items = Array.isArray(res) ? res : res?.data || [];
      const meta = Array.isArray(res)
        ? {
            page,
            pageSize,
            totalItems: items.length,
            totalPages: Math.ceil(items.length / pageSize) || 1,
            hasNext: false,
            hasPrev: false,
          }
        : res?.pagination || {
            page,
            pageSize,
            totalItems: items.length,
            totalPages: Math.ceil(items.length / pageSize) || 1,
            hasNext: false,
            hasPrev: false,
          };

      setTickets(items);
      setPagination(meta);
    } catch (err: unknown) {
      setError("Failed to load tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    debouncedSearch,
    page,
    pageSize,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Clear banner on filter changes or search
  const prevFiltersRef = useRef({
    search: searchInput,
    category: selectedCategory,
    priority: selectedPriority,
    status: selectedStatus,
  });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed =
      prev.search !== searchInput ||
      prev.category !== selectedCategory ||
      prev.priority !== selectedPriority ||
      prev.status !== selectedStatus;

    prevFiltersRef.current = {
      search: searchInput,
      category: selectedCategory,
      priority: selectedPriority,
      status: selectedStatus,
    };

    if (changed) {
      handleDismissBanner();
    }
  }, [searchInput, selectedCategory, selectedPriority, selectedStatus, handleDismissBanner]);

  // Clear filters handler
  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedCategory("ALL");
    setSelectedPriority("ALL");
    setSelectedStatus("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
    handleDismissBanner();
  };

  const hasActiveFilters = useMemo(() => {
    return (
      debouncedSearch.trim() !== "" ||
      selectedCategory !== "ALL" ||
      selectedPriority !== "ALL" ||
      selectedStatus !== "ALL"
    );
  }, [debouncedSearch, selectedCategory, selectedPriority, selectedStatus]);

  // Toggle sort handler
  const handleSortToggle = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const startItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div
      className="max-w-7xl mx-auto w-full"
      style={{ maxWidth: 1320, width: "100%", margin: "0 auto" }}
    >
      {banner && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between mb-4 shadow-sm"
          role="alert"
          data-testid="success-banner"
        >
          <div className="d-flex align-items-center">
            <CheckCircleIcon size={18} className="me-2 text-success flex-shrink-0" />
            <strong>{banner}</strong>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={handleDismissBanner}
          ></button>
        </div>
      )}

      <div
        className="w-full mx-auto bg-white border shadow-sm p-4 mb-4 card zg-dashboard-card"
        style={{
          maxWidth: 1320,
          width: "100%",
          margin: "0 auto",
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
        data-testid="my-tickets-dashboard"
      >
        {/* 1. Header & Action Bar */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-3 border-bottom" style={{ borderColor: "#EAECF0" }}>
          <div>
            <h1 className="h4 fw-bold mb-1" style={{ color: "var(--zg-text-primary)", letterSpacing: "-0.01em" }}>
              My Tickets
            </h1>
            <p className="text-secondary small mb-0" style={{ color: "#475467" }}>
              Track, view, and manage all your IT service and support requests in real time.
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary fw-semibold px-3 py-2 rounded-2"
                onClick={handleClearFilters}
                data-testid="clear-filters-btn"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-success fw-semibold d-flex align-items-center gap-2 px-3 py-2 rounded-2 shadow-sm"
              style={{
                backgroundColor: "var(--zg-primary)",
                borderColor: "var(--zg-primary)",
                transition: "all 0.15s ease-in-out",
              }}
              onClick={onCreateTicket}
              data-testid="dashboard-create-ticket-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Ticket</span>
            </button>
          </div>
        </div>

        {/* 2. Search & Filters Toolbar */}
        <div className="zg-filter-toolbar mb-4" data-testid="filters-toolbar">
          {/* Search Input */}
          <div className="zg-filter-search">
            <label htmlFor="ticket-search-input" className="visually-hidden">
              Search by ticket number or summary
            </label>
            <div className="input-group h-100">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <SearchIcon size={18} />
              </span>
              <input
                id="ticket-search-input"
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search tickets by keyword or ID…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="ticket-search-input"
              />
            </div>
          </div>

          {/* Filter Dropdowns Group */}
          <div className="zg-filter-dropdown-group">
            {/* Category Dropdown */}
            <div className="zg-filter-select-wrapper zg-filter-category">
              <label htmlFor="category-filter-select" className="visually-hidden">
                Filter by Category
              </label>
              <select
                id="category-filter-select"
                className="form-select zg-filter-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                data-testid="category-filter-select"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Dropdown */}
            <div className="zg-filter-select-wrapper zg-filter-priority">
              <label htmlFor="priority-filter-select" className="visually-hidden">
                Filter by Priority
              </label>
              <select
                id="priority-filter-select"
                className="form-select zg-filter-select"
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value);
                  setPage(1);
                }}
                data-testid="priority-filter-select"
              >
                <option value="ALL">All Priorities</option>
                <option value="P0_URGENT">P0 Urgent</option>
                <option value="P1_HIGH">P1 High</option>
                <option value="P2_MEDIUM">P2 Medium</option>
                <option value="P3_LOW">P3 Low</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="zg-filter-select-wrapper zg-filter-status">
              <label htmlFor="status-filter-select" className="visually-hidden">
                Filter by Status
              </label>
              <select
                id="status-filter-select"
                className="form-select zg-filter-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                data-testid="status-filter-select"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert with Retry button */}
        {error && (
          <div
            className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm"
            role="alert"
            data-testid="tickets-error-alert"
          >
            <div className="d-flex align-items-center gap-2">
              <AlertTriangleIcon size={18} className="text-danger flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => loadTickets()}
              data-testid="retry-tickets-btn"
            >
              Retry
            </button>
          </div>
        )}

        {/* 3. Ticket Content Area */}
        <div className="zg-ticket-content-area" data-testid="ticket-content-area">
          {loading ? (
            <div className="py-5 text-center text-muted" data-testid="tickets-loading-spinner">
              <div className="spinner-border spinner-border-sm text-success me-2" role="status">
                <span className="visually-hidden">Loading tickets…</span>
              </div>
              <span>Loading tickets…</span>
            </div>
          ) : error ? (
            /* Do not render empty-tickets-state when error is present */
            null
          ) : tickets.length === 0 ? (
            <div
              className="py-5 px-4 text-center rounded-3 border border-dashed my-3"
              style={{ backgroundColor: "#FAFCFB", borderColor: "#D0D5DD" }}
              data-testid="empty-tickets-state"
            >
              {hasActiveFilters ? (
                <div style={{ maxWidth: 460, margin: "0 auto" }}>
                  <div
                    className="mb-3 d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: 56, height: 56, backgroundColor: "#F2F4F7" }}
                    aria-hidden="true"
                  >
                    <SearchIcon size={26} color="#667085" />
                  </div>
                  <h2 className="h5 fw-bold text-dark mb-1">No tickets match your filters</h2>
                  <p className="text-muted small mb-3">
                    Try adjusting your search keywords, category, or status criteria to find what you're looking for.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary fw-semibold px-3 py-1 rounded-2"
                    onClick={handleClearFilters}
                    data-testid="clear-filters-empty-btn"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div style={{ maxWidth: 460, margin: "0 auto" }}>
                  <div
                    className="mb-3 d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: 56, height: 56, backgroundColor: "var(--zg-pale)" }}
                    aria-hidden="true"
                  >
                    <TicketIcon size={28} color="var(--zg-primary)" />
                  </div>
                  <h2 className="h5 fw-bold text-dark mb-1">No tickets found</h2>
                  <p className="text-muted small mb-3">
                    You haven't submitted any IT support requests yet. Submit your first ticket to get help from IT.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-success fw-semibold px-3 py-2 rounded-2 shadow-sm d-inline-flex align-items-center gap-1"
                    style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
                    onClick={onCreateTicket}
                    data-testid="create-first-ticket-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Create Your First Ticket</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div
                className="w-full zg-table-container d-none d-md-block mb-3"
                data-testid="tickets-desktop-table"
              >
                <table className="w-full text-left table align-middle zg-table mb-0" style={{ tableLayout: "fixed", width: "100%", minWidth: "900px" }}>
                  <colgroup>
                    <col style={{ width: "15%", minWidth: "125px" }} />
                    <col style={{ width: "10%", minWidth: "105px" }} />
                    <col style={{ width: "25%", minWidth: "190px" }} />
                    <col style={{ width: "10%", minWidth: "100px" }} />
                    <col style={{ width: "10%", minWidth: "95px" }} />
                    <col style={{ width: "10%", minWidth: "85px" }} />
                    <col style={{ width: "10%", minWidth: "95px" }} />
                    <col style={{ width: "10%", minWidth: "105px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" className="whitespace-nowrap font-semibold text-center">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none fw-bold d-inline-flex align-items-center justify-content-center gap-1 whitespace-nowrap text-nowrap mx-auto text-center"
                          style={{
                            color: sortBy === "ticketNo" ? "var(--zg-primary)" : "var(--zg-text-secondary)",
                            fontSize: "0.72rem",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                          onClick={() => handleSortToggle("ticketNo")}
                          data-testid="sort-ticket-no-btn"
                        >
                          <span>Ticket No.</span>
                          <TableSortIndicator active={sortBy === "ticketNo"} order={sortOrder} />
                        </button>
                      </th>
                      <th scope="col" className="text-center text-gray-500" style={{ lineHeight: 1.25 }}>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none fw-bold d-inline-flex align-items-center justify-content-center gap-1 mx-auto text-center"
                          style={{
                            color: sortBy === "createdAt" ? "var(--zg-primary)" : "var(--zg-text-secondary)",
                            fontSize: "0.72rem",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            lineHeight: 1.25,
                          }}
                          onClick={() => handleSortToggle("createdAt")}
                          data-testid="sort-created-at-btn"
                        >
                          <span>Created<br />Date</span>
                          <TableSortIndicator active={sortBy === "createdAt"} order={sortOrder} />
                        </button>
                      </th>
                      <th scope="col" className="text-center">
                        Summary
                      </th>
                      <th scope="col" className="text-center">
                        Category
                      </th>
                      <th scope="col" className="text-center" style={{ lineHeight: 1.25 }}>
                        Requested<br />Priority
                      </th>
                      <th scope="col" className="text-center" style={{ lineHeight: 1.25 }}>
                        IT<br />Priority
                      </th>
                      <th scope="col" className="text-center" style={{ lineHeight: 1.25 }}>
                        Current<br />Status
                      </th>
                      <th scope="col" className="text-center text-gray-500" style={{ lineHeight: 1.25 }}>
                        Last<br />Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="zg-table-row"
                        data-testid={`ticket-row-${ticket.id}`}
                        onClick={() => handleTicketClick(ticket.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="whitespace-nowrap text-center">
                          <button
                            type="button"
                            className="btn btn-link font-monospace p-0 text-decoration-none whitespace-nowrap text-nowrap"
                            style={{
                              fontWeight: 600,
                              fontSize: "0.82rem",
                              color: "var(--zg-primary)",
                              whiteSpace: "nowrap",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTicketClick(ticket.id);
                            }}
                            data-testid={`ticket-link-${ticket.id}`}
                          >
                            {ticket.ticketNo}
                          </button>
                        </td>
                        <td className="whitespace-nowrap text-center text-gray-500 small">
                          {(() => {
                            const parts = formatTicketDateParts(ticket.createdAt);
                            return (
                              <div className="d-flex flex-column align-items-center justify-content-center text-nowrap" style={{ lineHeight: 1.2, gap: "3px" }}>
                                <span className="fw-medium text-dark" style={{ fontSize: "0.78rem" }}>
                                  {parts.date}
                                </span>
                                <span className="text-muted" style={{ fontSize: "0.68rem" }}>
                                  {parts.time}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="text-start" title={ticket.summary}>
                          <div
                            className="truncate max-w-[200px] font-medium text-gray-900"
                            title={ticket.summary}
                            style={{ fontSize: "0.84rem" }}
                          >
                            {ticket.summary}
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-center">
                          {ticket.category ? (
                            <span
                              className="badge border fw-medium px-2 py-1 text-truncate d-inline-block"
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                backgroundColor: "#F8FAF9",
                                borderColor: "var(--zg-border)",
                                color: "var(--zg-text-primary)",
                                fontSize: "0.74rem",
                                verticalAlign: "middle",
                              }}
                              title={ticket.category.name}
                            >
                              {ticket.category.name}
                            </span>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-center">
                          {renderPriorityBadge(ticket.requestedPriority || ticket.priority)}
                        </td>
                        <td className="whitespace-nowrap text-center small text-muted">
                          {ticket.itPriority ? (
                            renderPriorityBadge(ticket.itPriority)
                          ) : (
                            <span className="text-muted fw-semibold" style={{ fontSize: "0.85rem" }} title="Not yet assigned by IT">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-center">
                          <div className="d-flex flex-column align-items-center justify-content-center">
                            {renderStatusBadge(ticket.status)}
                            {ticket.resolutionIndicated && (
                              <span
                                className="badge rounded-pill d-inline-flex align-items-center gap-1 mt-1"
                                style={{
                                  backgroundColor: "var(--zg-pale)",
                                  color: "var(--zg-primary)",
                                  border: "1px solid #12B76A",
                                  fontSize: "0.65rem",
                                  padding: "0.15rem 0.4rem",
                                  fontWeight: 600,
                                  maxWidth: "100%",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <CheckCircleIcon size={9} className="text-success" />
                                <span>Confirmed Resolved</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-center text-gray-500 small">
                          {(() => {
                            const parts = formatTicketDateParts(ticket.updatedAt);
                            return (
                              <div className="d-flex flex-column align-items-center justify-content-center text-nowrap" style={{ lineHeight: 1.2, gap: "5px" }}>
                                <span className="fw-medium text-dark" style={{ fontSize: "0.78rem" }}>
                                  {parts.date}
                                </span>
                                <span className="text-muted" style={{ fontSize: "0.68rem" }}>
                                  {parts.time}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< 768px) */}
              <div className="d-block d-md-none mb-3" data-testid="tickets-mobile-list">
                <div className="d-flex flex-column gap-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="card zg-mobile-card p-3 shadow-sm border"
                      data-testid={`ticket-card-${ticket.id}`}
                      onClick={() => handleTicketClick(ticket.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <button
                          type="button"
                          className="btn btn-link font-monospace fw-bold text-success p-0 text-decoration-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTicketClick(ticket.id);
                          }}
                          data-testid={`mobile-ticket-link-${ticket.id}`}
                        >
                          {ticket.ticketNo}
                        </button>
                        <span className="small text-muted">{formatTicketDate(ticket.createdAt)}</span>
                      </div>
                      <h3 className="h6 fw-semibold mb-2 text-dark">{ticket.summary}</h3>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                        {renderStatusBadge(ticket.status)}
                        {renderPriorityBadge(ticket.requestedPriority || ticket.priority)}
                        {ticket.category && (
                          <span className="badge bg-light text-dark border">
                            {ticket.category.name}
                          </span>
                        )}
                      </div>
                      {ticket.resolutionIndicated && (
                        <div className="small text-success fw-medium">
                          ✓ Confirmed Resolved by Requester
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Pagination & Page Size Controls */}
              {!loading && tickets.length > 0 && (
                <div
                  className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 pt-3 border-top"
                  data-testid="pagination-controls"
                >
                  {/* Counter Text */}
                  <div className="small text-muted" data-testid="pagination-counter">
                    Showing <span className="fw-semibold text-dark">{startItem}</span> to{" "}
                    <span className="fw-semibold text-dark">{endItem}</span> of{" "}
                    <span className="fw-semibold text-dark">{pagination.totalItems}</span> tickets
                  </div>

                  <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 pt-3 border-top w-100">
                    {/* Page Size Selector */}
                    <div className="d-flex align-items-center gap-1 small text-muted">
                      <label htmlFor="page-size-select" className="text-nowrap mb-0">
                        Per page:
                      </label>
                      <select
                        id="page-size-select"
                        className="form-select form-select-sm"
                        style={{ width: "auto" }}
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(parseInt(e.target.value, 10));
                          setPage(1);
                        }}
                        data-testid="page-size-select"
                        aria-label="Items per page"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    {/* Navigation buttons */}
                    <nav aria-label="Ticket Pagination">
                      <ul className="pagination pagination-sm mb-0 gap-1 flex-nowrap">
                        <li className={`page-item ${pagination.page <= 1 ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link rounded-2"
                            style={{
                              borderColor: "#D0D5DD",
                              color: pagination.page <= 1 ? "#98A2B3" : "#344054",
                              fontWeight: 500,
                            }}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={pagination.page <= 1}
                            data-testid="pagination-prev-btn"
                          >
                            &lt; Previous
                          </button>
                        </li>

                        {Array.from({ length: pagination.totalPages || 1 }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isActive = pageNum === pagination.page;
                          return (
                            <li
                              key={pageNum}
                              className={`page-item ${isActive ? "active" : ""}`}
                            >
                              <button
                                type="button"
                                className="page-link rounded-2"
                                style={
                                  isActive
                                    ? {
                                        backgroundColor: "var(--zg-primary)",
                                        borderColor: "var(--zg-primary)",
                                        color: "#FFFFFF",
                                        fontWeight: 600,
                                      }
                                    : {
                                        borderColor: "#D0D5DD",
                                        color: "#344054",
                                        fontWeight: 500,
                                      }
                                }
                                onClick={() => setPage(pageNum)}
                                data-testid={`pagination-page-${pageNum}`}
                              >
                                {pageNum}
                              </button>
                            </li>
                          );
                        })}

                        <li
                          className={`page-item ${
                            pagination.page >= pagination.totalPages ? "disabled" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="page-link rounded-2"
                            style={{
                              borderColor: "#D0D5DD",
                              color: pagination.page >= pagination.totalPages ? "#98A2B3" : "#344054",
                              fontWeight: 500,
                            }}
                            onClick={() => setPage((p) => p + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            data-testid="pagination-next-btn"
                          >
                            Next &gt;
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
