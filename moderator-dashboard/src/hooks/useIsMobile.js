import { useEffect, useState } from "react";

/**
 * Returns true when the viewport is at or below `maxWidth` (default 1023px,
 * i.e. below Tailwind's `lg`). Used to collapse dense multi-panel desktop
 * layouts (Reports queue, LE interface) into a single-column mobile flow.
 */
export default function useIsMobile(maxWidth = 1023) {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (event) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return isMobile;
}
