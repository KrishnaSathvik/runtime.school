import type { Metadata } from "next";
import { LearnEntry } from "@/features/rt/pages/LearnEntry";
import { entryPages } from "@/platform/seo";

export const metadata: Metadata = {
  title: "SQL",
  description:
    "Learn to query, transform, and analyze data through real SQL exercises: lessons, practice questions, and projects in your browser.",
  // Opens the learner's next lesson, so it has no content of its own; the first lesson is the canonical page.
  ...entryPages.learn,
};

/** Learn: opens the next unfinished lesson. */
export default function SqlHomePage() {
  return <LearnEntry />;
}
