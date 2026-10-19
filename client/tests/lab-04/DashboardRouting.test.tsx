import { describe, it, expect, beforeEach } from "vitest";
import { resolveAllowedView } from "../../src/App.js";
import { getInitialQueueFilters } from "../../src/components/StaffTicketQueue.js";

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

    it("safely ignores unknown or invalid query parameter values", () => {
      window.history.replaceState({}, "", "/staff/queue?owner=HACKED&status=INVALID_STATUS&categoryId=notanumber");
      const filters = getInitialQueueFilters();
      expect(filters.owner).toBe("ALL");
      expect(filters.status).toBe("ALL");
      expect(filters.category).toBe("ALL");
    });
  });
});
