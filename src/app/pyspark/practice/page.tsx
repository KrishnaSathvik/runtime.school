import { notFound, redirect } from "next/navigation";
import { authoredQuestions, psQuestionHref, psQuestions } from "@/content/pyspark/content";
import { pysparkEnabled } from "@/platform/pyspark-flag";

/** Practice: opens the first written question, like SQL and Python open the next one. */
export default function Page() {
  if (!pysparkEnabled()) notFound();
  const first = authoredQuestions()[0] ?? psQuestions[0];
  if (!first) notFound();
  redirect(psQuestionHref(first.slug));
}
