import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
vi.mock("@termix-ssh/plugin-sdk/frontend", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
import { AppList } from "../../src/frontend/AppList.js";
const apps = [
  {
    name: "api",
    id: "pm2:0",
    state: "online",
    cpu: 2,
    mem: 1048576,
    restarts: 0,
    pid: 12,
  },
  {
    name: "worker",
    id: "pm2:1",
    state: "stopped",
    cpu: 20,
    mem: null,
    restarts: 3,
    pid: 20,
  },
];
afterEach(cleanup);
describe("compact application views", () => {
  it("opens the selected app from either view", () => {
    const select = vi.fn();
    const { rerender } = render(
      <AppList apps={apps} view="grid" query="" onSelect={select} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "api — detail.open" }));
    expect(select).toHaveBeenLastCalledWith("api");
    rerender(<AppList apps={apps} view="table" query="" onSelect={select} />);
    fireEvent.click(
      screen.getByRole("button", { name: "worker — list.inspect" }),
    );
    expect(select).toHaveBeenLastCalledWith("worker");
  });
  it("sorts numeric columns and keeps unknown values last", () => {
    render(<AppList apps={apps} view="table" query="" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "tab.cpu" }));
    expect(screen.getAllByRole("row")[1].textContent).toContain("worker");
    fireEvent.click(screen.getByRole("button", { name: "tab.memory" }));
    expect(screen.getAllByRole("row")[1].textContent).toContain("api");
    expect(
      screen
        .getByRole("columnheader", { name: "tab.memory" })
        .getAttribute("aria-sort"),
    ).toBe("descending");
  });
  it("filters by status and PID and handles empty results", () => {
    const { rerender } = render(
      <AppList apps={apps} view="table" query="stopped" onSelect={vi.fn()} />,
    );
    expect(
      screen.queryByRole("button", { name: "api — detail.open" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "worker — detail.open" }),
    ).toBeTruthy();
    rerender(<AppList apps={apps} view="grid" query="12" onSelect={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "api — detail.open" }),
    ).toBeTruthy();
    rerender(
      <AppList apps={apps} view="grid" query="missing" onSelect={vi.fn()} />,
    );
    expect(screen.getByText("list.noMatches")).toBeTruthy();
  });
});
