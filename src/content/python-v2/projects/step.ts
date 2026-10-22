import type { PyCheck, PyTask } from "@/engine/python/grading";
import type { PyValue } from "@/engine/python/values";
import type { PyMilestone } from "../model";

export function shows(id: string, label: string, show: string, expr: string, expected: PyValue): PyCheck {
  return { kind: "expr", id, label, show, expr, expected };
}

export function prints(label: string, expected: string): PyCheck {
  return { kind: "output", id: "output", label, expected };
}

/** One milestone. `checks` are this step plus the earlier steps that must keep passing. */
export function milestone(part: {
  id: PyMilestone["id"];
  title: string;
  brief: string;
  doneWhen: string[];
  starters: Record<string, string>;
  solution: Record<string, string>;
  hints: [string, string, string];
  wrong: PyMilestone["wrong"];
  checks: PyCheck[];
  packages?: PyTask["packages"];
  mounts?: PyTask["mounts"];
  files?: Record<string, string>;
}): PyMilestone {
  return {
    id: part.id,
    title: part.title,
    brief: part.brief,
    doneWhen: part.doneWhen,
    starters: part.starters,
    solution: part.solution,
    hints: part.hints,
    wrong: part.wrong,
    task: {
      checks: part.checks,
      ...(part.packages ? { packages: part.packages } : {}),
      ...(part.mounts ? { mounts: part.mounts } : {}),
      ...(part.files ? { files: part.files } : {}),
    },
  };
}
