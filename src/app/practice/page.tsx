import { redirect } from "next/navigation";
import { availableSubjects } from "@/platform/subjects";
import { PracticeSubjectsFallback } from "@/features/practice/PracticeSubjectsFallback";

/**
 * While one subject has practice, Practice opens straight to its question list
 * (tracks and case studies are tabs there). When more subjects ship, show the subject picker.
 */
export default function GlobalPracticePage() {
  const withPractice = availableSubjects.filter((s) => s.practiceHref);
  if (withPractice.length === 1) redirect("/practice/questions");
  return <PracticeSubjectsFallback />;
}
