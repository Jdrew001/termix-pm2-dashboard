export interface StreamEvent {
  type: string;
  data: unknown;
}
/** A small SSE decoder: UTF-8 and event boundaries can cross network chunks. */
export function parseEvents(buffer: string): {
  events: StreamEvent[];
  rest: string;
} {
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: StreamEvent[] = [];
  for (const block of blocks) {
    let type = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) type = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length) events.push({ type, data: JSON.parse(data.join("\n")) });
  }
  return { events, rest };
}
export async function readEvents(
  response: Response,
  receive: (event: StreamEvent) => void,
  signal: AbortSignal,
) {
  if (!response.ok || !response.body) throw new Error("Stream unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (!signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error("Stream closed");
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length > 1000000) throw new Error("Stream frame too large");
      const parsed = parseEvents(buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) receive(event);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
