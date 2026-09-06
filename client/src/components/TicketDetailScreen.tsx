import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRequester } from "../context/RequesterContext";
import {
  TicketDetailItem,
  TicketDetailAttachment,
  fetchTicketDetail,
  downloadAttachment,
  addAttachmentToTicket,
  ApiError,
} from "../api";
import {
  HomeIcon,
  DownloadIcon,
  TrashIcon,
  PaperclipIcon,
  TicketIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
} from "./icons";
import AttachmentRemovalModal from "./AttachmentRemovalModal";

export interface TicketDetailScreenProps {
  ticketId: number;
  onNavigate: (view: "my-tickets" | "create-ticket" | "select-requester") => void;
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
          className="badge zg-priority-p0 px-2.5 py-1.5 d-inline-flex align-items-center gap-1"
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
          className="badge zg-priority-p1 px-2.5 py-1.5 d-inline-flex align-items-center gap-1"
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
          className="badge zg-priority-p2 px-2.5 py-1.5 d-inline-flex align-items-center gap-1"
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
          className="badge zg-priority-p3 px-2.5 py-1.5 d-inline-flex align-items-center gap-1"
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
      return <span className="badge zg-status-new px-2.5 py-1.5" data-testid="detail-status-badge">NEW</span>;
    case "IN_PROGRESS":
      return <span className="badge zg-status-in-progress px-2.5 py-1.5" data-testid="detail-status-badge">IN PROGRESS</span>;
    case "RESOLVED":
      return <span className="badge zg-status-resolved px-2.5 py-1.5" data-testid="detail-status-badge">RESOLVED</span>;
    case "CLOSED":
      return <span className="badge zg-status-closed px-2.5 py-1.5" data-testid="detail-status-badge">CLOSED</span>;
    case "REJECTED":
      return <span className="badge zg-status-rejected px-2.5 py-1.5" data-testid="detail-status-badge">REJECTED</span>;
    default:
      return <span className="badge bg-secondary" data-testid="detail-status-badge">{status}</span>;
  }
}

export const TicketDetailScreen: React.FC<TicketDetailScreenProps> = ({
  ticketId,
  onNavigate,
}) => {
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetailItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Soft-removal modal state
  const [removalModalOpen, setRemovalModalOpen] = useState<boolean>(false);
  const [targetAttachment, setTargetAttachment] = useState<TicketDetailAttachment | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!currentRequester?.id) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchTicketDetail(ticketId, currentRequester.id);
      setTicket(data);
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
  }, [ticketId, currentRequester?.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleDownload = async (attachment: TicketDetailAttachment) => {
    if (!currentRequester?.id) return;
    setDownloadError(null);

    try {
      await downloadAttachment(attachment.id, attachment.originalName, currentRequester.id);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 410) {
        setDownloadError("This attachment has been removed and can no longer be downloaded.");
        // Refresh ticket to sync soft-deleted state
        loadTicket();
      } else {
        setDownloadError(err instanceof Error ? err.message : "Failed to download attachment.");
      }
    }
  };

  const handleOpenRemovalModal = (attachment: TicketDetailAttachment) => {
    setTargetAttachment(attachment);
    setRemovalModalOpen(true);
  };

  const handleRemovalSuccess = (updatedAttachment: TicketDetailAttachment) => {
    setSuccessNotice(`Attachment "${updatedAttachment.originalName}" was successfully removed.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    // Reload ticket details to update attachments list and timeline
    loadTicket();
  };

  // Add attachment state
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so user can re-select same file if needed
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

    if (!currentRequester?.id) return;

    try {
      setIsUploadingAttachment(true);
      setUploadError(null);
      setUploadSuccess(null);
      await addAttachmentToTicket(ticketId, file, currentRequester.id);
      setUploadSuccess(`Attachment "${file.name}" added successfully.`);
      setTimeout(() => setUploadSuccess(null), 4000);
      await loadTicket();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to upload attachment.";
      setUploadError(msg);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div
        className="py-5 text-center"
        data-testid="ticket-detail-loading"
      >
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

  // 2. Error / 404 / 403 State
  if (errorMessage || !ticket) {
    return (
      <div data-testid="ticket-detail-error" className="py-4">
        <span data-testid="ticket-detail-id" className="visually-hidden">
          Ticket ID: {ticketId}
        </span>
        {/* Breadcrumb even in error state */}
        <nav aria-label="Breadcrumb" className="mb-4 d-flex align-items-center text-sm" style={{ fontSize: "0.875rem" }}>
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none text-secondary d-inline-flex align-items-center gap-1"
            onClick={() => onNavigate("my-tickets")}
            data-testid="breadcrumb-home-link"
          >
            <HomeIcon size={16} />
            <span>Home</span>
          </button>
          <span className="mx-2 text-muted">&gt;</span>
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none text-secondary"
            onClick={() => onNavigate("my-tickets")}
            data-testid="breadcrumb-tickets-link"
          >
            My Tickets
          </button>
          <span className="mx-2 text-muted">&gt;</span>
          <span className="text-dark fw-semibold">Ticket #{ticketId}</span>
        </nav>

        <div className="card border-0 shadow-sm p-5 text-center bg-white rounded-3">
          <div className="mb-3 d-flex justify-content-center">
            <div
              className="rounded-circle p-3 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: "var(--zg-error-bg, #FEF3F2)", width: 64, height: 64 }}
            >
              <AlertTriangleIcon size={32} color="var(--zg-error, #B42318)" />
            </div>
          </div>
          <h2 className="h4 fw-bold text-dark mb-2" data-testid="error-heading">
            Ticket Not Found or Access Denied
          </h2>
          <p className="text-secondary mx-auto mb-4" style={{ maxWidth: 480 }}>
            {errorMessage || "Ticket with the specified ID does not exist, or you do not have authorization to view it."}
          </p>
          <div>
            <button
              type="button"
              className="btn zg-btn-primary px-4 py-2"
              onClick={() => onNavigate("my-tickets")}
              data-testid="error-back-btn"
            >
              ← Back to My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeline = ticket.activityTimeline || ticket.timeline || ticket.activityHistory || [];

  return (
    <div data-testid="ticket-detail-screen" className="pb-5">
      <span data-testid="ticket-detail-id" className="visually-hidden">
        Ticket ID: {ticketId}
      </span>
      {/* Top Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="mb-4 d-flex align-items-center text-sm"
        style={{ fontSize: "0.875rem", color: "var(--zg-text-secondary, #667085)" }}
      >
        <button
          type="button"
          className="btn btn-link p-0 text-decoration-none text-secondary d-inline-flex align-items-center gap-1"
          onClick={() => onNavigate("my-tickets")}
          data-testid="breadcrumb-home-link"
        >
          <HomeIcon size={16} />
          <span>Home</span>
        </button>
        <span className="mx-2 text-muted">&gt;</span>
        <button
          type="button"
          className="btn btn-link p-0 text-decoration-none text-secondary"
          onClick={() => onNavigate("my-tickets")}
          data-testid="breadcrumb-tickets-link"
        >
          My Tickets
        </button>
        <span className="mx-2 text-muted">&gt;</span>
        <span className="text-dark fw-semibold" data-testid="breadcrumb-current-ticket">
          {ticket.ticketNo}
        </span>
      </nav>

      {/* Action Bar / Back button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 px-3 py-1.5 rounded-2"
          onClick={() => onNavigate("my-tickets")}
          data-testid="back-to-tickets-btn"
        >
          ← Back to My Tickets
        </button>
      </div>

      {/* Success Notification Alert */}
      {successNotice && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between mb-4 shadow-sm"
          role="alert"
          data-testid="ticket-detail-success-alert"
        >
          <div className="d-flex align-items-center gap-2">
            <CheckCircleIcon size={18} color="var(--zg-primary, #006B3C)" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setSuccessNotice(null)}
          />
        </div>
      )}

      {/* Download Error Alert */}
      {downloadError && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between mb-4 shadow-sm"
          role="alert"
          data-testid="download-error-alert"
        >
          <div className="d-flex align-items-center gap-2">
            <XCircleIcon size={18} color="var(--zg-error, #B42318)" />
            <span>{downloadError}</span>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setDownloadError(null)}
          />
        </div>
      )}

      {/* 1. Ticket Summary & Header Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden bg-white">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3 border-bottom pb-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="font-monospace fw-bold text-success" style={{ fontSize: "1.1rem" }} data-testid="ticket-number">
                  {ticket.ticketNo}
                </span>
                {renderDetailStatusBadge(ticket.status)}
                {renderDetailPriorityBadge(ticket.priority)}
              </div>
              <h1 className="h4 fw-bold text-dark mb-0 mt-2" data-testid="ticket-summary">
                {ticket.summary}
              </h1>
            </div>

            <div className="text-end text-muted" style={{ fontSize: "0.8rem" }}>
              <div>
                Created: <span className="text-dark fw-medium" data-testid="ticket-created-date">{formatDateTime(ticket.createdAt)}</span>
              </div>
              <div>
                Last Updated: <span className="text-dark fw-medium">{formatDateTime(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="row g-3 mb-4 pt-1" style={{ fontSize: "0.875rem" }}>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted d-block mb-1">Category</span>
              <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-medium" data-testid="ticket-category">
                {ticket.category.name}
              </span>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted d-block mb-1">Related System</span>
              <span className="text-dark fw-medium" data-testid="ticket-system">
                {ticket.relatedSystem ? ticket.relatedSystem.name : "None specified"}
              </span>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted d-block mb-1">Requester</span>
              <span className="text-dark fw-medium d-block" data-testid="ticket-requester-name">
                {ticket.requester.fullName || ticket.requester.displayName}
              </span>
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                {ticket.requester.department}
              </span>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted d-block mb-1">Requester Email</span>
              <span className="text-dark" style={{ fontSize: "0.825rem" }}>
                {ticket.requester.email}
              </span>
            </div>
          </div>

          {/* Description Block */}
          <div>
            <h2 className="h6 fw-bold text-dark mb-2">Description</h2>
            <div
              className="p-3 bg-light rounded border text-dark"
              style={{ whiteSpace: "pre-wrap", fontSize: "0.925rem", lineHeight: 1.6 }}
              data-testid="ticket-description"
            >
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Attachments Card */}
      {(() => {
        const activeAttachments = ticket.attachments.filter(
          (a) => !a.isSoftDeleted && a.status !== "REMOVED"
        );
        const maxAttachmentsReached = activeAttachments.length >= 5;

        return (
          <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white" data-testid="attachments-card">
            <div className="card-header bg-transparent border-bottom px-4 py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <PaperclipIcon size={18} color="var(--zg-primary, #006B3C)" />
                <h2 className="h5 fw-bold text-dark mb-0">
                  Attachments ({ticket.attachments.length})
                </h2>
                {maxAttachmentsReached && (
                  <span
                    className="badge bg-secondary-subtle text-secondary border ms-2"
                    data-testid="max-attachments-badge"
                  >
                    5/5 Active (Max limit reached)
                  </span>
                )}
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAddAttachment}
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: "none" }}
                  data-testid="add-attachment-input"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1.5 fw-semibold"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={maxAttachmentsReached || isUploadingAttachment}
                  data-testid="add-attachment-button"
                  title={
                    maxAttachmentsReached
                      ? "Maximum 5 active attachments reached"
                      : "Upload an attachment to this ticket"
                  }
                >
                  {isUploadingAttachment ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      <span>Add Attachment</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              {uploadError && (
                <div
                  className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 mb-3"
                  role="alert"
                  data-testid="upload-error-alert"
                >
                  <AlertTriangleIcon size={16} color="var(--zg-error, #B42318)" className="flex-shrink-0" />
                  <div className="flex-grow-1">{uploadError}</div>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setUploadError(null)}
                  ></button>
                </div>
              )}

              {uploadSuccess && (
                <div
                  className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 mb-3"
                  role="alert"
                  data-testid="upload-success-alert"
                >
                  <CheckCircleIcon size={16} color="var(--zg-primary, #006B3C)" className="flex-shrink-0" />
                  <div className="flex-grow-1">{uploadSuccess}</div>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setUploadSuccess(null)}
                  ></button>
                </div>
              )}
          {ticket.attachments.length === 0 ? (
            <div className="text-center py-4 text-muted" data-testid="no-attachments-msg">
              No files attached to this ticket.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3" data-testid="attachments-list">
              {ticket.attachments.map((att) => {
                const isRemoved = att.isSoftDeleted || att.status === "REMOVED";

                return (
                  <div
                    key={att.id}
                    className={`p-3 rounded border d-flex flex-wrap justify-content-between align-items-center gap-3 ${
                      isRemoved ? "bg-light border-dashed" : "bg-white"
                    }`}
                    data-testid={`attachment-item-${att.id}`}
                  >
                    {/* Left File Info */}
                    <div className="d-flex align-items-start gap-3">
                      <div
                        className={`rounded p-2.5 d-flex align-items-center justify-content-center ${
                          isRemoved ? "bg-secondary-subtle text-secondary" : "bg-success-subtle text-success"
                        }`}
                      >
                        <PaperclipIcon size={20} />
                      </div>

                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span
                            className={`fw-semibold ${
                              isRemoved
                                ? "text-decoration-line-through text-muted"
                                : "text-dark"
                            }`}
                            data-testid="attachment-name"
                          >
                            {att.originalName}
                          </span>

                          {isRemoved && (
                            <span
                              className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0.5 fw-semibold"
                              style={{ fontSize: "0.75rem" }}
                              data-testid="removed-badge"
                            >
                              Removed
                            </span>
                          )}
                        </div>

                        <div className="text-muted mt-1" style={{ fontSize: "0.785rem" }}>
                          <span>{formatFileSize(att.sizeBytes)}</span>
                          <span className="mx-1.5">•</span>
                          <span>Uploaded {formatDateTime(att.createdAt)}</span>
                        </div>

                        {/* Removal Audit Info */}
                        {isRemoved && (
                          <div
                            className="mt-2 text-danger d-flex align-items-center gap-1.5"
                            style={{ fontSize: "0.8rem" }}
                            data-testid="removal-reason"
                          >
                            <AlertTriangleIcon size={14} color="var(--zg-error, #B42318)" className="flex-shrink-0" />
                            <span>
                              Removed on {formatDateTime(att.deletedAt || "")}:{" "}
                              <strong>{att.deletionReason || "Removed"}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="d-flex align-items-center gap-2">
                      {isRemoved ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary disabled"
                          disabled
                          title="This file has been removed and cannot be downloaded"
                          data-testid="download-btn-disabled"
                          style={{ cursor: "not-allowed" }}
                        >
                          <DownloadIcon size={14} className="me-1" />
                          Download
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                            onClick={() => handleDownload(att)}
                            data-testid={`download-btn-${att.id}`}
                          >
                            <DownloadIcon size={14} />
                            Download
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                            onClick={() => handleOpenRemovalModal(att)}
                            data-testid={`remove-btn-${att.id}`}
                          >
                            <TrashIcon size={14} />
                            Remove
                          </button>
                        </>
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

      {/* 3. Activity History Timeline Card */}
      <div className="card border-0 shadow-sm rounded-3 bg-white" data-testid="timeline-card">
        <div className="card-header bg-transparent border-bottom px-4 py-3">
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
              {/* Timeline continuous vertical track line */}
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
                      {/* Event Dot / Icon */}
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

                      {/* Event Content */}
                      <div className="flex-grow-1 pt-0.5">
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
                            className="text-muted"
                            style={{ fontSize: "0.75rem" }}
                            data-testid="timeline-event-time"
                          >
                            {formatDateTime(event.timestamp)}
                          </span>
                        </div>

                        {event.actor && (
                          <div className="text-muted mt-0.5" style={{ fontSize: "0.75rem" }}>
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
        requesterId={currentRequester?.id}
        onClose={() => {
          setRemovalModalOpen(false);
          setTargetAttachment(null);
        }}
        onSuccess={handleRemovalSuccess}
      />
    </div>
  );
};

export default TicketDetailScreen;
