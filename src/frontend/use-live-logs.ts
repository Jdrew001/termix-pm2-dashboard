import { useEffect, useState } from "react";
import type { TermixApp } from "@termix-ssh/plugin-sdk/frontend";
import type { LogLine, LogSample } from "../shared/logs.js";
import { readEvents } from "./stream-client.js";
export function usePageVisible() {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}
export function useLiveLogs(
  app: TermixApp,
  hostId: string,
  name: string,
  enabled: boolean,
) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [status, setStatus] = useState("connecting");
  const [at, setAt] = useState("");
  const [gap, setGap] = useState(false);
  const [partial, setPartial] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setStatus("paused");
      return;
    }
    let disposed = false;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 2000;
    async function connect() {
      controller = new AbortController();
      setStatus("connecting");
      try {
        const response = await app.fetch(
          `/hosts/${hostId}/apps/${encodeURIComponent(name)}/logs/stream`,
          {
            signal: controller.signal,
            headers: { Accept: "text/event-stream" },
          },
        );
        await readEvents(
          response,
          (event) => {
            if (disposed) return;
            if (event.type === "connection-error")
              throw new Error("Stream unavailable");
            if (event.type !== "sample") return;
            const sample = event.data as LogSample;
            if (!Array.isArray(sample.lines)) throw new Error("Invalid sample");
            setLines((old) =>
              (sample.reset ? sample.lines : [...old, ...sample.lines]).slice(
                -2000,
              ),
            );
            setAt(sample.at);
            setStatus("connected");
            setGap((old) => old || sample.gap);
            setPartial(sample.partial);
            delay = 2000;
          },
          controller.signal,
        );
      } catch {
        if (!disposed) {
          setStatus("retrying");
          timer = setTimeout(() => void connect(), delay);
          delay = Math.min(30000, delay * 2);
        }
      }
    }
    void connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [app, hostId, name, enabled]);
  return { lines, status, at, gap, partial, clear: () => setLines([]) };
}
