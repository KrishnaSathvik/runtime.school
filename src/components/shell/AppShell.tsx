"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ThemeProvider } from "@/lib/theme";

/**
 * App-wide behaviour around every page. The home page, /sql and /python each render their own
 * header and navigation; this keeps the theme and moves focus to the heading on navigation.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Move focus to the new page's heading after client navigation, not on first load.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const h1 = document.querySelector<HTMLElement>("#main-content h1");
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  }, [pathname]);

  return <ThemeProvider>{children}</ThemeProvider>;
}
