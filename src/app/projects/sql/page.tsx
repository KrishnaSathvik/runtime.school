"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectList } from "@/features/projects/ProjectList";

export default function SqlProjectsPage() {
  return (
    <div className="canvas">
      <PageHeader
        title="Put SQL to work."
        description="Real business questions, real datasets. Investigate with SQL, verify your results, write up what you found, and export a report."
      />
      <h2 className="pt-8">Projects</h2>
      <ProjectList />

      <p className="metadata mt-6">
        Milestone completion requires both SQL challenges and the concept check. A complete report
        also needs your written findings.
      </p>
    </div>
  );
}
