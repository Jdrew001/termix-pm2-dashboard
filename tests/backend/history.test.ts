import { describe, it, expect } from "vitest";
import {
  appendMetricSample,
  chartSegments,
  metricKey,
} from "../../src/shared/history.js";
const app = {
  name: "api",
  id: "pm2:0",
  state: "online",
  pid: 1,
  cpu: 200,
  mem: 1048576,
  restarts: 0,
};
describe("observed metric history", () => {
  it("keeps observed values, ignores duplicate timestamps and separates namespaces", () => {
    const first = appendMetricSample(
      {},
      [app, { ...app, id: "pm2:web:0" }],
      "2026-11-17T22:00:00Z",
    );
    const second = appendMetricSample(
      first,
      [{ ...app, cpu: 99 }],
      "2026-11-17T22:00:00Z",
    );
    expect(second[metricKey(app)]).toHaveLength(1);
    expect(second[metricKey(app)][0].cpu).toBe(200);
    expect(Object.keys(second)).toHaveLength(2);
  });
  it("bounds retention and rejects invalid values and times", () => {
    const first = appendMetricSample({}, [app], "2026-11-17T22:00:00Z");
    const later = appendMetricSample(
      first,
      [{ ...app, cpu: NaN, mem: -1 }],
      "2026-11-17T22:11:00Z",
    );
    expect(later[metricKey(app)]).toHaveLength(1);
    expect(later[metricKey(app)][0]).toMatchObject({ cpu: null, memory: null });
    expect(appendMetricSample(later, [app], "invalid")).toBe(later);
  });
  it("breaks line segments at restarts, missing readings and disconnections", () => {
    const points = [
      { at: 0, cpu: 1, memory: 1, pid: 1 },
      { at: 5000, cpu: 2, memory: 2, pid: 1 },
      { at: 10000, cpu: 3, memory: 3, pid: 2 },
      { at: 15000, cpu: null, memory: 4, pid: 2 },
      { at: 20000, cpu: 4, memory: 4, pid: 2 },
      { at: 50000, cpu: 5, memory: 5, pid: 2 },
    ];
    expect(
      chartSegments(points, "cpu", 0, 60000, 10).map((s) => s.length),
    ).toEqual([2, 1, 1, 1]);
  });
});
