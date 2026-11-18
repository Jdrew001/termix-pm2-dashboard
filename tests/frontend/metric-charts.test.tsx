import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
vi.mock("@termix-ssh/plugin-sdk/frontend", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
import { MetricCharts } from "../../src/frontend/MetricCharts.js";
afterEach(cleanup);
describe("live usage charts", () => {
  it("offers time ranges, keyboard inspection and an honest stale state", () => {
    const at = Date.parse("2026-11-17T22:00:00Z");
    render(
      <MetricCharts
        history={[
          { at: at - 5000, cpu: 2, memory: 1048576, pid: 1 },
          { at, cpu: 4, memory: 2097152, pid: 1 },
        ]}
        sampledAt={new Date(at).toISOString()}
        stale
        isVisible
      />,
    );
    expect(screen.getByText("history.stale")).toBeTruthy();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    fireEvent.keyDown(screen.getAllByRole("img")[0], { key: "ArrowLeft" });
    expect(screen.getByText(/tab.cpu 2.0% · tab.memory 1.0 MB/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "5history.minuteShort" }),
    );
    expect(
      screen
        .getByRole("button", { name: "5history.minuteShort" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
  it("does not invent history before samples arrive", () => {
    const { container } = render(
      <MetricCharts
        history={[]}
        sampledAt="2026-11-17T22:00:00Z"
        stale={false}
        isVisible
      />,
    );
    expect(screen.getByText("history.collecting")).toBeTruthy();
    expect(container.querySelectorAll("[data-series]")).toHaveLength(0);
  });
});
