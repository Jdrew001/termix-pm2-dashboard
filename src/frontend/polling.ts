/** Serial polling prevents overlapping SSH reads; cleanup cancels the next sample. */
export function startPolling(
  load: () => Promise<void>,
  intervalMs: number,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function tick() {
    try {
      await load();
    } finally {
      if (!stopped) timer = setTimeout(() => void tick(), intervalMs);
    }
  }
  void tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
