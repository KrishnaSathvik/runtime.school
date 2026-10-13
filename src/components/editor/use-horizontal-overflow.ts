"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** True when the element’s content is wider than its box. */
export function useHorizontalOverflow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, overflows };
}
