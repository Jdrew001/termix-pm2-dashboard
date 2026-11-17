import { useEffect, useState } from "react";
import { useTranslation } from "@termix-ssh/plugin-sdk/frontend";
import { accentSurface } from "./theme.js";
import type { LogSelection } from "./use-log-selection.js";
export function SelectionCopy({ selection }: { selection: LogSelection }) {
  const { t } = useTranslation();
  const [state, setState] = useState("copy");
  useEffect(() => {
    if (state === "copy") return;
    const timer = setTimeout(() => setState("copy"), 1600);
    return () => clearTimeout(timer);
  }, [state]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(selection.text);
      setState("copied");
    } catch {
      setState("copyFailed");
    }
  }
  return (
    <button
      type="button"
      aria-label={t("logs.copySelection")}
      aria-live="polite"
      title={
        state === "copyFailed"
          ? t("logs.copyKeyboardHint")
          : t("logs.copySelection")
      }
      className="absolute z-30 min-w-20 rounded-full border border-border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg hover:bg-muted"
      style={{ ...accentSurface, left: selection.left, top: selection.top }}
      onPointerDown={(event) => event.preventDefault()}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => void copy()}
    >
      {t(`logs.${state}`)}
    </button>
  );
}
