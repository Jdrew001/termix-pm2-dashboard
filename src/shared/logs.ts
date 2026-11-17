export type LogSource = "stdout" | "stderr" | "unknown";
export interface LogLine {
  id: number;
  source: LogSource;
  text: string;
}
export interface LogSample {
  lines: LogLine[];
  reset: boolean;
  gap: boolean;
  partial: boolean;
  at: string;
}
export function cleanTerminalText(text: string): string {
  return text
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\r/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}
export function splitPm2Logs(text: string): Record<LogSource, string[]> {
  const result: Record<LogSource, string[]> = {
    stdout: [],
    stderr: [],
    unknown: [],
  };
  let source: LogSource = "unknown";
  const rows = cleanTerminalText(text).split("\n");
  if (rows.at(-1) === "") rows.pop();
  for (const line of rows) {
    const header = /^(\/.*) last \d+ lines:\s*$/.exec(line);
    if (header) {
      const file = header[1].split("/").at(-1) ?? "";
      if (/(?:^|[-_.])(?:error|err)(?:[-_.]|$)/i.test(file)) source = "stderr";
      else if (/(?:^|[-_.])(?:out|output|stdout)(?:[-_.]|$)/i.test(file))
        source = "stdout";
      else source = "unknown";
      continue;
    }
    if (/^\[TAILING\]/.test(line)) continue;
    result[source].push(line.slice(0, 12000));
  }
  return result;
}
/** Compare each file independently; identical lines within one sample stay intact. */
export function tailDelta(
  previous: string[],
  current: string[],
): { lines: string[]; gap: boolean } {
  if (previous.length === 0) return { lines: current, gap: false };
  for (
    let overlap = Math.min(previous.length, current.length);
    overlap > 0;
    overlap--
  ) {
    const start = previous.length - overlap;
    if (
      current
        .slice(0, overlap)
        .every((line, index) => previous[start + index] === line)
    )
      return { lines: current.slice(overlap), gap: false };
  }
  return { lines: current, gap: true };
}
export function visibleLogs(
  lines: LogLine[],
  source: string,
  query: string,
): LogLine[] {
  const search = query.toLocaleLowerCase();
  return lines.filter(
    (line) =>
      (source === "combined" || line.source === source) &&
      (!search || line.text.toLocaleLowerCase().includes(search)),
  );
}
