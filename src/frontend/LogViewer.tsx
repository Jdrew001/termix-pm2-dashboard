import { useLayoutEffect, useRef, useState } from "react";
import {
  useTranslation,
  type TermixApp,
} from "@termix-ssh/plugin-sdk/frontend";
import { StyledLogLine } from "./LogLine.js";
import { SelectionCopy } from "./SelectionCopy.js";
import { useLogSelection } from "./use-log-selection.js";
import { visibleLogs } from "../shared/logs.js";
import { useLiveLogs, usePageVisible } from "./use-live-logs.js";
export function LogViewer({
  app,
  hostId,
  name,
  pm2Id,
  isVisible,
}: {
  app: TermixApp;
  hostId: string;
  name: string;
  pm2Id?: string;
  isVisible: boolean;
}) {
  const { t } = useTranslation();
  const pageVisible = usePageVisible();
  const [paused, setPaused] = useState(false);
  const [source, setSource] = useState("combined");
  const [query, setQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [followingTail, setFollowingTail] = useState(true);
  const followingTailRef = useRef(true);
  const [styled, setStyled] = useState(true);
  const [wrap, setWrap] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const logSelection = useLogSelection(viewport);
  const logs = useLiveLogs(
    app,
    hostId,
    name,
    isVisible && pageVisible && !paused,
  );
  const shown = visibleLogs(logs.lines, source, query);
  useLayoutEffect(() => {
    if (
      autoScroll &&
      followingTailRef.current &&
      !logSelection.active.current &&
      viewport.current
    )
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [
    logs.lines,
    source,
    query,
    autoScroll,
    followingTail,
    logSelection.selection,
  ]);
  function trackScroll() {
    const element = viewport.current;
    if (!element) return;
    const atBottom =
      element.scrollHeight - element.clientHeight - element.scrollTop <= 8;
    followingTailRef.current = atBottom;
    setFollowingTail(atBottom);
  }
  function jumpToLatest() {
    followingTailRef.current = true;
    setFollowingTail(true);
    setAutoScroll(true);
    if (viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="shrink-0 border-b border-border px-3 py-2 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-semibold">{t("logs.title")}</h3>
          <span
            role="status"
            className={
              logs.status === "retrying"
                ? "text-amber-500 text-xs"
                : "text-muted-foreground text-xs"
            }
          >
            {t(`logs.${logs.status}`)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            role="group"
            aria-label={t("logs.title")}
            className="flex rounded-md border border-border overflow-hidden"
          >
            {["combined", "stdout", "stderr"].map((value) => (
              <button
                key={value}
                aria-pressed={source === value}
                className={`px-2 py-1 text-xs ${source === value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setSource(value)}
              >
                {t(`logs.${value}`)}
              </button>
            ))}
          </div>
          <input
            aria-label={t("logs.search")}
            placeholder={t("logs.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={300}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs flex-1 min-w-32"
          />
          <button
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? t("logs.resume") : t("logs.pause")}
          </button>
          <button
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
            onClick={logs.clear}
          >
            {t("logs.clear")}
          </button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => {
                setAutoScroll(e.target.checked);
                if (e.target.checked) jumpToLatest();
              }}
            />
            {t("logs.follow")}
          </label>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={wrap}
              onChange={(e) => setWrap(e.target.checked)}
            />
            {t("logs.wrap")}
          </label>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={styled}
              onChange={(e) => setStyled(e.target.checked)}
            />
            {t("logs.styled")}
          </label>
          {query && (
            <span className="inline-flex items-center gap-2 text-amber-500">
              <span>
                {t("logs.filtered")} · {shown.length}/{logs.lines.length}
              </span>
              <button
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setQuery("")}
              >
                {t("logs.clearFilter")}
              </button>
            </span>
          )}
          {logs.at && (
            <span>
              {t("logs.checked")}: {new Date(logs.at).toLocaleTimeString()}
            </span>
          )}
        </div>
        {logs.gap && (
          <p className="text-xs text-amber-500">{t("logs.rotation")}</p>
        )}
        {logs.partial && (
          <p className="text-xs text-amber-500">{t("logs.partial")}</p>
        )}
        {logs.status === "retrying" && (
          <p className="text-xs text-amber-500">{t("logs.notLive")}</p>
        )}
      </div>
      <div className="relative min-h-0 flex-1" data-log-frame>
        <div
          ref={viewport}
          onScroll={trackScroll}
          role="log"
          aria-label={t("logs.title")}
          aria-live="off"
          tabIndex={0}
          className="h-full min-h-0 overflow-auto bg-background font-mono text-xs leading-5 p-3"
        >
          {shown.length === 0 && (
            <p className="text-muted-foreground">{t("logs.empty")}</p>
          )}
          {shown.map((line) => (
            <StyledLogLine
              key={line.id}
              line={line}
              name={name}
              pm2Id={pm2Id}
              wrap={wrap}
              styled={styled}
            />
          ))}
        </div>
        {(!followingTail || !autoScroll) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
            <div
              className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-popover/95 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur-sm"
              title={t("logs.readingHistoryHint")}
            >
              <span role="status">
                {autoScroll ? t("logs.readingHistory") : t("logs.followOff")}
              </span>
              <button
                type="button"
                className="font-medium text-foreground hover:text-primary"
                onClick={jumpToLatest}
              >
                {t("logs.jumpLatest")}
              </button>
            </div>
          </div>
        )}
        {logSelection.selection && (
          <SelectionCopy
            key={logSelection.selection.text}
            selection={logSelection.selection}
          />
        )}
      </div>
      <p
        className="shrink-0 truncate border-t border-border px-3 py-1 text-[10px] text-muted-foreground"
        title={t("logs.tail")}
      >
        {shown.length} {t("logs.linesShown")} · {t("logs.applicationOutput")}
      </p>
    </section>
  );
}
