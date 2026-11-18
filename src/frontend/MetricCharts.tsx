import { useState } from "react";
import { useTranslation } from "@termix-ssh/plugin-sdk/frontend";
import { chartSegments, type MetricPoint } from "../shared/history.js";
import { accentColor, accentSelection } from "./theme.js";
function formatValue(value: number | null, metric: "cpu" | "memory"): string {
  if (value == null) return "—";
  return metric === "cpu"
    ? `${value.toFixed(1)}%`
    : `${(value / 1048576).toFixed(1)} MB`;
}
function UsageChart({
  points,
  metric,
  start,
  end,
  selected,
  onSelect,
}: {
  points: MetricPoint[];
  metric: "cpu" | "memory";
  start: number;
  end: number;
  selected: MetricPoint | null;
  onSelect: (point: MetricPoint | null) => void;
}) {
  const { t } = useTranslation();
  const values = points.flatMap((point) =>
    point[metric] == null ? [] : [point[metric]!],
  );
  const peak = values.length ? Math.max(...values) : null;
  const minimum = metric === "cpu" ? 1 : 16 * 1048576;
  const maximum = Math.max(minimum, (peak ?? 0) * 1.2);
  const segments = chartSegments(points, metric, start, end, maximum);
  const current = points.at(-1)?.[metric] ?? null;
  const label = t(metric === "cpu" ? "tab.cpu" : "tab.memory");
  const title = `${label}: ${formatValue(current, metric)}; ${t("history.peak")} ${formatValue(peak, metric)}`;
  function selectNear(at: number) {
    const nearest = points.reduce<MetricPoint | null>(
      (best, point) =>
        !best || Math.abs(point.at - at) < Math.abs(best.at - at)
          ? point
          : best,
      null,
    );
    onSelect(nearest);
  }
  return (
    <figure className="min-w-0 px-3 py-2">
      <figcaption className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-medium">
          {label}{" "}
          <span className="ml-1 tabular-nums" style={{ color: accentColor }}>
            {formatValue(current, metric)}
          </span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          {t("history.peak")} {formatValue(peak, metric)}
        </span>
      </figcaption>
      <svg
        viewBox="0 0 600 80"
        preserveAspectRatio="none"
        role="img"
        aria-label={title}
        tabIndex={0}
        className="mt-1 h-20 w-full outline-none focus:ring-1 focus:ring-accent-brand"
        onPointerLeave={() => onSelect(null)}
        onBlur={() => onSelect(null)}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          selectNear(
            start +
              ((event.clientX - bounds.left) / Math.max(1, bounds.width)) *
                (end - start),
          );
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const index = selected ? points.indexOf(selected) : points.length - 1;
          onSelect(
            points[
              Math.max(
                0,
                Math.min(
                  points.length - 1,
                  index + (event.key === "ArrowLeft" ? -1 : 1),
                ),
              )
            ] ?? null,
          );
        }}
      >
        {[8, 40, 72].map((y) => (
          <line
            key={y}
            x1="0"
            x2="600"
            y1={y}
            y2={y}
            stroke="var(--border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="3 5"
          />
        ))}
        {segments.map((segment, index) => {
          const path = segment
            .map(
              (p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`,
            )
            .join(" ");
          const first = segment[0],
            last = segment[segment.length - 1];
          return (
            <g key={index}>
              <path
                d={`${path} L${last.x},72 L${first.x},72 Z`}
                fill="color-mix(in oklab, var(--accent-brand) 12%, transparent)"
              />
              <path
                data-series
                d={path}
                fill="none"
                stroke={accentColor}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              {segment.length === 1 && (
                <circle cx={first.x} cy={first.y} r="2" fill={accentColor} />
              )}
            </g>
          );
        })}
        {selected && (
          <line
            x1={((selected.at - start) / (end - start)) * 600}
            x2={((selected.at - start) / (end - start)) * 600}
            y1="0"
            y2="80"
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="flex justify-between text-[9px] tabular-nums text-muted-foreground">
        <time>{new Date(start).toLocaleTimeString()}</time>
        <time>{new Date(end).toLocaleTimeString()}</time>
      </div>
    </figure>
  );
}
export function MetricCharts({
  history,
  sampledAt,
  stale,
  isVisible,
}: {
  history: MetricPoint[];
  sampledAt: string;
  stale: boolean;
  isVisible: boolean;
}) {
  const { t } = useTranslation();
  const [minutes, setMinutes] = useState(1);
  const [selected, setSelected] = useState<MetricPoint | null>(null);
  const parsed = Date.parse(sampledAt),
    end = Number.isFinite(parsed) ? parsed : Date.now(),
    start = end - minutes * 60000;
  const points = history.filter(
    (point) => point.at >= start && point.at <= end,
  );
  const active = selected && points.includes(selected) ? selected : null;
  return (
    <section
      aria-label={t("history.title")}
      className="shrink-0 overflow-hidden rounded-md border border-border bg-card"
    >
      <div className="flex items-center gap-3 border-b border-border px-3 py-1 text-[10px]">
        <h2 className="font-medium">{t("history.title")}</h2>
        <span className="text-muted-foreground">
          {t(
            stale
              ? "history.stale"
              : !isVisible
                ? "history.paused"
                : "history.cadence",
          )}
        </span>
        <div
          role="group"
          aria-label={t("history.range")}
          className="ml-auto flex gap-1"
        >
          {[1, 5, 10].map((value) => (
            <button
              key={value}
              aria-pressed={minutes === value}
              onClick={() => {
                setMinutes(value);
                setSelected(null);
              }}
              style={minutes === value ? accentSelection : undefined}
              className="rounded px-2 py-0.5 text-muted-foreground hover:text-accent-brand"
            >
              {value}
              {t("history.minuteShort")}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        {(["cpu", "memory"] as const).map((metric) => (
          <UsageChart
            key={metric}
            points={points}
            metric={metric}
            start={start}
            end={end}
            selected={active}
            onSelect={setSelected}
          />
        ))}
      </div>
      <div
        className="truncate border-t border-border px-3 py-1 text-[9px] text-muted-foreground"
        aria-live="off"
      >
        {active
          ? `${new Date(active.at).toLocaleTimeString()} · ${t("tab.cpu")} ${formatValue(active.cpu, "cpu")} · ${t("tab.memory")} ${formatValue(active.memory, "memory")}`
          : t(points.length < 2 ? "history.collecting" : "history.session")}
      </div>
    </section>
  );
}
