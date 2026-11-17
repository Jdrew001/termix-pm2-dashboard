import { afterEach, describe, expect, it, vi } from "vitest";
import { startPolling } from "../../src/frontend/polling.js";
afterEach(() => vi.useRealTimers());
describe("automatic metrics", () => {
  it("samples immediately and every five seconds", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => {});
    const stop = startPolling(load, 5000);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(load).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(20000);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not overlap slow reads or restart after disposal", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const load = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const stop = startPolling(load, 5000);
    await vi.advanceTimersByTimeAsync(20000);
    expect(load).toHaveBeenCalledTimes(1);
    stop();
    finish();
    await vi.advanceTimersByTimeAsync(20000);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
