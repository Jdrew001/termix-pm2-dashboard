import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type {
  TermixApp,
  PluginHostRecord,
} from "@termix-ssh/plugin-sdk/frontend";
vi.mock("@termix-ssh/plugin-sdk/frontend", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../src/frontend/LogViewer.js", () => ({
  LogViewer: () => <div>log-view</div>,
}));
import { ProcessDetail } from "../../src/frontend/ProcessDetail.js";
afterEach(cleanup);
describe("process detail freshness", () => {
  it("preserves a visible stale warning and the last PM2 sample", () => {
    const app = {
      api: { get: vi.fn(async () => ({ data: { process: null } })) },
    } as unknown as TermixApp;
    render(
      <ProcessDetail
        app={app}
        host={{ id: "1", name: "Faith", ip: "127.0.0.1" } as PluginHostRecord}
        row={{
          name: "api",
          state: "online",
          pid: 44,
          cpu: 1,
          mem: 1024,
          restarts: 0,
        }}
        sampledAt="2026-11-17T21:00:00Z"
        metricsStale
        isVisible={false}
        onBack={() => {}}
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe("tab.error");
    expect(screen.getByText(/detail.sample/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /detail.back/ })).toBeTruthy();
  });
});

it("keeps secondary process fields collapsed until requested", () => {
  const app = {
    api: { get: vi.fn(async () => ({ data: { process: null } })) },
  } as unknown as TermixApp;
  render(
    <ProcessDetail
      app={app}
      host={{ id: "1", name: "Faith", ip: "127.0.0.1" } as PluginHostRecord}
      row={{
        name: "api",
        id: "pm2:0",
        state: "online",
        pid: 44,
        cpu: 1,
        mem: 1024,
        restarts: 0,
      }}
      sampledAt="2026-11-17T21:00:00Z"
      metricsStale={false}
      isVisible={false}
      onBack={() => {}}
    />,
  );
  expect(screen.queryByText("detail.command")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "detail.more" }));
  expect(screen.getByText("detail.command")).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "detail.less" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "detail.less" }));
  expect(screen.queryByText("detail.command")).toBeNull();
});
