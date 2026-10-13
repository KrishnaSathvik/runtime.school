import type { Metadata } from "next";
import { BRAND_NAME } from "@/platform/brand";
import "./rt.css";

export const metadata: Metadata = {
  title: { default: "SQL", template: `%s · ${BRAND_NAME}` },
};

/** Runtime SQL workspace: Learn, Practice, Projects, and tools. */
export default function SqlRuntimeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
