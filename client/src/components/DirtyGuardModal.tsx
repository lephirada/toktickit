import React, { useEffect, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";

export interface DirtyGuardModalProps {
  isOpen?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function DirtyGuardModal({
  isOpen,
  onConfirm,
  onCancel,
}: DirtyGuardModalProps = {}) {
  const context = useRequester();
  const isModalOpen = isOpen !== undefined ? isOpen : context.isDirtyModalOpen;
  const handleConfirm = onConfirm || context.confirmDiscard;
  const handleCancel = onCancel || context.cancelDiscard;
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      cancelBtnRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          handleCancel();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isModalOpen, handleCancel]);

  if (!isModalOpen) {
    return null;
  }

  return (
    <div
      className="zg-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dirty-modal-title"
      aria-describedby="dirty-modal-desc"
      data-testid="dirty-guard-modal"
    >
      <div className="zg-modal-card">
        <h2 id="dirty-modal-title" className="h5 fw-bold mb-3 text-dark">
          Unsaved Changes
        </h2>
        <p id="dirty-modal-desc" className="text-secondary mb-4">
          You have unsaved ticket details. Leaving this page will discard your changes. Are you sure you want to proceed?
        </p>

        <div className="d-flex justify-content-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn btn-outline-secondary px-3"
            onClick={handleCancel}
            aria-label="Cancel"
            data-testid="dirty-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger px-3"
            onClick={handleConfirm}
            data-testid="dirty-discard-btn"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}
