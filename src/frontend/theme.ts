import type { CSSProperties } from "react";

// Read core tokens directly so Appearance changes apply without reloading the plugin.
export const accentColor = "var(--accent-brand)";
export const accentSurface: CSSProperties = {
  color: accentColor,
  background: "color-mix(in oklab, var(--accent-brand) 12%, var(--card))",
  borderColor: "color-mix(in oklab, var(--accent-brand) 35%, var(--border))",
};
export const accentSelection: CSSProperties = {
  ...accentSurface,
  boxShadow:
    "inset 0 0 0 1px color-mix(in oklab, var(--accent-brand) 35%, transparent)",
};
export const logColors: Record<string, string> = {
  timestamp: "var(--muted-foreground)",
  context: accentColor,
  success: "#4ade80",
  warning: "#fbbf24",
  error: "var(--destructive)",
  debug: "var(--muted-foreground)",
  duration: accentColor,
};
