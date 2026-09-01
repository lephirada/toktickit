import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import Header from "./components/Header.js";
import DirtyGuardModal from "./components/DirtyGuardModal.js";

type UiState = "idle" | "loading" | "success" | "error";

export function AppContent() {
  const { currentRequester, tickets, ticketsLoading } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeView, setActiveView] = useState<"my-tickets" | "create-ticket" | "system-check">("my-tickets");

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

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Header activeView={activeView} onNavigate={setActiveView} />
      <DirtyGuardModal />

      <main className="container py-4 flex-grow-1" style={{ maxWidth: 800 }}>
        <h1 className="h3 mb-4">
          <span className="text-success">IT Service Desk</span>
        </h1>

        {/* My Tickets Section */}
        {activeView === "my-tickets" && (
          <section className="card shadow-sm p-4 mb-4 border-0" data-testid="my-tickets-section">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="h5 mb-1">My Tickets</h2>
                <p className="text-muted small mb-0">
                  Showing tickets for: <strong data-testid="active-requester-display">{currentRequester?.fullName || "Loading…"}</strong>
                </p>
              </div>
            </div>

            {ticketsLoading && (
              <div className="py-4 text-center text-muted" data-testid="tickets-loading-indicator">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Loading tickets…
              </div>
            )}

            {!ticketsLoading && tickets.length === 0 && (
              <div className="py-4 text-center text-muted" data-testid="empty-tickets-message">
                <p className="mb-0">No tickets submitted yet for this requester.</p>
              </div>
            )}

            {!ticketsLoading && tickets.length > 0 && (
              <ul className="list-group list-group-flush" data-testid="my-tickets-list">
                {tickets.map((ticket) => (
                  <li
                    key={ticket.id}
                    className="list-group-item d-flex justify-content-between align-items-center px-0 py-3"
                    data-testid={`ticket-item-${ticket.id}`}
                  >
                    <div>
                      <span className="badge bg-light text-dark border me-2 font-monospace">
                        {ticket.ticketNo}
                      </span>
                      <strong className="text-dark">{ticket.summary}</strong>
                      {ticket.category && (
                        <span className="badge bg-success-subtle text-success ms-2">
                          {ticket.category.name}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="badge bg-primary-subtle text-primary me-2">
                        {ticket.status}
                      </span>
                      <span className="badge bg-secondary-subtle text-secondary">
                        {ticket.priority}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Diagnostic Section (Lab 1 compatibility) */}
        <div className="card shadow-sm p-4 mb-4 border-0">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="h5 mb-0">System Diagnostic</h2>
            <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
              {state === "loading" ? "Loading…" : "Check System"}
            </button>
          </div>

          {state === "loading" && <p className="mt-2 text-muted">Loading…</p>}

          {state === "success" && (
            <div className="mt-2">
              <p className="fw-bold text-success mb-3">System Status: Online</p>
              <h3 className="h6 mb-2">Supported Request Categories</h3>
              <ul className="list-group">
                {categories.map((cat) => (
                  <li key={cat.id} className="list-group-item">
                    {cat.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state === "error" && (
            <div className="mt-2 text-danger">
              <p className="fw-bold">System Status: Offline</p>
              <p className="mb-0">{errorMessage || "Unable to connect to TokTickIT API"}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}
