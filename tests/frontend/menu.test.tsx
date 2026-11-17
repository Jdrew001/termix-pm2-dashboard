import { describe, expect, it, vi } from "vitest";
import type { TermixApp } from "@termix-ssh/plugin-sdk/frontend";
import { activate } from "../../src/frontend/index.js";
describe("PM2 navigation", () => {
  it("registers a hostless singleton PM2 menu directly", () => {
    const app = {
      registerRailItem: vi.fn(),
      registerTab: vi.fn(),
    } as unknown as TermixApp;
    activate(app);
    expect(app.registerRailItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pm2-dashboard",
        titleKey: "tab.title",
        kind: "tab",
        permission: "use",
      }),
    );
    expect(app.registerTab).toHaveBeenCalledWith(
      "pm2-dashboard",
      expect.any(Function),
      expect.objectContaining({ singleton: true, hostless: true }),
    );
  });
});
