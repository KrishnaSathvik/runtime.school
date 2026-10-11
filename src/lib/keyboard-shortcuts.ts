"use client";

import { useSyncExternalStore } from "react";

// Platform is stable during a page visit. A neutral server label avoids guessing
// the operating system and keeps server/client hydration consistent.
const subscribe = () => () => {};
const serverModifier = () => "Ctrl/⌘";
const browserModifier = () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "⌘" : "Ctrl";

export function useShortcutModifier() {
  return useSyncExternalStore(subscribe, browserModifier, serverModifier);
}
