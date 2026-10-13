import { Suspense } from "react";
import { QuestionBrowser } from "@/features/practice/QuestionBrowser";

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="canvas practice-page">
          <h1>Sharpen your SQL.</h1>
          <p className="metadata" role="status">
            Loading…
          </p>
        </div>
      }
    >
      <QuestionBrowser />
    </Suspense>
  );
}
