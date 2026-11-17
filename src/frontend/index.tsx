import { useEffect, useState } from "react";
import {
  useTranslation,
  type TermixApp,
  type PluginHostRecord,
  type TabProps,
  useSettings,
} from "@termix-ssh/plugin-sdk/frontend";
import { LoadingState } from "@termix-ssh/plugin-sdk/ui";
import { AppList, type AppView } from "./AppList.js";
import {
  Activity,
  LayoutGrid,
  List,
  Search,
  Server,
  Radio,
} from "lucide-react";
import { accentSurface, accentSelection } from "./theme.js";
import { ProcessDetail } from "./ProcessDetail.js";
import { startPolling } from "./polling.js";
import type { AppMetric } from "../shared/metrics.js";
type Sample = { apps: AppMetric[]; sampledAt: string };
function HostMetrics({
  app,
  host,
  isVisible,
  allowAutomatic,
  selected,
  view,
  query,
  onSelect,
}: {
  app: TermixApp;
  host: PluginHostRecord;
  isVisible: boolean;
  allowAutomatic: boolean;
  selected: string | null;
  view: AppView;
  query: string;
  onSelect: (name: string | null) => void;
}) {
  const { t } = useTranslation();
  const [sample, setSample] = useState<Sample>();

  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isVisible || !allowAutomatic) return;
    let active = true;
    const stop = startPolling(async () => {
      if (document.hidden) return;

      try {
        const result = await app.api.get<Sample>(`/hosts/${host.id}/metrics`);
        if (active) {
          setSample(result.data);
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
  }, [app, host.id, isVisible, allowAutomatic]);
  const selectedRow = sample?.apps.find((row) => row.name === selected);
  if (selected && sample && !selectedRow)
    return (
      <section className="space-y-3">
        <button
          className="rounded-md border border-border px-3 py-2"
          onClick={() => onSelect(null)}
        >
          ← {t("detail.back")}
        </button>
        <p>{t("detail.noProcess")}</p>
      </section>
    );
  if (selectedRow)
    return (
      <ProcessDetail
        app={app}
        host={host}
        row={selectedRow}
        sampledAt={sample?.sampledAt ?? ""}
        metricsStale={failed}
        isVisible={isVisible}
        onBack={() => onSelect(null)}
      />
    );
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
          <Server size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{host.name}</h2>
          <p className="text-[10px] text-muted-foreground">{host.ip}</p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
          {sample && (
            <>
              <span>
                <span className="font-medium text-foreground">
                  {sample.apps.filter((row) => row.state === "online").length}/
                  {sample.apps.length}
                </span>{" "}
                {t("list.online")}
              </span>
              <span>
                {sample.apps.reduce((sum, row) => sum + (row.mem ?? 0), 0)
                  ? `${Math.round(sample.apps.reduce((sum, row) => sum + (row.mem ?? 0), 0) / 1048576)} MB`
                  : "—"}
              </span>
            </>
          )}
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              color: failed
                ? "#fbbf24"
                : allowAutomatic
                  ? "#4ade80"
                  : undefined,
            }}
          >
            <Radio size={11} />
            {failed
              ? t("list.stale")
              : allowAutomatic
                ? t("list.live")
                : t("list.scheduled")}
          </span>
          {sample && (
            <time title={new Date(sample.sampledAt).toLocaleString()}>
              {new Date(sample.sampledAt).toLocaleTimeString()}
            </time>
          )}
        </div>
      </div>
      {failed && (
        <p role="alert" className="px-4 py-2 text-xs text-amber-500">
          {t("tab.error")}
        </p>
      )}
      {!allowAutomatic && (
        <div className="flex items-start gap-3 px-4 py-4 text-xs text-muted-foreground">
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
          <p>{t("tab.pending")}</p>
        </div>
      )}
      {!sample && !failed && allowAutomatic && (
        <div className="p-4">
          <LoadingState compact label={t("tab.loading")} />
        </div>
      )}
      {sample && (
        <AppList
          apps={sample.apps}
          view={view}
          query={query}
          onSelect={onSelect}
        />
      )}
    </section>
  );
}
function Dashboard({ app, isVisible }: { app: TermixApp; isVisible: boolean }) {
  const { values } = useSettings("user");
  const [view, setView] = useState<AppView>(() => {
    try {
      return localStorage.getItem("pm2-dashboard-view") === "table"
        ? "table"
        : "grid";
    } catch {
      return "grid";
    }
  });
  const [query, setQuery] = useState("");
  function changeView(next: AppView) {
    setView(next);
    try {
      localStorage.setItem("pm2-dashboard-view", next);
    } catch {
      /* Keep the view usable if local storage is unavailable. */
    }
  }
  const [selection, setSelection] = useState<{
    hostId: string;
    name: string;
  } | null>(null);
  const { t } = useTranslation();
  const [hosts, setHosts] = useState<PluginHostRecord[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void app
      .listHosts()
      .then((rows) => {
        if (active) setHosts(rows.filter((h) => h.enableSsh));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [app]);
  return (
    <main
      className={
        selection
          ? "h-full min-h-0 overflow-hidden p-3"
          : "h-full overflow-auto p-4 space-y-4"
      }
    >
      {!selection && (
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-accent-brand"
              style={accentSurface}
            >
              <Activity size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{t("list.title")}</h1>
              <p className="text-[11px] text-muted-foreground">
                {t("list.subtitle")}
              </p>
            </div>
            <span className="ml-auto rounded-full border border-border px-3 py-1 text-[10px] text-muted-foreground">
              {hosts.length} {t("list.servers")} · {t("list.cadence")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-40 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground focus-within:border-accent-brand">
              <Search size={14} />
              <input
                aria-label={t("list.search")}
                placeholder={t("list.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none"
              />
            </label>
            <div
              role="group"
              aria-label={t("list.view")}
              className="flex rounded-lg border border-border bg-card p-1"
            >
              {(["grid", "table"] as const).map((mode) => (
                <button
                  key={mode}
                  aria-pressed={view === mode}
                  onClick={() => changeView(mode)}
                  style={view === mode ? accentSelection : undefined}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-accent-brand"
                >
                  {mode === "grid" ? (
                    <LayoutGrid size={14} />
                  ) : (
                    <List size={14} />
                  )}{" "}
                  {t(`list.${mode}`)}
                </button>
              ))}
            </div>
          </div>
        </header>
      )}
      {failed && <p role="alert">{t("tab.failed")}</p>}
      {hosts
        .filter((host) => !selection || host.id === selection.hostId)
        .map((host) => (
          <HostMetrics
            key={host.id}
            app={app}
            host={host}
            view={view}
            query={query}
            selected={selection?.hostId === host.id ? selection.name : null}
            onSelect={(name) =>
              setSelection(name ? { hostId: host.id, name } : null)
            }
            isVisible={isVisible}
            allowAutomatic={
              host.ip !== "72.14.179.70" ||
              values.abideAutomaticUpdates === true
            }
          />
        ))}
    </main>
  );
}
export function activate(app: TermixApp) {
  app.registerRailItem({
    id: "pm2-dashboard",
    icon: Activity,
    titleKey: "tab.title",
    kind: "tab",
    permission: "use",
  });
  app.registerTab(
    "pm2-dashboard",
    ({ isVisible }: TabProps) => <Dashboard app={app} isVisible={isVisible} />,
    {
      icon: Activity,
      titleKey: "tab.title",
      singleton: true,
      hostless: true,
    },
  );
}
