import type { PluginContext } from "@termix-ssh/plugin-sdk/backend";
import { pm2Metrics } from "../shared/metrics.js";
export async function readOperation(
  ctx: PluginContext,
  id: string,
  hostId: number,
  input?: Record<string, unknown>,
) {
  const result = await ctx.operations.invoke(id, {
    hostId,
    via: "pm2-dashboard",
    ...(input ? { input } : {}),
  });
  if (result.error || result.status !== "success")
    throw new Error("Read unavailable");
  return result.data;
}
export async function readMetrics(ctx: PluginContext, hostId: number) {
  return {
    apps: pm2Metrics(
      await readOperation(ctx, "process-manager.list-apps", hostId),
    ),
    sampledAt: new Date().toISOString(),
  };
}
export async function readProcess(
  ctx: PluginContext,
  hostId: number,
  pid: number,
) {
  const data = (await readOperation(
    ctx,
    "process-manager.list-processes",
    hostId,
  )) as { rows?: Record<string, unknown>[] };
  const row = data?.rows?.find((row) => Number(row.pid) === pid);
  if (!row) return { process: null };
  // Do not pass command arguments or any environment data to the dashboard.
  return {
    process: {
      pid: Number(row.pid),
      name: String(row.name ?? ""),
      user: String(row.user ?? ""),
      state: String(row.state ?? ""),
      cpu: typeof row.cpu === "number" ? row.cpu : null,
      memoryPercent: typeof row.mem === "number" ? row.mem : null,
    },
    sampledAt: new Date().toISOString(),
  };
}
export async function readLogTail(
  ctx: PluginContext,
  hostId: number,
  app: string,
) {
  const data = (await readOperation(ctx, "process-manager.tail-logs", hostId, {
    source: "pm2",
    target: app,
    lines: 200,
    grep: "",
  })) as { text?: unknown };
  if (typeof data?.text !== "string") throw new Error("Logs unavailable");
  return data.text;
}
