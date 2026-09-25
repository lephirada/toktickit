const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  categoryId: number;
}

export interface AttachmentItem {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  isSoftDeleted?: boolean;
}

export interface CreateTicketDTO {
  categoryId: number;
  relatedSystemId?: number | null;
  priority: "P0_URGENT" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW" | string;
  summary: string;
  description: string;
  attachmentIds?: number[];
}

export interface TicketItem {
  id: number;
  ticketNo: string;
  summary: string;
  description?: string;
  priority: string;
  requestedPriority?: string;
  itPriority?: string | null;
  status: string;
  resolutionIndicated?: boolean;
  categoryId: number;
  relatedSystemId?: number | null;
  requesterId: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  relatedSystem?: { id: number; name: string } | null;
  attachments?: AttachmentItem[];
  attachmentCount?: number;
  requester?: {
    id: number;
    email: string;
    fullName: string;
    department?: string;
    isActive?: boolean;
  };
}

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  code?: string;
  fieldErrors?: FieldError[];
  status?: number;

  constructor(message: string, code?: string, fieldErrors?: FieldError[], status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`, { credentials: "include" });
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`, { credentials: "include" });
  if (!categoriesRes.ok) {
    throw new Error("Unable to fetch categories");
  }

  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to fetch categories");
  }
  const body = await res.json();
  return body.data ?? body;
}

export async function fetchRelatedSystems(categoryId?: number): Promise<RelatedSystem[]> {
  const url = categoryId !== undefined
    ? `${API_URL}/api/related-systems?categoryId=${categoryId}`
    : `${API_URL}/api/related-systems`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to fetch related systems");
  }
  const body = await res.json();
  return body.data ?? body;
}

// ---------------------------------------------------------------------------
// Authentication & Session Endpoints
// ---------------------------------------------------------------------------

export async function login(credentials: { email: string; password: string }): Promise<{ data: AuthUser }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || "Invalid email or password.",
      errorObj?.code || "INVALID_CREDENTIALS",
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {
    // Permissive logout
  });
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });

  if (!res.ok) {
    return null;
  }

  const body = await res.json().catch(() => null);
  return body?.data ?? null;
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ data: { message: string; mustChangePassword: boolean } }> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || "Failed to change password",
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

// ---------------------------------------------------------------------------
// Tickets & Attachments Endpoints
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  pageSize: number;
  limit?: number;
  totalItems: number;
  totalCount?: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TicketQueryParams {
  search?: string;
  categoryId?: number;
  priority?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface FetchTicketsResponse {
  data: TicketItem[];
  pagination: PaginationMeta;
}

export async function fetchTickets(params?: TicketQueryParams): Promise<FetchTicketsResponse> {
  const query = new URLSearchParams();
  if (params) {
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.categoryId !== undefined && params.categoryId !== null && !isNaN(params.categoryId)) {
      query.set("categoryId", String(params.categoryId));
    }
    if (params.priority && params.priority !== "ALL") query.set("priority", params.priority);
    if (params.status && params.status !== "ALL") query.set("status", params.status);
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
  }

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_URL}/api/tickets${queryString}`, {
    credentials: "include",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || "Unable to fetch tickets",
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  const rawList: TicketItem[] = Array.isArray(body) ? body : body.data || [];
  const pagination: PaginationMeta = body.pagination || {
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
    limit: params?.pageSize || 10,
    totalItems: rawList.length,
    totalCount: rawList.length,
    totalPages: Math.ceil(rawList.length / (params?.pageSize || 10)) || 1,
    hasNext: false,
    hasPrev: false,
  };

  return {
    data: rawList,
    pagination,
  };
}

export interface StaffTicketItem {
  id: number;
  ticketNo: string;
  summary: string;
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  resolutionIndicated: boolean;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    fullName: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  };
  relatedSystem?: {
    id: number;
    name: string;
  } | null;
  owner?: {
    id: number;
    fullName: string;
    email?: string;
  } | null;
}

export interface StaffTicketQueryParams {
  search?: string;
  categoryId?: number;
  requestedPriority?: string;
  itPriority?: string;
  status?: string;
  owner?: "ALL" | "UNASSIGNED" | "MY_TICKETS" | string;
  sortBy?: "createdAt" | "itPriority" | "status" | "updatedAt" | string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface FetchStaffTicketsResponse {
  data: StaffTicketItem[];
  pagination: PaginationMeta;
}

export async function fetchStaffTickets(
  params?: StaffTicketQueryParams
): Promise<FetchStaffTicketsResponse> {
  const query = new URLSearchParams();
  if (params) {
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.categoryId !== undefined && params.categoryId !== null && !isNaN(params.categoryId)) {
      query.set("categoryId", String(params.categoryId));
    }
    if (params.requestedPriority && params.requestedPriority !== "ALL") {
      query.set("requestedPriority", params.requestedPriority);
    }
    if (params.itPriority && params.itPriority !== "ALL") {
      query.set("itPriority", params.itPriority);
    }
    if (params.status && params.status !== "ALL") {
      query.set("status", params.status);
    }
    if (params.owner && params.owner !== "ALL") {
      query.set("owner", params.owner);
    }
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
  }

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_URL}/api/staff/tickets${queryString}`, {
    credentials: "include",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || "Unable to fetch staff tickets",
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  const rawList: StaffTicketItem[] = Array.isArray(body) ? body : body.data || [];
  const pagination: PaginationMeta = body.pagination || {
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
    totalItems: rawList.length,
    totalPages: Math.ceil(rawList.length / (params?.pageSize || 10)) || 1,
    hasNext: false,
    hasPrev: false,
  };

  return {
    data: rawList,
    pagination,
  };
}

export async function uploadAttachments(files: File[]): Promise<{ data: AttachmentItem[] }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch(`${API_URL}/api/attachments/pre-upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Upload failed with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function createTicket(payload: CreateTicketDTO): Promise<{ data: TicketItem }> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to create ticket with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export interface TicketDetailAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status?: "ACTIVE" | "REMOVED" | string;
  isSoftDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: number | null;
  deletionReason?: string | null;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  action: string;
  message: string;
  timestamp: string;
  actor?: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PublicCommentItem {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  content: string;
  body?: string;
  createdAt: string;
}

export interface TicketDetailItem {
  id: number;
  ticketNo: string;
  summary: string;
  description: string;
  priority: string;
  requestedPriority?: string;
  itPriority?: string | null;
  status: string;
  resolutionIndicated?: boolean;
  requesterId: number;
  requester: {
    id: number;
    fullName: string;
    displayName?: string;
    email: string;
    department: string;
  };
  category: {
    id: number;
    name: string;
  };
  relatedSystem?: {
    id: number;
    name: string;
  } | null;
  attachments: TicketDetailAttachment[];
  comments?: PublicCommentItem[];
  activityTimeline: TimelineEvent[];
  timeline?: TimelineEvent[];
  activityHistory?: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchTicketDetail(ticketId: number): Promise<TicketDetailItem> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    credentials: "include",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to fetch ticket with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body.data ?? body;
}

export async function removeAttachment(
  attachmentId: number,
  payload: { reason: string; customReason?: string }
): Promise<TicketDetailAttachment> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to remove attachment with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body.data ?? body;
}

export async function addAttachmentToTicket(
  ticketId: number,
  file: File
): Promise<TicketDetailAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to add attachment with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body.data ?? body;
}

export function getAttachmentDownloadUrl(attachmentId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download`;
}

export async function downloadAttachment(
  attachmentId: number,
  originalName: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    credentials: "include",
  });

  if (res.status === 410) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.error?.message || body?.error || body?.message || "Attachment has been removed",
      "ATTACHMENT_SOFT_DELETED",
      undefined,
      410
    );
  }

  if (!res.ok) {
    throw new ApiError(
      `Download failed with status ${res.status}`,
      undefined,
      undefined,
      res.status
    );
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

// ---------------------------------------------------------------------------
// Discussion & Resolution Confirmation Endpoints
// ---------------------------------------------------------------------------

export async function fetchPublicComments(ticketId: number): Promise<{ data: PublicCommentItem[] }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    credentials: "include",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to fetch comments with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function postPublicComment(
  ticketId: number,
  content: string
): Promise<{ data: PublicCommentItem }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to post comment with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function confirmProblemResolved(
  ticketId: number,
  feedbackComment?: string
): Promise<{ data: { id: number; ticketNo: string; status: string; resolutionIndicated: boolean; message: string } }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/confirm-resolved`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(feedbackComment ? { feedbackComment } : {}),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to confirm resolution with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

// ===========================================================================
// Issue 15 — Staff Ticket Operations
// ===========================================================================

export interface StaffUserItem {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface InternalNoteItem {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  content: string;
  body?: string;
  createdAt: string;
}

export interface TicketActivityItem {
  id: string | number;
  type: string;
  action: string;
  message: string;
  timestamp: string;
  actor: string;
  metadata?: Record<string, unknown>;
}

export interface StaffTicketDetailData extends TicketItem {
  requestedPriority?: string;
  itPriority?: string | null;
  ownerId?: number | null;
  owner?: StaffUserItem | null;
  resolutionSummary?: string | null;
  cancellationReason?: string | null;
  reopenReason?: string | null;
  comments?: PublicCommentItem[];
  activityTimeline?: TicketActivityItem[];
}

export async function fetchStaffUsers(): Promise<{ data: StaffUserItem[] }> {
  const res = await fetch(`${API_URL}/api/staff/users`, {
    credentials: "include",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to fetch staff users with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function fetchStaffTicketDetail(
  ticketId: number
): Promise<{ data: StaffTicketDetailData }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
    credentials: "include",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to fetch ticket detail with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function claimTicket(
  ticketId: number
): Promise<{ data: StaffTicketDetailData }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to claim ticket with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function reassignTicket(
  ticketId: number,
  ownerId: number,
  expectedOwnerId?: number | null
): Promise<{ data: StaffTicketDetailData }> {
  const payload: { ownerId: number; expectedOwnerId?: number | null } = { ownerId };
  if (expectedOwnerId !== undefined) {
    payload.expectedOwnerId = expectedOwnerId;
  }
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to reassign ticket with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function updateTicketPriority(
  ticketId: number,
  itPriority: string
): Promise<{ data: StaffTicketDetailData }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ itPriority }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to update priority with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export interface UpdateStatusPayload {
  status: string;
  resolutionSummary?: string;
  cancellationReason?: string;
  reopenReason?: string;
}

export async function updateTicketStatus(
  ticketId: number,
  payload: UpdateStatusPayload
): Promise<{ data: StaffTicketDetailData }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to update status with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function fetchInternalNotes(
  ticketId: number
): Promise<{ data: InternalNoteItem[] }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/notes`, {
    credentials: "include",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to fetch notes with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function postInternalNote(
  ticketId: number,
  content: string
): Promise<{ data: InternalNoteItem }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to post note with status ${res.status}`,
      errorObj?.code,
      errorObj?.details?.fieldErrors,
      res.status
    );
  }

  return body;
}

