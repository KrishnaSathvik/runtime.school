"use client";

import { useSyncExternalStore } from "react";

// Platform is stable during a page visit. A neutral server label avoids guessing
// the operating system and keeps server/client hydration consistent.
const subscribe = () => () => {};
const serverModifier = () => "Ctrl/⌘";
const browserModifier = () => (isMacDesktop() ? "⌘" : "Ctrl");

/** Shortcut chips belong on a Mac with a keyboard. Phones, tablets, and other desktops keep the keys working without printing them. */
export function isMacDesktop(): boolean {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return false;
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
  if (data) return data === "macOS" && navigator.maxTouchPoints <= 1;
  return /Mac/i.test(navigator.platform) && navigator.maxTouchPoints <= 1;
}

const serverMac = () => false;

export function useMacKeyboard() {
  return useSyncExternalStore(subscribe, isMacDesktop, serverMac);
}

export function useShortcutModifier() {
  return useSyncExternalStore(subscribe, browserModifier, serverModifier);
}
