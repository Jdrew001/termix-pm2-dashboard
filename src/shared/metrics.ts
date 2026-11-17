export interface AppMetric {
  name: string;
  id?: string;
  state: string;
  cpu: number | null;
  mem: number | null;
  restarts: number | null;
  pid: number | null;
}
export function pm2Metrics(data: unknown): AppMetric[] {
  if (!data || typeof data !== "object") return [];
  const rows = (data as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return [];
  const number = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return rows
    .filter((row) => row?.manager === "pm2")
    .map((row) => ({
      name: String(row.name ?? ""),
      ...(typeof row.id === "string" ? { id: row.id } : {}),
      state: String(row.state ?? "unknown"),
      cpu: number(row.cpu),
      mem: number(row.mem),
      restarts: number(row.restarts),
      pid: number(row.pid),
    }));
}
