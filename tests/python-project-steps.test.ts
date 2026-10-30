// Moving between project steps (src/features/python/project-steps.ts): the next step gets its authored stub and
// main.py, and the learner's own earlier code stays. Regression for "Next keeps the previous step's files".
import { describe, expect, it } from "vitest";
import { authoredProjects } from "@/content/python-v2/content";
import { stepFiles } from "@/features/python/project-steps";

const steps = authoredProjects.flatMap((p) => p.milestones.slice(1).map((ms, k) => [ms.id, p, p.milestones[k], ms] as const));

describe.each(steps)("entering %s", (_, project, prev, ms) => {
  it("turns the previous step's solution into exactly this step's starters", () => {
    // A main.py that already is this step's answer (the step only re-checks it) is the learner's to keep.
    const keepMain = prev.solution["main.py"] === ms.solution["main.py"];
    const expected = { ...prev.solution, ...ms.starters, ...(keepMain ? { "main.py": prev.solution["main.py"] } : {}) };
    expect(stepFiles({ ...prev.solution }, ms, project.milestones)).toEqual(expected);
  });
  it("is idempotent, so returning to the step keeps what the learner typed", () => {
    const once = stepFiles({ ...prev.solution }, ms, project.milestones);
    const typed = Object.fromEntries(Object.entries(once).map(([n, t]) => [n, t + "# mine\n"]));
    expect(stepFiles(once, ms, project.milestones)).toEqual(once);
    expect(stepFiles(typed, ms, project.milestones)).toEqual(typed);
  });
  it("keeps the learner's own versions of earlier functions; main.py is the step's on arrival, theirs after", () => {
    const mod = project.files.find((f) => f !== "main.py")!;
    const own = prev.solution[mod].replace(/"""[^\n]*"""\n/g, "") + "\n\ndef helper():\n    return 1\n";
    const custom = "print('my own program')\n";
    const out = stepFiles({ [mod]: own, "main.py": custom }, ms, project.milestones);
    expect(out[mod].startsWith(own)).toBe(true);
    for (const name of [...ms.starters[mod].matchAll(/^def\s+(\w+)/gm)].map((m) => m[1])) expect(out[mod]).toMatch(new RegExp(`^def ${name}\\(`, "m"));
    const adds = out[mod] !== own;
    expect(out["main.py"]).toBe(adds ? ms.starters["main.py"] : custom);
    // Back on the step after editing main.py there: the learner's main.py stays.
    expect(stepFiles({ ...out, "main.py": custom }, ms, project.milestones)["main.py"]).toBe(custom);
  });
});

// Nothing written yet: opening a later step must not insert that step's stubs, and must not reveal an earlier answer.
describe.each(steps)("jumping straight to %s", (_, project, prev, ms) => {
  it("leaves the first step's starter untouched and hands out no earlier answer", () => {
    const files = stepFiles({ ...project.milestones[0].starters }, ms, project.milestones);
    expect(files).toEqual({ ...project.milestones[0].starters });
    for (const [name, text] of Object.entries(files)) {
      if (name === "main.py") continue;
      for (const earlier of project.milestones.slice(0, project.milestones.indexOf(ms))) {
        for (const solved of (earlier.solution[name] ?? "").split(/\n(?=def )/).filter((b) => b.startsWith("def ") && !b.includes("pass\n"))) {
          expect(text.includes(solved.trimEnd()), `${ms.id} ${name} shows ${solved.split("(")[0]}`).toBe(false);
        }
      }
    }
    void prev;
  });
});
