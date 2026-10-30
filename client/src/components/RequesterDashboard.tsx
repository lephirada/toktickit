import React, { useState, useEffect, useCallback } from "react";
import { fetchTickets, TicketItem } from "../api.js";
import {
  TicketIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BoltIcon,
} from "./icons/index.js";
import { renderPriorityBadge, formatTicketDate } from "./MyTicketsDashboard.js";

export interface RequesterDashboardProps {
  onCreateTicket?: () => void;
  onViewMyTickets?: () => void;
  onViewTicket?: (ticketId: number) => void;
}

export function renderRequesterStatusBadge(status: string) {
  switch (status) {
    case "NEW":
      return <span className="badge zg-status-new zg-status-badge">NEW</span>;
    case "OPEN":
      return <span className="badge zg-status-open zg-status-badge">OPEN</span>;
    case "IN_PROGRESS":
      return <span className="badge zg-status-in-progress zg-status-badge">IN PROGRESS</span>;
    case "WAITING_FOR_REQUESTER":
      return <span className="badge zg-status-waiting zg-status-badge">WAITING FOR YOU</span>;
    case "RESOLVED":
      return <span className="badge zg-status-resolved zg-status-badge">RESOLVED</span>;
    case "CLOSED":
      return <span className="badge zg-status-closed zg-status-badge">CLOSED</span>;
    case "REOPENED":
      return <span className="badge zg-status-reopened zg-status-badge">REOPENED</span>;
    case "CANCELLED":
    case "REJECTED":
      return <span className="badge zg-status-cancelled zg-status-badge">{status}</span>;
    default:
      return <span className="badge bg-secondary zg-status-badge">{status}</span>;
  }
}

export default function RequesterDashboard({
  onCreateTicket,
  onViewMyTickets,
  onViewTicket,
}: RequesterDashboardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  const loadAllRequesterTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch first page
      const firstPage = await fetchTickets({
        page: 1,
        limit: 50,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      let all: TicketItem[] = [...firstPage.data];
      const totalPages = firstPage.pagination?.totalPages || 1;

      // 2. Multi-page assembling: If there are additional pages, fetch them all concurrently
      if (totalPages > 1) {
        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(
            fetchTickets({
              page: p,
              limit: 50,
              sortBy: "createdAt",
              sortOrder: "desc",
            })
          );
        }

        const remainingPages = await Promise.all(pagePromises);
        for (const res of remainingPages) {
          all = all.concat(res.data);
        }
      }

      // Sort assembled dataset chronologically descending to ensure recent tickets order
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(all);
    } catch (err: any) {
      // Atomic failure: On ANY page failure, do not compute partial totals
      setError(err?.message || "Failed to load dashboard tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllRequesterTickets();
  }, [loadAllRequesterTickets]);

  // Derived metrics with strict 7-day rolling window for recentlyResolved
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const totalOpen = tickets.filter(
    (t) => t.status === "NEW" || t.status === "OPEN"
  ).length;

  const waitingForRequester = tickets.filter(
    (t) => t.status === "WAITING_FOR_REQUESTER"
  ).length;

  const recentlyResolved = tickets.filter((t) => {
    if (t.status !== "RESOLVED") return false;
    const updatedTime = new Date(t.updatedAt).getTime();
    return !isNaN(updatedTime) && updatedTime >= sevenDaysAgo;
  }).length;

  const totalClosed = tickets.filter(
    (t) => t.status === "CLOSED"
  ).length;

  const recentTickets = tickets.slice(0, 5);

  // 1. Loading State
  if (loading) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center py-5"
        data-testid="dashboard-loading"
        style={{ minHeight: "360px" }}
      >
        <div
          className="spinner-border text-success mb-3"
          role="status"
          style={{ width: "3rem", height: "3rem" }}
        >
          <span className="visually-hidden">Loading your dashboard…</span>
        </div>
        <p className="text-muted fw-medium">Loading your ticket dashboard…</p>
      </div>
    );
  }

  // 2. Error State with Retry
  if (error) {
    return (
      <div className="py-4" data-testid="dashboard-error-container">
        <div
          className="alert alert-danger d-flex flex-column flex-sm-row align-items-sm-center justify-content-between p-3 rounded-3 shadow-sm border-danger"
          role="alert"
          data-testid="dashboard-error-alert"
        >
          <div className="d-flex align-items-center mb-2 mb-sm-0">
            <AlertTriangleIcon size={20} className="text-danger me-2 flex-shrink-0" />
            <span className="fw-medium">{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger px-3 py-1 fw-medium"
            onClick={loadAllRequesterTickets}
            data-testid="dashboard-error-retry"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0" data-testid="requester-dashboard-container">
      {/* Dashboard Top Header & Quick Actions */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1
            className="h3 fw-bold mb-1"
            style={{ color: "var(--zg-text-primary)", letterSpacing: "-0.02em" }}
            data-testid="requester-dashboard-title"
          >
            My Helpdesk Overview
          </h1>
          <p className="text-muted mb-0 small">
            Track your open service requests, pending actions, and recent resolutions.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 px-3 py-2 fw-medium shadow-sm"
            onClick={onViewMyTickets}
            data-testid="requester-dash-view-all-btn"
          >
            <TicketIcon size={16} />
            <span>View My Tickets</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1 px-3 py-2 fw-semibold shadow-sm"
            style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
            onClick={onCreateTicket}
            data-testid="requester-dash-create-btn"
          >
            <span>+ Create Ticket</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Zen Green Design Tokens) */}
      <div className="row g-3 mb-4" data-testid="requester-kpi-row">
        {/* Total Open */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3"
            style={{
              backgroundColor: "#EFF8FF",
              borderLeft: "4px solid #175CD3",
            }}
            data-testid="kpi-card-total-open"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#175CD3", letterSpacing: "0.05em" }}>
                Total Open
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#D1E9FF", color: "#175CD3" }}>
                <TicketIcon size={14} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#175CD3" }} data-testid="kpi-count-total-open">
              {totalOpen}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.78rem" }}>
              New &amp; acknowledged tickets
            </span>
          </div>
        </div>

        {/* Waiting for Requester */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3"
            style={{
              backgroundColor: "#FFFAEB",
              borderLeft: "4px solid #B54708",
            }}
            data-testid="kpi-card-waiting-requester"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#B54708", letterSpacing: "0.05em" }}>
                Action Needed
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#FEDF89", color: "#B54708" }}>
                <AlertTriangleIcon size={14} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#B54708" }} data-testid="kpi-count-waiting-requester">
              {waitingForRequester}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.78rem" }}>
              Waiting for your response
            </span>
          </div>
        </div>

        {/* Recently Resolved */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3"
            style={{
              backgroundColor: "var(--zg-pale)",
              borderLeft: "4px solid var(--zg-primary)",
            }}
            data-testid="kpi-card-recently-resolved"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "var(--zg-primary)", letterSpacing: "0.05em" }}>
                Recently Resolved
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#A6F4C5", color: "var(--zg-primary)" }}>
                <CheckCircleIcon size={14} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "var(--zg-primary)" }} data-testid="kpi-count-recently-resolved">
              {recentlyResolved}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.78rem" }}>
              Rolling 7-day window
            </span>
          </div>
        </div>

        {/* Total Closed */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="card border-0 shadow-sm h-100 p-3 rounded-3"
            style={{
              backgroundColor: "#F8F9FA",
              borderLeft: "4px solid #667085",
            }}
            data-testid="kpi-card-total-closed"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.72rem", color: "#475467", letterSpacing: "0.05em" }}>
                Total Closed
              </span>
              <span className="badge rounded-circle p-1" style={{ backgroundColor: "#EAECF0", color: "#475467" }}>
                <CheckCircleIcon size={14} />
              </span>
            </div>
            <div className="h2 fw-bold mb-1" style={{ color: "#344054" }} data-testid="kpi-count-total-closed">
              {totalClosed}
            </div>
            <span className="text-muted small" style={{ fontSize: "0.78rem" }}>
              Archived &amp; completed
            </span>
          </div>
        </div>
      </div>

      {/* Recent Tickets Section */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden" data-testid="requester-recent-tickets-card">
        <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <TicketIcon size={18} className="text-success" />
            <h2 className="h6 fw-bold mb-0 text-dark">Recent Service Requests</h2>
          </div>
          {tickets.length > 5 && (
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none fw-semibold p-0"
              style={{ color: "var(--zg-primary)" }}
              onClick={onViewMyTickets}
              data-testid="see-all-tickets-link"
            >
              See all ({tickets.length}) &rarr;
            </button>
          )}
        </div>

        {/* 3. Empty State */}
        {tickets.length === 0 ? (
          <div className="text-center py-5 px-3" data-testid="dashboard-empty-state">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: "54px", height: "54px", backgroundColor: "var(--zg-pale)" }}
            >
              <TicketIcon size={26} className="text-success" />
            </div>
            <h3 className="h6 fw-bold text-dark mb-1">No Tickets Found</h3>
            <p className="text-muted small mb-3" style={{ maxWidth: "340px", margin: "0 auto" }}>
              You haven&apos;t submitted any IT service requests yet. Create a ticket whenever you need assistance.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-success px-3 py-2 fw-semibold shadow-sm"
              style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
              onClick={onCreateTicket}
              data-testid="empty-create-ticket-btn"
            >
              + Create First Ticket
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" data-testid="recent-tickets-table">
              <thead className="table-light text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>
                <tr>
                  <th scope="col" className="ps-4">Ticket No</th>
                  <th scope="col">Summary</th>
                  <th scope="col">Category</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                  <th scope="col" className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((t) => (
                  <tr
                    key={t.id}
                    data-testid={`ticket-row-${t.id}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onViewTicket?.(t.id)}
                  >
                    <td className="ps-4 fw-bold text-nowrap" style={{ color: "var(--zg-primary)" }}>
                      {t.ticketNo}
                    </td>
                    <td>
                      <div className="fw-medium text-dark text-truncate" style={{ maxWidth: "280px" }}>
                        {t.summary}
                      </div>
                    </td>
                    <td className="text-nowrap small text-muted">
                      {t.category?.name || "General"}
                    </td>
                    <td>
                      {renderPriorityBadge(t.requestedPriority || t.priority)}
                    </td>
                    <td>
                      {renderRequesterStatusBadge(t.status)}
                    </td>
                    <td className="text-nowrap small text-muted">
                      {formatTicketDate(t.createdAt)}
                    </td>
                    <td className="text-end pe-4">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary px-2 py-1"
                        style={{ fontSize: "0.75rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTicket?.(t.id);
                        }}
                        data-testid={`view-ticket-btn-${t.id}`}
                        aria-label={`View ticket ${t.ticketNo}`}
                      >
                        View &rarr;
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
