import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import Header from "../../src/components/Header.js";
import DirtyGuardModal from "../../src/components/DirtyGuardModal.js";

const mockRequesters: api.RequesterUser[] = [
  {
    id: 1,
    fullName: "Sarah Connor",
    email: "sarah.connor@toktickit.com",
    department: "Engineering",
    isActive: true,
  },
  {
    id: 2,
    fullName: "John Doe",
    email: "john.doe@toktickit.com",
    department: "Finance",
    isActive: true,
  },
  {
    id: 3,
    fullName: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.com",
    department: "Engineering",
    isActive: true,
  },
];

// Helper test component to manipulate dirty state
function TestApp({ activeView }: { activeView?: "my-tickets" | "create-ticket" }) {
  const { currentRequester, isFormDirty, setFormDirty } = useRequester();

  return (
    <div>
      <Header activeView={activeView} />
      <DirtyGuardModal />
      <div data-testid="current-requester">{currentRequester?.fullName}</div>
      <div data-testid="is-dirty">{isFormDirty ? "dirty" : "clean"}</div>
      <button onClick={() => setFormDirty(true)}>Make Form Dirty</button>
      <button onClick={() => setFormDirty(false)}>Clean Form</button>
    </div>
  );
}

describe("Issue 6 — Requester Context & Header Component Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches active requesters and displays them in the header dropdown", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    // Verify loading state appears first or resolves to dropdown options
    const selectElement = await screen.findByRole("combobox", {
      name: /select active requester/i,
    });

    expect(selectElement).toBeInTheDocument();
    expect(screen.getByText("Sarah Connor (Engineering)")).toBeInTheDocument();
    expect(screen.getByText("John Doe (Finance)")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson (Engineering)")).toBeInTheDocument();

    // Default to the first requester
    expect(screen.getByTestId("current-requester")).toHaveTextContent("Sarah Connor");
    expect(localStorage.getItem("toktickit_requester_id")).toBe("1");
  });

  it("restores previously selected requester from localStorage", async () => {
    localStorage.setItem("toktickit_requester_id", "2");
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    const selectElement = await screen.findByRole("combobox", {
      name: /select active requester/i,
    });

    await waitFor(() => {
      expect(selectElement).toHaveValue("2");
      expect(screen.getByTestId("current-requester")).toHaveTextContent("John Doe");
    });
  });

  it("updates localStorage and active context when a new requester is selected", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    const selectElement = await screen.findByRole("combobox", {
      name: /select active requester/i,
    });

    // Select John Doe (ID: 2)
    await user.selectOptions(selectElement, "2");

    expect(screen.getByTestId("current-requester")).toHaveTextContent("John Doe");
    expect(localStorage.getItem("toktickit_requester_id")).toBe("2");
  });

  it("intercepts requester switch with dirty guard modal when form has unsaved changes", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    const selectElement = await screen.findByRole("combobox", {
      name: /select active requester/i,
    });

    // Make form dirty
    await user.click(screen.getByRole("button", { name: /make form dirty/i }));
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");

    // Attempt to switch to John Doe (ID: 2)
    await user.selectOptions(selectElement, "2");

    // Modal should appear
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    expect(
      screen.getByText(/you have unsaved ticket details/i)
    ).toBeInTheDocument();

    // Requester must NOT have switched yet
    expect(screen.getByTestId("current-requester")).toHaveTextContent("Sarah Connor");

    // Test "Cancel / Stay"
    await user.click(screen.getByRole("button", { name: /cancel \/ stay/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-requester")).toHaveTextContent("Sarah Connor");
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");

    // Attempt switch again and click "Discard Changes"
    await user.selectOptions(selectElement, "2");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /discard changes/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-requester")).toHaveTextContent("John Doe");
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("clean");
    expect(localStorage.getItem("toktickit_requester_id")).toBe("2");
  });
});
