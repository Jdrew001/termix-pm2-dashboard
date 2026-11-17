import { describe, expect, it } from "vitest";
import {
  cleanTerminalText,
  splitPm2Logs,
  tailDelta,
  visibleLogs,
} from "../../src/shared/logs.js";
describe("PM2 log streams", () => {
  it("separates regular and error files instead of guessing from message content", () => {
    const split = splitPm2Logs(
      "[TAILING] Tailing last 2 lines\n/log/api-error-0.log last 2 lines:\ntrace one\ntrace two\n/log/api-out-0.log last 2 lines:\nthis mentions error but is stdout\nready\n",
    );
    expect(split.stderr).toEqual(["trace one", "trace two"]);
    expect(split.stdout).toEqual([
      "this mentions error but is stdout",
      "ready",
    ]);
    expect(split.unknown).toEqual([]);
  });
  it("does not mislabel custom files or truncated headers", () => {
    expect(
      splitPm2Logs("/log/custom.log last 1 lines:\nhello\n").unknown,
    ).toEqual(["hello"]);
    expect(splitPm2Logs("truncated start").unknown).toEqual([
      "truncated start",
    ]);
  });
  it("strips terminal control sequences and retains literal markup as text", () => {
    expect(
      cleanTerminalText(
        "\u001b[31m<script>text</script>\u001b[0m\u001b]8;;https://example.test\u0007link\u001b]8;;\u0007",
      ),
    ).toBe("<script>text</script>link");
  });
  it("appends new lines without replaying overlapping tails", () => {
    expect(tailDelta(["a", "b", "b"], ["b", "b", "c"])).toEqual({
      lines: ["c"],
      gap: false,
    });
    expect(tailDelta(["a", "b"], ["a", "b"])).toEqual({
      lines: [],
      gap: false,
    });
  });
  it("reports rotation or missed history when no overlap exists", () => {
    expect(tailDelta(["a", "b"], ["c", "d"])).toEqual({
      lines: ["c", "d"],
      gap: true,
    });
    expect(tailDelta(["a"], []).gap).toBe(true);
  });
  it("filters combined or one source case-insensitively", () => {
    const lines = [
      { id: 1, source: "stdout" as const, text: "Ready" },
      { id: 2, source: "stderr" as const, text: "Failure" },
    ];
    expect(visibleLogs(lines, "combined", "")).toHaveLength(2);
    expect(visibleLogs(lines, "stderr", "")).toEqual([lines[1]]);
    expect(visibleLogs(lines, "combined", "READY")).toEqual([lines[0]]);
  });
});
