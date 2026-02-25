import { useCallback, useEffect, useRef, useState } from "react";

export default function useQueueSplitter({
  activeView,
  minWidth,
  maxWidth,
  defaultWidth,
  splitterWidth,
  minDetailWidth,
}) {
  const [queuePanelWidth, setQueuePanelWidth] = useState(defaultWidth);
  const [isQueueSplitterActive, setIsQueueSplitterActive] = useState(false);
  const queueLayoutRef = useRef(null);
  const queueDragStateRef = useRef(null);

  const clampQueueWidth = useCallback(
    (nextWidth, containerWidth) => {
      const availableWidth = containerWidth - splitterWidth;
      if (availableWidth <= 0) return nextWidth;
      const maxFromLayout = Math.max(minWidth, availableWidth - minDetailWidth);
      return Math.min(
        Math.max(nextWidth, minWidth),
        Math.min(maxWidth, maxFromLayout),
      );
    },
    [maxWidth, minDetailWidth, minWidth, splitterWidth],
  );

  const handleQueueSplitterPointerDown = useCallback(
    (event) => {
      if (event.button !== 0 || !queueLayoutRef.current) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      queueDragStateRef.current = {
        startX: event.clientX,
        startWidth: queuePanelWidth,
      };
      setIsQueueSplitterActive(true);
    },
    [queuePanelWidth],
  );

  const handleQueueSplitterKeyDown = useCallback(
    (event) => {
      if (!queueLayoutRef.current) return;
      const step = event.shiftKey ? 40 : 16;
      let direction = 0;
      if (event.key === "ArrowLeft") direction = -1;
      if (event.key === "ArrowRight") direction = 1;
      if (!direction) return;
      event.preventDefault();
      const containerWidth = queueLayoutRef.current.getBoundingClientRect().width;
      setQueuePanelWidth((prev) =>
        clampQueueWidth(prev + direction * step, containerWidth),
      );
    },
    [clampQueueWidth],
  );

  useEffect(() => {
    if (!isQueueSplitterActive) return;

    const handlePointerMove = (event) => {
      const drag = queueDragStateRef.current;
      if (!drag || !queueLayoutRef.current) return;
      if (event.buttons === 0) {
        queueDragStateRef.current = null;
        setIsQueueSplitterActive(false);
        return;
      }

      const containerWidth =
        queueLayoutRef.current.getBoundingClientRect().width;
      const deltaX = event.clientX - drag.startX;
      setQueuePanelWidth(
        clampQueueWidth(drag.startWidth + deltaX, containerWidth),
      );
    };

    const handlePointerEnd = () => {
      queueDragStateRef.current = null;
      setIsQueueSplitterActive(false);
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
  }, [isQueueSplitterActive, clampQueueWidth]);

  useEffect(() => {
    const clampOnResize = () => {
      if (!queueLayoutRef.current) return;
      const containerWidth =
        queueLayoutRef.current.getBoundingClientRect().width;
      setQueuePanelWidth((prev) => clampQueueWidth(prev, containerWidth));
    };

    clampOnResize();
    window.addEventListener("resize", clampOnResize);
    return () => window.removeEventListener("resize", clampOnResize);
  }, [clampQueueWidth]);

  useEffect(() => {
    if (activeView !== "queue") return;
    const frameId = window.requestAnimationFrame(() => {
      if (!queueLayoutRef.current) return;
      const containerWidth =
        queueLayoutRef.current.getBoundingClientRect().width;
      setQueuePanelWidth((prev) => clampQueueWidth(prev, containerWidth));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeView, clampQueueWidth]);

  return {
    queuePanelWidth,
    isQueueSplitterActive,
    queueLayoutRef,
    handleQueueSplitterPointerDown,
    handleQueueSplitterKeyDown,
  };
}
