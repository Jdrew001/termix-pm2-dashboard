import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { TermixApp } from "@termix-ssh/plugin-sdk/frontend";
const useLogs = vi.hoisted(() => vi.fn());
vi.mock("@termix-ssh/plugin-sdk/frontend", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../src/frontend/use-live-logs.js", () => ({
  usePageVisible: () => true,
  useLiveLogs: useLogs,
}));
import { LogViewer } from "../../src/frontend/LogViewer.js";
afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
function setup() {
  useLogs.mockReturnValue({
    lines: [
      { id: 1, source: "stdout", text: "regular message" },
      { id: 2, source: "stderr", text: "error message" },
    ],
    status: "connected",
    at: "2026-11-17T21:00:00Z",
    gap: false,
    partial: false,
    clear: vi.fn(),
  });
  render(<LogViewer app={{} as TermixApp} hostId="1" name="api" isVisible />);
}
describe("log controls", () => {
  it("shows both sources, then filters errors and regular output", () => {
    setup();
    expect(screen.getByText("regular message")).toBeTruthy();
    expect(screen.getByText("error message")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "logs.stderr" }));
    expect(screen.queryByText("regular message")).toBeNull();
    expect(screen.getByText("error message")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "logs.stdout" }));
    expect(screen.getByText("regular message")).toBeTruthy();
    expect(screen.queryByText("error message")).toBeNull();
  });
  it("searches locally and pauses the subscription without changing server logs", () => {
    setup();
    fireEvent.change(screen.getByLabelText("logs.search"), {
      target: { value: "regular" },
    });
    expect(screen.queryByText("error message")).toBeNull();
    expect(screen.getByText(/logs.filtered/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "logs.clearFilter" }));
    expect(screen.getByText("error message")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "logs.pause" }));
    expect(useLogs.mock.lastCall?.[3]).toBe(false);
    expect(screen.getByRole("button", { name: "logs.resume" })).toBeTruthy();
  });
});

describe("reading older logs", () => {
  it("holds position as new samples arrive and resumes only at the bottom", () => {
    setup();
    const viewport = screen.getByRole("log");
    Object.defineProperties(viewport, {
      clientHeight: { value: 200, configurable: true },
      scrollHeight: { value: 1000, writable: true, configurable: true },
    });
    viewport.scrollTop = 300;
    fireEvent.scroll(viewport);
    expect(screen.getByText("logs.readingHistory")).toBeTruthy();
    expect(useLogs.mock.lastCall?.[3]).toBe(true);
    const sample = useLogs.mock.results.at(-1)!.value;
    useLogs.mockReturnValue({
      ...sample,
      lines: [...sample.lines, { id: 3, source: "stdout", text: "new entry" }],
    });
    Object.defineProperty(viewport, "scrollHeight", {
      value: 1020,
      writable: true,
    });
    // Changing a control re-renders the viewer with the incoming sample.
    fireEvent.click(screen.getByLabelText("logs.wrap"));
    expect(viewport.scrollTop).toBe(300);
    viewport.scrollTop = 820;
    fireEvent.scroll(viewport);
    expect(screen.queryByText("logs.readingHistory")).toBeNull();
    useLogs.mockReturnValue({
      ...sample,
      lines: [...sample.lines, { id: 4, source: "stdout", text: "next entry" }],
    });
    Object.defineProperty(viewport, "scrollHeight", {
      value: 1040,
      writable: true,
    });
    fireEvent.click(screen.getByLabelText("logs.wrap"));
    expect(viewport.scrollTop).toBe(1040);
  });
  it("offers an explicit jump without stopping the incoming log stream", () => {
    setup();
    const viewport = screen.getByRole("log");
    Object.defineProperties(viewport, {
      clientHeight: { value: 200, configurable: true },
      scrollHeight: { value: 1000, configurable: true },
    });
    viewport.scrollTop = 100;
    fireEvent.scroll(viewport);
    fireEvent.click(screen.getByRole("button", { name: "logs.jumpLatest" }));
    expect(viewport.scrollTop).toBe(1000);
    expect(screen.queryByText("logs.readingHistory")).toBeNull();
    expect(useLogs.mock.lastCall?.[3]).toBe(true);
  });
  it("respects the explicit Auto-scroll off setting even at the bottom", () => {
    setup();
    const viewport = screen.getByRole("log");
    Object.defineProperties(viewport, {
      clientHeight: { value: 200, configurable: true },
      scrollHeight: { value: 1000, writable: true, configurable: true },
    });
    fireEvent.click(screen.getByLabelText("logs.follow"));
    viewport.scrollTop = 800;
    fireEvent.scroll(viewport);
    const sample = useLogs.mock.results.at(-1)!.value;
    useLogs.mockReturnValue({
      ...sample,
      lines: [...sample.lines, { id: 5, source: "stdout", text: "next" }],
    });
    Object.defineProperty(viewport, "scrollHeight", {
      value: 1020,
      writable: true,
    });
    fireEvent.click(screen.getByLabelText("logs.wrap"));
    expect(viewport.scrollTop).toBe(800);
    expect(screen.getByText("logs.followOff")).toBeTruthy();
  });
});

describe("floating log controls", () => {
  it("places paused controls over the log frame rather than in its header", () => {
    setup();
    const viewport = screen.getByRole("log");
    Object.defineProperties(viewport, {
      clientHeight: { value: 200, configurable: true },
      scrollHeight: { value: 1000, configurable: true },
    });
    viewport.scrollTop = 100;
    fireEvent.scroll(viewport);
    const jump = screen.getByRole("button", { name: "logs.jumpLatest" });
    expect(viewport.parentElement?.contains(jump)).toBe(true);
    expect(jump.closest(".absolute")).toBeTruthy();
  });
  it("shows Copy only for log selections and preserves the view during new samples", () => {
    setup();
    const viewport = screen.getByRole("log");
    Object.defineProperties(viewport, {
      clientHeight: { value: 200, configurable: true },
      scrollHeight: { value: 1000, writable: true, configurable: true },
    });
    viewport.scrollTop = 800;
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 600,
      bottom: 384,
      width: 600,
      height: 384,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const range = document.createRange();
    range.selectNodeContents(screen.getByText("regular message"));
    Object.defineProperty(range, "getClientRects", {
      value: () => [
        { left: 30, top: 40, right: 300, bottom: 60, width: 270, height: 20 },
      ],
    });
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent(document, new Event("selectionchange"));
    expect(
      screen.getByRole("button", { name: "logs.copySelection" }),
    ).toBeTruthy();
    expect(useLogs.mock.lastCall?.[3]).toBe(true);
    const sample = useLogs.mock.results.at(-1)!.value;
    useLogs.mockReturnValue({
      ...sample,
      lines: [...sample.lines, { id: 3, source: "stdout", text: "new line" }],
    });
    Object.defineProperty(viewport, "scrollHeight", {
      value: 1020,
      writable: true,
    });
    fireEvent.click(screen.getByLabelText("logs.wrap"));
    expect(viewport.scrollTop).toBe(800);
    selection.removeAllRanges();
    fireEvent(document, new Event("selectionchange"));
    expect(
      screen.queryByRole("button", { name: "logs.copySelection" }),
    ).toBeNull();
    expect(viewport.scrollTop).toBe(1020);
  });
});
