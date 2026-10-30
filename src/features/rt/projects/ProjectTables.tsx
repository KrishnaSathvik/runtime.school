"use client";

import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { RelationshipList, TableList } from "../DatasetBrowser";

/**
 * The project's tables and joins, scoped to the tables this project cares about.
 * The overview gives each its own section.
 */
export function ProjectTableCards({ datasetId, names }: { datasetId: CanonicalDatasetId; names: string[] }) {
  return <TableList id={datasetId} only={names} />;
}

export function ProjectRelationshipLines({ datasetId, names }: { datasetId: CanonicalDatasetId; names: string[] }) {
  return (
    <>
      <p className="rx-cap">How to join these tables. Left column matches the right column.</p>
      <RelationshipList id={datasetId} only={names} />
    </>
  );
}
