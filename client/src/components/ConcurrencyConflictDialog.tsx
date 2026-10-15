import React, { useState } from "react";
import { ActionTakenItem, UpdateActionPayload } from "../api.js";

interface ConcurrencyConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serverRecord: ActionTakenItem | null;
  serverUpdatedAt: string | null;
  localDraft: UpdateActionPayload;
  onReloadLatest: (latestRecord: ActionTakenItem, latestUpdatedAt: string) => void;
}

export const ConcurrencyConflictDialog: React.FC<ConcurrencyConflictDialogProps> = ({
  isOpen,
  onClose,
  serverRecord,
  serverUpdatedAt,
  localDraft,
  onReloadLatest,
}) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  if (!isOpen) return null;

  const draftTextToCopy = `Description: ${localDraft.description || ""}\nResult: ${
    localDraft.result || ""
  }\nTime Spent: ${localDraft.timeSpentMinutes || 0} mins${
    localDraft.followUpRequired ? `\nFollow-Up Note: ${localDraft.followUpNote || ""}` : ""
  }${localDraft.attachmentNotes ? `\nAttachment Notes: ${localDraft.attachmentNotes}` : ""}`;

  const handleCopy = async () => {
    setCopyStatus("idle");
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(draftTextToCopy);
        setCopyStatus("success");
        setTimeout(() => setCopyStatus("idle"), 3000);
        return;
      } catch {
        setCopyStatus("error");
        return;
      }
    }
    setCopyStatus("error");
  };

  const handleReload = () => {
    if (serverRecord) {
      onReloadLatest(serverRecord, serverUpdatedAt || serverRecord.updatedAt || "");
    } else {
      onClose();
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="modal show d-block"
      data-testid="concurrency-conflict-dialog"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="concurrency-conflict-title"
      style={{
        backgroundColor: "rgba(16, 24, 40, 0.6)",
        zIndex: 1060,
        overflowY: "auto",
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div
          className="modal-content border-0 shadow-lg"
          style={{
            borderRadius: "16px",
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            className="modal-header border-bottom py-3 px-4"
            style={{ backgroundColor: "#FEF3F2", borderColor: "#FECDCA" }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="fs-5" aria-hidden="true">⚠️</span>
              <h5
                id="concurrency-conflict-title"
                className="modal-title fw-bold text-danger m-0"
                style={{ fontSize: "1.1rem" }}
              >
                Concurrency Conflict Detected (409)
              </h5>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            <p className="text-secondary small mb-3">
              Another team member updated this action record while you were editing. To avoid overwriting their work, please review the differences below:
            </p>

            {/* Comparison Grid */}
            <div className="row g-3 mb-4">
              {/* Server Version (Latest) */}
              <div className="col-12 col-md-6">
                <div
                  className="card h-100 border p-3"
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderColor: "#EAECF0",
                    borderRadius: "12px",
                  }}
                  data-testid="server-conflict-version"
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="badge bg-secondary text-uppercase fw-semibold" style={{ fontSize: "0.75rem" }}>
                      Current Server Version
                    </span>
                    <span className="text-muted small">
                      {formatTimestamp(serverRecord?.updatedAt || serverUpdatedAt || undefined)}
                    </span>
                  </div>

                  <div className="small mb-2">
                    <strong className="text-dark">Updated By:</strong>{" "}
                    <span className="text-secondary">{serverRecord?.performedBy?.fullName || "Another Staff Member"}</span>
                  </div>

                  <div className="small mb-2">
                    <strong className="text-dark">Type & Duration:</strong>{" "}
                    <span className="badge bg-light text-dark border me-1">
                      {serverRecord?.actionType || "INVESTIGATION"}
                    </span>
                    <span className="text-secondary">{serverRecord?.timeSpentMinutes || 0} mins</span>
                  </div>

                  <div className="small mb-2">
                    <strong className="text-dark">Description:</strong>
                    <div
                      className="p-2 mt-1 rounded bg-white border text-dark"
                      style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", maxHeight: "120px", overflowY: "auto" }}
                    >
                      {serverRecord?.description || "—"}
                    </div>
                  </div>

                  <div className="small">
                    <strong className="text-dark">Result:</strong>
                    <div
                      className="p-2 mt-1 rounded bg-white border text-dark"
                      style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", maxHeight: "80px", overflowY: "auto" }}
                    >
                      {serverRecord?.result || "—"}
                    </div>
                  </div>

                  {serverRecord?.followUpRequired && (
                    <div className="small mt-2">
                      <strong className="text-dark">Follow-Up Note:</strong>
                      <div className="p-2 mt-1 rounded bg-white border text-dark" style={{ fontSize: "0.85rem" }}>
                        {serverRecord.followUpNote || "—"}
                      </div>
                    </div>
                  )}

                  {serverRecord?.attachmentNotes && (
                    <div className="small text-muted mt-2 fst-italic">
                      📎 {serverRecord.attachmentNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Your Changes (Unsaved Draft) */}
              <div className="col-12 col-md-6">
                <div
                  className="card h-100 border p-3"
                  style={{
                    backgroundColor: "#FEF6EE",
                    borderColor: "#F9DBAF",
                    borderRadius: "12px",
                  }}
                  data-testid="local-conflict-version"
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="badge bg-warning text-dark text-uppercase fw-semibold" style={{ fontSize: "0.75rem" }}>
                      Your Changes (Unsaved)
                    </span>
                    <span className="text-muted small">Local Draft</span>
                  </div>

                  <div className="small mb-2">
                    <strong className="text-dark">Updated By:</strong>{" "}
                    <span className="text-secondary">You (Local Session)</span>
                  </div>

                  <div className="small mb-2">
                    <strong className="text-dark">Type & Duration:</strong>{" "}
                    <span className="badge bg-light text-dark border me-1">
                      {localDraft.actionType || "INVESTIGATION"}
                    </span>
                    <span className="text-secondary">{localDraft.timeSpentMinutes || 0} mins</span>
                  </div>

                  <div className="small mb-2">
                    <strong className="text-dark">Description:</strong>
                    <div
                      className="p-2 mt-1 rounded bg-white border text-dark"
                      style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", maxHeight: "120px", overflowY: "auto" }}
                    >
                      {localDraft.description || "—"}
                    </div>
                  </div>

                  <div className="small">
                    <strong className="text-dark">Result:</strong>
                    <div
                      className="p-2 mt-1 rounded bg-white border text-dark"
                      style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", maxHeight: "80px", overflowY: "auto" }}
                    >
                      {localDraft.result || "—"}
                    </div>
                  </div>

                  {localDraft.followUpRequired && (
                    <div className="small mt-2">
                      <strong className="text-dark">Follow-Up Note:</strong>
                      <div className="p-2 mt-1 rounded bg-white border text-dark" style={{ fontSize: "0.85rem" }}>
                        {localDraft.followUpNote || "—"}
                      </div>
                    </div>
                  )}

                  {localDraft.attachmentNotes && (
                    <div className="small text-muted mt-2 fst-italic">
                      📎 {localDraft.attachmentNotes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Copy Status Feedback */}
            {copyStatus === "success" && (
              <div className="alert alert-success py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                <span>✓</span>
                <span>Copied draft to clipboard!</span>
              </div>
            )}

            {copyStatus === "error" && (
              <div className="alert alert-warning py-2 px-3 small mb-3" role="alert">
                <div className="fw-semibold mb-1">Could not access clipboard directly. You can manually copy your changes below:</div>
                <textarea
                  readOnly
                  data-testid="manual-copy-fallback"
                  className="form-control form-control-sm font-monospace"
                  rows={3}
                  value={draftTextToCopy}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            className="modal-footer border-top py-3 px-4 d-flex flex-wrap justify-content-between gap-2"
            style={{ backgroundColor: "#F9FAFB", borderColor: "#EAECF0" }}
          >
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              onClick={onClose}
            >
              Cancel
            </button>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm px-3"
                onClick={handleCopy}
              >
                Copy My Changes
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm px-3 text-white fw-semibold"
                style={{ backgroundColor: "var(--zg-primary, #006B3C)", borderColor: "var(--zg-primary, #006B3C)" }}
                onClick={handleReload}
              >
                Reload Latest Version
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
