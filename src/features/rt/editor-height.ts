/**
 * Right-pane editor heights inside the sticky desktop work column.
 * Leave room for Run / Check and results without forcing page scroll.
 */
/* Tools: a moderate editor so the result rows, not empty editor space, fill the column. */
export const PLAYGROUND_EDITOR_HEIGHT = "clamp(160px, calc(100dvh - 620px), 320px)";
export const LAB_EDITOR_HEIGHT = "clamp(160px, calc(100dvh - 640px), 320px)";
/** Learn challenges — tabs + prompt sit above the editor. Floor stays small so Run / Check fit on a short laptop. */
export const CHALLENGE_EDITOR_HEIGHT = "clamp(48px, calc(100dvh - 560px), 400px)";
/** Practice — brief on the left, solution editor on the right. */
export const PRACTICE_EDITOR_HEIGHT = "clamp(72px, calc(100dvh - 420px), 420px)";
