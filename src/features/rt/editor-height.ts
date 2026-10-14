/**
 * Right-pane editor heights. Playground/Lab set the pattern: the sticky work
 * column is the main surface, so the editor grows with the viewport.
 */
export const PLAYGROUND_EDITOR_HEIGHT = "clamp(300px, calc(100dvh - 300px), 820px)";
export const LAB_EDITOR_HEIGHT = "clamp(300px, calc(100dvh - 330px), 820px)";
/** Learn / projects challenges — tabs + prompt sit above the editor. */
export const CHALLENGE_EDITOR_HEIGHT = "clamp(280px, calc(100dvh - 400px), 820px)";
/** Practice — brief on the left, solution editor on the right. */
export const PRACTICE_EDITOR_HEIGHT = "clamp(280px, calc(100dvh - 340px), 820px)";
