import React, { useState, useEffect } from "react";
import { ActionTakenItem, updateTicketAction, fetchTicketActions, UpdateActionPayload, ActionType, ApiError } from "../api.js";
import { ConcurrencyConflictDialog } from "./ConcurrencyConflictDialog.js";

interface EditActionModalProps {
  isOpen: boolean;
  ticketId: number;
  action: ActionTakenItem | null;
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

export const EditActionModal: React.FC<EditActionModalProps> = ({
  isOpen,
  ticketId,
  action,
  onClose,
  onSuccess,
}) => {
  const [actionType, setActionType] = useState<ActionType>("INVESTIGATION");
  const [timeSpentMinutes, setTimeSpentMinutes] = useState<number>(30);
  const [performedAt, setPerformedAt] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");

  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Concurrency conflict state
  const [conflictOpen, setConflictOpen] = useState<boolean>(false);
  const [conflictServerRecord, setConflictServerRecord] = useState<ActionTakenItem | null>(null);
  const [conflictServerUpdatedAt, setConflictServerUpdatedAt] = useState<string | null>(null);

  const formatLocalInputString = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (action) {
      setActionType((action.actionType as ActionType) || "INVESTIGATION");
      setTimeSpentMinutes(action.timeSpentMinutes || 30);
      setPerformedAt(formatLocalInputString(action.performedAt || action.actionDateTime));
      setDescription(action.description || "");
      setResult(action.result || "");
      setFollowUpRequired(action.followUpRequired || false);
      setFollowUpNote(action.followUpNote || "");
      setAttachmentNotes(action.attachmentNotes || "");
      setExpectedUpdatedAt(action.updatedAt || "");
      setErrorBanner(null);
      setTouched({});
      setConflictOpen(false);
    }
  }, [action]);

  if (!isOpen || !action) return null;

  const nowMax = formatLocalInputString(new Date().toISOString());

  const trimmedDesc = description.trim();
  const descError =
    touched.description &&
    (trimmedDesc.length < 10
      ? "Description must be at least 10 characters."
      : trimmedDesc.length > 2000
      ? "Description cannot exceed 2000 characters."
      : null);

  const trimmedResult = result.trim();
  const resultError =
    touched.result &&
    (trimmedResult.length < 1
      ? "Action result is required."
      : trimmedResult.length > 2000
      ? "Result cannot exceed 2000 characters."
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
      ? "Follow-up note is required (at least 3 characters)."
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

  const getCurrentDraftPayload = (): UpdateActionPayload => ({
    expectedUpdatedAt,
    description: trimmedDesc,
    result: trimmedResult,
    actionType,
    timeSpentMinutes,
    performedAt: performedAt ? new Date(performedAt).toISOString() : undefined,
    followUpRequired,
    followUpNote: followUpRequired ? trimmedFollowUp : null,
    attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      description: true,
      result: true,
      timeSpentMinutes: true,
      followUpNote: true,
    });
    setErrorBanner(null);

    if (!isFormValid) return;

    if (performedAt && new Date(performedAt).getTime() > Date.now()) {
      setErrorBanner("Action timestamp cannot be set in the future.");
      return;
    }

    setIsSubmitting(true);
    const payload = getCurrentDraftPayload();

    try {
      await updateTicketAction(ticketId, action.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 409 || err.code === "STALE_ACTION_CONFLICT")) {
        const details = err.details;
        setConflictServerRecord(details?.currentRecord || null);
        setConflictServerUpdatedAt(details?.currentUpdatedAt || null);
        setConflictOpen(true);
      } else if (err instanceof ApiError) {
        setErrorBanner(err.message || "Failed to update action record.");
      } else {
        setErrorBanner("An unexpected error occurred while saving changes.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReloadLatest = async (latestRecord?: ActionTakenItem | null, latestUpdatedAt?: string | null) => {
    let recordToApply = latestRecord;
    let updatedAtToApply = latestUpdatedAt;

    if (!recordToApply) {
      const res = await fetchTicketActions(ticketId);
      const found = (res.data || []).find((a) => a.id === action.id);
      if (!found) {
        throw new Error("Action record was not found on server.");
      }
      recordToApply = found;
      updatedAtToApply = found.updatedAt;
    }

    setActionType((recordToApply.actionType as ActionType) || "INVESTIGATION");
    setTimeSpentMinutes(recordToApply.timeSpentMinutes || 30);
    setPerformedAt(formatLocalInputString(recordToApply.performedAt || recordToApply.actionDateTime));
    setDescription(recordToApply.description || "");
    setResult(recordToApply.result || "");
    setFollowUpRequired(recordToApply.followUpRequired || false);
    setFollowUpNote(recordToApply.followUpNote || "");
    setAttachmentNotes(recordToApply.attachmentNotes || "");
    setExpectedUpdatedAt(updatedAtToApply || recordToApply.updatedAt || "");

    setConflictOpen(false);
    setErrorBanner(null);
  };

  return (
    <>
      <div
        className="modal show d-block"
        data-testid="edit-action-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-action-modal-title"
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
                <span className="fs-5" aria-hidden="true">✏️</span>
                <h5
                  id="edit-action-modal-title"
                  className="modal-title fw-bold text-dark m-0"
                  style={{ fontSize: "1.1rem" }}
                >
                  Edit Action Taken #{action.id}
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
                  <div className="alert alert-danger py-2 px-3 small mb-3" role="alert" data-testid="edit-action-error">
                    {errorBanner}
                  </div>
                )}

                {/* Row 1: Performed By (read-only) & Action Type */}
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-performed-by" className="form-label fw-semibold small text-secondary">
                      Recorded By
                    </label>
                    <input
                      id="edit-performed-by"
                      type="text"
                      className="form-control form-control-sm bg-light text-muted"
                      value={action.performedBy?.fullName || "Staff User"}
                      readOnly
                      aria-readonly="true"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-action-type" className="form-label fw-semibold small text-secondary">
                      Action Type <span className="text-danger">*</span>
                    </label>
                    <select
                      id="edit-action-type"
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
                    <label htmlFor="edit-time-spent" className="form-label fw-semibold small text-secondary">
                      Time Spent (Minutes) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        id="edit-time-spent"
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
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-performed-at" className="form-label fw-semibold small text-secondary">
                      Performed At <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-performed-at"
                      type="datetime-local"
                      max={nowMax}
                      className="form-control form-control-sm"
                      value={performedAt}
                      onChange={(e) => setPerformedAt(e.target.value)}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label htmlFor="edit-description" className="form-label fw-semibold small text-secondary m-0">
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
                    id="edit-description"
                    rows={3}
                    className={`form-control form-control-sm ${descError ? "is-invalid" : ""}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                  />
                  {descError && <div className="invalid-feedback">{descError}</div>}
                </div>

                {/* Result */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label htmlFor="edit-result" className="form-label fw-semibold small text-secondary m-0">
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
                    id="edit-result"
                    rows={2}
                    className={`form-control form-control-sm ${resultError ? "is-invalid" : ""}`}
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
                      id="edit-followup-toggle"
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
                    <label htmlFor="edit-followup-toggle" className="form-check-label fw-semibold small text-dark">
                      Follow-Up Action Required?
                    </label>
                  </div>

                  {followUpRequired && (
                    <div className="mt-3 pt-2 border-top">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label htmlFor="edit-followup-note" className="form-label fw-semibold small text-danger m-0">
                          Follow-Up Note <span className="text-danger">*</span>
                        </label>
                        <span className="small text-muted" style={{ fontSize: "0.75rem" }}>
                          {trimmedFollowUp.length} / 1000 chars (min 3)
                        </span>
                      </div>
                      <textarea
                        id="edit-followup-note"
                        data-testid="edit-followup-note"
                        rows={2}
                        className={`form-control form-control-sm ${followUpError ? "is-invalid" : ""}`}
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        onBlur={() => setTouched((prev) => ({ ...prev, followUpNote: true }))}
                      />
                      {followUpError && <div className="invalid-feedback">{followUpError}</div>}
                    </div>
                  )}
                </div>

                {/* Attachment Notes */}
                <div className="mb-2">
                  <label htmlFor="edit-attachment-notes" className="form-label fw-semibold small text-secondary">
                    Attachment Notes <span className="text-muted fw-normal">(Optional)</span>
                  </label>
                  <input
                    id="edit-attachment-notes"
                    type="text"
                    maxLength={1000}
                    className="form-control form-control-sm"
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
                  data-testid="submit-edit-btn"
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
                      Saving Changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 409 Concurrency Conflict Dialog */}
      <ConcurrencyConflictDialog
        isOpen={conflictOpen}
        onClose={() => setConflictOpen(false)}
        serverRecord={conflictServerRecord}
        serverUpdatedAt={conflictServerUpdatedAt}
        localDraft={getCurrentDraftPayload()}
        onReloadLatest={handleReloadLatest}
        ticketId={ticketId}
        actionId={action.id}
      />
    </>
  );
};
