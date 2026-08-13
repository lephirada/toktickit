import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — write these yourself. Hint: mock the api module with
  // vi.spyOn(api, "checkSystem").mockResolvedValue(...) / .mockRejectedValue(...)
  // then click the button and assert the Online list / Offline message.
  it("shows Online when the health check succeeds", async () => {
  vi.spyOn(api, "checkSystem").mockResolvedValue({
    online: true,
    categories: [],
  });

  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /check system/i }));

  expect(await screen.findByText("System Status: Online")).toBeInTheDocument();
});

 it("shows an Offline error message when the API is unavailable", async () => {
  vi.spyOn(api, "checkSystem").mockRejectedValue(
    new Error("Unable to connect to TokTickIT API"),
  );

  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /check system/i }));

  expect(
    await screen.findByText(/System Status: Offline/),
  ).toBeInTheDocument();

  expect(
    screen.getByText(/Unable to connect to TokTickIT API/),
  ).toBeInTheDocument();
});
});
