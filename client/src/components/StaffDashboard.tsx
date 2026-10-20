import React, { useState, useEffect, useCallback } from "react";
import {
  fetchStaffDashboard,
  fetchStaffTickets,
  fetchAdminUsers,
  DashboardResponse,
  StaffTicketItem,
  AuthUser,
  PriorityBreakdown,
} from "../api.js";
import {
  TicketIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BoltIcon,
  UserIcon,
} from "./icons/index.js";
import {
  renderStaffPriorityBadge,
  renderStaffStatusBadge,
  renderCompactTicketDate,
} from "./StaffTicketQueue.js";

export interface StaffDashboardProps {
  currentUser: AuthUser;
  onNavigateQueue?: (params?: Record<string, string>) => void;
  onViewTicket?: (ticketId: number) => void;
  onNavigateUsers?: () => void;
}

export function formatMinutesToHoursMinutes(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return "0h 00m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export default function StaffDashboard({
  currentUser,
  onNavigateQueue,
  onViewTicket,
  onNavigateUsers,
}: StaffDashboardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse["data"] | null>(null);
  const [myAssignedCount, setMyAssignedCount] = useState<number>(0);
  const [recentTickets, setRecentTickets] = useState<StaffTicketItem[]>([]);
  const [urgentTickets, setUrgentTickets] = useState<StaffTicketItem[]>([]);
  const [adminStats, setAdminStats] = useState<{
    totalUsers: number;
    activeStaff: number;
    activeAdmins: number;
    activeRequesters: number;
    passwordChangeRequired: number;
  } | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch staff dashboard metrics, my tickets, recent tickets, and urgent tickets in parallel
      const promises: Array<Promise<any>> = [
        fetchStaffDashboard(),
        fetchStaffTickets({ owner: "MY_TICKETS", pageSize: 1 }),
        fetchStaffTickets({ pageSize: 5, sortBy: "createdAt", sortOrder: "desc" }),
        fetchStaffTickets({ priority: "P0_URGENT", pageSize: 5, sortBy: "createdAt", sortOrder: "desc" }),
      ];

      // Concurrently fetch admin user statistics if caller is ADMINISTRATOR
      if (currentUser.role === "ADMINISTRATOR") {
        promises.push(fetchAdminUsers());
      }

      const [dashRes, myTicketsRes, recentTicketsRes, urgentTicketsRes, adminUsersRes] =
        await Promise.all(promises);

      setDashboardData(dashRes.data);
      setMyAssignedCount(myTicketsRes?.pagination?.totalItems ?? 0);
      setRecentTickets(recentTicketsRes?.data ?? []);

      // Filter non-terminal urgent tickets
      const urgentList = (urgentTicketsRes?.data ?? []).filter(
        (t: any) =>
          (t.itPriority ?? t.requestedPriority) === "P0_URGENT" &&
          t.status !== "CLOSED" &&
          t.status !== "CANCELLED"
      );
      setUrgentTickets(urgentList);

      if (adminUsersRes && adminUsersRes.data) {
        const users = adminUsersRes.data;
        setAdminStats({
          totalUsers: users.length,
          activeStaff: users.filter((u: any) => u.role === "IT_STAFF" && u.isActive).length,
          activeAdmins: users.filter((u: any) => u.role === "ADMINISTRATOR" && u.isActive).length,
          activeRequesters: users.filter((u: any) => u.role === "REQUESTER" && u.isActive).length,
          passwordChangeRequired: users.filter((u: any) => u.mustChangePassword).length,
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load operational dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentUser.role]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Loading State
  if (loading) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center py-5"
        data-testid="staff-dashboard-loading"
        style={{ minHeight: "400px" }}
      >
        <div
          className="spinner-border text-success mb-3"
          role="status"
          style={{ width: "3rem", height: "3rem" }}
        >
          <span className="visually-hidden">Loading dashboard…</span>
        </div>
        <p className="text-muted fw-medium">Loading operational service desk metrics…</p>
      </div>
    );
  }

  // Error State with Retry
  if (error || !dashboardData) {
    return (
      <div className="py-4" data-testid="staff-dashboard-error-container">
        <div
          className="alert alert-danger d-flex flex-column flex-sm-row align-items-sm-center justify-content-between p-3 rounded-3 shadow-sm border-danger"
          role="alert"
          data-testid="staff-dashboard-error-alert"
        >
          <div className="d-flex align-items-center mb-2 mb-sm-0">
            <AlertTriangleIcon size={20} className="text-danger me-2 flex-shrink-0" />
            <span className="fw-medium">{error || "Failed to load operational metrics."}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger px-3 py-1 fw-medium"
            onClick={loadDashboardData}
            data-testid="staff-dashboard-error-retry"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { metrics, categoryBreakdown, priorityBreakdown } = dashboardData;

  // Calculate non-terminal tickets total for progress bars
  const totalNonTerminal =
    categoryBreakdown.reduce((acc, c) => acc + c.ticketCount, 0) || 1;

  const priorityConfigs: { key: keyof PriorityBreakdown; label: string; color: string; badge: string }[] = [
    { key: "P0_URGENT", label: "P0 Urgent", color: "#D92D20", badge: "bg-danger" },
    { key: "P1_HIGH", label: "P1 High", color: "#F79009", badge: "bg-warning text-dark" },
    { key: "P2_MEDIUM", label: "P2 Medium", color: "#175CD3", badge: "bg-primary" },
    { key: "P3_LOW", label: "P3 Low", color: "#667085", badge: "bg-secondary" },
  ];

  return (
    <div className="container-fluid px-0" data-testid="staff-dashboard-container">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1
            className="h3 fw-bold mb-1"
            style={{ color: "var(--zg-text-primary)", letterSpacing: "-0.02em" }}
            data-testid="staff-dashboard-title"
          >
            Operational Service Desk Dashboard
          </h1>
          <p className="text-muted mb-0 small">
            Real-time queue workload, service metrics, and resolution throughput.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1 px-3 py-2 fw-semibold shadow-sm"
            style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
            onClick={() => onNavigateQueue?.()}
            data-testid="go-to-queue-btn"
          >
            <TicketIcon size={16} />
            <span>Open Ticket Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Zen Green Design Tokens) */}
      <div className="row g-3 mb-4" data-testid="staff-kpi-row">
        {/* 1. Unassigned Tickets */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3 position-relative"
            style={{
              backgroundColor: "#FEF3F2",
              borderLeft: "4px solid #D92D20",
              cursor: "pointer",
            }}
            onClick={() => onNavigateQueue?.({ owner: "UNASSIGNED" })}
            data-testid="kpi-card-unassigned"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onNavigateQueue?.({ owner: "UNASSIGNED" })}
            aria-label="View unassigned tickets in queue"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#D92D20", letterSpacing: "0.05em" }}>
                Unassigned
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#FECDCA", color: "#D92D20" }}>
                <TicketIcon size={13} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#D92D20" }} data-testid="kpi-count-unassigned">
              {metrics.unassignedCount}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
              Needs staff assignment &rarr;
            </span>
          </div>
        </div>

        {/* 2. My Assigned Tickets */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3 position-relative"
            style={{
              backgroundColor: "#EFF8FF",
              borderLeft: "4px solid #175CD3",
              cursor: "pointer",
            }}
            onClick={() => onNavigateQueue?.({ owner: "MY_TICKETS" })}
            data-testid="kpi-card-my-assigned"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onNavigateQueue?.({ owner: "MY_TICKETS" })}
            aria-label="View my assigned tickets in queue"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#175CD3", letterSpacing: "0.05em" }}>
                My Tickets
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#D1E9FF", color: "#175CD3" }}>
                <UserIcon size={13} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#175CD3" }} data-testid="kpi-count-my-assigned">
              {myAssignedCount}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
              Assigned to you &rarr;
            </span>
          </div>
        </div>

        {/* 3. In Progress */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3 position-relative"
            style={{
              backgroundColor: "#FEF0C7",
              borderLeft: "4px solid #F79009",
              cursor: "pointer",
            }}
            onClick={() => onNavigateQueue?.({ status: "IN_PROGRESS" })}
            data-testid="kpi-card-in-progress"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onNavigateQueue?.({ status: "IN_PROGRESS" })}
            aria-label="View in progress tickets in queue"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#B54708", letterSpacing: "0.05em" }}>
                In Progress
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#FEDF89", color: "#B54708" }}>
                <BoltIcon size={13} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#B54708" }} data-testid="kpi-count-in-progress">
              {metrics.inProgress}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
              Active investigation &rarr;
            </span>
          </div>
        </div>

        {/* 4. Waiting for Requester */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3 position-relative"
            style={{
              backgroundColor: "#FFFAEB",
              borderLeft: "4px solid #B54708",
              cursor: "pointer",
            }}
            onClick={() => onNavigateQueue?.({ status: "WAITING_FOR_REQUESTER" })}
            data-testid="kpi-card-waiting-requester"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onNavigateQueue?.({ status: "WAITING_FOR_REQUESTER" })}
            aria-label="View waiting for requester tickets in queue"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#B54708", letterSpacing: "0.05em" }}>
                Waiting Req.
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#FEDF89", color: "#B54708" }}>
                <AlertTriangleIcon size={13} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#B54708" }} data-testid="kpi-count-waiting-requester">
              {metrics.waitingForRequester}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
              Pending user reply &rarr;
            </span>
          </div>
        </div>

        {/* 5. Total Open */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3 position-relative"
            style={{
              backgroundColor: "#F8F9FA",
              borderLeft: "4px solid #344054",
              cursor: "pointer",
            }}
            onClick={() => onNavigateQueue?.({ status: "NEW,OPEN" })}
            data-testid="kpi-card-total-open"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onNavigateQueue?.({ status: "NEW,OPEN" })}
            aria-label="View open tickets in queue"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#344054", letterSpacing: "0.05em" }}>
                Total Open
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#EAECF0", color: "#344054" }}>
                <TicketIcon size={13} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#344054" }} data-testid="kpi-count-total-open">
              {metrics.totalOpen}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
              New &amp; unworked &rarr;
            </span>
          </div>
        </div>

        {/* 6. Recently Resolved (Rolling 7-day window) */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3 position-relative"
            style={{
              backgroundColor: "var(--zg-pale)",
              borderLeft: "4px solid var(--zg-primary)",
              cursor: "pointer",
            }}
            onClick={() => onNavigateQueue?.({ status: "RESOLVED", resolvedWithinDays: "7" })}
            data-testid="kpi-card-recently-resolved"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onNavigateQueue?.({ status: "RESOLVED", resolvedWithinDays: "7" })}
            aria-label="View recently resolved tickets in queue"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "var(--zg-primary)", letterSpacing: "0.05em" }}>
                Resolved
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#A6F4C5", color: "var(--zg-primary)" }}>
                <CheckCircleIcon size={13} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "var(--zg-primary)" }} data-testid="kpi-count-recently-resolved">
              {metrics.recentlyResolved}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
              Rolling 7-day window &rarr;
            </span>
          </div>
        </div>

        {/* 7. Total Time Spent */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3"
            style={{
              backgroundColor: "var(--zg-surface-subtle)",
              borderLeft: "4px solid #475467",
            }}
            data-testid="kpi-card-total-time"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#475467", letterSpacing: "0.05em" }}>
                Total Labor
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#EAECF0", color: "#475467" }}>
                <BoltIcon size={13} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1 text-dark" data-testid="kpi-count-total-time">
              {formatMinutesToHoursMinutes(metrics.totalTimeSpentMinutes)}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
              Active &amp; 7d actions
            </span>
          </div>
        </div>
      </div>

      {/* Administrator-Only User Accounts Summary Card (DSH-UI-03) */}
      {currentUser.role === "ADMINISTRATOR" && adminStats && (
        <div
          className="card border-0 shadow-sm rounded-3 mb-4 p-3 p-md-4"
          style={{
            backgroundColor: "#F9F5FF",
            border: "1px solid #D8B4FE",
            borderLeft: "5px solid #7F56D9",
          }}
          data-testid="admin-user-summary-card"
        >
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge px-2 py-1 rounded-pill" style={{ backgroundColor: "#F4EBFF", color: "#5925DC", border: "1px solid #D8B4FE" }}>
                  Administrator Only
                </span>
                <h2 className="h6 fw-bold mb-0 text-dark">User Accounts &amp; Access Summary</h2>
              </div>
              <p className="text-muted small mb-0">
                System-wide account health, role distribution, and pending credential actions.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-3 py-1 fw-semibold shadow-sm text-nowrap"
              style={{ color: "#6941C6", borderColor: "#7F56D9" }}
              onClick={onNavigateUsers}
              data-testid="admin-manage-users-btn"
            >
              <UserIcon size={15} />
              <span>Manage User Accounts &rarr;</span>
            </button>
          </div>

          <div className="row g-2 g-md-3 text-center">
            <div className="col-6 col-sm-4 col-md-2">
              <div className="bg-white p-2 rounded-2 border shadow-2xs">
                <div className="small text-muted" style={{ fontSize: "0.75rem" }}>Total Users</div>
                <div className="fs-5 fw-bold text-dark" data-testid="admin-stat-total-users">{adminStats.totalUsers}</div>
              </div>
            </div>
            <div className="col-6 col-sm-4 col-md-2">
              <div className="bg-white p-2 rounded-2 border shadow-2xs">
                <div className="small text-muted" style={{ fontSize: "0.75rem" }}>Active Staff</div>
                <div className="fs-5 fw-bold text-success" data-testid="admin-stat-staff">{adminStats.activeStaff}</div>
              </div>
            </div>
            <div className="col-6 col-sm-4 col-md-2">
              <div className="bg-white p-2 rounded-2 border shadow-2xs">
                <div className="small text-muted" style={{ fontSize: "0.75rem" }}>Administrators</div>
                <div className="fs-5 fw-bold" style={{ color: "#6941C6" }} data-testid="admin-stat-admins">{adminStats.activeAdmins}</div>
              </div>
            </div>
            <div className="col-6 col-sm-4 col-md-3">
              <div className="bg-white p-2 rounded-2 border shadow-2xs">
                <div className="small text-muted" style={{ fontSize: "0.75rem" }}>Active Requesters</div>
                <div className="fs-5 fw-bold text-primary" data-testid="admin-stat-requesters">{adminStats.activeRequesters}</div>
              </div>
            </div>
            <div className="col-12 col-sm-8 col-md-3">
              <div className="bg-white p-2 rounded-2 border shadow-2xs">
                <div className="small text-muted" style={{ fontSize: "0.75rem" }}>Password Reset Required</div>
                <div className="fs-5 fw-bold text-danger" data-testid="admin-stat-pwd-reset">{adminStats.passwordChangeRequired}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualizations Grid: Categories & Priority Distribution */}
      <div className="row g-3 g-md-4 mb-4">
        {/* Category Workload Distribution */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100 rounded-3 p-3 p-md-4" data-testid="category-breakdown-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="h6 fw-bold mb-0 text-dark">Tickets &amp; Labor by Category</h2>
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  Non-terminal tickets and active action hours
                </span>
              </div>
              <span className="badge bg-light text-muted border">
                {categoryBreakdown.length} Categories
              </span>
            </div>

            <div className="d-flex flex-column gap-3">
              {categoryBreakdown.map((cat) => {
                const percent = Math.round((cat.ticketCount / totalNonTerminal) * 100);
                const hours = (cat.totalTimeSpentMinutes / 60).toFixed(1);

                return (
                  <div
                    key={cat.categoryId}
                    className="p-2 rounded-2 category-drilldown-row"
                    style={{
                      cursor: "pointer",
                      backgroundColor: "var(--zg-surface-subtle)",
                      transition: "background 0.15s ease",
                    }}
                    onClick={() => onNavigateQueue?.({ categoryId: String(cat.categoryId) })}
                    data-testid={`category-drilldown-${cat.categoryId}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      onNavigateQueue?.({ categoryId: String(cat.categoryId) })
                    }
                  >
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="fw-semibold text-dark small">{cat.categoryName}</span>
                      <div className="small text-muted">
                        <strong className="text-dark">{cat.ticketCount}</strong> tickets (
                        <span>{hours} hrs</span>)
                      </div>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: "var(--zg-primary)",
                        }}
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority Workload Distribution */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100 rounded-3 p-3 p-md-4" data-testid="priority-breakdown-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="h6 fw-bold mb-0 text-dark">Priority Distribution</h2>
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  Effective priority on non-terminal tickets
                </span>
              </div>
            </div>

            <div className="d-flex flex-column gap-3">
              {priorityConfigs.map((cfg) => {
                const count = priorityBreakdown[cfg.key] || 0;
                const percent = Math.round((count / totalNonTerminal) * 100);

                return (
                  <div
                    key={cfg.key}
                    className="p-2 rounded-2 priority-drilldown-row"
                    style={{
                      cursor: "pointer",
                      backgroundColor: "var(--zg-surface-subtle)",
                      transition: "background 0.15s ease",
                    }}
                    onClick={() => onNavigateQueue?.({ priority: cfg.key })}
                    data-testid={`priority-drilldown-${cfg.key}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      onNavigateQueue?.({ priority: cfg.key })
                    }
                  >
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className={`badge ${cfg.badge} px-2 py-1`}>{cfg.label}</span>
                      <span className="fw-bold text-dark small">{count}</span>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: cfg.color,
                        }}
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* P0 Urgent Tickets Section (Issue 24 Scope Refinement) */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden mb-4" data-testid="staff-urgent-tickets-card">
        <div
          className="card-header py-3 px-4 d-flex align-items-center justify-content-between"
          style={{ backgroundColor: "#FEF3F2", borderBottom: "1px solid #FECDCA" }}
        >
          <div className="d-flex align-items-center gap-2">
            <span
              className="badge rounded-pill px-2 py-1 fw-bold text-uppercase d-inline-flex align-items-center gap-1"
              style={{ backgroundColor: "#D92D20", color: "#FFFFFF", fontSize: "0.72rem" }}
            >
              <AlertTriangleIcon size={12} color="#FFFFFF" />
              P0 Urgent
            </span>
            <h2 className="h6 fw-bold mb-0" style={{ color: "#B42318" }}>
              Immediate Attention Required
            </h2>
            <span
              className="badge rounded-pill fw-semibold"
              style={{ backgroundColor: "#FEE4E2", color: "#B42318", fontSize: "0.75rem" }}
              data-testid="urgent-tickets-count-badge"
            >
              {urgentTickets.length}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none fw-semibold p-0"
            style={{ color: "#B42318" }}
            onClick={() => onNavigateQueue?.({ priority: "P0_URGENT" })}
            data-testid="see-all-urgent-link"
          >
            View all urgent in queue &rarr;
          </button>
        </div>

        {urgentTickets.length === 0 ? (
          <div className="text-center py-4 text-muted small bg-white" data-testid="staff-empty-urgent-tickets">
            <div className="text-success mb-1">
              <CheckCircleIcon size={22} color="var(--zg-primary)" />
            </div>
            <span className="fw-medium">No urgent P0 tickets currently requiring immediate attention.</span>
          </div>
        ) : (
          <div className="table-responsive bg-white">
            <table className="table table-hover align-middle mb-0" data-testid="staff-urgent-tickets-table">
              <thead className="table-light text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>
                <tr>
                  <th scope="col" className="ps-4">Ticket</th>
                  <th scope="col">Summary</th>
                  <th scope="col">Requester</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-center">Created</th>
                  <th scope="col" className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {urgentTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    data-testid={`urgent-ticket-row-${ticket.id}`}
                    style={{ cursor: "pointer", backgroundColor: "#FFFBFA" }}
                    onClick={() => onViewTicket?.(ticket.id)}
                  >
                    <td className="ps-4 fw-bold text-nowrap" style={{ color: "#D92D20" }}>
                      {ticket.ticketNo}
                    </td>
                    <td>
                      <div className="fw-medium text-dark text-truncate" style={{ maxWidth: "280px" }}>
                        {ticket.summary}
                      </div>
                    </td>
                    <td className="text-nowrap small text-muted">
                      {ticket.requester?.fullName || "Requester"}
                    </td>
                    <td>
                      {renderStaffStatusBadge(ticket.status)}
                    </td>
                    <td className="text-center">
                      {renderCompactTicketDate(ticket.createdAt)}
                    </td>
                    <td className="text-end pe-4">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger px-2 py-1"
                        style={{ fontSize: "0.75rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTicket?.(ticket.id);
                        }}
                        data-testid={`view-urgent-ticket-btn-${ticket.id}`}
                      >
                        Open &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Queue Activity Section */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden" data-testid="staff-recent-tickets-card">
        <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <TicketIcon size={18} className="text-success" />
            <h2 className="h6 fw-bold mb-0 text-dark">Recent Queue Activity</h2>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none fw-semibold p-0"
            style={{ color: "var(--zg-primary)" }}
            onClick={() => onNavigateQueue?.()}
            data-testid="see-all-queue-link"
          >
            View full queue &rarr;
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <div className="text-center py-4 text-muted small" data-testid="staff-empty-recent-tickets">
            No recent ticket activity found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" data-testid="staff-recent-tickets-table">
              <thead className="table-light text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>
                <tr>
                  <th scope="col" className="ps-4">Ticket</th>
                  <th scope="col">Summary</th>
                  <th scope="col">Requester</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-center">Created</th>
                  <th scope="col" className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    data-testid={`staff-ticket-row-${ticket.id}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onViewTicket?.(ticket.id)}
                  >
                    <td className="ps-4 fw-bold text-nowrap" style={{ color: "var(--zg-primary)" }}>
                      {ticket.ticketNo}
                    </td>
                    <td>
                      <div className="fw-medium text-dark text-truncate" style={{ maxWidth: "260px" }}>
                        {ticket.summary}
                      </div>
                    </td>
                    <td className="text-nowrap small text-muted">
                      {ticket.requester?.fullName || "Requester"}
                    </td>
                    <td>
                      {renderStaffPriorityBadge(ticket.itPriority ?? ticket.requestedPriority)}
                    </td>
                    <td>
                      {renderStaffStatusBadge(ticket.status)}
                    </td>
                    <td className="text-center">
                      {renderCompactTicketDate(ticket.createdAt)}
                    </td>
                    <td className="text-end pe-4">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary px-2 py-1"
                        style={{ fontSize: "0.75rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTicket?.(ticket.id);
                        }}
                        data-testid={`view-staff-ticket-btn-${ticket.id}`}
                      >
                        Open &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
