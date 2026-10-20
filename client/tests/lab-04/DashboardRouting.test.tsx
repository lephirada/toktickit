import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App, { resolveAllowedView } from "../../src/App.js";
import StaffTicketQueue, { getInitialQueueFilters } from "../../src/components/StaffTicketQueue.js";
import Header from "../../src/components/Header.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
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

    it("blocks REQUESTER from accessing /admin/users and redirects to safe view", () => {
      expect(
        resolveAllowedView("/admin/users", { role: "REQUESTER" }, false)
      ).toEqual({
        view: "my-tickets",
        path: "/my-tickets",
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

    it("parses ?priority=P0_URGENT for effective priority drill-down", () => {
      window.history.replaceState({}, "", "/staff/queue?priority=P0_URGENT");
      const filters = getInitialQueueFilters();
      expect(filters.reqPriority).toBe("P0_URGENT");
      expect(filters.priority).toBe("P0_URGENT");
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

  describe("Header role-based navigation & Dashboard active highlighting", () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
      vi.restoreAllMocks();
    });

    it("renders and highlights Dashboard tab for REQUESTER in desktop and mobile drawer", async () => {
      vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
        id: 1,
        fullName: "Sarah Connor",
        email: "sarah@toktickit.com",
        role: "REQUESTER",
        mustChangePassword: false,
      });

      render(
        <AuthProvider>
          <Header activeView="requester-dashboard" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("nav-requester-dashboard")).toBeInTheDocument();
      });

      const desktopDashboard = screen.getByTestId("nav-requester-dashboard");
      expect(desktopDashboard).toHaveAttribute("aria-current", "page");
      expect(desktopDashboard.className).toContain("fw-bold");

      // Open mobile drawer
      fireEvent.click(screen.getByTestId("mobile-menu-toggle"));
      const mobileDashboard = screen.getByTestId("mobile-nav-requester-dashboard");
      expect(mobileDashboard).toBeInTheDocument();
      expect(mobileDashboard.className).toContain("fw-bold");
    });

    it("renders and highlights Dashboard tab for IT_STAFF in desktop and mobile drawer", async () => {
      vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
        id: 2,
        fullName: "David Lee",
        email: "david@toktickit.com",
        role: "IT_STAFF",
        mustChangePassword: false,
      });

      render(
        <AuthProvider>
          <Header activeView="staff-dashboard" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("nav-staff-dashboard")).toBeInTheDocument();
      });

      const desktopDashboard = screen.getByTestId("nav-staff-dashboard");
      expect(desktopDashboard).toHaveAttribute("aria-current", "page");
      expect(desktopDashboard.className).toContain("fw-bold");

      // Open mobile drawer
      fireEvent.click(screen.getByTestId("mobile-menu-toggle"));
      const mobileDashboard = screen.getByTestId("mobile-nav-staff-dashboard");
      expect(mobileDashboard).toBeInTheDocument();
      expect(mobileDashboard.className).toContain("fw-bold");
    });

    it("renders and highlights Dashboard tab for ADMINISTRATOR in desktop and mobile drawer", async () => {
      vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
        id: 3,
        fullName: "Admin Alice",
        email: "admin@toktickit.com",
        role: "ADMINISTRATOR",
        mustChangePassword: false,
      });

      render(
        <AuthProvider>
          <Header activeView="staff-dashboard" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("nav-admin-dashboard")).toBeInTheDocument();
      });

      const desktopDashboard = screen.getByTestId("nav-admin-dashboard");
      expect(desktopDashboard).toHaveAttribute("aria-current", "page");
      expect(desktopDashboard.className).toContain("fw-bold");

      // Open mobile drawer
      fireEvent.click(screen.getByTestId("mobile-menu-toggle"));
      const mobileDashboard = screen.getByTestId("mobile-nav-admin-dashboard");
      expect(mobileDashboard).toBeInTheDocument();
      expect(mobileDashboard.className).toContain("fw-bold");
    });
  });

  describe("App metric drill-down browser history pushState integration", () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
      vi.restoreAllMocks();
    });

    it("calls window.history.pushState exactly ONCE when navigating from Dashboard with query parameters", async () => {
      window.history.replaceState({}, "", "/staff/dashboard");
      vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
        id: 2,
        fullName: "David Lee",
        email: "david@toktickit.com",
        role: "IT_STAFF",
        mustChangePassword: false,
      });
      vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
      vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue({
        data: {
          metrics: {
            totalOpen: 10,
            inProgress: 3,
            waitingForRequester: 2,
            recentlyResolved: 5,
            unassignedCount: 4,
            totalTimeSpentMinutes: 300,
          },
          categoryBreakdown: [],
          priorityBreakdown: { P0_URGENT: 0, P1_HIGH: 0, P2_MEDIUM: 0, P3_LOW: 0 },
          meta: {
            calculationTimestamp: new Date().toISOString(),
            recentlyResolvedWindowDays: 7,
            recentlyResolvedWindowStart: new Date().toISOString(),
          },
        },
      });
      vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });

      const pushStateSpy = vi.spyOn(window.history, "pushState");

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("kpi-card-total-open")).toBeInTheDocument();
      });

      // Clear any pushState calls that may have occurred during initial App render
      pushStateSpy.mockClear();

      // Click Total Open KPI card which triggers onNavigateQueue({ status: "NEW,OPEN" })
      fireEvent.click(screen.getByTestId("kpi-card-total-open"));

      // Assert pushState was called EXACTLY ONCE with the composed query string
      expect(pushStateSpy).toHaveBeenCalledTimes(1);
      expect(pushStateSpy).toHaveBeenCalledWith(
        {},
        "",
        "/staff/queue?status=NEW%2COPEN"
      );
    });
  });
});


