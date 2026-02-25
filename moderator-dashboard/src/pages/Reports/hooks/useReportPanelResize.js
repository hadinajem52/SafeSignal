import { useCallback, useEffect, useRef, useState } from "react";

const LEFT_PANEL_WIDTH = { min: 280, max: 620, default: 380 };
const RIGHT_PANEL_WIDTH = { min: 260, max: 520, default: 300 };
const SPLITTER_WIDTH = 8;
const IDEAL_MIN_DETAIL_WIDTH = 440;

export function useReportPanelResize() {
  const [panelWidths, setPanelWidths] = useState({
    left: LEFT_PANEL_WIDTH.default,
    right: RIGHT_PANEL_WIDTH.default,
  });
  const [activeSplitter, setActiveSplitter] = useState(null); // 'left' | 'right' | null
  const panelsContainerRef = useRef(null);
  const dragStateRef = useRef(null);

  const clamp = useCallback(
    (value, min, max) => Math.min(Math.max(value, min), max),
    [],
  );

  const clampPanelWidths = useCallback(
    (nextWidths, containerWidth) => {
      const availableWidth = containerWidth - SPLITTER_WIDTH * 2;
      if (availableWidth <= 0) return nextWidths;

      const maxLeftFromLayout = Math.max(
        LEFT_PANEL_WIDTH.min,
        availableWidth - RIGHT_PANEL_WIDTH.min - IDEAL_MIN_DETAIL_WIDTH,
      );
      const maxRightFromLayout = Math.max(
        RIGHT_PANEL_WIDTH.min,
        availableWidth - LEFT_PANEL_WIDTH.min - IDEAL_MIN_DETAIL_WIDTH,
      );

      let left = clamp(
        nextWidths.left,
        LEFT_PANEL_WIDTH.min,
        Math.min(LEFT_PANEL_WIDTH.max, maxLeftFromLayout),
      );
      let right = clamp(
        nextWidths.right,
        RIGHT_PANEL_WIDTH.min,
        Math.min(RIGHT_PANEL_WIDTH.max, maxRightFromLayout),
      );

      const overflow = left + right + IDEAL_MIN_DETAIL_WIDTH - availableWidth;
      if (overflow > 0) {
        const shrinkRight = Math.min(overflow, right - RIGHT_PANEL_WIDTH.min);
        right -= shrinkRight;
        const remaining = overflow - shrinkRight;
        if (remaining > 0) {
          left -= Math.min(remaining, left - LEFT_PANEL_WIDTH.min);
        }
      }

      return { left, right };
    },
    [clamp],
  );

  const handleSplitterPointerDown = useCallback(
    (side, event) => {
      if (event.button !== 0 || !panelsContainerRef.current) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragStateRef.current = {
        side,
        startX: event.clientX,
        startLeft: panelWidths.left,
        startRight: panelWidths.right,
      };
      setActiveSplitter(side);
    },
    [panelWidths.left, panelWidths.right],
  );

  useEffect(() => {
    if (!activeSplitter) return;

    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || !panelsContainerRef.current) return;
      if (event.buttons === 0) {
        dragStateRef.current = null;
        setActiveSplitter(null);
        return;
      }

      const containerWidth =
        panelsContainerRef.current.getBoundingClientRect().width;
      const deltaX = event.clientX - dragState.startX;

      const nextWidths =
        dragState.side === "left"
          ? { left: dragState.startLeft + deltaX, right: dragState.startRight }
          : { left: dragState.startLeft, right: dragState.startRight - deltaX };

      setPanelWidths(clampPanelWidths(nextWidths, containerWidth));
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setActiveSplitter(null);
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerUp);
    };
  }, [activeSplitter, clampPanelWidths]);

  useEffect(() => {
    const handleResize = () => {
      if (!panelsContainerRef.current) return;
      const width = panelsContainerRef.current.getBoundingClientRect().width;
      setPanelWidths((prev) => clampPanelWidths(prev, width));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPanelWidths]);

  return {
    panelWidths,
    activeSplitter,
    panelsContainerRef,
    handleSplitterPointerDown,
  };
}
