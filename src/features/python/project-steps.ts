/**
 * Moving a project to a step it hasn't passed yet. Authored starters are cumulative: each step's module is the
 * earlier steps' functions plus a stub for the new one, and each step has its own `main.py`. The learner's files
 * are carried between steps, so a step adds what it needs instead of replacing their work:
 * - a module the learner has written in gets the stub of any function this step introduces that it doesn't define yet;
 * - a module they haven't written in is left alone, so opening the next step does not drop that step's `pass` stubs in;
 * - `main.py` becomes this step's program only once a module has the learner's own code. An unwritten project keeps the first step's program. Once they have edited `main.py` on this step, it stays.
 * Applying it again changes nothing.
 */
type Step = { id: string; starters: Record<string, string>; solution: Record<string, string> };

/** Top-level `def` blocks, from the `def` line up to the next unindented line, with the blank lines before them. */
function defBlocks(source: string): { name: string; code: string; gap: number }[] {
  const lines = source.split("\n");
  const blocks: { name: string; code: string; gap: number }[] = [];
  lines.forEach((line, i) => {
    const m = line.match(/^def\s+(\w+)\s*\(/);
    if (!m) return;
    let end = i + 1;
    while (end < lines.length && !/^\S/.test(lines[end])) end++;
    const body = lines.slice(i, end);
    while (body.length && body.at(-1)!.trim() === "") body.pop();
    let gap = 0;
    while (gap < i && lines[i - gap - 1].trim() === "") gap++;
    blocks.push({ name: m[1], code: body.join("\n") + "\n", gap });
  });
  return blocks;
}

const same = (a: string | undefined, b: string | undefined) => a !== undefined && b !== undefined && a.trimEnd() === b.trimEnd();

/**
 * What a step adds to a module: the step's starter without the functions an earlier step's starter already has. A
 * later step's authored starter carries the earlier steps' solved functions; those are never handed out.
 */
function ownStubs(name: string, step: Step, steps: Step[]): string {
  const starter = step.starters[name] ?? "";
  const at = steps.findIndex((s) => s.id === step.id);
  const earlier = new Set(steps.slice(0, Math.max(0, at)).flatMap((s) => defBlocks(s.starters[name] ?? "").map((b) => b.name)));
  const blocks = defBlocks(starter);
  const head = starter.split("\n").slice(0, starter.split("\n").findIndex((l) => /^def\s/.test(l))).join("\n").trimEnd();
  const own = blocks.filter((b) => !earlier.has(b.name));
  return [head, ...own.map((b) => b.code.trimEnd())].filter((x) => x.trim()).join("\n\n\n") + "\n";
}

/**
 * A module the learner hasn't written in: empty, or exactly the stubs a step hands out (step 1's starter is all stubs).
 * A later step's authored starter holds solved functions, so a file equal to one is someone's work and is kept.
 */
function untouched(text: string | undefined, name: string, steps: Step[]): boolean {
  return text === undefined || text.trim() === "" || same(text, steps[0]?.starters[name]) || steps.some((s) => same(text, ownStubs(name, s, steps)));
}

/** A step's files before the learner has written anything: its own new stubs, and its own main.py. */
export function freshFiles(step: Step, steps: Step[], main = "main.py"): Record<string, string> {
  return Object.fromEntries(Object.keys(step.starters).map((name) => [name, name === main ? step.starters[name] : ownStubs(name, step, steps)]));
}

export function stepFiles(files: Record<string, string>, step: Step, steps: Step[], main = "main.py"): Record<string, string> {
  const out = { ...files };
  // The step introduces a function the learner's code doesn't have yet: this is the first time they are here.
  let arriving = false;
  for (const name of Object.keys(step.starters)) {
    const mine = files[name];
    if (name === main) continue;
    // Nothing of the learner's in it yet. Leave it: opening a later step must not insert that step's stubs.
    if (untouched(mine, name, steps)) continue;
    const stubs = ownStubs(name, step, steps);
    const defined = new Set(defBlocks(mine!).map((b) => b.name));
    const own = new Set(defBlocks(stubs).map((b) => b.name));
    const missing = defBlocks(step.starters[name]).filter((b) => own.has(b.name) && !defined.has(b.name));
    if (missing.length) {
      arriving = true;
      out[name] = missing.reduce((text, b) => text + "\n".repeat(Math.max(1, b.gap)) + b.code, mine!.replace(/\n*$/, "\n"));
    }
  }
  const starter = step.starters[main];
  const mine = files[main];
  const written = Object.keys(step.starters).some((name) => name !== main && !untouched(files[name], name, steps));
  if (starter !== undefined && mine !== undefined && mine.trim() !== "" && written) {
    const authoredBy = (s: Step) => same(mine, s.starters[main]) || same(mine, s.solution[main]);
    // A program the learner wrote on this step stays. One that is still an earlier step's program becomes this step's.
    if (!authoredBy(step) && (arriving || steps.some((s) => s.id !== step.id && authoredBy(s)))) out[main] = starter;
  }
  return out;
}
