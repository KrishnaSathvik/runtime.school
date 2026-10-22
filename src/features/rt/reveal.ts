/**
 * Bring part of a workspace into view without moving anything else.
 *
 * Only the element's own scroll owner moves: the desktop pane it sits in, or the page on phones
 * and short screens. `scrollIntoView` also scrolls overflow-hidden ancestors, which slid the
 * whole workspace under the sticky header and clipped the Run / Check bar.
 */
function scrollOwner(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) return node;
  }
  return null;
}

/** The sticky site header covers the top of the page, never the top of a pane. */
function headerBottom(): number {
  const bar = document.querySelector<HTMLElement>(".rx-bar");
  return bar && getComputedStyle(bar).position === "sticky" ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
}

/**
 * Scroll so `start` is fully below any sticky header and as much as possible down to `end`
 * (at most `cap` pixels below the top of `start`) is visible. Never scrolls `start` out of
 * view to show more of `end`; does nothing when the range is already visible.
 */
export function revealRange(start: HTMLElement, end: HTMLElement = start, cap = Infinity) {
  const owner = scrollOwner(start);
  const top = owner ? owner.getBoundingClientRect().top + owner.clientTop : headerBottom();
  const bottom = owner ? top + owner.clientHeight : window.visualViewport?.height ?? window.innerHeight;
  const gap = 8;
  const from = start.getBoundingClientRect().top - (top + gap);
  const last = Math.min(end.getBoundingClientRect().bottom, start.getBoundingClientRect().top + cap);
  const overflow = last - (bottom - gap);
  const delta = from < 0 ? from : overflow > 0 ? Math.min(overflow, from) : 0;
  if (Math.abs(delta) < 1) return;
  const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (owner) owner.scrollBy({ top: delta, behavior });
  else window.scrollBy({ top: delta, behavior });
}

/** Phones and short screens: move between the reading and the work without a long scroll. */
export function jumpTo(target: HTMLElement | null) {
  if (!target) return;
  target.focus({ preventScroll: true });
  revealRange(target, target, (window.visualViewport?.height ?? window.innerHeight) - 64);
}
