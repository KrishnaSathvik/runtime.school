import { projectReferences } from "../index";

export function getProjectReference(referenceId: string): string | undefined {
  return projectReferences[referenceId];
}
