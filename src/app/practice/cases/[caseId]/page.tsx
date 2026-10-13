"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { caseStudyById } from "@/content/question-bank/case-studies";
import { CaseLanding } from "@/features/practice/CaseLanding";

export default function CaseStudyPage() {
  const params = useParams<{ caseId: string }>();
  const meta = caseStudyById.get(params.caseId);

  if (!meta) {
    return (
      <div className="canvas">
        <h1>Case study not found</h1>
        <Link href="/practice/questions" className="btn mt-4">
          Back to questions
        </Link>
      </div>
    );
  }

  return <CaseLanding meta={meta} />;
}
