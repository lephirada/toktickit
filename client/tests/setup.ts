import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const defaultFetchMock = async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/api/requesters")) {
    return {
      ok: true,
      json: async () => ({
        data: [
          {
            id: 1,
            fullName: "Sarah Connor",
            email: "sarah.connor@toktickit.com",
            department: "Engineering",
            isActive: true,
          },
        ],
      }),
    } as Response;
  }
  if (url.includes("/api/categories")) {
    return {
      ok: true,
      json: async () => [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    } as Response;
  }
  if (url.includes("/api/tickets")) {
    return {
      ok: true,
      json: async () => ({ data: [] }),
    } as Response;
  }
  return {
    ok: true,
    json: async () => ({ status: "ok" }),
  } as Response;
};

// Provide a safe fallback fetch mock to avoid ECONNREFUSED when unmocked in unit tests
globalThis.fetch = vi.fn().mockImplementation(defaultFetchMock);

beforeEach(() => {
  if (!globalThis.fetch || vi.isMockFunction(globalThis.fetch) === false) {
    globalThis.fetch = vi.fn().mockImplementation(defaultFetchMock);
  }
});
