import { describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { logTokens } from "../../src/shared/log-style.js";
vi.mock("@termix-ssh/plugin-sdk/frontend", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
import { StyledLogLine } from "../../src/frontend/LogLine.js";
afterEach(cleanup);
describe("PM2 presentation", () => {
  it("preserves exact message text while styling Nest timestamps, context and severity", () => {
    const text =
      "[Nest] 123 - 11/17/2026, 4:53:02 AM LOG [NestApplication] Started +12ms";
    const tokens = logTokens(text);
    expect(tokens.map((x) => x.text).join("")).toBe(text);
    expect(tokens.find((x) => x.text === "LOG")?.kind).toBe("success");
    expect(tokens.find((x) => x.text.includes("4:53:02"))?.kind).toBe(
      "timestamp",
    );
    expect(logTokens("[WARN] disk pressure")[0].kind).toBe("warning");
  });
  it("keeps hostile HTML inert and includes the real PM2 process prefix", () => {
    const { container } = render(
      <StyledLogLine
        line={{
          id: 1,
          source: "stderr",
          text: "<img src=x onerror=alert(1)> ERROR: failed",
        }}
        name="api"
        pm2Id="0"
        wrap
        styled
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("0|api");
    expect(container.textContent).toContain(
      "<img src=x onerror=alert(1)> ERROR: failed",
    );
  });
  it("does not invent timestamps or change plain messages", () => {
    expect(logTokens("simple message")).toEqual([{ text: "simple message" }]);
    const { container } = render(
      <StyledLogLine
        line={{ id: 1, source: "stdout", text: "simple message" }}
        name="api"
        wrap={false}
        styled={false}
      />,
    );
    expect(container.textContent).toBe("logs.stdoutsimple message");
  });
});
