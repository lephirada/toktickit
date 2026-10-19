import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { resolveAllowedView } from "../../src/App.js";
import StaffTicketQueue, { getInitialQueueFilters } from "../../src/components/StaffTicketQueue.js";
import * as api from "../../src/api.js";

describe("Dashboard Routing & Query Filter Integration (Lab 4 Issue #24)", () => {
  describe("resolveAllowedView route guards & role boundaries", () => {
    it("redirects unauthenticated users from dashboard paths to /login", () => {
      expect(resolveAllowedView("/dashboard", null)).toEqual({
        view: "login",
        path: "/login",
      });
      expect(resolveAllowedView("/staff/dashboard", null)).toEqual({
        view: "login",
        path: "/login",
      });
    });

    it("locks user to /change-password if mustChangePassword is true", () => {
      expect(
        resolveAllowedView("/dashboard", { role: "REQUESTER" }, true)
      ).toEqual({
        view: "change-password",
        path: "/change-password",
      });
      expect(
        resolveAllowedView("/staff/dashboard", { role: "IT_STAFF" }, true)
      ).toEqual({
        view: "change-password",
        path: "/change-password",
      });
    });

    it("resolves /dashboard to requester-dashboard for REQUESTER role", () => {
      expect(
        resolveAllowedView("/dashboard", { role: "REQUESTER" }, false)
      ).toEqual({
        view: "requester-dashboard",
        path: "/dashboard",
      });
    });

    it("blocks REQUESTER from accessing /staff/dashboard and redirects to safe view", () => {
      expect(
        resolveAllowedView("/staff/dashboard", { role: "REQUESTER" }, false)
      ).toEqual({
        view: "my-tickets",
        path: "/my-tickets",
      });
    });

    it("resolves /staff/dashboard and /dashboard to staff-dashboard for IT_STAFF", () => {
      expect(
        resolveAllowedView("/staff/dashboard", { role: "IT_STAFF" }, false)
      ).toEqual({
        view: "staff-dashboard",
        path: "/staff/dashboard",
      });
      expect(
        resolveAllowedView("/dashboard", { role: "IT_STAFF" }, false)
      ).toEqual({
        view: "staff-dashboard",
        path: "/staff/dashboard",
      });
    });

    it("resolves /staff/dashboard and /dashboard to staff-dashboard for ADMINISTRATOR", () => {
      expect(
        resolveAllowedView("/staff/dashboard", { role: "ADMINISTRATOR" }, false)
      ).toEqual({
        view: "staff-dashboard",
        path: "/staff/dashboard",
      });
      expect(
        resolveAllowedView("/dashboard", { role: "ADMINISTRATOR" }, false)
      ).toEqual({
        view: "staff-dashboard",
        path: "/staff/dashboard",
      });
    });

    it("allows ADMINISTRATOR to access /admin/users while blocking IT_STAFF", () => {
      expect(
        resolveAllowedView("/admin/users", { role: "ADMINISTRATOR" }, false)
      ).toEqual({
        view: "admin-users",
        path: "/admin/users",
      });
      expect(
        resolveAllowedView("/admin/users", { role: "IT_STAFF" }, false)
      ).toEqual({
        view: "staff-queue",
        path: "/staff/queue",
      });
    });
  });

  describe("getInitialQueueFilters URL query-parameter extraction", () => {
    beforeEach(() => {
      window.history.replaceState({}, "", "/staff/queue");
    });

    it("defaults all filters to ALL when no search params are present", () => {
      window.history.replaceState({}, "", "/staff/queue");
      const filters = getInitialQueueFilters();
      expect(filters).toEqual({
        category: "ALL",
        reqPriority: "ALL",
        itPriority: "ALL",
        status: "ALL",
        owner: "ALL",
        search: "",
      });
    });

    it("parses ?owner=UNASSIGNED and ?status=IN_PROGRESS correctly", () => {
      window.history.replaceState({}, "", "/staff/queue?owner=UNASSIGNED&status=IN_PROGRESS");
      const filters = getInitialQueueFilters();
      expect(filters.owner).toBe("UNASSIGNED");
      expect(filters.status).toBe("IN_PROGRESS");
    });

    it("parses ?owner=MY_TICKETS correctly", () => {
      window.history.replaceState({}, "", "/staff/queue?owner=MY_TICKETS");
      const filters = getInitialQueueFilters();
      expect(filters.owner).toBe("MY_TICKETS");
    });

    it("parses ?categoryId=2 and ?requestedPriority=P0_URGENT correctly", () => {
      window.history.replaceState({}, "", "/staff/queue?categoryId=2&requestedPriority=P0_URGENT");
      const filters = getInitialQueueFilters();
      expect(filters.category).toBe("2");
      expect(filters.reqPriority).toBe("P0_URGENT");
    });

    it("parses ?status=NEW,OPEN for Total Open metric drill-down", () => {
      window.history.replaceState({}, "", "/staff/queue?status=NEW,OPEN");
      const filters = getInitialQueueFilters();
      expect(filters.status).toBe("NEW,OPEN");
    });

    it("parses ?status=RESOLVED&resolvedWithinDays=7 for Recently Resolved rolling window drill-down", () => {
      window.history.replaceState({}, "", "/staff/queue?status=RESOLVED&resolvedWithinDays=7");
      const filters = getInitialQueueFilters();
      expect(filters.status).toBe("RESOLVED");
      expect(filters.resolvedWithinDays).toBe(7);
    });

    it("parses ?days=7 alternative query parameter for rolling window", () => {
      window.history.replaceState({}, "", "/staff/queue?status=RESOLVED&days=7");
      const filters = getInitialQueueFilters();
      expect(filters.status).toBe("RESOLVED");
      expect(filters.resolvedWithinDays).toBe(7);
    });

    it("safely ignores unknown or invalid query parameter values", () => {
      window.history.replaceState({}, "", "/staff/queue?owner=HACKED&status=INVALID_STATUS&categoryId=notanumber&resolvedWithinDays=invalid");
      const filters = getInitialQueueFilters();
      expect(filters.owner).toBe("ALL");
      expect(filters.status).toBe("ALL");
      expect(filters.category).toBe("ALL");
      expect(filters.resolvedWithinDays).toBeUndefined();
    });
  });

  describe("StaffTicketQueue drill-down component mounting with URL parameters", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(api, "fetchCategories").mockResolvedValue([
        { id: 1, name: "Hardware" },
        { id: 2, name: "Software" },
      ]);
    });

    it("initializes queue with status=NEW,OPEN and calls fetchStaffTickets with status=NEW,OPEN", async () => {
      window.history.replaceState({}, "", "/staff/queue?status=NEW,OPEN");
      const fetchSpy = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });

      render(<StaffTicketQueue />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "NEW,OPEN",
          })
        );
      });

      const select = screen.getByTestId("queue-status-filter") as HTMLSelectElement;
      expect(select.value).toBe("NEW,OPEN");
    });

    it("initializes queue with status=RESOLVED and resolvedWithinDays=7, displaying rolling window badge", async () => {
      window.history.replaceState({}, "", "/staff/queue?status=RESOLVED&resolvedWithinDays=7");
      const fetchSpy = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });

      render(<StaffTicketQueue />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "RESOLVED",
            resolvedWithinDays: 7,
          })
        );
      });

      const badge = screen.getByTestId("queue-resolved-window-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Last 7 Days");

      // Dismissing the window filter
      const clearBtn = screen.getByTestId("queue-clear-window-btn");
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.objectContaining({
            status: "RESOLVED",
            resolvedWithinDays: undefined,
          })
        );
      });
      expect(screen.queryByTestId("queue-resolved-window-badge")).not.toBeInTheDocument();
    });
  });
});


