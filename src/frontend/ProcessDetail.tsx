import { useEffect, useState } from "react";
import {
  useTranslation,
  type TermixApp,
  type PluginHostRecord,
} from "@termix-ssh/plugin-sdk/frontend";
import type { AppMetric } from "../shared/metrics.js";
import { startPolling } from "./polling.js";
import { MetricCharts } from "./MetricCharts.js";
import type { MetricPoint } from "../shared/history.js";
import { LogViewer } from "./LogViewer.js";
interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  state: string;
  cpu: number | null;
  memoryPercent: number | null;
}
export function ProcessDetail({
  app,
  host,
  row,
  sampledAt,
  metricsStale,
  history = [],
  isVisible,
  onBack,
}: {
  app: TermixApp;
  host: PluginHostRecord;
  row: AppMetric;
  sampledAt: string;
  metricsStale: boolean;
  history?: MetricPoint[];
  isVisible: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [process, setProcess] = useState<ProcessInfo | null>();
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!isVisible || !row.pid) return;
    setProcess(undefined);
    setFailed(false);
    let active = true;
    const stop = startPolling(async () => {
      if (document.hidden) return;
      try {
        const result = await app.api.get<{ process: ProcessInfo | null }>(
          `/hosts/${host.id}/process/${row.pid}`,
        );
        if (active) {
          setProcess(result.data.process);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    }, 5000);
    return () => {
      active = false;
      stop();
    };
  }, [app, host.id, row.pid, isVisible]);
  const primary = [
    [t("tab.cpu"), row.cpu == null ? "—" : `${row.cpu.toFixed(1)}%`],
    [
      t("tab.memory"),
      row.mem == null ? "—" : `${Math.round(row.mem / 1048576)} MB`,
    ],
    [t("tab.restarts"), row.restarts ?? "—"],
    [t("tab.pid"), row.pid ?? "—"],
    [t("detail.owner"), process?.user ?? "—"],
  ];
  const secondary = [
    [t("detail.host"), `${host.name} · ${host.ip}`],
    [t("detail.appId"), row.id?.replace(/^pm2:/, "") ?? "—"],
    [t("detail.command"), process?.name ?? "—"],
    [t("detail.state"), process?.state ?? row.state],
    [
      t("detail.memoryPercent"),
      process?.memoryPercent == null
        ? "—"
        : `${process.memoryPercent.toFixed(1)}%`,
    ],
  ];
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
        <button
          onClick={onBack}
          aria-label={t("detail.back")}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          ← {t("detail.backCompact")}
        </button>
        <h1 className="min-w-0 truncate text-sm font-semibold" title={row.name}>
          {row.name}
        </h1>
        <span className="text-xs text-muted-foreground">{host.name}</span>
        <span
          className={
            row.state === "online"
              ? "text-xs text-green-500"
              : "text-xs text-amber-500"
          }
        >
          {row.state}
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {t("detail.sample")}:{" "}
          {sampledAt ? new Date(sampledAt).toLocaleTimeString() : "—"}
        </span>
        <button
          className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t("detail.less") : t("detail.more")}
        </button>
      </header>
      {metricsStale && (
        <p role="alert" className="shrink-0 text-xs text-amber-500">
          {t("tab.error")}
        </p>
      )}
      <dl className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
        {primary.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {expanded && (
        <dl className="grid max-h-40 shrink-0 grid-cols-2 gap-3 overflow-auto rounded-md border border-border bg-card p-3 text-xs lg:grid-cols-5">
          {secondary.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {failed && (
        <p role="alert" className="shrink-0 text-xs text-amber-500">
          {t("detail.unavailable")}
        </p>
      )}
      {process === null && (
        <p role="status" className="shrink-0 text-xs text-amber-500">
          {t("detail.noProcess")}
        </p>
      )}
      <MetricCharts
        history={history}
        sampledAt={sampledAt}
        stale={metricsStale}
        isVisible={isVisible}
      />
      <LogViewer
        key={`${host.id}:${row.name}`}
        app={app}
        hostId={host.id}
        name={row.name}
        pm2Id={row.id?.replace(/^pm2:/, "")}
        isVisible={isVisible}
      />
    </div>
  );
}
