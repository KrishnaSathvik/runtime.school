"use client";

import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { RelationshipList, TableList } from "../DatasetBrowser";

/**
 * Same table schema + relationships browser as the SQL playground, scoped to the
 * tables this project (or stage) cares about.
 */
export function ProjectTables({ datasetId, names }: { datasetId: CanonicalDatasetId; names: string[] }) {
  return (
    <div className="project-data-browser">
      <p className="rx-label sec">tables</p>
      <TableList id={datasetId} only={names} />
      <p className="rx-label sec">relationships</p>
      <p className="rx-cap">How to join these tables. Left column matches the right column.</p>
      <RelationshipList id={datasetId} only={names} />
    </div>
  );
}
