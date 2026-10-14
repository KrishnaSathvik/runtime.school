"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useHydrated, useLearning, type ThemePreference } from "@/lib/learning-state";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function paintTheme(next: "light" | "dark") {
  const root = document.documentElement;
  root.dataset.theme = next;
  root.style.colorScheme = next;
  root.style.backgroundColor = next === "dark" ? "#000000" : "#ffffff";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", next === "dark" ? "#000000" : "#ffffff");
}

function writeThemeCookie(preference: ThemePreference) {
  document.cookie = `rt-theme=${preference};path=/;max-age=31536000;SameSite=Lax`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useLearning((s) => s.preferences.theme);
  const setTheme = useLearning((s) => s.setTheme);
  const hydrated = useHydrated();
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useLayoutEffect(() => {
    // Saved theme is painted by the inline boot script. Don't replace it with the
    // default "system" preference before local progress has loaded.
    if (!hydrated) {
      const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      setResolved(current);
      paintTheme(current);
      return;
    }
    const apply = () => {
      const next = resolveTheme(preference);
      setResolved(next);
      paintTheme(next);
      // Don't replace a saved dark/light cookie with the default "system"
      // preference if saved progress has not actually loaded yet.
      const painted = document.documentElement.dataset.theme;
      if (preference !== "system" || painted === next) writeThemeCookie(preference);
    };
    apply();
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [preference, hydrated]);

  const setPreference = useCallback(
    (theme: ThemePreference) => setTheme(theme),
    [setTheme],
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme requires ThemeProvider");
  return ctx;
}
