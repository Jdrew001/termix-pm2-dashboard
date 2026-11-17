import { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@termix-ssh/plugin-sdk/frontend";
import type { AppMetric } from "../shared/metrics.js";
export type AppView = "grid" | "table";
type SortKey = "name" | "cpu" | "mem" | "restarts";
export function StateBadge({ state }: { state: string }) {
  const online = state === "online";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        color: online ? "#4ade80" : "#fbbf24",
        background: online ? "#4ade8010" : "#fbbf2410",
        border: `1px solid ${online ? "#4ade8028" : "#fbbf2428"}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: "currentColor" }}
      />
      {state}
    </span>
  );
}
function cpu(value: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}
function memory(value: number | null) {
  return value == null ? "—" : `${Math.round(value / 1048576)} MB`;
}
function CpuMeter({ value }: { value: number | null }) {
  return (
    <div
      className="h-1 overflow-hidden rounded-full bg-muted"
      style={{ width: "3rem" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, value ?? 0))}%`,
          background: (value ?? 0) > 80 ? "#fbbf24" : "#38bdf8",
        }}
      />
    </div>
  );
}
export function AppList({
  apps,
  view,
  query,
  onSelect,
}: {
  apps: AppMetric[];
  view: AppView;
  query: string;
  onSelect: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortKey>("name");
  const [descending, setDescending] = useState(false);
  const rows = apps
    .filter((row) =>
      `${row.name} ${row.state} ${row.pid ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      const left = a[sort],
        right = b[sort];
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return descending ? -order : order;
    });
  function changeSort(key: SortKey) {
    if (sort === key) setDescending(!descending);
    else {
      setSort(key);
      setDescending(key !== "name");
    }
  }
  function heading(key: SortKey, label: string) {
    return (
      <th
        scope="col"
        aria-sort={
          sort === key ? (descending ? "descending" : "ascending") : "none"
        }
        className="px-3 py-2 text-left font-medium"
      >
        <button
          onClick={() => changeSort(key)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {label}
          {sort === key &&
            (descending ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
        </button>
      </th>
    );
  }
  if (!rows.length)
    return (
      <p className="px-4 py-5 text-xs text-muted-foreground">
        {t(apps.length ? "list.noMatches" : "tab.empty")}
      </p>
    );
  if (view === "table")
    return (
      <div className="overflow-x-auto">
        <table
          className="w-full text-xs tabular-nums"
          style={{ minWidth: "38rem" }}
        >
          <thead className="border-b border-border bg-muted/30 text-[10px] text-muted-foreground">
            <tr>
              {heading("name", t("list.application"))}
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t("list.status")}
              </th>
              {heading("cpu", t("tab.cpu"))}
              {heading("mem", t("tab.memory"))}
              {heading("restarts", t("tab.restarts"))}
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t("tab.pid")}
              </th>
              <th scope="col">
                <span className="sr-only">{t("detail.open")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  <button
                    aria-label={`${row.name} — ${t("detail.open")}`}
                    onClick={() => onSelect(row.name)}
                    className="block text-left hover:text-primary"
                  >
                    <span className="block">{row.name}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {t("detail.appId")} {row.id?.replace(/^pm2:/, "") ?? "—"}
                    </span>
                  </button>
                </th>
                <td className="px-3 py-2">
                  <StateBadge state={row.state} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span style={{ minWidth: "3rem" }}>{cpu(row.cpu)}</span>
                    <CpuMeter value={row.cpu} />
                  </div>
                </td>
                <td className="px-3 py-2">{memory(row.mem)}</td>
                <td
                  className="px-3 py-2"
                  style={row.restarts ? { color: "#fbbf24" } : undefined}
                >
                  {row.restarts ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.pid ?? "—"}
                </td>
                <td className="pr-3">
                  <button
                    title={t("detail.open")}
                    aria-label={`${row.name} — ${t("list.inspect")}`}
                    onClick={() => onSelect(row.name)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
                  >
                    <ArrowUpRight size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <button
          key={row.name}
          onClick={() => onSelect(row.name)}
          aria-label={`${row.name} — ${t("detail.open")}`}
          className="group min-w-0 rounded-lg border border-border bg-background p-3 text-left hover:border-primary hover:bg-muted/20"
        >
          <div className="flex items-center gap-2">
            <span
              className="min-w-0 flex-1 truncate text-xs font-semibold"
              title={row.name}
            >
              {row.name}
            </span>
            <StateBadge state={row.state} />
            <ArrowUpRight
              size={14}
              className="shrink-0 text-muted-foreground"
            />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {t("detail.appId")} {row.id?.replace(/^pm2:/, "") ?? "—"} ·{" "}
            {t("tab.pid")} {row.pid ?? "—"}
          </div>
          <dl className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-2">
            {[
              [t("tab.cpu"), cpu(row.cpu)],
              [t("tab.memory"), memory(row.mem)],
              [t("tab.restarts"), row.restarts ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </button>
      ))}
    </div>
  );
}
