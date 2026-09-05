const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  categoryId: number;
}

export interface RequesterUser {
  id: number;
  email: string;
  fullName: string;
  department: string;
  isActive: boolean;
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
  status: string;
  categoryId: number;
  relatedSystemId?: number | null;
  requesterId: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  relatedSystem?: { id: number; name: string } | null;
  attachments?: AttachmentItem[];
  attachmentCount?: number;
  requester?: RequesterUser;
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
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error("Unable to fetch categories");
  }

  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

export async function fetchRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Unable to fetch requesters");
  }
  const body = await res.json();
  return body.data ?? body;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Unable to fetch related systems");
  }
  const body = await res.json();
  return body.data ?? body;
}

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

export async function fetchTickets(
  requesterId?: number,
  params?: TicketQueryParams
): Promise<FetchTicketsResponse> {
  const headers: Record<string, string> = {};
  if (requesterId) {
    headers["X-Requester-Id"] = String(requesterId);
  }

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
  const res = await fetch(`${API_URL}/api/tickets${queryString}`, { headers });
  if (!res.ok) {
    throw new Error("Unable to fetch tickets");
  }
  const body = await res.json();
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

export async function uploadAttachments(
  files: File[],
  requesterId: number
): Promise<{ data: AttachmentItem[] }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch(`${API_URL}/api/attachments/pre-upload`, {
    method: "POST",
    headers: {
      "X-Requester-Id": String(requesterId),
    },
    body: formData,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Upload failed with status ${res.status}`,
      errorObj?.code,
      errorObj?.fieldErrors,
      res.status
    );
  }

  return body;
}

export async function createTicket(
  payload: CreateTicketDTO,
  requesterId: number
): Promise<{ data: TicketItem }> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requester-Id": String(requesterId),
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = body?.error;
    throw new ApiError(
      errorObj?.message || `Failed to create ticket with status ${res.status}`,
      errorObj?.code,
      errorObj?.fieldErrors,
      res.status
    );
  }

  return body;
}
