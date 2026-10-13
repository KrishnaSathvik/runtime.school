"use client";

import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const MIN_TASK = 300;
const MIN_EDITOR = 400;
const DEFAULT_SHARE = 0.46;

/** Task context and SQL stay side by side; the divider also works with a keyboard. */
export function WorkspaceSplit({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [available, setAvailable] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setAvailable(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(MIN_TASK, Math.min(Math.round(available * 0.55), available - MIN_EDITOR));
  const preferred = available > 0 ? Math.round(available * DEFAULT_SHARE) : 400;
  const actual = Math.min(Math.max(MIN_TASK, width ?? preferred), max);
  const reset = () => setWidth(preferred);
  const panes = Children.toArray(children);
  return (
    <div
      ref={ref}
      className="practice-layout adjustable"
      style={{ "--task-width": `${actual}px` } as CSSProperties}
    >
      {panes[0]}
      <div
        className="task-divider"
        role="separator"
        aria-label="Resize task and editor"
        aria-orientation="vertical"
        tabIndex={0}
        aria-valuemin={MIN_TASK}
        aria-valuemax={max}
        aria-valuenow={actual}
        onDoubleClick={reset}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          setWidth(
            event.key === "Home"
              ? MIN_TASK
              : event.key === "End"
                ? max
                : Math.max(
                    MIN_TASK,
                    Math.min(max, actual + (event.key === "ArrowRight" ? 24 : -24)),
                  ),
          );
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          setWidth(
            Math.max(
              MIN_TASK,
              Math.min(
                max,
                event.clientX - (ref.current?.getBoundingClientRect().left ?? 0),
              ),
            ),
          );
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      />
      {panes.slice(1)}
    </div>
  );
}
