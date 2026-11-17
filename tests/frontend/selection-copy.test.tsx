import { afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
vi.mock("@termix-ssh/plugin-sdk/frontend", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
import { SelectionCopy } from "../../src/frontend/SelectionCopy.js";
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "clipboard");
});
describe("selected log copying", () => {
  it("copies exact multiline text and confirms success", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(
      <SelectionCopy
        selection={{ text: "first line\nsecond line", left: 40, top: 20 }}
      />,
    );
    const button = screen.getByRole("button", { name: "logs.copySelection" });
    const down = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    button.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    fireEvent.click(button);
    await waitFor(() => expect(button.textContent).toBe("logs.copied"));
    expect(writeText).toHaveBeenCalledWith("first line\nsecond line");
  });
  it("shows an honest failure if clipboard access is refused", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(async () => {
          throw new Error("denied");
        }),
      },
    });
    render(<SelectionCopy selection={{ text: "line", left: 40, top: 20 }} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByRole("button").textContent).toBe("logs.copyFailed"),
    );
    expect(screen.getByRole("button").title).toBe("logs.copyKeyboardHint");
  });
});
