import type { Metadata } from "next";
import { LearnEntry } from "@/features/rt/pages/LearnEntry";

export const metadata: Metadata = {
  title: "SQL",
  description:
    "Learn to query, transform, and analyze data through real SQL exercises: lessons, practice questions, and projects in your browser.",
  // Opens the learner's next lesson, so it has no content of its own to index.
  robots: { index: false, follow: true },
};

/** Learn: opens the next unfinished lesson. */
export default function SqlHomePage() {
  return <LearnEntry />;
}
