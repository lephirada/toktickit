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
import StaffTicketQueue from "./components/StaffTicketQueue.js";
import { StaffTicketDetail } from "./components/StaffTicketDetail.js";
import { CheckCircleIcon, TicketIcon, UserIcon } from "./components/icons/index.js";

type UiState = "idle" | "loading" | "success" | "error";
export type ActiveView =
  | "my-tickets"
  | "create-ticket"
  | "ticket-detail"
  | "change-password"
  | "login"
  | "staff-queue"
  | "staff-ticket-detail"
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

  // 5. Role-based restrictions:
  if (user.role === "REQUESTER") {
    if (path.startsWith("/tickets/")) return { view: "ticket-detail", path };
    if (path === "/create-ticket") return { view: "create-ticket", path: "/create-ticket" };
    return { view: "my-tickets", path: "/my-tickets" };
  }

  if (user.role === "IT_STAFF") {
    if (path.startsWith("/staff/tickets/")) return { view: "staff-ticket-detail", path };
    if (path === "/staff/queue") return { view: "staff-queue", path: "/staff/queue" };
    return { view: "staff-queue", path: "/staff/queue" };
  }

  if (user.role === "ADMINISTRATOR") {
    if (path.startsWith("/staff/tickets/")) return { view: "staff-ticket-detail", path };
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
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const staffMatch = path.match(/^\/staff\/tickets\/(\d+)$/);
    if (staffMatch) return parseInt(staffMatch[1], 10);
    const reqMatch = path.match(/^\/tickets\/(\d+)$/);
    if (reqMatch) return parseInt(reqMatch[1], 10);
    return null;
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
    const resolved = resolveAllowedView(path, user, mustChangePassword);
    if (resolved.path !== path) {
      window.history.replaceState({}, "", resolved.path);
    }
    if (resolved.view === "ticket-detail") {
      const match = resolved.path.match(/^\/tickets\/(\d+)$/);
      setSelectedTicketId(match ? parseInt(match[1], 10) : null);
    } else if (resolved.view === "staff-ticket-detail") {
      const match = resolved.path.match(/^\/staff\/tickets\/(\d+)$/);
      setSelectedTicketId(match ? parseInt(match[1], 10) : null);
    } else {
      setSelectedTicketId(null);
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
      const resolved = resolveAllowedView(path, user, mustChangePassword);
      if (resolved.path !== path) {
        window.history.replaceState({}, "", resolved.path);
      }
      if (resolved.view === "ticket-detail") {
        const match = resolved.path.match(/^\/tickets\/(\d+)$/);
        setSelectedTicketId(match ? parseInt(match[1], 10) : null);
      } else if (resolved.view === "staff-ticket-detail") {
        const match = resolved.path.match(/^\/staff\/tickets\/(\d+)$/);
        setSelectedTicketId(match ? parseInt(match[1], 10) : null);
      } else {
        setSelectedTicketId(null);
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

    // Harden against mustChangePassword: lock out any normal route navigation
    if (mustChangePassword) {
      if (window.location.pathname !== "/change-password") {
        window.history.replaceState({}, "", "/change-password");
      }
      setActiveView("change-password");
      return;
    }

    if (targetScreen === "ticket-detail" && ticketId) {
      if (user?.role === "REQUESTER") {
        setSelectedTicketId(ticketId);
        window.history.pushState({}, "", `/tickets/${ticketId}`);
        setActiveView("ticket-detail");
        return;
      } else {
        window.history.pushState({}, "", `/staff/tickets/${ticketId}`);
        setSelectedTicketId(ticketId);
        setActiveView("staff-ticket-detail");
        return;
      }
    }

    if (targetScreen === "staff-ticket-detail" && ticketId) {
      setSelectedTicketId(ticketId);
      window.history.pushState({}, "", `/staff/tickets/${ticketId}`);
      setActiveView("staff-ticket-detail");
      return;
    }

    let targetPath = "/my-tickets";
    if (targetScreen === "create-ticket") targetPath = "/create-ticket";
    else if (targetScreen === "change-password") targetPath = "/change-password";
    else if (targetScreen === "login") targetPath = "/login";
    else if (targetScreen === "staff-queue") targetPath = "/staff/queue";
    else if (targetScreen === "admin-users") targetPath = "/admin/users";

    const resolved = resolveAllowedView(targetPath, user, mustChangePassword);
    window.history.pushState({}, "", resolved.path);
    setActiveView(resolved.view);
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
        className={`container-fluid py-4 flex-grow-1 ${effectiveView === "staff-queue" ? "px-2 px-sm-3 px-xl-4" : "px-3 px-sm-4 px-lg-4"}`}
        style={{
          maxWidth:
            effectiveView === "staff-queue"
              ? "1600px"
              : effectiveView === "my-tickets" || effectiveView === "ticket-detail" || effectiveView === "staff-ticket-detail"
              ? 1440
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
            <StaffTicketQueue
              onViewTicket={(ticketId) => handleNavigate("staff-ticket-detail", ticketId)}
            />
          </section>
        )}

        {/* IT Staff Ticket Detail View (Issue 15 Destination) */}
        {effectiveView === "staff-ticket-detail" && user && (
          <section data-testid="staff-ticket-detail-section" className="w-full">
            {selectedTicketId ? (
              <StaffTicketDetail
                ticketId={selectedTicketId}
                currentUser={user}
                onNavigateBack={() => handleNavigate("staff-queue")}
              />
            ) : (
              <div style={{ padding: "48px 20px", textAlign: "center", color: "#667085" }}>
                <div className="spinner-border text-success mb-3" role="status" style={{ width: "2.5rem", height: "2.5rem" }} />
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#344054" }}>Loading staff ticket details...</div>
              </div>
            )}
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
