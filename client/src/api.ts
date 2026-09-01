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
