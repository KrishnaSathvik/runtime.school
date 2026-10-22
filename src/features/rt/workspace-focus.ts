import type { FocusEvent } from "react";

const PAGE_SCROLL = "(max-width: 899px), (max-height: 600px)";

/** Bring code into a short desktop activity pane on entry, without moving the caret or
 * the other pane. Runs once per focus entry, never on typing or results. Phones and short
 * screens scroll as one page (rt.css): there, once an on-screen keyboard has had time to open,
 * the page moves only if Run / Check ended up hidden, so the code and its controls share the screen. */
export function focusWorkspaceEditor(event: FocusEvent<HTMLElement>) {
  const content = event.target;
  const pane = event.currentTarget;
  if (!(content instanceof HTMLElement) || !content.classList.contains("cm-content")) return;
  if (window.matchMedia(PAGE_SCROLL).matches) {
    window.setTimeout(() => keepControlsInView(content, pane), 400);
    return;
  }
  if (pane.clientHeight >= 500) return;
  requestAnimationFrame(() => {
    if (!pane.isConnected || document.activeElement !== content) return;
    const editor = content.closest<HTMLElement>(".cm-editor");
    if (!editor || !pane.contains(editor)) return;
    const top = editor.getBoundingClientRect().top - pane.getBoundingClientRect().top - pane.clientTop;
    // Leave a little room for the editor's focus outline. Scrolling only the
    // owning pane also preserves the independent reading pane's position.
    pane.scrollTop += top - 12;
  });
}

function keepControlsInView(content: HTMLElement, pane: HTMLElement) {
  if (!content.isConnected || document.activeElement !== content || !window.matchMedia(PAGE_SCROLL).matches) return;
  const editor = content.closest<HTMLElement>(".rx-editor") ?? content;
  const foot = editor.closest(".rx-cell")?.querySelector<HTMLElement>(".rx-cell-foot");
  if (!foot || !pane.contains(foot)) return;
  const view = window.visualViewport;
  const bottom = view ? view.offsetTop + view.height : window.innerHeight;
  const footBottom = foot.getBoundingClientRect().bottom;
  if (footBottom <= bottom) return;
  const header = document.querySelector(".rx-bar")?.getBoundingClientRect().bottom ?? 0;
  // Scroll just enough to show the controls, but never past the top of the editor.
  const delta = Math.min(footBottom - bottom + 8, editor.getBoundingClientRect().top - header - 8);
  if (delta > 0) window.scrollBy({ top: delta });
}
