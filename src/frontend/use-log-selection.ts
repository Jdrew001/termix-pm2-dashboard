import { useEffect, useRef, useState, type RefObject } from "react";
export interface LogSelection {
  text: string;
  left: number;
  top: number;
}
export function useLogSelection(viewport: RefObject<HTMLDivElement | null>) {
  const [selection, setSelection] = useState<LogSelection | null>(null);
  const active = useRef(false);
  useEffect(() => {
    function update() {
      const element = viewport.current;
      const selected = window.getSelection();
      const inside =
        element &&
        selected?.anchorNode &&
        selected.focusNode &&
        element.contains(selected.anchorNode) &&
        element.contains(selected.focusNode);
      const text = inside && !selected.isCollapsed ? selected.toString() : "";
      active.current = Boolean(text.trim());
      if (!element || !active.current || !selected || document.hidden) {
        setSelection(null);
        return;
      }
      const bounds = element.getBoundingClientRect();
      const rects = Array.from(selected.getRangeAt(0).getClientRects()).filter(
        (rect) =>
          rect.bottom > bounds.top &&
          rect.top < bounds.bottom &&
          rect.right > bounds.left &&
          rect.left < bounds.right,
      );
      const rect = rects.at(-1);
      if (!rect) {
        setSelection(null);
        return;
      }
      const left = Math.max(
        8,
        Math.min(bounds.width - 120, rect.right - bounds.left - 90),
      );
      const below = rect.bottom - bounds.top + 6;
      const top = Math.max(8, Math.min(bounds.height - 80, below));
      setSelection({ text, left, top });
    }
    document.addEventListener("selectionchange", update);
    document.addEventListener("mouseup", update);
    document.addEventListener("keyup", update);
    window.addEventListener("resize", update);
    const element = viewport.current;
    element?.addEventListener("scroll", update);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (element) observer?.observe(element);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("mouseup", update);
      document.removeEventListener("keyup", update);
      window.removeEventListener("resize", update);
      element?.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [viewport]);
  return { selection, active };
}
