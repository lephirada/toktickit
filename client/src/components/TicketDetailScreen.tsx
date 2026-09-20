import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  TicketDetailItem,
  TicketDetailAttachment,
  PublicCommentItem,
  fetchTicketDetail,
  fetchPublicComments,
  downloadAttachment,
  addAttachmentToTicket,
  postPublicComment,
  confirmProblemResolved,
  ApiError,
} from "../api.js";
import {
  HomeIcon,
  DownloadIcon,
  TrashIcon,
  PaperclipIcon,
  TicketIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
} from "./icons/index.js";
import AttachmentRemovalModal from "./AttachmentRemovalModal.js";

// Custom SVG Icons designed specifically for Ticket Detail view
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

const DetailDocIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export interface TicketDetailScreenProps {
  ticketId: number;
  onNavigate: (view: string) => void;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

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

export const TicketDetailScreen: React.FC<TicketDetailScreenProps> = ({
  ticketId,
  onNavigate,
}) => {
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetailItem | null>(null);
  const [comments, setComments] = useState<PublicCommentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Soft-removal modal state
  const [removalModalOpen, setRemovalModalOpen] = useState<boolean>(false);
  const [targetAttachment, setTargetAttachment] = useState<TicketDetailAttachment | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Confirm Resolved modal state
  const [confirmResolvedModalOpen, setConfirmResolvedModalOpen] = useState<boolean>(false);
  const [confirmFeedback, setConfirmFeedback] = useState<string>("");
  const [confirmResolvedError, setConfirmResolvedError] = useState<string | null>(null);
  const [isSubmittingConfirmResolved, setIsSubmittingConfirmResolved] = useState<boolean>(false);

  // Public Comments state
  const [newComment, setNewComment] = useState<string>("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // Add attachment state
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTicket = useCallback(async (silent = false) => {
    if (!user) return;

    if (!silent) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await fetchTicketDetail(ticketId);
      setTicket(data);
      if (data.comments) {
        setComments(data.comments);
      } else {
        // Fallback fetch comments
        try {
          const commentsRes = await fetchPublicComments(ticketId);
          setComments(commentsRes.data || []);
        } catch {
          setComments([]);
        }
      }
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Ticket with the specified ID does not exist or you are not authorized to view it."
        );
      }
    }
  }, [ticketId, user]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleDownload = async (attachment: TicketDetailAttachment) => {
    setDownloadError(null);

    try {
      await downloadAttachment(attachment.id, attachment.originalName);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 410) {
        setDownloadError("This attachment has been removed and can no longer be downloaded.");
        loadTicket(true);
      } else {
        setDownloadError(err instanceof Error ? err.message : "Failed to download attachment.");
      }
    }
  };

  const handleOpenRemovalModal = (attachment: TicketDetailAttachment) => {
    const isOwner = user?.id === ticket?.requesterId;
    const isStaff = user?.role === "IT_STAFF";
    const isAdmin = user?.role === "ADMINISTRATOR";
    if (!isOwner && !isStaff && !isAdmin) return;

    setTargetAttachment(attachment);
    setRemovalModalOpen(true);
  };

  const handleRemovalSuccess = (updatedAttachment: TicketDetailAttachment) => {
    setSuccessNotice(`Attachment "${updatedAttachment.originalName}" was successfully removed.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadTicket(true);
  };

  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isOwner = user?.id === ticket?.requesterId;
    const isStaff = user?.role === "IT_STAFF";
    const isAdmin = user?.role === "ADMINISTRATOR";
    if (!isOwner && !isStaff && !isAdmin) {
      setUploadError("You are not authorized to upload attachments to this ticket.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "image/jpg",
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid file type. Allowed types: JPG/JPEG, PNG, WEBP, PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit.");
      return;
    }

    try {
      setIsUploadingAttachment(true);
      setUploadError(null);
      setUploadSuccess(null);
      await addAttachmentToTicket(ticketId, file);
      setUploadSuccess(`Attachment "${file.name}" added successfully.`);
      setTimeout(() => setUploadSuccess(null), 4000);
      await loadTicket(true);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to upload attachment.";
      setUploadError(msg);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleConfirmResolvedSubmit = async () => {
    setIsSubmittingConfirmResolved(true);
    setConfirmResolvedError(null);

    try {
      await confirmProblemResolved(ticketId, confirmFeedback.trim() || undefined);
      setConfirmResolvedModalOpen(false);
      setSuccessNotice("You confirmed this ticket appears resolved.");
      setTimeout(() => setSuccessNotice(null), 5000);
      await loadTicket(true);
    } catch (err: unknown) {
      setConfirmResolvedError(
        err instanceof ApiError ? err.message : "Failed to confirm resolution."
      );
    } finally {
      setIsSubmittingConfirmResolved(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();

    if (!trimmed) {
      setCommentError("Comment content cannot be empty.");
      return;
    }

    if (trimmed.length > 2000) {
      setCommentError("Comment cannot exceed 2,000 characters.");
      return;
    }

    const isOwner = user?.id === ticket?.requesterId;
    const canComment = isOwner || user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";
    if (!canComment) {
      setCommentError("You are not authorized to post comments to this ticket.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      await postPublicComment(ticketId, trimmed);
      setNewComment("");
      await loadTicket(true);
    } catch (err: unknown) {
      setCommentError(err instanceof ApiError ? err.message : "Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="py-5 text-center" data-testid="ticket-detail-loading">
        <span data-testid="ticket-detail-id" className="visually-hidden">
          Ticket ID: {ticketId}
        </span>
        <div className="spinner-border text-success" role="status" style={{ width: "3rem", height: "3rem" }}>
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="mt-3 text-muted fw-medium">Loading ticket details...</p>
      </div>
    );
  }

  // 2. Error State
  if (errorMessage || !ticket) {
    return (
      <div className="py-5 text-center" data-testid="ticket-detail-error">
        <span data-testid="ticket-detail-id" className="visually-hidden">
          Ticket ID: {ticketId}
        </span>
        <div className="d-inline-flex p-3 rounded-circle bg-danger-subtle text-danger mb-3">
          <AlertTriangleIcon size={36} color="var(--zg-error, #B42318)" />
        </div>
        <h2 className="h4 fw-bold text-dark mb-2" data-testid="error-heading">
          Ticket Not Found or Access Denied
        </h2>
        <p className="text-muted mb-4" style={{ maxWidth: 480, margin: "0 auto" }}>
          {errorMessage || "Ticket with the specified ID does not exist or you are not authorized to view it."}
        </p>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm fw-semibold"
          onClick={() => onNavigate("my-tickets")}
          data-testid="error-back-btn"
        >
          Back to My Tickets
        </button>
      </div>
    );
  }

  const activeAttachments = ticket.attachments || [];
  const timeline = ticket.activityTimeline || ticket.timeline || ticket.activityHistory || [];

  const isOwner = user?.id === ticket.requesterId;
  const isStaff = user?.role === "IT_STAFF";
  const isAdmin = user?.role === "ADMINISTRATOR";
  const isEligibleStatus = ticket.status === "IN_PROGRESS" || ticket.status === "WAITING_FOR_REQUESTER";
  const canConfirmResolved = isOwner && isEligibleStatus && !ticket.resolutionIndicated;
  const canComment = isOwner || isStaff || isAdmin;
  const canManageAttachments = isOwner || isStaff || isAdmin;

  return (
    <div
      className="zg-ticket-detail-container pb-5"
      data-testid="ticket-detail-screen"
      style={{ maxWidth: 1200, margin: "0 auto" }}
    >
      <span data-testid="ticket-detail-id" className="visually-hidden">
        Ticket ID: {ticket.id}
      </span>

      {/* Top Breadcrumb Navigation */}
      <nav aria-label="breadcrumb" className="mb-3 pt-2">
        <ol className="breadcrumb small mb-0 d-flex align-items-center gap-2">
          <li className="breadcrumb-item d-flex align-items-center">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none text-secondary d-inline-flex align-items-center gap-1 fw-medium hover-text-primary"
              onClick={() => onNavigate("my-tickets")}
              data-testid="breadcrumb-tickets-link"
              style={{ fontSize: "0.85rem" }}
            >
              <HomeIcon size={14} color="currentColor" />
              <span>My Tickets</span>
            </button>
          </li>
          <li className="text-muted small" aria-hidden="true">/</li>
          <li
            className="breadcrumb-item active text-dark fw-bold"
            aria-current="page"
            data-testid="breadcrumb-current-ticket"
            style={{ fontSize: "0.85rem" }}
          >
            {ticket.ticketNo}
          </li>
        </ol>
      </nav>

      {/* Global Success / Alert Banner */}
      {successNotice && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between mb-4 shadow-sm rounded-3 p-3"
          role="alert"
          data-testid="detail-success-banner"
          style={{ borderColor: "#A6F4C5", backgroundColor: "#ECFDF3" }}
        >
          <div className="d-flex align-items-center gap-2">
            <CheckCircleIcon size={18} color="var(--zg-primary, #006B3C)" />
            <span className="small fw-semibold text-success">{successNotice}</span>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setSuccessNotice(null)}
          />
        </div>
      )}

      {/* Confirmed Resolved Notice */}
      {ticket.resolutionIndicated && (
        <div
          className="alert alert-success d-flex align-items-center gap-2 p-3 mb-4 rounded-3 shadow-sm"
          style={{ borderColor: "#A6F4C5", backgroundColor: "#ECFDF3" }}
          data-testid="confirmed-resolved-notice"
        >
          <CheckCircleIcon size={18} className="text-success flex-shrink-0" />
          <span className="small fw-semibold text-success">You confirmed this ticket appears resolved.</span>
        </div>
      )}

      {/* Top Action / Header Bar */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
        {/* Left: Back button & Confirm Resolved if eligible */}
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2 rounded-2 bg-white shadow-sm"
            onClick={() => onNavigate("my-tickets")}
            data-testid="back-to-tickets-btn"
          >
            ← Back to Tickets
          </button>

          {canConfirmResolved && (
            <button
              type="button"
              className="btn btn-outline-success btn-sm fw-semibold d-inline-flex align-items-center gap-1 px-3 py-2 rounded-2 shadow-sm bg-white"
              style={{ borderColor: "var(--zg-primary)", color: "var(--zg-primary)" }}
              onClick={() => {
                setConfirmFeedback("");
                setConfirmResolvedError(null);
                setConfirmResolvedModalOpen(true);
              }}
              data-testid="confirm-resolved-btn"
            >
              <CheckCircleIcon size={16} />
              <span>Problem Appears Resolved</span>
            </button>
          )}
        </div>

        {/* Center: Title + Ticket No Badge */}
        <div className="d-flex align-items-center gap-2">
          <h1 className="h3 fw-bold text-dark mb-0" style={{ letterSpacing: "-0.01em" }}>
            Ticket Details
          </h1>
          <span
            className="badge px-2 py-1 rounded-pill font-monospace"
            style={{
              backgroundColor: "var(--zg-pale)",
              color: "var(--zg-primary)",
              border: "1px solid #A6F4C5",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
            data-testid="ticket-number"
          >
            #{ticket.ticketNo}
          </span>
        </div>

        {/* Right: Created Date Card */}
        <div
          className="card border shadow-sm px-3 py-2 rounded-3 bg-white"
          style={{
            borderColor: "#EAECF0",
            minWidth: 180,
          }}
        >
          <div className="text-muted small fw-medium mb-1" style={{ fontSize: "0.75rem" }}>
            Created Date
          </div>
          <div className="d-flex align-items-center gap-1 text-dark fw-semibold small" style={{ fontSize: "0.82rem" }}>
            <DetailCalendarIcon size={14} className="text-muted flex-shrink-0" />
            <span>{formatDateTime(ticket.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Metadata Cards Grid */}
      <div className="row g-3 mb-4">
        {/* Status Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailStatusIcon size={15} className="text-muted flex-shrink-0" />
              <span>Status</span>
            </div>
            <div>{renderDetailStatusBadge(ticket.status)}</div>
          </div>
        </div>

        {/* Priority Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailPriorityIcon size={15} className="text-muted flex-shrink-0" />
              <span>{ticket.itPriority ? "Requested Priority" : "Priority"}</span>
            </div>
            <div>{renderDetailPriorityBadge(ticket.requestedPriority || ticket.priority)}</div>
          </div>
        </div>

        {/* Category Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailCategoryIcon size={15} className="text-muted flex-shrink-0" />
              <span>Category</span>
            </div>
            <div className="fw-bold text-dark" data-testid="ticket-category" style={{ fontSize: "0.95rem" }}>
              {ticket.category ? ticket.category.name : "—"}
            </div>
          </div>
        </div>

        {/* Related System Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailSystemIcon size={15} className="text-muted flex-shrink-0" />
              <span>Related System</span>
            </div>
            <div className="fw-bold text-dark text-truncate" data-testid="ticket-system" style={{ fontSize: "0.95rem" }} title={ticket.relatedSystem?.name}>
              {ticket.relatedSystem ? ticket.relatedSystem.name : "None specified"}
            </div>
          </div>
        </div>

        {/* Requester Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
              <DetailRequesterIcon size={15} className="text-muted flex-shrink-0" />
              <span>Requester</span>
            </div>
            <div className="fw-bold text-dark text-truncate" data-testid="ticket-requester-name" style={{ fontSize: "0.95rem" }}>
              {ticket.requester ? ticket.requester.fullName : "—"}
            </div>
          </div>
        </div>

        {/* Department Card */}
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

        {/* Last Updated / Request Card */}
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

        {/* IT Priority Card (if present) */}
        {ticket.itPriority && (
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card h-100 border shadow-sm p-3 rounded-3 bg-white" style={{ borderColor: "#EAECF0" }}>
              <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
                <DetailPriorityIcon size={15} className="text-muted flex-shrink-0" />
                <span>IT Priority</span>
              </div>
              <div>{renderDetailPriorityBadge(ticket.itPriority)}</div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Ticket Overview Card: Summary & Description */}
      <div
        className="card border shadow-sm rounded-4 mb-4 bg-white"
        style={{
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
        data-testid="ticket-overview-card"
      >
        <div className="card-body px-3 pt-3 pb-3 p-md-5">
          <div className="mb-4 pb-3 border-bottom" style={{ borderColor: "#F2F4F7" }}>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: "0.04em", fontSize: "0.75rem" }}>
              <DetailDocIcon size={14} className="text-muted flex-shrink-0 pb-1" />
              <span>Summary</span>
            </div>
            <h2 className="h4 fw-bold text-dark mb-0" data-testid="ticket-summary">
              {ticket.summary}
            </h2>
          </div>

          <div>
            <div className="d-flex align-items-center gap-1 text-muted small fw-semibold text-uppercase mb-2" style={{ letterSpacing: "0.04em", fontSize: "0.75rem" }}>
              <DetailDocIcon size={14} className="text-muted flex-shrink-0" />
              <span>Description</span>
            </div>
            <div
              className="py-1 px-2 rounded-3 text-dark border"
              style={{
                backgroundColor: "#FAFCFB",
                borderColor: "#EAECF0",
                whiteSpace: "pre-wrap",
                minHeight: 100,
                lineHeight: 1.6,
                fontSize: "0.925rem",
              }}
              data-testid="ticket-description"
            >
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Attachments Card */}
      {(() => {
        const activeList = (ticket.attachments || []).filter(
          (a) => !a.isSoftDeleted && a.status !== "REMOVED"
        );
        const maxAttachmentsReached = activeList.length >= 5;

        return (
          <div
            className="card border shadow-sm rounded-4 mb-4 bg-white"
            style={{
              borderRadius: "16px",
              borderColor: "#EAECF0",
              boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
            }}
            data-testid="attachments-card"
          >
            <div
              className="card-header bg-transparent border-bottom px-3 px-sm-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
              style={{ borderColor: "#EAECF0" }}
            >
              <div className="d-flex flex-wrap align-items-center gap-2 py-2">
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <PaperclipIcon size={18} color="var(--zg-primary, #006B3C)" className="flex-shrink-0" />
                  <h2 className="h5 fw-bold text-dark mb-0 text-nowrap">
                    Attachments ({(ticket.attachments || []).length})
                  </h2>
                </div>
                {maxAttachmentsReached && (
                  <span
                    className="badge bg-secondary-subtle text-secondary border text-wrap text-start"
                    style={{ whiteSpace: "normal" }}
                    data-testid="max-attachments-badge"
                  >
                    5/5 Active (Max limit reached)
                  </span>
                )}
              </div>

              {canManageAttachments && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAddAttachment}
                    style={{ display: "none" }}
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    data-testid="add-attachment-input"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success fw-semibold d-inline-flex align-items-center gap-1 px-3 py-1 rounded-2"
                    style={{ borderColor: "var(--zg-primary, #006B3C)", color: "var(--zg-primary, #006B3C)" }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={maxAttachmentsReached || isUploadingAttachment}
                    data-testid="add-attachment-button"
                  >
                    <PaperclipIcon size={14} color="currentColor" />
                    <span>{isUploadingAttachment ? "Uploading..." : "+ Add Attachment"}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="card-body p-4 p-md-5">
              {uploadError && (
                <div className="alert alert-danger small py-2 px-3 mb-3 d-flex align-items-center gap-2 rounded-2" role="alert">
                  <AlertTriangleIcon size={16} color="currentColor" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="alert alert-success small py-2 px-3 mb-3 d-flex align-items-center gap-2 rounded-2" role="alert">
                  <CheckCircleIcon size={16} color="currentColor" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {downloadError && (
                <div
                  className="alert alert-danger small py-2 px-3 mb-3 d-flex align-items-center gap-2 rounded-2"
                  role="alert"
                  data-testid="download-error-alert"
                >
                  <AlertTriangleIcon size={16} color="currentColor" />
                  <span>{downloadError}</span>
                </div>
              )}

          {activeAttachments.length === 0 ? (
            <p className="text-muted mb-0 small" data-testid="no-attachments-msg">
              No files attached to this ticket.
            </p>
          ) : (
            <div className="row g-3" data-testid="attachments-list">
              {activeAttachments.map((att) => {
                const isSoftDeleted = att.status === "REMOVED" || att.isSoftDeleted;

                return (
                  <div key={att.id} className="col-12 col-sm-6 col-md-4">
                    <div
                      className={`p-3 rounded-3 border d-flex flex-column justify-content-between h-100 shadow-sm ${
                        isSoftDeleted ? "bg-light opacity-75" : "bg-white"
                      }`}
                      style={{ borderColor: "#EAECF0", borderRadius: "10px" }}
                      data-testid={`attachment-item-${att.id}`}
                    >
                      <div className="mb-2">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <PaperclipIcon size={16} color={isSoftDeleted ? "#98A2B3" : "#006B3C"} />
                          <span
                            className={`fw-semibold text-truncate small ${
                              isSoftDeleted ? "text-decoration-line-through text-muted" : "text-dark"
                            }`}
                            title={att.originalName}
                            data-testid="attachment-name"
                            style={{ fontSize: "0.84rem" }}
                          >
                            {att.originalName}
                          </span>
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {formatFileSize(att.sizeBytes)} • {formatDateTime(att.createdAt)}
                        </div>

                        {isSoftDeleted && (
                          <div className="mt-2">
                            <span
                              className="badge bg-danger-subtle text-danger px-2 py-0 rounded-pill"
                              style={{ fontSize: "0.7rem" }}
                              data-testid="removed-badge"
                            >
                              Removed
                            </span>
                            {att.deletionReason && (
                              <div
                                className="text-muted mt-1"
                                style={{ fontSize: "0.75rem" }}
                                data-testid="removal-reason"
                              >
                                Reason: {att.deletionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!isSoftDeleted && (
                        <div className="d-flex align-items-center justify-content-end gap-2 pt-2 border-top" style={{ borderColor: "#F2F4F7" }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none p-0 text-success d-inline-flex align-items-center gap-1 hover-opacity-75"
                            onClick={() => handleDownload(att)}
                            title="Download attachment"
                            data-testid={`download-btn-${att.id}`}
                          >
                            <DownloadIcon size={14} color="var(--zg-primary, #006B3C)" />
                            <span className="small fw-semibold" style={{ color: "var(--zg-primary)" }}>Download</span>
                          </button>

                          {canManageAttachments && (
                            <>
                              <span className="text-muted opacity-50">•</span>
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-decoration-none p-0 text-danger d-inline-flex align-items-center gap-1 hover-opacity-75"
                                onClick={() => handleOpenRemovalModal(att)}
                                title="Remove attachment"
                                data-testid={`remove-btn-${att.id}`}
                              >
                                <TrashIcon size={14} color="var(--zg-error, #B42318)" />
                                <span className="small fw-semibold" style={{ color: "var(--zg-error, #B42318)" }}>Remove</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
        );
      })()}

      {/* 3. Public Comments Thread Card */}
      <div
        className="card border shadow-sm rounded-4 mb-4 bg-white"
        style={{
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
        data-testid="public-comments-card"
      >
        <div className="card-header bg-transparent border-bottom px-4 py-3 d-flex align-items-center justify-content-between" style={{ borderColor: "#EAECF0" }}>
          <h2 className="h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <span>💬</span>
            <span>Public Discussion ({comments.length})</span>
          </h2>
        </div>
        <div className="card-body p-4 p-md-5">
          {/* Comments list */}
          <div className="d-flex flex-column gap-3 mb-4" data-testid="public-comments-list">
            {comments.length === 0 ? (
              <p className="text-muted small mb-0" data-testid="no-comments-msg">
                No public comments on this ticket yet.
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-2 rounded-3 border"
                  style={{
                    backgroundColor: "#FAFCFB",
                    borderColor: "#EAECF0",
                    borderRadius: "12px",
                  }}
                  data-testid={`comment-item-${comment.id}`}
                >
                  <div className="d-flex align-items-start gap-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0 mt-0"
                      style={{
                        width: 26,
                        height: 26,
                        backgroundColor:
                          comment.authorRole === "IT_STAFF"
                            ? "var(--zg-primary)"
                            : comment.authorRole === "ADMINISTRATOR"
                            ? "#5925DC"
                            : "#175CD3",
                        fontSize: "0.72rem",
                      }}
                      aria-hidden="true"
                    >
                      {comment.authorName ? comment.authorName[0].toUpperCase() : "U"}
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 gap-sm-2 mb-1">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <strong className="text-dark small text-nowrap" data-testid="comment-author-name">
                            {comment.authorName}
                          </strong>
                          <span
                            className="badge px-2 py-1 rounded-pill text-nowrap"
                            style={{
                              fontSize: "0.7rem",
                              backgroundColor:
                                comment.authorRole === "IT_STAFF"
                                  ? "var(--zg-pale)"
                                  : comment.authorRole === "ADMINISTRATOR"
                                  ? "#F4EBFF"
                                  : "#EFF8FF",
                              color:
                                comment.authorRole === "IT_STAFF"
                                  ? "var(--zg-primary)"
                                  : comment.authorRole === "ADMINISTRATOR"
                                  ? "#5925DC"
                                  : "#175CD3",
                            }}
                            data-testid="comment-role-badge"
                          >
                            {comment.authorRole === "IT_STAFF"
                              ? "IT Staff"
                              : comment.authorRole === "ADMINISTRATOR"
                              ? "Admin"
                              : "Requester"}
                          </span>
                        </div>
                        <span className="text-muted text-nowrap" style={{ fontSize: "0.75rem" }} data-testid="comment-timestamp">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <div className="text-dark small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, wordBreak: "break-word" }} data-testid="comment-content">
                        {comment.content || comment.body}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Form */}
          {canComment ? (
            <form onSubmit={handleCommentSubmit} data-testid="public-comment-form">
              {commentError && (
                <div className="alert alert-danger small p-2 mb-2 rounded-2" data-testid="comment-error">
                  {commentError}
                </div>
              )}
              <div className="mb-2">
                <textarea
                  className="form-control"
                  rows={3}
                  style={{
                    borderRadius: "8px",
                    borderColor: "#D0D5DD",
                    fontSize: "0.875rem",
                  }}
                  placeholder="Add a public comment to this ticket…"
                  value={newComment}
                  maxLength={2000}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  disabled={isSubmittingComment}
                  data-testid="comment-input"
                />
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted small" data-testid="comment-char-counter" style={{ fontSize: "0.75rem" }}>
                  {newComment.length} / 2,000 characters
                </span>
                <button
                  type="submit"
                  className="btn btn-success btn-sm fw-semibold px-3 py-1 rounded-2 shadow-sm"
                  style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
                  disabled={isSubmittingComment || !newComment.trim()}
                  data-testid="comment-submit-btn"
                >
                  {isSubmittingComment ? "Posting…" : "Post Comment"}
                </button>
              </div>
            </form>
          ) : (
            <div className="alert alert-light border small text-muted p-3 text-center mb-0" data-testid="comment-permission-notice">
              Only the ticket requester, IT staff, and administrators can post comments to this discussion.
            </div>
          )}
        </div>
      </div>

      {/* 4. Activity History Timeline Card */}
      <div
        className="card border shadow-sm rounded-4 bg-white"
        style={{
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
        data-testid="timeline-card"
      >
        <div className="card-header bg-transparent border-bottom px-4 py-3" style={{ borderColor: "#EAECF0" }}>
          <h2 className="h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <TicketIcon size={18} color="var(--zg-primary, #006B3C)" />
            Activity Timeline
          </h2>
        </div>

        <div className="card-body p-4">
          {timeline.length === 0 ? (
            <p className="text-muted mb-0">No recorded activity for this ticket.</p>
          ) : (
            <div className="position-relative ps-3" data-testid="activity-timeline">
              <div
                className="position-absolute"
                style={{
                  top: 8,
                  bottom: 12,
                  left: 28,
                  width: 2,
                  backgroundColor: "var(--zg-border-subtle, #EAECF0)",
                }}
              />

              <div className="d-flex flex-column gap-4">
                {timeline.map((event, idx) => {
                  const isRemoval =
                    event.type === "ATTACHMENT_REMOVED" ||
                    event.message.includes("removed by requester");

                  return (
                    <div
                      key={event.id || idx}
                      className="d-flex align-items-start gap-3 position-relative"
                      data-testid={`timeline-event-${idx}`}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: 26,
                          height: 26,
                          zIndex: 1,
                          backgroundColor: isRemoval
                            ? "var(--zg-error-bg, #FEF3F2)"
                            : "var(--zg-pale, #EAF6EF)",
                          border: `2px solid ${
                            isRemoval
                              ? "var(--zg-error, #B42318)"
                              : "var(--zg-primary, #006B3C)"
                          }`,
                        }}
                      >
                        {isRemoval ? (
                          <TrashIcon size={12} color="var(--zg-error, #B42318)" />
                        ) : (
                          <CheckCircleIcon size={12} color="var(--zg-primary, #006B3C)" />
                        )}
                      </div>

                      <div className="flex-grow-1 pt-0">
                        <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2">
                          <span
                            className={`fw-semibold ${
                              isRemoval ? "text-danger" : "text-dark"
                            }`}
                            style={{ fontSize: "0.875rem" }}
                            data-testid="timeline-event-message"
                          >
                            {event.message}
                          </span>
                          <span
                            className="text-muted text-nowrap"
                            style={{ fontSize: "0.75rem" }}
                            data-testid="timeline-event-time"
                          >
                            {formatDateTime(event.timestamp)}
                          </span>
                        </div>

                        {event.actor && (
                          <div className="text-muted mt-0" style={{ fontSize: "0.75rem" }}>
                            By {event.actor}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attachment Removal Modal */}
      <AttachmentRemovalModal
        isOpen={removalModalOpen}
        attachment={targetAttachment}
        onClose={() => {
          setRemovalModalOpen(false);
          setTargetAttachment(null);
        }}
        onSuccess={handleRemovalSuccess}
      />

      {/* Confirm Problem Resolved Modal */}
      {confirmResolvedModalOpen && (
        <div
          className="zg-modal-backdrop position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          role="dialog"
          aria-modal="true"
          data-testid="confirm-resolved-modal"
        >
          <div
            className="p-4 rounded-3 bg-white shadow-lg w-100 mx-3"
            style={{ maxWidth: 500 }}
          >
            <h3 className="h5 fw-bold text-dark mb-2">Confirm Problem Appears Resolved</h3>
            <p className="text-muted small mb-3">
              Are you sure this issue appears resolved? This will notify IT Staff that you consider the problem solved.
            </p>

            {confirmResolvedError && (
              <div className="alert alert-danger small p-2 mb-3" data-testid="confirm-resolved-error">
                {confirmResolvedError}
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="confirm-resolved-feedback-input" className="form-label small fw-semibold text-dark">
                Resolution Feedback (Optional)
              </label>
              <textarea
                id="confirm-resolved-feedback-input"
                className="form-control form-control-sm"
                rows={3}
                placeholder="Let the IT staff know how the problem was resolved or any additional details…"
                value={confirmFeedback}
                onChange={(e) => setConfirmFeedback(e.target.value)}
                disabled={isSubmittingConfirmResolved}
                data-testid="confirm-resolved-feedback"
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setConfirmResolvedModalOpen(false)}
                disabled={isSubmittingConfirmResolved}
                data-testid="confirm-resolved-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm fw-semibold"
                style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
                onClick={handleConfirmResolvedSubmit}
                disabled={isSubmittingConfirmResolved}
                data-testid="confirm-resolved-submit-btn"
              >
                {isSubmittingConfirmResolved ? "Confirming…" : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailScreen;
