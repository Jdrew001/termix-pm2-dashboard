import type { PluginContext } from "@termix-ssh/plugin-sdk/backend";
import type { Response } from "express";
import {
  splitPm2Logs,
  tailDelta,
  type LogLine,
  type LogSource,
} from "../shared/logs.js";
import { readLogTail } from "./read.js";
export function followLogs(
  ctx: PluginContext,
  hostId: number,
  app: string,
  res: Response,
  onStop: () => void,
) {
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sequence = 0;
  let first = true;
  let previous: Record<LogSource, string[]> = {
    stdout: [],
    stderr: [],
    unknown: [],
  };
  function stop() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    onStop();
    res.end();
  }
  function send(type: string, data: unknown) {
    if (closed || res.destroyed) return;
    if (res.writableLength > 512000) {
      stop();
      return;
    }
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  async function sample() {
    try {
      const current = splitPm2Logs(await readLogTail(ctx, hostId, app));
      if (closed) return;
      const lines: LogLine[] = [];
      let gap = false;
      for (const source of ["stdout", "stderr", "unknown"] as const) {
        const delta = tailDelta(previous[source], current[source]);
        gap ||= delta.gap;
        for (const text of delta.lines)
          lines.push({ id: ++sequence, source, text });
      }
      send("sample", {
        lines,
        reset: first,
        gap,
        partial: current.unknown.some((line) => line.trim()),
        at: new Date().toISOString(),
      });
      previous = current;
      first = false;
    } catch {
      send("connection-error", { message: "Logs unavailable" });
      stop();
    } finally {
      if (!closed) timer = setTimeout(() => void sample(), 2000);
    }
  }
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  res.once("close", stop);
  void sample();
  return stop;
}
