import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drag-to-resize for the right-docked Timeline & Comms panel. The splitter sits
 * on the panel's left edge, so dragging left grows the panel (and shrinks the
 * detail pane). Width is clamped so the detail pane keeps a usable minimum.
 */
export default function useTimelinePanelResize({
  containerRef,
  queueWidth,
  minWidth,
  maxWidth,
  defaultWidth,
  splitterWidth,
  minDetailWidth,
}) {
  const [panelWidth, setPanelWidth] = useState(defaultWidth);
  const [isActive, setIsActive] = useState(false);
  const dragRef = useRef(null);

  const clampWidth = useCallback(
    (nextWidth, containerWidth) => {
      // Two splitters are in play (queue + this one).
      const available = containerWidth - queueWidth - splitterWidth * 2;
      if (available <= 0) return nextWidth;
      const maxFromLayout = Math.max(minWidth, available - minDetailWidth);
      return Math.min(
        Math.max(nextWidth, minWidth),
        Math.min(maxWidth, maxFromLayout),
      );
    },
    [queueWidth, splitterWidth, minWidth, maxWidth, minDetailWidth],
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (event.button !== 0 || !containerRef.current) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragRef.current = { startX: event.clientX, startWidth: panelWidth };
      setIsActive(true);
    },
    [panelWidth, containerRef],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!containerRef.current) return;
      const step = event.shiftKey ? 40 : 16;
      let direction = 0;
      if (event.key === "ArrowLeft") direction = 1; // grow the panel
      if (event.key === "ArrowRight") direction = -1; // shrink the panel
      if (!direction) return;
      event.preventDefault();
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      setPanelWidth((prev) => clampWidth(prev + direction * step, containerWidth));
    },
    [clampWidth, containerRef],
  );

  useEffect(() => {
    if (!isActive) return undefined;

    const handlePointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag || !containerRef.current) return;
      if (event.buttons === 0) {
        dragRef.current = null;
        setIsActive(false);
        return;
      }
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const deltaX = event.clientX - drag.startX;
      // Splitter is on the left edge → dragging left (negative delta) grows it.
      setPanelWidth(clampWidth(drag.startWidth - deltaX, containerWidth));
    };

    const handlePointerEnd = () => {
      dragRef.current = null;
      setIsActive(false);
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    window.addEventListener("blur", handlePointerEnd);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      window.removeEventListener("blur", handlePointerEnd);
    };
  }, [isActive, clampWidth, containerRef]);

  useEffect(() => {
    const clampOnResize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      setPanelWidth((prev) => clampWidth(prev, containerWidth));
    };
    clampOnResize();
    window.addEventListener("resize", clampOnResize);
    return () => window.removeEventListener("resize", clampOnResize);
  }, [clampWidth, containerRef]);

  return { panelWidth, isActive, handlePointerDown, handleKeyDown };
}
