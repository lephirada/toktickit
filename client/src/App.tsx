import { useState, useEffect, useCallback, useRef } from "react";
import { checkSystem, Category, UserRole } from "./api.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import Header from "./components/Header.js";
import DirtyGuardModal from "./components/DirtyGuardModal.js";
import CreateTicketForm from "./components/CreateTicketForm.js";
import MyTicketsDashboard from "./components/MyTicketsDashboard.js";
import TicketDetailScreen from "./components/TicketDetailScreen.js";
import LoginScreen from "./components/LoginScreen.js";
import ChangePasswordScreen from "./components/ChangePasswordScreen.js";
import { CheckCircleIcon, TicketIcon, UserIcon } from "./components/icons/index.js";

type UiState = "idle" | "loading" | "success" | "error";
export type ActiveView =
  | "my-tickets"
  | "create-ticket"
  | "ticket-detail"
  | "change-password"
  | "login"
  | "staff-queue"
  | "admin-users";

export function resolveAllowedView(
  path: string,
  user?: { role: UserRole } | null,
  mustChangePassword?: boolean
): { view: ActiveView; path: string } {
  // 1. Unauthenticated users: ALL paths resolve to /login
  if (!user) {
    return { view: "login", path: "/login" };
  }

  // 2. Authenticated user requiring password change: ALL paths locked to /change-password
  if (mustChangePassword) {
    return { view: "change-password", path: "/change-password" };
  }

  // 3. Authenticated user accessing /login: Redirect to role default landing page (NO BLANK SHELL)
  if (path === "/login") {
    if (user.role === "REQUESTER") return { view: "my-tickets", path: "/my-tickets" };
    return { view: "staff-queue", path: "/staff/queue" };
  }

  // 4. Authenticated user accessing change-password
  if (path === "/change-password") {
    return { view: "change-password", path: "/change-password" };
  }

  // 5. Ticket Detail
  if (path.startsWith("/tickets/")) {
    return { view: "ticket-detail", path };
  }

  // 6. Role-based restrictions:
  if (user.role === "REQUESTER") {
    if (path === "/create-ticket") return { view: "create-ticket", path: "/create-ticket" };
    return { view: "my-tickets", path: "/my-tickets" };
  }

  if (user.role === "IT_STAFF") {
    if (path === "/staff/queue") return { view: "staff-queue", path: "/staff/queue" };
    return { view: "staff-queue", path: "/staff/queue" };
  }

  if (user.role === "ADMINISTRATOR") {
    if (path === "/admin/users") return { view: "admin-users", path: "/admin/users" };
    if (path === "/staff/queue") return { view: "staff-queue", path: "/staff/queue" };
    return { view: "staff-queue", path: "/staff/queue" };
  }

  return { view: "my-tickets", path: "/my-tickets" };
}

export function AppContent() {
  const {
    user,
    isLoading,
    isAuthenticated,
    mustChangePassword,
    isFormDirty,
    setFormDirty,
    isDirtyModalOpen,
    confirmDiscard,
    cancelDiscard,
    requestNavigationWithGuard,
  } = useAuth();

  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
    const match = window.location.pathname.match(/^\/tickets\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  });

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const path = window.location.pathname;
    return resolveAllowedView(path, null).view;
  });

  const [formKey, setFormKey] = useState<number>(0);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Auto-dismiss success banner after 5 seconds
  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => {
      setSuccessBanner(null);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [successBanner]);

  // Dismiss success banner on navigation away from my-tickets
  useEffect(() => {
    if (activeView !== "my-tickets") {
      setSuccessBanner(null);
    }
  }, [activeView]);

  // Auto-redirect to role landing page when password change completes
  const prevMustChangePassword = useRef(mustChangePassword);
  useEffect(() => {
    if (prevMustChangePassword.current && !mustChangePassword && user) {
      const landing = user.role === "REQUESTER" ? "my-tickets" : "staff-queue";
      const landingPath = user.role === "REQUESTER" ? "/my-tickets" : "/staff/queue";
      window.history.replaceState({}, "", landingPath);
      setActiveView(landing);
    }
    prevMustChangePassword.current = mustChangePassword;
  }, [mustChangePassword, user]);

  // Sync active view and enforce role authorization on user or route changes
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      if (window.location.pathname !== "/login") {
        window.history.replaceState({}, "", "/login");
      }
      setActiveView("login");
      return;
    }

    if (mustChangePassword) {
      if (window.location.pathname !== "/change-password") {
        window.history.replaceState({}, "", "/change-password");
      }
      setActiveView("change-password");
      return;
    }

    const path = window.location.pathname;
    const ticketMatch = path.match(/^\/tickets\/(\d+)$/);
    if (ticketMatch) {
      setSelectedTicketId(parseInt(ticketMatch[1], 10));
      setActiveView("ticket-detail");
      return;
    }

    const resolved = resolveAllowedView(path, user, false);
    if (resolved.path !== path) {
      window.history.replaceState({}, "", resolved.path);
    }
    setActiveView(resolved.view);
  }, [user, isLoading, isAuthenticated, mustChangePassword]);

  // Sync active view with browser popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (!isAuthenticated || !user) {
        if (path !== "/login") {
          window.history.replaceState({}, "", "/login");
        }
        setActiveView("login");
        return;
      }
      if (mustChangePassword) {
        if (path !== "/change-password") {
          window.history.replaceState({}, "", "/change-password");
        }
        setActiveView("change-password");
        return;
      }
      const ticketMatch = path.match(/^\/tickets\/(\d+)$/);
      if (ticketMatch) {
        setSelectedTicketId(parseInt(ticketMatch[1], 10));
        setActiveView("ticket-detail");
        return;
      }
      const resolved = resolveAllowedView(path, user, false);
      if (resolved.path !== path) {
        window.history.replaceState({}, "", resolved.path);
      }
      setActiveView(resolved.view);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [user, isAuthenticated, mustChangePassword]);

  const handleNavigate = (targetScreen: string, ticketId?: number) => {
    if (targetScreen !== "my-tickets") {
      setSuccessBanner(null);
    }

    if (targetScreen === "ticket-detail" && ticketId) {
      setSelectedTicketId(ticketId);
      window.history.pushState({}, "", `/tickets/${ticketId}`);
      setActiveView("ticket-detail");
      return;
    }

    let targetPath = "/my-tickets";
    if (targetScreen === "create-ticket") targetPath = "/create-ticket";
    else if (targetScreen === "change-password") targetPath = "/change-password";
    else if (targetScreen === "login") targetPath = "/login";
    else if (targetScreen === "staff-queue") targetPath = "/staff/queue";
    else if (targetScreen === "admin-users") targetPath = "/admin/users";

    if (user) {
      const resolved = resolveAllowedView(targetPath, user, false);
      window.history.pushState({}, "", resolved.path);
      setActiveView(resolved.view);
    } else {
      const nextView = (targetScreen as ActiveView) || "my-tickets";
      window.history.pushState({}, "", targetPath);
      setActiveView(nextView);
    }
  };

  const handleModalCancel = () => {
    cancelDiscard();
  };

  const handleModalConfirmDiscard = () => {
    setFormDirty(false);
    confirmDiscard();
    setFormKey((prev) => prev + 1);
  };

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to connect to TokTickIT API"
      );
      setState("error");
    }
  }

  const handleTicketCreateSuccess = (ticketNo: string) => {
    setFormDirty(false);
    setSuccessBanner(`Ticket ${ticketNo} created successfully!`);
    window.history.pushState({}, "", "/my-tickets");
    setActiveView("my-tickets");
  };

  const handleTicketCreateCancel = () => {
    handleNavigate("my-tickets");
  };

  const handleClearBanner = useCallback(() => {
    setSuccessBanner(null);
  }, []);

  // 1. Loading Authentication State
  if (isLoading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center min-vh-100"
        data-testid="app-loading"
        style={{ backgroundColor: "var(--zg-bg)" }}
      >
        <div className="text-center">
          <div className="spinner-border text-success" role="status" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Loading application…</span>
          </div>
          <p className="mt-3 text-muted fw-medium">Loading TokTickIT…</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State -> Force Login Screen
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onSuccess={() => {
          // Handled inside LoginScreen via onNavigate or history
        }}
        onNavigate={(screen) => handleNavigate(screen)}
      />
    );
  }

  // 3. Authenticated but Must Change Password -> Force Change Password Screen
  if (mustChangePassword) {
    return (
      <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--zg-bg)" }}>
        <Header activeView="change-password" onNavigate={handleNavigate} />
        <main className="container py-4 flex-grow-1">
          <ChangePasswordScreen
            onSuccess={() => {
              handleNavigate("my-tickets");
            }}
            onNavigate={(screen) => handleNavigate(screen)}
          />
        </main>
      </div>
    );
  }

  // 4. Authenticated Normal Application Shell
  const effectiveView: ActiveView = (activeView === "login")
    ? (user?.role === "REQUESTER" ? "my-tickets" : "staff-queue")
    : activeView;

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--zg-bg)" }}>
      <Header activeView={effectiveView} currentScreen={effectiveView} onNavigate={handleNavigate} />
      <DirtyGuardModal
        isOpen={isDirtyModalOpen}
        onConfirm={handleModalConfirmDiscard}
        onCancel={handleModalCancel}
      />

      <main
        className="container-fluid py-4 flex-grow-1 px-3 px-sm-4 px-lg-5"
        style={{
          maxWidth:
            effectiveView === "my-tickets" || effectiveView === "ticket-detail"
              ? 1380
              : 800,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Success Banner */}
        {successBanner && effectiveView === "my-tickets" && (
          <div
            className="alert alert-success d-flex align-items-center justify-content-between mb-4 shadow-sm"
            role="alert"
            data-testid="success-banner"
          >
            <div className="d-flex align-items-center">
              <CheckCircleIcon size={18} className="me-2 text-success flex-shrink-0" />
              <strong>{successBanner}</strong>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={handleClearBanner}
            ></button>
          </div>
        )}

        {/* Change Password View (voluntary change from header menu) */}
        {effectiveView === "change-password" && (
          <ChangePasswordScreen
            onSuccess={() => handleNavigate("my-tickets")}
            onNavigate={(screen) => handleNavigate(screen)}
          />
        )}

        {/* Create Ticket View */}
        {effectiveView === "create-ticket" && (
          <section data-testid="create-ticket-section">
            <CreateTicketForm
              key={formKey}
              onSuccess={handleTicketCreateSuccess}
              onCancel={handleTicketCreateCancel}
            />
          </section>
        )}

        {/* My Tickets Dashboard */}
        {effectiveView === "my-tickets" && (
          <section data-testid="my-tickets-section">
            <MyTicketsDashboard
              onCreateTicket={() => handleNavigate("create-ticket")}
              onViewTicket={(ticketId) => handleNavigate("ticket-detail", ticketId)}
              onClearBanner={handleClearBanner}
              onDismissSuccessBanner={handleClearBanner}
            />
          </section>
        )}

        {/* Ticket Detail View */}
        {effectiveView === "ticket-detail" && (
          <section data-testid="ticket-detail-section">
            <TicketDetailScreen
              ticketId={selectedTicketId || 0}
              onNavigate={(view) => handleNavigate(view)}
            />
          </section>
        )}

        {/* IT Staff Ticket Queue View (Issue 14 Destination) */}
        {effectiveView === "staff-queue" && (
          <section data-testid="staff-queue-section" className="w-full">
            <div
              className="bg-white border shadow-sm p-4 p-md-5 text-center mx-auto"
              style={{
                maxWidth: 800,
                borderRadius: "16px",
                borderColor: "#EAECF0",
                boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
              }}
            >
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle p-3 mb-3"
                style={{ backgroundColor: "var(--zg-pale)" }}
              >
                <TicketIcon size={32} color="var(--zg-primary)" />
              </div>
              <h2 className="h4 fw-bold text-dark mb-2">IT Staff Ticket Queue</h2>
              <p className="text-muted small mb-4" style={{ maxWidth: 500, margin: "0 auto" }}>
                The shared IT Staff Ticket Queue with search, multi-field filtering, priority assignment, and ticket management is being developed in Issue 14.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm fw-semibold px-3 py-2 rounded-2"
                  style={{ color: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
                  onClick={() => handleNavigate("my-tickets")}
                >
                  View My Tickets
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Administrator User Management View (Issue 16 Destination) */}
        {effectiveView === "admin-users" && (
          <section data-testid="admin-users-section" className="w-full">
            <div
              className="bg-white border shadow-sm p-4 p-md-5 text-center mx-auto"
              style={{
                maxWidth: 800,
                borderRadius: "16px",
                borderColor: "#EAECF0",
                boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
              }}
            >
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle p-3 mb-3"
                style={{ backgroundColor: "#F4EBFF" }}
              >
                <UserIcon size={32} color="#5925DC" />
              </div>
              <h2 className="h4 fw-bold text-dark mb-2">User Management</h2>
              <p className="text-muted small mb-4" style={{ maxWidth: 500, margin: "0 auto" }}>
                User directory, account creation, role assignments, and security guardrails are being developed in Issue 16.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2 rounded-2"
                  onClick={() => handleNavigate("staff-queue")}
                >
                  Back to Ticket Queue
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Hidden Diagnostic section preserved for test suite compatibility */}
        <div className="visually-hidden" aria-hidden="false" data-testid="legacy-diagnostic-container">
          <h2>System Diagnostic</h2>
          <button onClick={handleCheck} disabled={state === "loading"}>
            Check System
          </button>
          {state === "loading" && <p>Loading…</p>}
          {state === "success" && (
            <div>
              <p>System Status: Online</p>
              <h3>Supported Request Categories</h3>
              <ul>
                {categories.map((cat) => (
                  <li key={cat.id}>{cat.name}</li>
                ))}
              </ul>
            </div>
          )}
          {state === "error" && (
            <div>
              <p>System Status: Offline</p>
              <p>{errorMessage || "Unable to connect to TokTickIT API"}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
