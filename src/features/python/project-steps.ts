/**
 * Moving a project to a step it hasn't passed yet. Authored starters are cumulative: each step's module is the
 * earlier steps' functions plus a stub for the new one, and each step has its own `main.py`. The learner's files
 * are carried between steps, so a step adds what it needs instead of replacing their work:
 * - a module gets the stub of any function the step introduces that the learner's file doesn't define yet;
 * - `main.py` becomes the step's program on arrival (the old one runs the previous step), or later while it is
 *   still another step's authored program. Once the learner has edited it on this step, it is theirs and kept.
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

export function stepFiles(files: Record<string, string>, step: Step, steps: Step[], main = "main.py"): Record<string, string> {
  const out = { ...files };
  // The step introduces a function the learner's code doesn't have yet: this is the first time they are here.
  let arriving = false;
  for (const [name, starter] of Object.entries(step.starters)) {
    const mine = files[name];
    if (name === main) continue;
    if (mine === undefined || mine.trim() === "") {
      out[name] = starter;
      continue;
    }
    const defined = new Set(defBlocks(mine).map((b) => b.name));
    const missing = defBlocks(starter).filter((b) => !defined.has(b.name));
    if (missing.length) {
      arriving = true;
      out[name] = missing.reduce((text, b) => text + "\n".repeat(Math.max(1, b.gap)) + b.code, mine.replace(/\n*$/, "\n"));
    }
  }
  const starter = step.starters[main];
  const mine = files[main];
  if (starter !== undefined) {
    const authoredBy = (s: Step) => same(mine, s.starters[main]) || same(mine, s.solution[main]);
    // Already this step's program: keep it. Arriving, or still another step's authored program: this step's.
    if (mine === undefined || mine.trim() === "") out[main] = starter;
    else if (!authoredBy(step) && (arriving || steps.some((s) => s.id !== step.id && authoredBy(s)))) out[main] = starter;
  }
  return out;
}
