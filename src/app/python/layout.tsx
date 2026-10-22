import type { Metadata } from "next";
import { BRAND_NAME } from "@/platform/brand";
import "../sql/rt.css";
import "./py.css";
import "./p2.css";
import "./tools.css";

export const metadata: Metadata = {
  title: { default: "Python", template: `%s · ${BRAND_NAME}` },
};

/** Python pages share Runtime's design tokens; Python-only styles live in py.css. */
export default function PythonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
