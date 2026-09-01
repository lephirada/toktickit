import React, { useState, useEffect, useRef } from "react";
import {
  Category,
  RelatedSystem,
  AttachmentItem,
  fetchCategories,
  fetchRelatedSystems,
  uploadAttachments,
  createTicket,
  ApiError,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface CreateTicketFormProps {
  onSuccess?: (ticketNo: string) => void;
  onCancel?: () => void;
}

type PriorityType = "P0_URGENT" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "image/jpg",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreateTicketForm({ onSuccess, onCancel }: CreateTicketFormProps) {
  const { currentRequester, setFormDirty, reloadTickets } = useRequester();

  // Taxonomy state
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [isLoadingSystems, setIsLoadingSystems] = useState<boolean>(false);

  // Form field state
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [priority, setPriority] = useState<PriorityType>("P2_MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Attachments state
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation & Submission state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch categories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCats() {
      setIsLoadingCategories(true);
      try {
        const cats = await fetchCategories();
        if (isMounted) {
          setCategories(cats);
        }
      } catch (err) {
        if (isMounted) {
          setGlobalError("Failed to load categories.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    }
    loadCats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch related systems when category changes
  useEffect(() => {
    if (categoryId === "" || typeof categoryId !== "number") {
      setRelatedSystems([]);
      setRelatedSystemId("");
      return;
    }

    let isMounted = true;
    async function loadSystems(catId: number) {
      setIsLoadingSystems(true);
      try {
        const systems = await fetchRelatedSystems(catId);
        if (isMounted) {
          setRelatedSystems(systems);
        }
      } catch (err) {
        if (isMounted) {
          setRelatedSystems([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSystems(false);
        }
      }
    }

    loadSystems(categoryId);
    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  // Handle Category change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const numVal = val ? parseInt(val, 10) : "";
    setCategoryId(numVal);
    setRelatedSystemId("");
    setFormDirty(true);
    if (fieldErrors.categoryId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.categoryId;
        return next;
      });
    }
  };

  // Handle Related System change
  const handleSystemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const numVal = val ? parseInt(val, 10) : "";
    setRelatedSystemId(numVal);
    setFormDirty(true);
    if (fieldErrors.relatedSystemId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.relatedSystemId;
        return next;
      });
    }
  };

  // Handle Summary change
  const handleSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSummary(e.target.value);
    setFormDirty(true);
    if (fieldErrors.summary) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.summary;
        return next;
      });
    }
  };

  // Handle Description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setFormDirty(true);
    if (fieldErrors.description) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.description;
        return next;
      });
    }
  };

  // Handle Priority change
  const handlePrioritySelect = (p: PriorityType) => {
    setPriority(p);
    setFormDirty(true);
  };

  // Process files for upload
  const processFiles = async (selectedFiles: FileList | File[]) => {
    setUploadError("");
    const fileArray = Array.from(selectedFiles);

    if (fileArray.length === 0) return;

    if (attachments.length + fileArray.length > 5) {
      setUploadError("Maximum 5 attachments allowed.");
      return;
    }

    // Client-side file validation
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("File size exceeds 5MB limit.");
        return;
      }

      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
      const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);

      if (!isValidExt && !isValidMime) {
        setUploadError("Allowed file types: JPEG, PNG, WEBP, PDF.");
        return;
      }
    }

    if (!currentRequester) {
      setUploadError("Please select an active requester first.");
      return;
    }

    setIsUploading(true);
    try {
      const response = await uploadAttachments(fileArray, currentRequester.id);
      const newAttachments = response.data || (response as unknown as AttachmentItem[]);
      setAttachments((prev) => [...prev, ...newAttachments]);
      setFormDirty(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setUploadError(err.message);
      } else {
        setUploadError("Failed to upload attachment.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (id: number) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setFormDirty(true);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};

    const trimmedSummary = summary.trim();
    if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.summary = "Summary must be between 5 and 100 characters.";
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters.";
    }

    if (categoryId === "" || typeof categoryId !== "number") {
      errors.categoryId = "Valid category is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!currentRequester) {
      setGlobalError("Active requester context is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        categoryId: categoryId as number,
        relatedSystemId: relatedSystemId ? (relatedSystemId as number) : null,
        priority,
        summary: trimmedSummary,
        description: trimmedDescription,
        attachmentIds: attachments.map((a) => a.id),
      };

      const result = await createTicket(payload, currentRequester.id);
      const createdTicket = result.data || (result as unknown as { ticketNo: string });

      setFormDirty(false);
      await reloadTickets();

      if (onSuccess) {
        onSuccess(createdTicket.ticketNo || "");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          const mapped: Record<string, string> = {};
          for (const fe of err.fieldErrors) {
            mapped[fe.field] = fe.message;
          }
          setFieldErrors(mapped);
        } else {
          setGlobalError(err.message || "Failed to create ticket.");
        }
      } else {
        setGlobalError("Network error: Unable to create ticket. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions: { value: PriorityType; label: string; icon: string; badgeClass: string }[] = [
    { value: "P0_URGENT", label: "P0 Urgent", icon: "⚡", badgeClass: "zg-priority-p0" },
    { value: "P1_HIGH", label: "P1 High", icon: "▲", badgeClass: "zg-priority-p1" },
    { value: "P2_MEDIUM", label: "P2 Medium", icon: "●", badgeClass: "zg-priority-p2" },
    { value: "P3_LOW", label: "P3 Low", icon: "▼", badgeClass: "zg-priority-p3" },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="zg-ticket-form card shadow-sm p-4 border-0 mb-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: "var(--zg-primary)" }}>
            Create New IT Ticket
          </h2>
          <p className="text-secondary small mb-0">
            Reporting as: <strong data-testid="form-active-requester">{currentRequester?.fullName || "Loading…"}</strong>
          </p>
        </div>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <span className="me-2">⚠️</span>
          <div>{globalError}</div>
        </div>
      )}

      {/* Taxonomy 2-Column Grid */}
      <div className="row g-3 mb-3">
        {/* Category Selection */}
        <div className="col-12 col-md-6">
          <label htmlFor="category-select" className="form-label fw-semibold">
            Category <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <select
            id="category-select"
            className={`form-select ${fieldErrors.categoryId ? "is-invalid" : ""}`}
            value={categoryId}
            onChange={handleCategoryChange}
            disabled={isLoadingCategories}
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.categoryId}
            aria-describedby={fieldErrors.categoryId ? "category-error" : undefined}
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && (
            <div id="category-error" className="invalid-feedback d-block" role="alert">
              {fieldErrors.categoryId}
            </div>
          )}
        </div>

        {/* Related System Selection */}
        <div className="col-12 col-md-6">
          <label htmlFor="related-system-select" className="form-label fw-semibold">
            Related System <span className="text-muted fw-normal small">(Optional)</span>
          </label>
          <select
            id="related-system-select"
            className={`form-select ${fieldErrors.relatedSystemId ? "is-invalid" : ""}`}
            value={relatedSystemId}
            onChange={handleSystemChange}
            disabled={!categoryId || isLoadingSystems}
            aria-invalid={!!fieldErrors.relatedSystemId}
            aria-describedby={fieldErrors.relatedSystemId ? "related-system-error" : undefined}
          >
            <option value="">
              {!categoryId ? "Select a category first..." : "-- None / General --"}
            </option>
            {relatedSystems.map((sys) => (
              <option key={sys.id} value={sys.id}>
                {sys.name}
              </option>
            ))}
          </select>
          {fieldErrors.relatedSystemId && (
            <div id="related-system-error" className="invalid-feedback d-block" role="alert">
              {fieldErrors.relatedSystemId}
            </div>
          )}
        </div>
      </div>

      {/* Priority Selection */}
      <div className="mb-3">
        <label className="form-label fw-semibold d-block">
          Priority <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <div
          role="radiogroup"
          aria-label="Ticket Priority"
          className="d-flex flex-wrap gap-2"
        >
          {priorityOptions.map((opt) => {
            const isSelected = priority === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handlePrioritySelect(opt.value)}
                className={`zg-priority-pill btn btn-sm d-flex align-items-center gap-1 px-3 py-2 ${
                  opt.badgeClass
                } ${isSelected ? "selected" : ""}`}
              >
                <span aria-hidden="true">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Input */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <label htmlFor="summary-input" className="form-label fw-semibold">
            Summary <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <span
            id="summary-counter"
            className={`small ${
              summary.length > 100 || (summary.length > 0 && summary.length < 5)
                ? "text-danger"
                : "text-muted"
            }`}
          >
            {summary.length}/100
          </span>
        </div>
        <input
          type="text"
          id="summary-input"
          className={`form-control ${fieldErrors.summary ? "is-invalid" : ""}`}
          placeholder="Brief description of the issue"
          value={summary}
          onChange={handleSummaryChange}
          required
          aria-required="true"
          aria-invalid={!!fieldErrors.summary}
          aria-describedby={`summary-counter ${fieldErrors.summary ? "summary-error" : ""}`}
        />
        {fieldErrors.summary && (
          <div id="summary-error" className="invalid-feedback d-block" role="alert">
            {fieldErrors.summary}
          </div>
        )}
      </div>

      {/* Description Textarea */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <label htmlFor="description-textarea" className="form-label fw-semibold">
            Description <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <span
            id="description-counter"
            className={`small ${
              description.length > 2000 || (description.length > 0 && description.length < 10)
                ? "text-danger"
                : "text-muted"
            }`}
          >
            {description.length}/2000
          </span>
        </div>
        <textarea
          id="description-textarea"
          rows={5}
          className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
          placeholder="Detailed explanation of the issue, error messages, or steps to reproduce..."
          value={description}
          onChange={handleDescriptionChange}
          required
          aria-required="true"
          aria-invalid={!!fieldErrors.description}
          aria-describedby={`description-counter ${fieldErrors.description ? "description-error" : ""}`}
        />
        {fieldErrors.description && (
          <div id="description-error" className="invalid-feedback d-block" role="alert">
            {fieldErrors.description}
          </div>
        )}
      </div>

      {/* Pre-upload Attachment Dropzone */}
      <div className="mb-4">
        <label className="form-label fw-semibold d-block mb-1">
          Attachments <span className="text-muted fw-normal small">Allowed formats: JPEG, PNG, WEBP, PDF (Max 5MB per file)</span>
        </label>

        {/* Dropzone Container */}
        <div
          className={`zg-dropzone p-4 text-center border-dashed rounded-3 ${
            isDragging ? "active" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-live="polite"
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload-input"
            className="visually-hidden"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileInputChange}
            disabled={isUploading || attachments.length >= 5}
          />
          <div className="mb-2">
            <span className="fs-3" aria-hidden="true">📁</span>
          </div>
          <p className="mb-1 text-dark fw-medium">
            Drag &amp; drop files here or{" "}
            <label
              htmlFor="file-upload-input"
              className="text-success text-decoration-underline"
              style={{ cursor: attachments.length >= 5 || isUploading ? "not-allowed" : "pointer" }}
            >
              Browse
            </label>
          </p>
          <p className="text-muted small mb-0">
            {attachments.length}/5 files attached
          </p>

          {isUploading && (
            <div className="mt-3 text-success d-flex align-items-center justify-content-center gap-2">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span className="small fw-semibold">Uploading attachments…</span>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="text-danger small mt-2 d-flex align-items-center gap-1" role="alert">
            <span>❌</span>
            <span>{uploadError}</span>
          </div>
        )}

        {fieldErrors.attachmentIds && (
          <div className="invalid-feedback d-block mt-2" role="alert">
            {fieldErrors.attachmentIds}
          </div>
        )}

        {/* Attachment Chips */}
        {attachments.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mt-3" data-testid="attachments-list">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="zg-attachment-chip d-flex align-items-center gap-2 px-3 py-2 rounded-3 border bg-white shadow-sm"
                data-testid={`attachment-chip-${att.id}`}
              >
                <span className="text-success" aria-hidden="true">📎</span>
                <span className="small fw-medium text-dark text-truncate" style={{ maxWidth: 200 }}>
                  {att.originalName}
                </span>
                <span className="text-muted small">({formatFileSize(att.sizeBytes)})</span>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0 ms-1"
                  onClick={() => handleRemoveAttachment(att.id)}
                  aria-label={`Remove ${att.originalName}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="d-flex justify-content-end gap-2 pt-3 border-top">
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline-secondary px-4"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-success px-4 d-flex align-items-center gap-2"
          disabled={isSubmitting}
          data-testid="submit-ticket-btn"
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Submitting…</span>
            </>
          ) : (
            <span>Submit Ticket</span>
          )}
        </button>
      </div>
    </form>
  );
}
