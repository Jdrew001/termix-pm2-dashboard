import { useTranslation } from "@termix-ssh/plugin-sdk/frontend";
import type { LogLine as Entry } from "../shared/logs.js";
import { logTokens } from "../shared/log-style.js";

const colors: Record<string, string> = {
  timestamp: "#94a3b8",
  context: "#38bdf8",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#f87171",
  debug: "#c084fc",
  duration: "#a3e635",
};
export function StyledLogLine({
  line,
  name,
  pm2Id,
  wrap,
  styled,
}: {
  line: Entry;
  name: string;
  pm2Id?: string;
  wrap: boolean;
  styled: boolean;
}) {
  const { t } = useTranslation();
  const error = line.source === "stderr";
  return (
    <div
      className={`flex min-w-max gap-3 rounded-sm hover:bg-muted/40 ${wrap ? "whitespace-pre-wrap break-all min-w-0" : "whitespace-pre"}`}
      style={{
        borderLeft: `2px solid ${error ? "#f8717155" : "transparent"}`,
        paddingLeft: "0.4rem",
      }}
    >
      <span
        aria-label={t(`logs.${line.source}`)}
        title={t(`logs.${line.source}`)}
        className="select-none shrink-0 text-right text-muted-foreground"
        style={{
          color: error ? "#f87171" : "#4ade80",
          width: styled ? "auto" : "6rem",
          maxWidth: "14rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {styled
          ? `${pm2Id ? `${pm2Id}|` : ""}${name} › ${t(`logs.short.${line.source}`)}`
          : t(`logs.${line.source}`)}
      </span>
      <span
        className="min-w-0 text-foreground"
        style={styled && error ? { color: "#fca5a5" } : undefined}
      >
        {styled
          ? logTokens(line.text).map((token, index) => (
              <span
                key={index}
                style={
                  token.kind
                    ? {
                        color: colors[token.kind],
                        fontWeight:
                          token.kind === "error" || token.kind === "warning"
                            ? 600
                            : undefined,
                      }
                    : undefined
                }
              >
                {token.text}
              </span>
            ))
          : line.text || " "}
      </span>
    </div>
  );
}
