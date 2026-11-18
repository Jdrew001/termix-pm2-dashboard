import type { AppMetric } from "./metrics.js";
export interface MetricPoint {
  at: number;
  cpu: number | null;
  memory: number | null;
  pid: number | null;
}
export type MetricHistory = Record<string, MetricPoint[]>;
export const HISTORY_MS = 10 * 60 * 1000;
export function metricKey(row: AppMetric): string {
  return `${row.id ?? ""}:${row.name}`;
}
function measurement(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
/** Keep observed samples only. Never interpolate a disconnect or process restart. */
export function appendMetricSample(
  history: MetricHistory,
  apps: AppMetric[],
  sampledAt: string,
): MetricHistory {
  const at = Date.parse(sampledAt);
  if (!Number.isFinite(at)) return history;
  const next: MetricHistory = {};
  for (const [key, points] of Object.entries(history)) {
    const retained = points
      .filter((point) => point.at >= at - HISTORY_MS)
      .slice(-120);
    if (retained.length) next[key] = retained;
  }
  for (const row of apps) {
    const key = metricKey(row),
      points = next[key] ?? [];
    if (points.length && points[points.length - 1].at >= at) continue;
    next[key] = [
      ...points,
      {
        at,
        cpu: measurement(row.cpu),
        memory: measurement(row.mem),
        pid: row.pid,
      },
    ].slice(-121);
  }
  return next;
}
export function chartSegments(
  points: MetricPoint[],
  metric: "cpu" | "memory",
  start: number,
  end: number,
  maximum: number,
): { x: number; y: number; point: MetricPoint }[][] {
  const segments: ReturnType<typeof chartSegments> = [];
  let segment: ReturnType<typeof chartSegments>[number] = [];
  let previous: MetricPoint | undefined;
  for (const point of points) {
    if (point.at < start || point.at > end) continue;
    const value = point[metric];
    if (value == null) {
      segment = [];
      previous = undefined;
      continue;
    }
    if (
      !previous ||
      point.at - previous.at > 15000 ||
      point.pid !== previous.pid
    ) {
      segment = [];
      segments.push(segment);
    }
    segment.push({
      x: ((point.at - start) / Math.max(1, end - start)) * 600,
      y: 72 - Math.min(1, value / maximum) * 64,
      point,
    });
    previous = point;
  }
  return segments.filter((segment) => segment.length);
}
