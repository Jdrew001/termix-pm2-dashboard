import type { PluginContext } from "@termix-ssh/plugin-sdk/backend";
import type { Router } from "express";
import { readMetrics, readProcess } from "./read.js";
import { followLogs } from "./log-stream.js";
const APP_NAME = /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/;
export function activate(ctx: PluginContext) {
  const router = ctx.http.router<Router>();
  const streams = new Map<() => void, string>();
  ctx.disposables?.add(() => {
    for (const stop of [...streams.keys()]) stop();
  });
  router.use(ctx.rbac.require("use") as never);
  router.use("/hosts/:hostId", (req, res, next) => {
    const id = Number(req.params.hostId);
    if (!Number.isSafeInteger(id) || id <= 0)
      return res.status(400).json({ error: "Invalid host" });
    next();
  });
  /**
   * @openapi
   * /plugin-api/pm2-dashboard/hosts/{hostId}/metrics:
   *   get:
   *     summary: Read authorized PM2 metrics
   *     responses:
   *       200:
   *         description: Sanitized PM2 metrics
   *       400:
   *         description: Invalid host
   *       403:
   *         description: Permission denied
   */
  router.get("/hosts/:hostId/metrics", async (req, res) => {
    try {
      res.json(await readMetrics(ctx, Number(req.params.hostId)));
    } catch {
      res.status(502).json({ error: "Metrics unavailable" });
    }
  });
  /**
   * @openapi
   * /plugin-api/pm2-dashboard/hosts/{hostId}/process/{pid}:
   *   get:
   *     summary: Read a process owner and state without arguments or environment
   *     responses:
   *       200:
   *         description: Sanitized process details or null for an exited PID
   *       400:
   *         description: Invalid PID
   *       403:
   *         description: Permission denied
   */
  router.get("/hosts/:hostId/process/:pid", async (req, res) => {
    const pid = Number(req.params.pid);
    if (!Number.isSafeInteger(pid) || pid < 2 || pid > 4194304)
      return res.status(400).json({ error: "Invalid PID" });
    try {
      return res.json(await readProcess(ctx, Number(req.params.hostId), pid));
    } catch {
      return res.status(502).json({ error: "Process unavailable" });
    }
  });
  /**
   * @openapi
   * /plugin-api/pm2-dashboard/hosts/{hostId}/apps/{app}/logs/stream:
   *   get:
   *     summary: Follow bounded, source-labeled PM2 log tails as authenticated SSE
   *     responses:
   *       200:
   *         description: Log samples and connection events
   *       400:
   *         description: Invalid app
   *       403:
   *         description: Permission denied
   *       429:
   *         description: Too many active streams
   */
  router.get("/hosts/:hostId/apps/:app/logs/stream", (req, res) => {
    const app = String(req.params.app);
    if (!APP_NAME.test(app) || app === "all")
      return res.status(400).json({ error: "Invalid app" });
    const actor = String(ctx.currentActor());
    if ([...streams.values()].filter((id) => id === actor).length >= 4)
      return res.status(429).json({ error: "Too many streams" });
    let stop = () => {};
    stop = followLogs(ctx, Number(req.params.hostId), app, res, () =>
      streams.delete(stop),
    );
    streams.set(stop, actor);
  });
}
