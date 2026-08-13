import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states for the system health check.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  void categories;

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");
    try {
      await checkSystem();
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && <p className="mt-4">Loading…</p>}
      {state === "success" && <p className="mt-4">System Status: Online</p>}
      {state === "error" && <p className="mt-4 text-danger">System Status: Offline <br /> Unable to connect to TokTickIT API </p>}

      {/* TODO(Issue 4): render the category list in the success state. */}
    </div>
  );
}
