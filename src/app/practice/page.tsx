import { Suspense } from "react";
import { PracticeHub } from "@/features/practice/PracticeHub";

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="canvas">
          <h1>Practice SQL.</h1>
        </div>
      }
    >
      <PracticeHub />
    </Suspense>
  );
}
