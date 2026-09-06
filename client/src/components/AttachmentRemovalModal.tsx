import React, { useState, useEffect, useRef } from "react";
import { TicketDetailAttachment, removeAttachment, ApiError } from "../api";
import { AlertTriangleIcon, XCircleIcon } from "./icons";

export interface AttachmentRemovalModalProps {
  isOpen: boolean;
  attachment: TicketDetailAttachment | null;
  requesterId?: number;
  onClose: () => void;
  onSuccess: (updatedAttachment: TicketDetailAttachment) => void;
}

export const PRESET_OPTIONS = [
  { value: "Uploaded incorrect document / file", label: "Uploaded incorrect document / file" },
  { value: "Contains sensitive or confidential data", label: "Contains sensitive or confidential data" },
  { value: "Duplicate file", label: "Duplicate file" },
  { value: "Other", label: "Other (specify below)" },
];

export const AttachmentRemovalModal: React.FC<AttachmentRemovalModalProps> = ({
  isOpen,
  attachment,
  requesterId,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("Uploaded incorrect document / file");
  const [customReason, setCustomReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasBlurredCustom, setHasBlurredCustom] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedReason("Uploaded incorrect document / file");
      setCustomReason("");
      setIsSubmitting(false);
      setErrorMessage(null);
      setHasBlurredCustom(false);
    }
  }, [isOpen]);

  // Focus textarea when "Other" is selected
  useEffect(() => {
    if (selectedReason === "Other") {
      textareaRef.current?.focus();
    }
  }, [selectedReason]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !attachment) {
    return null;
  }

  const isCustomReasonValid = customReason.trim().length >= 5;
  const isSubmitDisabled =
    isSubmitting || (selectedReason === "Other" && !isCustomReasonValid);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReason === "Other" && !isCustomReasonValid) {
      setErrorMessage("Custom reason must be at least 5 characters long.");
      return;
    }

    if (!requesterId) {
      setErrorMessage("Requester authentication is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        reason: selectedReason,
        ...(selectedReason === "Other" ? { customReason: customReason.trim() } : {}),
      };

      const updated = await removeAttachment(attachment.id, payload, requesterId);
      setIsSubmitting(false);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Failed to remove attachment.");
      }
    }
  };

  return (
    <div
      className="zg-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-attachment-title"
      data-testid="attachment-removal-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="zg-modal-card" ref={modalRef} style={{ maxWidth: 520 }}>
        {/* Modal Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3
            id="remove-attachment-title"
            className="h5 fw-bold mb-0 text-dark"
            data-testid="modal-title"
          >
            Remove Attachment
          </h3>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="modal-close-btn"
          />
        </div>

        {/* Warning Alert */}
        <div
          className="alert alert-warning d-flex align-items-start gap-2 p-3 mb-3"
          style={{ fontSize: "0.875rem", backgroundColor: "var(--zg-warning-bg, #FFFAEB)", borderColor: "#FEDF89" }}
        >
          <AlertTriangleIcon size={18} color="var(--zg-warning, #B54708)" className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>Warning:</strong> This file will be soft-deleted. The removal will be recorded in the audit log and the file can no longer be downloaded.
          </div>
        </div>

        {/* Target Attachment Info */}
        <div className="bg-light p-2 rounded mb-3 border text-secondary" style={{ fontSize: "0.875rem" }}>
          <span className="fw-semibold text-dark">File: </span>
          <span className="font-monospace text-dark" data-testid="attachment-filename-label">
            {attachment.originalName}
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="alert alert-danger d-flex align-items-center gap-2 p-2 mb-3"
            style={{ fontSize: "0.875rem" }}
            role="alert"
            data-testid="modal-error-alert"
          >
            <XCircleIcon size={16} color="var(--zg-error, #B42318)" className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleConfirm}>
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark" style={{ fontSize: "0.9rem" }}>
              Reason for Removal <span className="text-danger">*</span>
            </label>

            <div className="d-flex flex-column gap-2" data-testid="preset-reasons-group">
              {PRESET_OPTIONS.map((opt) => (
                <div key={opt.value} className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="removalReason"
                    id={`reason-${opt.value.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    value={opt.value}
                    checked={selectedReason === opt.value}
                    onChange={() => {
                      setSelectedReason(opt.value);
                      setErrorMessage(null);
                    }}
                    disabled={isSubmitting}
                    data-testid={`preset-reason-${opt.value === "Other" ? "other" : opt.value.split(" ")[0].toLowerCase()}`}
                  />
                  <label
                    className="form-check-label text-dark"
                    htmlFor={`reason-${opt.value.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    style={{ fontSize: "0.875rem", cursor: "pointer" }}
                  >
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Conditional Custom Reason Textarea */}
          {selectedReason === "Other" && (
            <div className="mb-3" data-testid="custom-reason-container">
              <label
                htmlFor="custom-removal-reason"
                className="form-label fw-semibold text-dark"
                style={{ fontSize: "0.875rem" }}
              >
                Specify Custom Reason <span className="text-danger">*</span>
              </label>
              <textarea
                id="custom-removal-reason"
                ref={textareaRef}
                className={`form-control ${
                  (hasBlurredCustom || customReason.length > 0) && !isCustomReasonValid
                    ? "is-invalid"
                    : ""
                }`}
                rows={3}
                placeholder="Please enter the reason for removing this attachment (e.g. uploaded wrong file / sensitive data)"
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setErrorMessage(null);
                }}
                onBlur={() => setHasBlurredCustom(true)}
                disabled={isSubmitting}
                data-testid="custom-reason-textarea"
                aria-describedby="custom-reason-feedback"
              />
              <div className="d-flex justify-content-between mt-1">
                <span
                  id="custom-reason-feedback"
                  className={
                    (hasBlurredCustom || customReason.length > 0) && !isCustomReasonValid
                      ? "text-danger"
                      : "text-muted"
                  }
                  style={{ fontSize: "0.75rem" }}
                  data-testid="custom-reason-validation"
                >
                  {(hasBlurredCustom || customReason.length > 0) && !isCustomReasonValid
                    ? "Custom reason must be at least 5 characters long."
                    : "Minimum 5 characters required."}
                </span>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {customReason.trim().length} / 255
                </span>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="cancel-remove-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={isSubmitDisabled}
              data-testid="confirm-remove-btn"
            >
              {isSubmitting ? "Removing..." : "Confirm Removal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttachmentRemovalModal;
