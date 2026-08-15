import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

describe("App", () => {
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online and the categories returned by the API on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 99, name: "Test Category" },
        { id: 100, name: "Special Request" },
      ],
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Online/i)).toBeInTheDocument();
    expect(screen.getByText("Supported Request Categories")).toBeInTheDocument();
    expect(screen.getByText("Test Category")).toBeInTheDocument();
    expect(screen.getByText("Special Request")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Unable to connect to TokTickIT API")
    );

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
