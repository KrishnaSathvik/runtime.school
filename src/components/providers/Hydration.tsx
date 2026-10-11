"use client";

import { useEffect } from "react";
import { useLearning } from "@/lib/learning-state";

export function Hydration({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useLearning.persist.rehydrate();
    // Other tabs share the same local progress file. Load their latest write
    // before this tab edits another draft or records a check.
    const onStorage = (event: StorageEvent) => {
      if (event.key === "sql-studio-v1" && event.storageArea === localStorage) {
        void useLearning.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return children;
}
