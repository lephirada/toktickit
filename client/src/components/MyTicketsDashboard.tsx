import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BoltIcon, SearchIcon, TicketIcon, ArrowRightIcon, AlertTriangleIcon, CheckCircleIcon } from "./icons";
import { useRequester } from "../context/RequesterContext.js";
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

export function renderPriorityBadge(priority: string) {
  switch (priority) {
    case "P0_URGENT":
      return (
        <span className="badge zg-priority-p0 px-2 py-1 d-inline-flex align-items-center gap-1" data-testid="priority-badge">
          <BoltIcon size={12} />
          <span>P0 Urgent</span>
        </span>
      );
    case "P1_HIGH":
      return (
        <span className="badge zg-priority-p1 px-2 py-1 d-inline-flex align-items-center gap-1" data-testid="priority-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 4 22 20 2 20" />
          </svg>
          <span>P1 High</span>
        </span>
      );
    case "P2_MEDIUM":
      return (
        <span className="badge zg-priority-p2 px-2 py-1 d-inline-flex align-items-center gap-1" data-testid="priority-badge">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span>P2 Medium</span>
        </span>
      );
    case "P3_LOW":
      return (
        <span className="badge zg-priority-p3 px-2 py-1 d-inline-flex align-items-center gap-1" data-testid="priority-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 20 2 4 22 4" />
          </svg>
          <span>P3 Low</span>
        </span>
      );
    default:
      return <span className="badge bg-secondary">{priority}</span>;
  }
}

export function renderStatusBadge(status: string) {
  switch (status) {
    case "NEW":
      return <span className="badge zg-status-new px-2 py-1">NEW</span>;
    case "IN_PROGRESS":
      return <span className="badge zg-status-in-progress px-2 py-1">IN PROGRESS</span>;
    case "RESOLVED":
      return <span className="badge zg-status-resolved px-2 py-1">RESOLVED</span>;
    case "CLOSED":
      return <span className="badge zg-status-closed px-2 py-1">CLOSED</span>;
    case "REJECTED":
      return <span className="badge zg-status-rejected px-2 py-1">REJECTED</span>;
    default:
      return <span className="badge bg-secondary">{status}</span>;
  }
}

export default function MyTicketsDashboard({
  onCreateTicket,
  onViewTicket,
  successBanner,
  successMessage,
  onClearBanner,
  onDismissSuccessBanner,
}: MyTicketsDashboardProps) {
  const { currentRequester } = useRequester();

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
      setPage(1); // reset to page 1 on search change
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
    if (!currentRequester) return;

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
      const res = await fetchTickets(currentRequester.id, params);
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
            page: 1,
            pageSize: 10,
            totalItems: items.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          };

      setTickets(items);
      setPagination(meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentRequester,
    page,
    pageSize,
    debouncedSearch,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    sortBy,
    sortOrder,
  ]);

  // Fetch tickets when dependencies change
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Reset page to 1 and immediately clear previous tickets when requester changes
  const prevRequesterIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (prevRequesterIdRef.current !== undefined && prevRequesterIdRef.current !== currentRequester?.id) {
      setTickets([]);
      setPage(1);
      handleDismissBanner();
    }
    prevRequesterIdRef.current = currentRequester?.id;
  }, [currentRequester?.id, handleDismissBanner]);

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
      setSortOrder(column === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  };

  // Pagination calculation
  const startItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <>
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
        className="card shadow-sm border-0 p-3 p-md-4 mb-4 rounded-3"
        style={{ maxWidth: 1200, margin: "0 auto" }}
        data-testid="my-tickets-dashboard"
      >
      {/* 1. Header & Action Bar */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-2 border-bottom">
        <div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "var(--zg-text-primary)" }}>
            My Tickets
          </h1>
          <p className="text-muted small mb-0">
            View and track all of your support requests.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary fw-semibold"
              onClick={handleClearFilters}
              data-testid="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-success fw-semibold d-flex align-items-center gap-1"
            style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
            onClick={onCreateTicket}
            data-testid="dashboard-create-ticket-btn"
          >
            <span>+ Create Ticket</span>
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
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0 text-muted">
              <SearchIcon size={16} />
            </span>
            <input
              id="ticket-search-input"
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search by ticket number or summary..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              data-testid="ticket-search-input"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="zg-filter-select-wrapper">
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
            aria-label="Filter by Category"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="zg-filter-select-wrapper">
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
            aria-label="Filter by Priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="P0_URGENT">P0 Urgent</option>
            <option value="P1_HIGH">P1 High</option>
            <option value="P2_MEDIUM">P2 Medium</option>
            <option value="P3_LOW">P3 Low</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="zg-filter-select-wrapper">
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
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Error alert with Retry */}
      {error && (
        <div
          className="alert alert-danger py-2 px-3 mb-3 small d-flex align-items-center justify-content-between rounded-3 shadow-sm"
          role="alert"
          data-testid="tickets-error-alert"
        >
          <div className="d-flex align-items-center gap-2">
            <AlertTriangleIcon size={18} className="text-danger flex-shrink-0" />
            <span>Failed to load tickets. Please try again.</span>
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

      {/* 3. Ticket Content Area with min-height to prevent vertical shift */}
      <div className="zg-ticket-content-area" data-testid="ticket-content-area">
        {loading ? (
          <div className="py-5 text-center text-muted" data-testid="tickets-loading-spinner">
            <div className="spinner-border spinner-border-sm text-success me-2" role="status">
              <span className="visually-hidden">Loading tickets…</span>
            </div>
            <span>Loading tickets…</span>
          </div>
      ) : tickets.length === 0 ? (
        <div className="py-5 text-center" data-testid="empty-tickets-state">
          {hasActiveFilters ? (
            <div>
              <div className="mb-3 text-secondary d-flex justify-content-center" aria-hidden="true">
                <SearchIcon size={44} color="#8A9E94" />
              </div>
              <h2 className="h5 fw-bold text-dark mb-1">No tickets match your filters</h2>
              <p className="text-muted small mb-3">
                Try adjusting your search keywords, category, or status criteria.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary fw-semibold"
                onClick={handleClearFilters}
                data-testid="clear-filters-empty-btn"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-3 text-success d-flex justify-content-center" aria-hidden="true">
                <TicketIcon size={48} color="#006B3C" />
              </div>
              <h2 className="h5 fw-bold text-dark mb-1">No tickets found</h2>
              <p className="text-muted small mb-3">
                You haven't submitted any IT support requests yet. Create your first support ticket!
              </p>
              <button
                type="button"
                className="btn btn-sm btn-success fw-semibold"
                style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
                onClick={onCreateTicket}
                data-testid="create-first-ticket-btn"
              >
                Create Your First Ticket
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Section 8.4 Ticket Display Area */}
          <div className="table-responsive d-none d-md-block mb-3" data-testid="tickets-desktop-table">
            {/* Desktop Table View */}
            <table className="table table-hover align-middle zg-table mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="whitespace-nowrap text-nowrap">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-muted fw-bold small d-inline-flex align-items-center gap-1 whitespace-nowrap text-nowrap"
                      onClick={() => handleSortToggle("ticketNo")}
                      data-testid="sort-ticket-no-btn"
                    >
                      Ticket No.
                      {sortBy === "ticketNo" && (
                        <span className="ms-1">
                          {sortOrder === "asc" ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 4 22 20 2 20" /></svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 20 2 4 22 4" /></svg>
                          )}
                        </span>
                      )}
                    </button>
                  </th>
                  <th scope="col" className="whitespace-nowrap text-nowrap">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-muted fw-bold small d-inline-flex align-items-center gap-1 whitespace-nowrap text-nowrap"
                      onClick={() => handleSortToggle("createdAt")}
                      data-testid="sort-created-at-btn"
                    >
                      Created Date
                      {sortBy === "createdAt" && (
                        <span className="ms-1">
                          {sortOrder === "asc" ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 4 22 20 2 20" /></svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 20 2 4 22 4" /></svg>
                          )}
                        </span>
                      )}
                    </button>
                  </th>
                  <th scope="col">Summary</th>
                  <th scope="col" className="whitespace-nowrap text-nowrap">Category</th>
                  <th scope="col" className="whitespace-nowrap text-nowrap">Requested Priority</th>
                  <th scope="col" className="whitespace-nowrap text-nowrap">IT Priority</th>
                  <th scope="col" className="whitespace-nowrap text-nowrap">Current Status</th>
                  <th scope="col" className="whitespace-nowrap text-nowrap">Last Updated</th>
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
                    <td className="whitespace-nowrap text-nowrap">
                      <button
                        type="button"
                        className="btn btn-link font-monospace fw-bold text-success p-0 text-decoration-none whitespace-nowrap text-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTicketClick(ticket.id);
                        }}
                        data-testid={`ticket-link-${ticket.id}`}
                      >
                        {ticket.ticketNo}
                      </button>
                    </td>
                    <td className="small text-muted whitespace-nowrap text-nowrap">
                      {formatTicketDate(ticket.createdAt)}
                    </td>
                    <td title={ticket.summary}>
                      <div
                        className="truncate max-w-[200px] lg:max-w-xs font-medium fw-semibold text-dark text-truncate"
                        style={{
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={ticket.summary}
                      >
                        {ticket.summary}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-nowrap">
                      {ticket.category ? (
                        <span className="badge bg-light text-dark border">
                          {ticket.category.name}
                        </span>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-nowrap">{renderPriorityBadge(ticket.priority)}</td>
                    <td className="small text-muted whitespace-nowrap text-nowrap">—</td>
                    <td className="whitespace-nowrap text-nowrap">{renderStatusBadge(ticket.status)}</td>
                    <td className="small text-muted whitespace-nowrap text-nowrap">
                      {formatTicketDate(ticket.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Mobile Card View (< 768px) */}
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
                    {renderStatusBadge(ticket.status)}
                  </div>
                  <h3
                    className="h6 fw-semibold text-dark mb-2 text-truncate truncate"
                    title={ticket.summary}
                  >
                    {ticket.summary}
                  </h3>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                    {ticket.category && (
                      <span className="badge bg-light text-dark border small">
                        {ticket.category.name}
                      </span>
                    )}
                    {renderPriorityBadge(ticket.priority)}
                  </div>
                  <div className="d-flex align-items-center justify-content-between text-muted small mt-2 pt-2 border-top">
                    <span>{formatTicketDate(ticket.createdAt)}</span>
                    <span className="text-success fw-bold d-inline-flex align-items-center">
                      View <ArrowRightIcon size={12} className="ms-1" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
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

            <div className="d-flex align-items-center gap-3">
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
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${pagination.page <= 1 ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1}
                      data-testid="pagination-prev-btn"
                    >
                      &lt; Previous
                    </button>
                  </li>

                  {Array.from({ length: pagination.totalPages || 1 }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <li
                        key={pageNum}
                        className={`page-item ${pageNum === pagination.page ? "active" : ""}`}
                      >
                        <button
                          type="button"
                          className="page-link"
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
                      className="page-link"
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
    </div>
    </>
  );
}
