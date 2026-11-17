import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { PluginContext } from "@termix-ssh/plugin-sdk/backend";
import { activate } from "../../src/backend/index.js";
import { pm2Metrics } from "../../src/shared/metrics.js";
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
async function setup(
  allowed = true,
  outcome: object = { status: "success", data: { rows: [] } },
) {
  const router = express.Router();
  const invoke = vi.fn(async () => outcome);
  activate({
    http: { router: () => router },
    rbac: {
      require:
        () =>
        (_req: unknown, res: express.Response, next: express.NextFunction) =>
          allowed ? next() : res.sendStatus(403),
    },
    operations: { invoke },
    currentActor: () => "user-1",
  } as unknown as PluginContext);
  const app = express();
  app.use(router);
  const server = app.listen(0);
  servers.push(server);
  const addr = server.address() as { port: number };
  return { url: `http://127.0.0.1:${addr.port}`, invoke };
}
describe("monitor boundary", () => {
  it("denies without permission and does not invoke", async () => {
    const { url, invoke } = await setup(false);
    expect((await fetch(url + "/hosts/1/metrics")).status).toBe(403);
    expect(invoke).not.toHaveBeenCalled();
  });
  it("rejects an invalid host before invoking", async () => {
    const { url, invoke } = await setup();
    expect((await fetch(url + "/hosts/1e100/metrics")).status).toBe(400);
    expect(invoke).not.toHaveBeenCalled();
  });
  it("calls only the read action and strips non-metric fields", async () => {
    const { url, invoke } = await setup(true, {
      status: "success",
      data: {
        rows: [
          {
            manager: "pm2",
            name: "api",
            state: "online",
            cpu: 2,
            mem: 1024,
            restarts: 1,
            pid: 44,
            env: { SECRET: "sensitive" },
          },
        ],
      },
    });
    const res = await fetch(url + "/hosts/7/metrics");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.apps).toEqual([
      { name: "api", state: "online", cpu: 2, mem: 1024, restarts: 1, pid: 44 },
    ]);
    expect(invoke).toHaveBeenCalledWith("process-manager.list-apps", {
      hostId: 7,
      via: "pm2-dashboard",
    });
  });
  it("does not present denied or failed results as healthy", async () => {
    const { url } = await setup(true, {
      status: "failed",
      error: "secret internal detail",
    });
    const res = await fetch(url + "/hosts/1/metrics");
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("secret");
  });
  it("filters supervisor and invalid numeric samples", () => {
    expect(
      pm2Metrics({
        rows: [
          { manager: "supervisor" },
          { manager: "pm2", name: "api", cpu: NaN },
        ],
      }),
    ).toEqual([
      {
        name: "api",
        state: "unknown",
        cpu: null,
        mem: null,
        restarts: null,
        pid: null,
      },
    ]);
  });
});

describe("detail and log routes", () => {
  it("returns only selected process information without arguments or environment", async () => {
    const { url, invoke } = await setup(true, {
      status: "success",
      data: {
        rows: [
          {
            pid: "44",
            name: "node",
            user: "teamcity",
            state: "running",
            cpu: 2,
            mem: 3,
            args: "SECRET=hidden",
            env: { password: "hidden" },
          },
        ],
      },
    });
    const res = await fetch(url + "/hosts/1/process/44");
    const body = await res.json();
    expect(body.process).toEqual({
      pid: 44,
      name: "node",
      user: "teamcity",
      state: "running",
      cpu: 2,
      memoryPercent: 3,
    });
    expect(JSON.stringify(body)).not.toContain("hidden");
    expect(invoke).toHaveBeenCalledWith("process-manager.list-processes", {
      hostId: 1,
      via: "pm2-dashboard",
    });
  });
  it("rejects untrusted app and PID arguments before reading", async () => {
    const { url, invoke } = await setup();
    expect((await fetch(url + "/hosts/1/process/NaN")).status).toBe(400);
    expect(
      (
        await fetch(
          url +
            "/hosts/1/apps/" +
            encodeURIComponent("api;whoami") +
            "/logs/stream",
        )
      ).status,
    ).toBe(400);
    expect((await fetch(url + "/hosts/1/apps/all/logs/stream")).status).toBe(
      400,
    );
    expect(invoke).not.toHaveBeenCalled();
  });
  it("requires permission for detail and streaming routes", async () => {
    const { url, invoke } = await setup(false);
    expect((await fetch(url + "/hosts/1/process/44")).status).toBe(403);
    expect((await fetch(url + "/hosts/1/apps/api/logs/stream")).status).toBe(
      403,
    );
    expect(invoke).not.toHaveBeenCalled();
  });
  it("streams source-labeled samples and stops reads after the viewer disconnects", async () => {
    const { url, invoke } = await setup(true, {
      status: "success",
      data: {
        text: "/log/api-error-0.log last 1 lines:\nerror line\n/log/api-out-0.log last 1 lines:\nregular line\n",
      },
    });
    const controller = new AbortController();
    const res = await fetch(url + "/hosts/1/apps/api/logs/stream", {
      signal: controller.signal,
    });
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const reader = res.body!.getReader();
    const first = await reader.read();
    const text = new TextDecoder().decode(first.value);
    expect(text).toContain('"source":"stdout"');
    expect(text).toContain('"source":"stderr"');
    expect(text).toContain('"reset":true');
    expect(invoke).toHaveBeenCalledWith("process-manager.tail-logs", {
      hostId: 1,
      via: "pm2-dashboard",
      input: { source: "pm2", target: "api", lines: 200, grep: "" },
    });
    controller.abort();
    await reader.cancel().catch(() => {});
    const count = invoke.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 2150));
    expect(invoke).toHaveBeenCalledTimes(count);
  });
  it("closes a failed stream with a sanitized error instead of exposing internal details", async () => {
    const { url } = await setup(true, {
      status: "failed",
      error: "secret credentials",
    });
    const res = await fetch(url + "/hosts/1/apps/api/logs/stream");
    const text = await res.text();
    expect(text).toContain("connection-error");
    expect(text).not.toContain("secret");
  });
});
