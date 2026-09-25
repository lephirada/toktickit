import React, { useEffect, useState, useCallback } from "react";
import {
  AuthUser,
  StaffTicketDetailData,
  StaffUserItem,
  InternalNoteItem,
  fetchStaffTicketDetail,
  fetchStaffUsers,
  claimTicket,
  reassignTicket,
  updateTicketPriority,
  updateTicketStatus,
  fetchInternalNotes,
  postInternalNote,
  UpdateStatusPayload,
  TicketDetailAttachment,
} from "../api";
import { StatusTransitionModal, STATUS_LABELS } from "./StatusTransitionModal";
import { AttachmentRemovalModal } from "./AttachmentRemovalModal";
import {
  HomeIcon,
  PaperclipIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DownloadIcon,
} from "./icons/index.js";

// Custom SVG Icons matching TicketDetailScreen design
const DetailCalendarIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="8" cy="15" r="1" fill="currentColor" />
    <circle cx="12" cy="15" r="1" fill="currentColor" />
    <circle cx="16" cy="15" r="1" fill="currentColor" />
  </svg>
);

const DetailStatusIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <polyline points="7 12 10 12 11.5 9 13.5 15 15 12 17 12" />
  </svg>
);

const DetailPriorityIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 2c1 3.5 4 5 4 9a6 6 0 0 1-12 0c0-4 3.5-6.5 4.5-9 1 2 2 2.5 3.5 0z" />
    <path d="M12 18a2.5 2.5 0 0 0 2.5-2.5c0-1.5-1.5-2.5-2.5-3.5-.8 1-2.5 2-2.5 3.5A2.5 2.5 0 0 0 12 18z" />
  </svg>
);

const DetailCategoryIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const DetailSystemIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="2" y="3" width="20" height="6" rx="2" />
    <rect x="2" y="15" width="20" height="6" rx="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
    <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
    <path d="M12 9v6" />
  </svg>
);

const DetailRequesterIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
  </svg>
);

const DetailDepartmentIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
    <line x1="9" y1="7" x2="9.01" y2="7" strokeWidth="2.5" />
    <line x1="15" y1="7" x2="15.01" y2="7" strokeWidth="2.5" />
    <line x1="9" y1="12" x2="9.01" y2="12" strokeWidth="2.5" />
    <line x1="15" y1="12" x2="15.01" y2="12" strokeWidth="2.5" />
    <path d="M10 21v-4h4v4" />
  </svg>
);

const DetailHistoryIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

const DetailDocIcon = ({ size = 15, className = "", color = "currentColor" }: { size?: number; className?: string; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function renderDetailPriorityBadge(priority: string) {
  switch (priority) {
    case "P0_URGENT":
      return (
        <span
          className="badge zg-priority-p0 px-2 py-1 d-inline-flex align-items-center gap-1"
          data-testid="detail-priority-badge"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2L2 12l10 10 10-10L12 2z" />
          </svg>
          <span>P0 Urgent</span>
        </span>
      );
    case "P1_HIGH":
      return (
        <span
          className="badge zg-priority-p1 px-2 py-1 d-inline-flex align-items-center gap-1"
          data-testid="detail-priority-badge"
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
          className="badge zg-priority-p2 px-2 py-1 d-inline-flex align-items-center gap-1"
          data-testid="detail-priority-badge"
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
          className="badge zg-priority-p3 px-2 py-1 d-inline-flex align-items-center gap-1"
          data-testid="detail-priority-badge"
        >
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

export function renderDetailStatusBadge(status: string) {
  switch (status) {
    case "NEW":
      return <span className="badge zg-status-new px-2 py-1" data-testid="detail-status-badge">NEW</span>;
    case "OPEN":
      return <span className="badge zg-status-open px-2 py-1" data-testid="detail-status-badge">OPEN</span>;
    case "IN_PROGRESS":
      return <span className="badge zg-status-in-progress px-2 py-1" data-testid="detail-status-badge">IN PROGRESS</span>;
    case "WAITING_FOR_REQUESTER":
      return (
        <span
          className="badge px-2 py-1"
          style={{ backgroundColor: "var(--zg-status-waiting-bg)", color: "var(--zg-status-waiting-text)" }}
          data-testid="detail-status-badge"
        >
          WAITING FOR REQUESTER
        </span>
      );
    case "RESOLVED":
      return <span className="badge zg-status-resolved px-2 py-1" data-testid="detail-status-badge">RESOLVED</span>;
    case "CLOSED":
      return <span className="badge zg-status-closed px-2 py-1" data-testid="detail-status-badge">CLOSED</span>;
    case "REOPENED":
      return (
        <span
          className="badge px-2 py-1"
          style={{ backgroundColor: "var(--zg-status-reopened-bg)", color: "var(--zg-status-reopened-text)" }}
          data-testid="detail-status-badge"
        >
          REOPENED
        </span>
      );
    case "CANCELLED":
    case "REJECTED":
      return <span className="badge zg-status-rejected px-2 py-1" data-testid="detail-status-badge">CANCELLED</span>;
    default:
      return <span className="badge bg-secondary" data-testid="detail-status-badge">{status}</span>;
  }
}

interface StaffTicketDetailProps {
  ticketId: number;
  currentUser: AuthUser;
  onNavigateBack: () => void;
}

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({
  ticketId,
  currentUser,
  onNavigateBack,
}) => {
  const [ticket, setTicket] = useState<StaffTicketDetailData | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNoteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Tabs: "comments" | "notes" | "timeline"
  const [activeTab, setActiveTab] = useState<"comments" | "notes" | "timeline">("comments");

  // Inputs
  const [newComment, setNewComment] = useState<string>("");
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>("");
  const [isPostingNote, setIsPostingNote] = useState<boolean>(false);

  // Status Modal
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);

  // Selected Reassign Owner
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // IT Priority selection
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [isUpdatingPriority, setIsUpdatingPriority] = useState<boolean>(false);

  // Claiming
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // Attachment soft-removal modal state
  const [removalModalOpen, setRemovalModalOpen] = useState<boolean>(false);
  const [targetAttachment, setTargetAttachment] = useState<TicketDetailAttachment | null>(null);

  // Auto-dismiss alerts after 4.5s for success and 6s for errors
  useEffect(() => {
    if (!actionSuccess) return;
    const timer = setTimeout(() => {
      setActionSuccess(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [actionSuccess]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [error]);

  const loadData = useCallback(async (isInitial = false) => {
    if (!ticketId || ticketId <= 0) {
      setLoading(false);
      return;
    }
    try {
      if (isInitial) {
        setLoading(true);
      }
      setError(null);
      const [ticketRes, staffRes, notesRes] = await Promise.all([
        fetchStaffTicketDetail(ticketId),
        fetchStaffUsers(),
        fetchInternalNotes(ticketId),
      ]);
      setTicket(ticketRes.data);
      setStaffUsers(staffRes.data);
      setInternalNotes(notesRes.data);
      setSelectedPriority(ticketRes.data.itPriority || ticketRes.data.requestedPriority || "P2_MEDIUM");
      setSelectedOwnerId(ticketRes.data.ownerId ? String(ticketRes.data.ownerId) : "");
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load ticket details.");
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [ticketId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const isClosed = ticket?.status === "CLOSED";
  const isCancelled = ticket?.status === "CANCELLED";
  const isLocked = isClosed || isCancelled;

  const handleOpenRemovalModal = (att: any) => {
    if (isLocked) return;
    setTargetAttachment(att);
    setRemovalModalOpen(true);
  };

  const handleRemovalSuccess = (updatedAttachment: TicketDetailAttachment) => {
    setActionSuccess(`Attachment "${updatedAttachment.originalName}" was successfully removed.`);
    setTimeout(() => setActionSuccess(null), 5000);
    loadData();
  };

  // Claim action
  const handleClaim = async () => {
    if (!ticket) return;
    try {
      setIsClaiming(true);
      setError(null);
      await claimTicket(ticket.id);
      setActionSuccess("Ticket claimed successfully! Status transitioned to Open.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to claim ticket.");
    } finally {
      setIsClaiming(false);
    }
  };

  // Reassign action
  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !selectedOwnerId) return;
    try {
      setIsReassigning(true);
      setError(null);
      await reassignTicket(ticket.id, parseInt(selectedOwnerId, 10));
      setActionSuccess("Ticket owner reassigned successfully.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to reassign ticket.");
    } finally {
      setIsReassigning(false);
    }
  };

  // Priority change
  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket || isLocked) return;
    try {
      setIsUpdatingPriority(true);
      setError(null);
      setSelectedPriority(newPriority);
      await updateTicketPriority(ticket.id, newPriority);
      setActionSuccess(`IT Priority updated to ${newPriority}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update priority.");
      setSelectedPriority(ticket.itPriority || ticket.requestedPriority || "P2_MEDIUM");
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // Status transition
  const handleStatusSubmit = async (payload: UpdateStatusPayload) => {
    if (!ticket) return;
    await updateTicketStatus(ticket.id, payload);
    setActionSuccess(`Ticket status updated to ${STATUS_LABELS[payload.status] || payload.status}.`);
    await loadData();
  };

  // Public Comment Submit
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !newComment.trim()) return;
    try {
      setIsPostingComment(true);
      setError(null);
      await postPublicComment(ticket.id, newComment.trim());
      setNewComment("");
      setActionSuccess("Comment posted successfully.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to post comment.");
    } finally {
      setIsPostingComment(false);
    }
  };

  // Internal Note Submit
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !newNote.trim()) return;
    try {
      setIsPostingNote(true);
      setError(null);
      await postInternalNote(ticket.id, newNote.trim());
      setNewNote("");
      setActionSuccess("Internal note added successfully.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to post internal note.");
    } finally {
      setIsPostingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="py-5 text-center" data-testid="ticket-detail-loading">
        <div className="spinner-border text-success mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
        <p className="mt-3 text-muted fw-medium" style={{ fontSize: "1.05rem" }}>Loading staff ticket details...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="py-5 text-center" style={{ maxWidth: 800, margin: "0 auto" }}>
        <button
          type="button"
          onClick={onNavigateBack}
          className="btn btn-outline-secondary btn-sm fw-semibold mb-4 d-inline-flex align-items-center gap-1"
        >
          &larr; Back to Ticket Queue
        </button>
        <div
          role="alert"
          className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          />
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const publicComments = ticket.comments || [];
  const timeline = ticket.activityTimeline || [];
  const attachments = ticket.attachments || [];

  return (
    <div
      className="zg-ticket-detail-container pb-5"
      data-testid="staff-ticket-detail-screen"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="breadcrumb" className="mb-3 pt-2">
        <ol className="breadcrumb small mb-0 d-flex align-items-center gap-2">
          <li className="breadcrumb-item d-flex align-items-center">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none text-secondary d-inline-flex align-items-center gap-1 fw-medium"
              onClick={onNavigateBack}
              data-testid="breadcrumb-queue-link"
              style={{ fontSize: "0.85rem" }}
            >
              <HomeIcon size={14} color="currentColor" />
              <span>Ticket Queue</span>
            </button>
          </li>
          <li className="text-muted small" aria-hidden="true">/</li>
          <li
            className="breadcrumb-item active text-dark fw-bold"
            aria-current="page"
            style={{ fontSize: "0.85rem" }}
          >
            Ticket #{ticket.id}
          </li>
          <li className="text-muted small ms-auto" style={{ fontSize: "0.8rem" }}>
            Staff Console
          </li>
        </ol>
      </nav>

      {/* Dismissible Success Banner */}
      {actionSuccess && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between mb-4 shadow-sm rounded-3 p-3"
          role="alert"
          style={{ borderColor: "#A6F4C5", backgroundColor: "#ECFDF3" }}
        >
          <div className="d-flex align-items-center gap-2">
            <CheckCircleIcon size={18} color="var(--zg-primary, #006B3C)" />
            <span className="small fw-semibold text-success">{actionSuccess}</span>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss success notification"
            onClick={() => setActionSuccess(null)}
          />
        </div>
      )}

      {/* Dismissible Error Banner */}
      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between mb-4 shadow-sm rounded-3 p-3"
          role="alert"
          style={{ borderColor: "#FECDCA", backgroundColor: "#FEF3F2" }}
        >
          <div className="d-flex align-items-center gap-2">
            <AlertTriangleIcon size={18} color="var(--zg-error, #B42318)" />
            <span className="small fw-semibold text-danger">{error}</span>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss error"
            onClick={() => setError(null)}
          />
        </div>
      )}

      {/* Requester Confirmed Resolved Notice */}
      {ticket.resolutionIndicated && (
        <div
          className="alert alert-success d-flex align-items-center gap-2 p-3 mb-4 rounded-3 shadow-sm"
          style={{ borderColor: "#A6F4C5", backgroundColor: "#ECFDF3" }}
          data-testid="confirmed-resolved-notice"
        >
          <CheckCircleIcon size={18} className="text-success flex-shrink-0" />
          <span className="small fw-semibold text-success">
            Requester Confirmed Resolved &bull; The requester has indicated that this issue appears to be resolved.
          </span>
        </div>
      )}

      {/* Top Action / Header Bar */}
      <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 mb-4">
        {/* Left: Back button */}
        <div className="d-flex align-items-center justify-content-start gap-2 flex-grow-1" style={{ flex: "1 1 0" }}>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2 rounded-2 bg-white shadow-sm"
            onClick={onNavigateBack}
            data-testid="back-to-queue-btn"
          >
            &larr; Back to Ticket Queue
          </button>
        </div>

        {/* Center: Title + Ticket No Badge (Placed Underneath and Centered) */}
        <div className="d-flex flex-column align-items-center text-center px-2">
          <h1 className="h3 fw-bold text-dark mb-1" style={{ letterSpacing: "-0.01em" }}>
            Ticket Details
          </h1>
          <div>
            <span
              className="badge px-3 py-1 rounded-pill font-monospace"
              style={{
                backgroundColor: "var(--zg-pale, #E8F5E9)",
                color: "var(--zg-primary, #006B3C)",
                border: "1px solid #A6F4C5",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
              data-testid="ticket-number"
            >
              <span>#</span><span>{ticket.ticketNo}</span>
            </span>
          </div>
        </div>

        {/* Right: Created Date & Primary Action */}
        <div className="d-flex align-items-center justify-content-md-end justify-content-start gap-2 flex-wrap flex-grow-1" style={{ flex: "1 1 0" }}>
          <div
            className="card border shadow-sm px-3 py-2 rounded-3 bg-white"
            style={{ borderColor: "#EAECF0", minWidth: 160 }}
          >
            <div className="text-muted small fw-medium mb-1" style={{ fontSize: "0.72rem" }}>
              Created Date
            </div>
            <div className="d-flex align-items-center gap-1 text-dark fw-semibold small" style={{ fontSize: "0.82rem" }}>
              <DetailCalendarIcon size={14} className="text-muted flex-shrink-0" />
              <span>{formatDateTime(ticket.createdAt)}</span>
            </div>
          </div>

          <button
            type="button"
            data-testid="open-status-modal-button"
            disabled={isCancelled}
            onClick={() => setShowStatusModal(true)}
            className="btn btn-success fw-semibold px-3 py-2 shadow-sm rounded-2"
            style={{
              backgroundColor: isCancelled ? "#98A2B3" : "var(--zg-primary, #006B3C)",
              borderColor: isCancelled ? "#98A2B3" : "var(--zg-primary, #006B3C)",
              fontSize: "0.9rem",
            }}
          >
            Update Status
          </button>
        </div>
      </div>

      {/* Metadata Cards Grid */}
      <div className="row g-3 mb-4">
        {/* 1. Status Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailStatusIcon size={15} className="text-muted flex-shrink-0" />
              <span>Status</span>
            </div>
            <div>{renderDetailStatusBadge(ticket.status)}</div>
          </div>
        </div>

        {/* 2. Priority Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailPriorityIcon size={15} className="text-muted flex-shrink-0" />
              <span>Priority</span>
            </div>
            <div>{renderDetailPriorityBadge(ticket.requestedPriority || ticket.priority)}</div>
          </div>
        </div>

        {/* 3. Category Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailCategoryIcon size={15} className="text-muted flex-shrink-0" />
              <span>Category</span>
            </div>
            <div className="fw-bold text-dark" style={{ fontSize: "0.95rem" }}>
              {ticket.category ? ticket.category.name : "General"}
            </div>
          </div>
        </div>

        {/* 4. Related System Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailSystemIcon size={15} className="text-muted flex-shrink-0" />
              <span>Related System</span>
            </div>
            <div className="fw-bold text-dark text-truncate" style={{ fontSize: "0.95rem" }} title={ticket.relatedSystem?.name}>
              {ticket.relatedSystem ? ticket.relatedSystem.name : "None specified"}
            </div>
          </div>
        </div>

        {/* 5. Requester Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailRequesterIcon size={15} className="text-muted flex-shrink-0" />
              <span>Requester</span>
            </div>
            <div className="fw-bold text-dark text-truncate" style={{ fontSize: "0.95rem" }}>
              {ticket.requester ? ticket.requester.fullName : "—"}
            </div>
          </div>
        </div>

        {/* 6. Department Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailDepartmentIcon size={15} className="text-muted flex-shrink-0" />
              <span>Department</span>
            </div>
            <div className="fw-bold text-dark text-truncate" style={{ fontSize: "0.95rem" }}>
              {ticket.requester?.department || "—"}
            </div>
          </div>
        </div>


        {/* 7. IT Priority Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailPriorityIcon size={15} className="text-muted flex-shrink-0" />
              <label htmlFor="it-priority-select" className="mb-0 cursor-pointer" style={{ cursor: "pointer" }}>
                IT Priority
              </label>
            </div>
            <div>
              <select
                id="it-priority-select"
                aria-label="IT PRIORITY"
                value={selectedPriority}
                disabled={isLocked || isUpdatingPriority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="form-select form-select-sm rounded-2 fw-semibold"
                style={{
                  fontSize: "0.85rem",
                  borderColor: "#D0D5DD",
                  backgroundColor: isLocked ? "#F2F4F7" : "#FFFFFF",
                }}
              >
                <option value="P0_URGENT">P0_URGENT</option>
                <option value="P1_HIGH">P1_HIGH</option>
                <option value="P2_MEDIUM">P2_MEDIUM</option>
                <option value="P3_LOW">P3_LOW</option>
              </select>
            </div>
          </div>
        </div>


        {/* 8. Last Updated Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailHistoryIcon size={15} className="text-muted flex-shrink-0" />
              <span>Last Updated</span>
            </div>
            <div className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
              {ticket.updatedAt ? formatDateTime(ticket.updatedAt) : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Ticket Overview Card: Summary & Description (Directly beneath Metadata) */}
      <div
        className="card border shadow-sm rounded-4 mb-4 bg-white"
        style={{
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
        data-testid="ticket-overview-card"
      >
        <div className="card-body px-3 pt-3 pb-3 p-md-4">
          {/* Summary Section */}
          <div className="mb-4 pb-3 border-bottom" style={{ borderColor: "#F2F4F7" }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <DetailDocIcon size={18} color="var(--zg-primary, #006B3C)" className="flex-shrink-0" />
              <h2 className="h5 fw-bold mb-0 text-dark" style={{ fontSize: "1.05rem" }}>
                Summary
              </h2>
            </div>
            <div
              className="ms-4 ps-2 fw-semibold text-dark"
              style={{ fontSize: "0.98rem", lineHeight: 1.5 }}
            >
              {ticket.summary}
            </div>
          </div>

          {/* Description Section */}
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <DetailDocIcon size={18} color="var(--zg-primary, #006B3C)" className="flex-shrink-0" />
              <h3 className="h5 fw-bold mb-0 text-dark" style={{ fontSize: "1.05rem" }}>
                Description
              </h3>
            </div>
            <div
              className="rounded-3 p-3 p-md-4 mt-2"
              style={{
                backgroundColor: "#FAFCFB",
                border: "1px solid #EAECF0",
                whiteSpace: "pre-wrap",
                lineHeight: 1.65,
                fontSize: "0.92rem",
                color: "#344054",
              }}
            >
              {ticket.description}
            </div>
          </div>

          {/* Special Reason Banners */}
          {ticket.resolutionSummary && (
            <div
              className="mt-4 p-3 rounded-3"
              style={{
                backgroundColor: "#ECFDF3",
                border: "1px solid #A6F4C5",
              }}
            >
              <div className="small fw-bold text-success text-uppercase mb-1" style={{ letterSpacing: "0.04em", fontSize: "0.75rem" }}>
                Resolution Summary
              </div>
              <div className="text-dark small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {ticket.resolutionSummary}
              </div>
            </div>
          )}

          {ticket.cancellationReason && (
            <div
              className="mt-4 p-3 rounded-3"
              style={{
                backgroundColor: "#FEF3F2",
                border: "1px solid #FECDCA",
              }}
            >
              <div className="small fw-bold text-danger text-uppercase mb-1" style={{ letterSpacing: "0.04em", fontSize: "0.75rem" }}>
                Cancellation Reason
              </div>
              <div className="text-dark small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {ticket.cancellationReason}
              </div>
            </div>
          )}

          {ticket.reopenReason && (
            <div
              className="mt-4 p-3 rounded-3"
              style={{
                backgroundColor: "#FFFAEB",
                border: "1px solid #FEDF89",
              }}
            >
              <div className="small fw-bold text-warning text-uppercase mb-1" style={{ letterSpacing: "0.04em", fontSize: "0.75rem", color: "#B54708" }}>
                Reopen Reason
              </div>
              <div className="text-dark small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {ticket.reopenReason}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Attachments Section (Full Width) */}
      <div
        className="card border shadow-sm rounded-4 mb-4 bg-white"
        style={{
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
        data-testid="staff-attachments-card"
      >
        <div className="card-body px-3 pt-3 pb-3 p-md-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-2">
              <PaperclipIcon size={18} color="var(--zg-primary, #006B3C)" className="flex-shrink-0" />
              <h3 className="h5 fw-bold mb-0 text-dark" style={{ fontSize: "1.05rem" }}>
                Attachments ({attachments.length})
              </h3>
            </div>
          </div>

          {attachments.length === 0 ? (
            <div className="text-muted small fst-italic py-2">
              No attachments uploaded for this ticket.
            </div>
          ) : (
            <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
              {attachments.map((att: any) => (
                <li
                  key={att.id}
                  className="d-flex justify-content-between align-items-center p-2 px-3 rounded-3 border"
                  style={{
                    backgroundColor: att.isSoftDeleted ? "#F9FAFB" : "#FFFFFF",
                    borderColor: "#EAECF0",
                  }}
                >
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <PaperclipIcon size={15} className="text-muted flex-shrink-0" />
                    <span
                      className={`fw-semibold text-truncate small ${att.isSoftDeleted ? "text-muted text-decoration-line-through" : "text-dark"}`}
                    >
                      {att.originalName}
                    </span>
                    <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                      ({(att.sizeBytes / 1024).toFixed(1)} KB)
                    </span>
                    {att.isSoftDeleted && (
                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: "0.7rem" }}>
                        REMOVED
                      </span>
                    )}
                  </div>

                  {!att.isSoftDeleted && (
                    <div className="d-flex align-items-center gap-2">
                      <a
                        href={`/api/attachments/${att.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 py-1 px-2 fw-semibold rounded-2"
                        style={{ fontSize: "0.8rem" }}
                      >
                        <DownloadIcon size={13} />
                        <span>Download &darr;</span>
                      </a>
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleOpenRemovalModal(att)}
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 py-1 px-2 fw-semibold rounded-2"
                          style={{ fontSize: "0.8rem" }}
                          data-testid={`remove-attachment-btn-${att.id}`}
                        >
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 3. Operational Controls Card (Assigned Owner & Reassignment) */}
      <div
        className="card border shadow-sm rounded-4 mb-4 bg-white"
        style={{
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
      >
        <div className="card-body p-3 p-md-4">
          <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom" style={{ borderColor: "#F2F4F7" }}>
            <h2 className="h6 fw-bold mb-0 text-muted text-uppercase" style={{ letterSpacing: "0.04em", fontSize: "0.8rem" }}>
              Operational Controls
            </h2>
            {isLocked && (
              <span className="badge bg-secondary-subtle text-secondary small">
                Locked ({ticket.status})
              </span>
            )}
          </div>

          <div className="row g-3 align-items-start">
            {/* Assigned Owner & Claim */}
            <div className="col-12 col-md-6">
              <label className="d-block text-muted small fw-bold text-uppercase mb-2" style={{ letterSpacing: "0.04em", fontSize: "0.75rem" }}>
                ASSIGNED OWNER
              </label>
              <div
                className="d-flex align-items-center justify-content-between gap-2 p-2 px-3 rounded-3 border"
                style={{ backgroundColor: "#F9FAFB", borderColor: "#EAECF0", minHeight: 40 }}
              >
                <span
                  data-testid="assigned-owner-display"
                  className="fw-semibold small"
                  style={{ color: ticket.owner ? "#101828" : "#98A2B3" }}
                >
                  {ticket.owner ? `${ticket.owner.fullName} (${ticket.owner.role})` : "(Unassigned)"}
                </span>

                {!ticket.ownerId && !isLocked && (
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="btn btn-success btn-sm fw-semibold px-3 py-1 rounded-2 shadow-sm"
                    style={{
                      backgroundColor: "var(--zg-primary, #006B3C)",
                      borderColor: "var(--zg-primary, #006B3C)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {isClaiming ? "Claiming..." : "Claim Ticket"}
                  </button>
                )}
              </div>
            </div>

            {/* Reassign Owner Form */}
            <div className="col-12 col-md-6">
              <label className="d-block text-muted small fw-bold text-uppercase mb-2" style={{ letterSpacing: "0.04em", fontSize: "0.75rem" }}>
                REASSIGN OWNER
              </label>
              {!isLocked ? (
                <form onSubmit={handleReassign} className="d-flex gap-2">
                  <select
                    value={selectedOwnerId}
                    onChange={(e) => setSelectedOwnerId(e.target.value)}
                    className="form-select form-select-sm rounded-2"
                    style={{ fontSize: "0.85rem", borderColor: "#D0D5DD", height: 40 }}
                    aria-label="Select new owner"
                  >
                    <option value="">Select staff to reassign...</option>
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isReassigning || !selectedOwnerId || selectedOwnerId === String(ticket.ownerId)}
                    className="btn btn-outline-secondary btn-sm fw-semibold rounded-2 px-3 flex-shrink-0"
                    style={{ fontSize: "0.85rem", height: 40 }}
                  >
                    {isReassigning ? "Saving..." : "Reassign"}
                  </button>
                </form>
              ) : (
                <div className="form-control form-control-sm text-muted bg-light d-flex align-items-center" style={{ height: 40, fontSize: "0.85rem" }}>
                  Locked for closed/cancelled tickets
                </div>
              )}
            </div>
          </div>

          {isLocked && (
            <div
              className="small text-muted fst-italic pt-3 border-top mt-3"
              style={{ borderColor: "#EAECF0" }}
            >
              Ticket is {ticket.status.toLowerCase()}. Operational updates are locked unless reopened.
            </div>
          )}
        </div>
      </div>
      {/* 4. Discussion & Notes Tabs Card (Full Width) */}
      <div
        className="card border shadow-sm rounded-4 mb-4 bg-white overflow-hidden"
        style={{
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
      >
        {/* Segmented Tab Headers */}
        <div
          className="d-flex border-bottom"
          style={{ backgroundColor: "#F9FAFB", borderColor: "#EAECF0" }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className="btn text-center py-3 px-3 fw-semibold border-0 rounded-0 flex-grow-1"
            style={{
              fontSize: "0.875rem",
              color: activeTab === "comments" ? "var(--zg-primary, #006B3C)" : "#667085",
              borderBottom: activeTab === "comments" ? "2px solid var(--zg-primary, #006B3C)" : "2px solid transparent",
              backgroundColor: activeTab === "comments" ? "#FFFFFF" : "transparent",
              transition: "all 0.15s ease",
            }}
          >
            Public Comments ({publicComments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className="btn text-center py-3 px-3 fw-semibold border-0 rounded-0 flex-grow-1"
            style={{
              fontSize: "0.875rem",
              color: activeTab === "notes" ? "#B54708" : "#667085",
              borderBottom: activeTab === "notes" ? "2px solid #B54708" : "2px solid transparent",
              backgroundColor: activeTab === "notes" ? "#FFFFFF" : "transparent",
              transition: "all 0.15s ease",
            }}
          >
            <span className="me-1">🔒</span>
            Internal Notes ({internalNotes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className="btn text-center py-3 px-3 fw-semibold border-0 rounded-0 flex-grow-1"
            style={{
              fontSize: "0.875rem",
              color: activeTab === "timeline" ? "var(--zg-primary, #006B3C)" : "#667085",
              borderBottom: activeTab === "timeline" ? "2px solid var(--zg-primary, #006B3C)" : "2px solid transparent",
              backgroundColor: activeTab === "timeline" ? "#FFFFFF" : "transparent",
              transition: "all 0.15s ease",
            }}
          >
            Activity ({timeline.length})
          </button>
        </div>

        {/* Tab 1: Public Comments */}
        {activeTab === "comments" && (
          <div className="p-3 p-md-4">
            <div className="small text-muted mb-3">
              Public comments are visible to the requester.
            </div>

            {publicComments.length === 0 ? (
              <div className="text-muted small fst-italic mb-4">
                No public comments yet.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 mb-4">
                {publicComments.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-3 border"
                    style={{ backgroundColor: "#F9FAFB", borderColor: "#EAECF0" }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold small text-dark">
                        {c.authorName || c.author?.fullName || "User"} ({c.authorRole || c.author?.role || "REQUESTER"})
                      </span>
                      <span className="text-muted small" style={{ fontSize: "0.78rem" }}>
                        {formatDateTime(c.createdAt)}
                      </span>
                    </div>
                    <div className="text-dark small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {c.content || c.body}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Public Comment Form */}
            <form onSubmit={handlePostComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type a public message for the requester..."
                rows={3}
                maxLength={2000}
                className="form-control rounded-3 mb-2"
                style={{ fontSize: "0.875rem", borderColor: "#D0D5DD" }}
              />
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted" style={{ fontSize: "0.75rem" }}>
                  {newComment.trim().length} / 2,000
                </span>
                <button
                  type="submit"
                  disabled={isPostingComment || !newComment.trim()}
                  className="btn btn-success btn-sm fw-semibold px-3 py-2 rounded-2 shadow-sm"
                  style={{ backgroundColor: "var(--zg-primary, #006B3C)", borderColor: "var(--zg-primary, #006B3C)" }}
                >
                  {isPostingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Internal Notes (Amber Privacy Theme) */}
        {activeTab === "notes" && (
          <div className="p-3 p-md-4">
            {/* Amber Privacy Banner */}
            <div
              className="d-flex align-items-center gap-2 p-3 rounded-3 mb-4"
              style={{
                backgroundColor: "#FEF0C7",
                border: "1px solid #F79009",
                color: "#7A2E0E",
              }}
            >
              <span role="img" aria-label="lock">🔒</span>
              <span className="small fw-semibold">
                Private Note. Visible only to IT Staff and Administrators.
              </span>
            </div>

            {internalNotes.length === 0 ? (
              <div className="text-muted small fst-italic mb-4">
                No internal notes recorded yet.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 mb-4">
                {internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-3 border"
                    style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold small" style={{ color: "#92400E" }}>
                        {note.authorName} ({note.authorRole})
                      </span>
                      <span className="small" style={{ fontSize: "0.78rem", color: "#B45309" }}>
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                    <div className="small" style={{ color: "#78350F", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {note.content || note.body}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Internal Note Form */}
            <form onSubmit={handlePostNote}>
              <textarea
                value={newNote}
                disabled={isLocked}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={
                  isLocked
                    ? "Cannot add notes to closed or cancelled tickets."
                    : "Type a confidential note for IT staff..."
                }
                rows={3}
                maxLength={2000}
                className="form-control rounded-3 mb-2"
                style={{
                  fontSize: "0.875rem",
                  borderColor: "#FDE68A",
                  backgroundColor: isLocked ? "#F2F4F7" : "#FFFCF5",
                }}
              />
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted" style={{ fontSize: "0.75rem" }}>
                  {newNote.trim().length} / 2,000
                </span>
                <button
                  type="submit"
                  disabled={isPostingNote || isLocked || !newNote.trim()}
                  className="btn btn-warning btn-sm fw-semibold px-3 py-2 rounded-2 text-white shadow-sm"
                  style={{ backgroundColor: "#D97706", borderColor: "#D97706" }}
                >
                  {isPostingNote ? "Saving..." : "Add Internal Note"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Activity Timeline */}
        {activeTab === "timeline" && (
          <div className="p-3 p-md-4">
            {timeline.length === 0 ? (
              <div className="text-muted small fst-italic">No activity recorded yet.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {timeline.map((act, idx) => (
                  <div
                    key={act.id || idx}
                    className="d-flex gap-3 small pb-3 border-bottom"
                    style={{ borderColor: idx === timeline.length - 1 ? "transparent" : "#F2F4F7" }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--zg-primary, #006B3C)",
                        marginTop: "5px",
                        flexShrink: 0,
                      }}
                    />
                    <div className="flex-grow-1">
                      <div className="fw-semibold text-dark">{act.action || act.type}</div>
                      <div className="text-muted mt-1">{act.message}</div>
                      <div className="text-muted mt-1" style={{ fontSize: "0.78rem" }}>
                        {act.actor} &bull; {formatDateTime(act.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Transition Modal */}
      {showStatusModal && (
        <StatusTransitionModal
          currentStatus={ticket.status}
          hasOwner={Boolean(ticket.ownerId)}
          onClose={() => setShowStatusModal(false)}
          onSubmit={handleStatusSubmit}
        />
      )}

      {/* Attachment Soft-Removal Modal */}
      <AttachmentRemovalModal
        isOpen={removalModalOpen}
        attachment={targetAttachment}
        onClose={() => {
          setRemovalModalOpen(false);
          setTargetAttachment(null);
        }}
        onSuccess={handleRemovalSuccess}
      />
    </div>
  );
};
