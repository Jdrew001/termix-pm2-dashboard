import { describe, expect, it } from "vitest";
import { parseEvents } from "../../src/frontend/stream-client.js";
describe("log transport", () => {
  it("retains partial frames across chunks", () => {
    const a = parseEvents('event: sample\ndata: {"lines":');
    expect(a.events).toEqual([]);
    const b = parseEvents(a.rest + "[]}\n\n");
    expect(b.events).toEqual([{ type: "sample", data: { lines: [] } }]);
    expect(b.rest).toBe("");
  });
  it("handles multiple CRLF events and does not execute log text", () => {
    const data = { lines: [{ text: "<img src=x onerror=alert(1)>" }] };
    const frame = `event: sample\r\ndata: ${JSON.stringify(data)}\r\n\r\nevent: connection-error\r\ndata: {}\r\n\r\n`;
    expect(parseEvents(frame).events).toEqual([
      { type: "sample", data },
      { type: "connection-error", data: {} },
    ]);
  });
});
