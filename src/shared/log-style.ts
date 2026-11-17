export interface LogToken {
  text: string;
  kind?: string;
}
/** Presentation only: retain exact message text, never interpret it as HTML or a terminal command. */
export function logTokens(text: string): LogToken[] {
  const pattern =
    /(\b\d{4}-\d{2}-\d{2}[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?|\b\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}:\d{2}(?:\s*[AP]M)?|\[(?:Nest|[A-Za-z][\w.:-]*)\]|\b(?:LOG|INFO|WARN|WARNING|ERROR|FATAL|DEBUG|VERBOSE)\b(?=\s*(?:\[|:|$))|\+\d+(?:\.\d+)?(?:ms|s)\b)/g;
  const tokens: LogToken[] = [];
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > start)
      tokens.push({ text: text.slice(start, match.index) });
    tokens.push({ text: match[0], kind: tokenKind(match[0]) });
    start = match.index + match[0].length;
  }
  if (start < text.length) tokens.push({ text: text.slice(start) });
  return tokens.length ? tokens : [{ text: text || " " }];
}
function tokenKind(text: string): string {
  const label = text.replace(/^\[|\]$/g, "").toUpperCase();
  if (/^(ERROR|FATAL)$/.test(label)) return "error";
  if (/^(WARN|WARNING)$/.test(label)) return "warning";
  if (/^(LOG|INFO)$/.test(label)) return "success";
  if (/^(DEBUG|VERBOSE)$/.test(label)) return "debug";
  if (/^\d/.test(text)) return "timestamp";
  if (text.startsWith("+")) return "duration";
  return "context";
}
