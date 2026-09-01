import React, { useEffect, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";

export default function DirtyGuardModal() {
  const { isDirtyModalOpen, confirmDiscard, cancelDiscard } = useRequester();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isDirtyModalOpen) {
      cancelBtnRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          cancelDiscard();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isDirtyModalOpen, cancelDiscard]);

  if (!isDirtyModalOpen) {
    return null;
  }

  return (
    <div
      className="zg-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dirty-modal-title"
      aria-describedby="dirty-modal-desc"
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
            onClick={cancelDiscard}
          >
            Cancel / Stay
          </button>
          <button
            type="button"
            className="btn btn-danger px-3"
            onClick={confirmDiscard}
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}
