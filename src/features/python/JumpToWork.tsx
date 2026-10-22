"use client";

/** Show the top of the work area after moving to another step: its own scroll on desktop, the page on phones. */
export function showWorkTop(target: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(target);
    if (!el) return;
    if (window.matchMedia("(max-width: 899px), (max-height: 600px)").matches) {
      if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
    } else el.scrollTo?.({ top: 0 });
  });
}
