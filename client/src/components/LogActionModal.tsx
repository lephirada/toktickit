import React, { useState } from "react";
import { createTicketAction, CreateActionPayload, ActionType, ApiError } from "../api.js";

interface LogActionModalProps {
  isOpen: boolean;
  ticketId: number;
  staffName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "INVESTIGATION", label: "Investigation" },
  { value: "CONFIGURATION", label: "Configuration" },
  { value: "REPAIR", label: "Repair" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "OTHER", label: "Other" },
];

const PRESETS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
];

export const LogActionModal: React.FC<LogActionModalProps> = ({
  isOpen,
  ticketId,
  staffName,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const getNowLocalString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const [actionType, setActionType] = useState<ActionType>("INVESTIGATION");
  const [timeSpentMinutes, setTimeSpentMinutes] = useState<number>(30);
  const [performedAt, setPerformedAt] = useState<string>(getNowLocalString);
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nowMax = getNowLocalString();

  // Field validations
  const trimmedDesc = description.trim();
  const descError =
    touched.description &&
    (trimmedDesc.length < 10 || trimmedDesc.length > 2000
      ? "Description must be between 10 and 2000 characters."
      : null);

  const trimmedResult = result.trim();
  const resultError =
    touched.result &&
    (trimmedResult.length < 1 || trimmedResult.length > 2000
      ? "Result must be between 1 and 2000 characters."
      : null);

  const timeError =
    touched.timeSpentMinutes &&
    (!Number.isInteger(timeSpentMinutes) || timeSpentMinutes < 1 || timeSpentMinutes > 1440
      ? "Duration must be an integer between 1 and 1440 minutes."
      : null);

  const trimmedFollowUp = followUpNote.trim();
  const followUpError =
    followUpRequired &&
    touched.followUpNote &&
    (trimmedFollowUp.length < 3
      ? "Follow-up note must be at least 3 characters."
      : trimmedFollowUp.length > 1000
      ? "Follow-up note cannot exceed 1000 characters."
      : null);

  const isFormValid =
    trimmedDesc.length >= 10 &&
    trimmedDesc.length <= 2000 &&
    trimmedResult.length >= 1 &&
    trimmedResult.length <= 2000 &&
    timeSpentMinutes >= 1 &&
    timeSpentMinutes <= 1440 &&
    (!followUpRequired || (trimmedFollowUp.length >= 3 && trimmedFollowUp.length <= 1000));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      description: true,
      result: true,
      timeSpentMinutes: true,
      performedAt: true,
      followUpNote: true,
    });
    setErrorBanner(null);

    if (new Date(performedAt).getTime() > Date.now()) {
      setErrorBanner("Action cannot be logged in the future.");
      return;
    }

    if (!isFormValid) {
      if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
        setErrorBanner("Description must be between 10 and 2000 characters.");
      } else if (trimmedResult.length < 1 || trimmedResult.length > 2000) {
        setErrorBanner("Result must be between 1 and 2000 characters.");
      } else if (followUpRequired && trimmedFollowUp.length < 3) {
        setErrorBanner("Follow-up note must be at least 3 characters.");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateActionPayload = {
        description: trimmedDesc,
        result: trimmedResult,
        actionType,
        timeSpentMinutes,
        performedAt: new Date(performedAt).toISOString(),
        followUpRequired,
        followUpNote: followUpRequired ? trimmedFollowUp : null,
        attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
      };

      await createTicketAction(ticketId, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorBanner(err.message || "Failed to log action.");
      } else {
        setErrorBanner("An unexpected error occurred while saving the action.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      data-testid="log-action-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-action-modal-title"
      style={{
        backgroundColor: "rgba(16, 24, 40, 0.6)",
        zIndex: 1050,
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
            style={{ backgroundColor: "#F9FAFB", borderColor: "#EAECF0" }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="fs-5" aria-hidden="true">📋</span>
              <h5
                id="log-action-modal-title"
                className="modal-title fw-bold text-dark m-0"
                style={{ fontSize: "1.1rem" }}
              >
                Log Action Taken
              </h5>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={isSubmitting}
            />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Body */}
            <div className="modal-body p-4">
              {errorBanner && (
                <div className="alert alert-danger py-2 px-3 small mb-3" role="alert" data-testid="log-action-error">
                  {errorBanner}
                </div>
              )}

              {/* Row 1: Performed By (read-only) & Action Type */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label htmlFor="log-performed-by" className="form-label fw-semibold small text-secondary">
                    Performed By
                  </label>
                  <input
                    id="log-performed-by"
                    type="text"
                    className="form-control form-control-sm bg-light text-muted"
                    value={staffName || "Current Staff User"}
                    readOnly
                    aria-readonly="true"
                  />
                  <div className="form-text text-muted" style={{ fontSize: "0.75rem" }}>
                    Auto-derived from your active staff session.
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="log-action-type" className="form-label fw-semibold small text-secondary">
                    Action Type <span className="text-danger">*</span>
                  </label>
                  <select
                    id="log-action-type"
                    className="form-select form-select-sm"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as ActionType)}
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Duration & Timestamp */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label htmlFor="log-time-spent" className="form-label fw-semibold small text-secondary">
                    Time Spent (Minutes) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group input-group-sm mb-2">
                    <input
                      id="log-time-spent"
                      type="number"
                      step={5}
                      min={1}
                      max={1440}
                      className={`form-control ${timeError ? "is-invalid" : ""}`}
                      value={timeSpentMinutes}
                      onChange={(e) => setTimeSpentMinutes(parseInt(e.target.value, 10) || 0)}
                      onBlur={() => setTouched((prev) => ({ ...prev, timeSpentMinutes: true }))}
                    />
                    <span className="input-group-text">mins</span>
                    {timeError && <div className="invalid-feedback">{timeError}</div>}
                  </div>
                  {/* Preset Buttons */}
                  <div className="d-flex flex-wrap gap-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        data-testid={`preset-${p.label.toLowerCase()}`}
                        className={`btn btn-xs py-0 px-2 rounded-pill ${
                          timeSpentMinutes === p.value
                            ? "btn-success text-white"
                            : "btn-outline-secondary"
                        }`}
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => {
                          setTimeSpentMinutes(p.value);
                          setTouched((prev) => ({ ...prev, timeSpentMinutes: true }));
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="log-performed-at" className="form-label fw-semibold small text-secondary">
                    Performed At <span className="text-danger">*</span>
                  </label>
                  <input
                    id="log-performed-at"
                    type="datetime-local"
                    max={nowMax}
                    className="form-control form-control-sm"
                    value={performedAt}
                    onChange={(e) => setPerformedAt(e.target.value)}
                  />
                  <div className="form-text text-muted" style={{ fontSize: "0.75rem" }}>
                    Cannot be set to a future time.
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="log-description" className="form-label fw-semibold small text-secondary m-0">
                    Technical Description <span className="text-danger">*</span>
                  </label>
                  <span
                    className={`small ${
                      trimmedDesc.length < 10 || trimmedDesc.length > 2000
                        ? "text-danger"
                        : "text-muted"
                    }`}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {trimmedDesc.length} / 2000 chars (min 10)
                  </span>
                </div>
                <textarea
                  id="log-description"
                  rows={3}
                  className={`form-control form-control-sm ${descError ? "is-invalid" : ""}`}
                  placeholder="Detail diagnostic procedures, tests, or hardware/software modifications performed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                />
                {descError && <div className="invalid-feedback">{descError}</div>}
              </div>

              {/* Result */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="log-result" className="form-label fw-semibold small text-secondary m-0">
                    Action Result / Outcome <span className="text-danger">*</span>
                  </label>
                  <span
                    className={`small ${trimmedResult.length > 2000 ? "text-danger" : "text-muted"}`}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {trimmedResult.length} / 2000 chars
                  </span>
                </div>
                <textarea
                  id="log-result"
                  rows={2}
                  className={`form-control form-control-sm ${resultError ? "is-invalid" : ""}`}
                  placeholder="Outcome of this action (e.g., Connection verified at 1Gbps, configuration rebooted)..."
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, result: true }))}
                />
                {resultError && <div className="invalid-feedback">{resultError}</div>}
              </div>

              {/* Follow-up Required Checkbox */}
              <div className="mb-3 p-3 rounded bg-light border">
                <div className="form-check form-switch m-0">
                  <input
                    id="log-followup-toggle"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={followUpRequired}
                    onChange={(e) => {
                      setFollowUpRequired(e.target.checked);
                      if (e.target.checked) {
                        setTouched((prev) => ({ ...prev, followUpNote: true }));
                      }
                    }}
                  />
                  <label htmlFor="log-followup-toggle" className="form-check-label fw-semibold small text-dark">
                    Follow-Up Action Required?
                  </label>
                </div>

                {followUpRequired && (
                  <div className="mt-3 pt-2 border-top">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label htmlFor="log-followup-note" className="form-label fw-semibold small text-danger m-0">
                        Follow-Up Note <span className="text-danger">*</span>
                      </label>
                      <span className="small text-muted" style={{ fontSize: "0.75rem" }}>
                        {trimmedFollowUp.length} / 1000 chars (min 3)
                      </span>
                    </div>
                    <textarea
                      id="log-followup-note"
                      data-testid="action-followup-note"
                      rows={2}
                      className={`form-control form-control-sm ${followUpError ? "is-invalid" : ""}`}
                      placeholder="Specify required follow-up (e.g., Schedule maintenance window for switch replacement)..."
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, followUpNote: true }))}
                    />
                    {followUpError && <div className="invalid-feedback">{followUpError}</div>}
                  </div>
                )}
              </div>

              {/* Attachment Notes (Optional) */}
              <div className="mb-2">
                <label htmlFor="log-attachment-notes" className="form-label fw-semibold small text-secondary">
                  Attachment Notes <span className="text-muted fw-normal">(Optional)</span>
                </label>
                <input
                  id="log-attachment-notes"
                  type="text"
                  maxLength={1000}
                  className="form-control form-control-sm"
                  placeholder="Reference files or log extracts uploaded for this action..."
                  value={attachmentNotes}
                  onChange={(e) => setAttachmentNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              className="modal-footer border-top py-3 px-4 d-flex justify-content-between"
              style={{ backgroundColor: "#F9FAFB", borderColor: "#EAECF0" }}
            >
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-action-btn"
                className="btn btn-primary btn-sm px-4 text-white fw-semibold"
                style={{
                  backgroundColor: "var(--zg-primary, #006B3C)",
                  borderColor: "var(--zg-primary, #006B3C)",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  "Save Action"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
