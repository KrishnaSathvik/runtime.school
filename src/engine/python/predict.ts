/**
 * Predict-the-output answers: the learner types what a program prints, and it's compared with what the program
 * really prints. Spaces at line ends and blank lines at the very end don't count; everything else does.
 */

export type PredictResult = { ok: boolean; detail: string; line: number | null };

export function normalizePrediction(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

export function gradePrediction(expected: string, answer: string): PredictResult {
  const want = normalizePrediction(expected);
  const got = normalizePrediction(answer);
  if (!got) return { ok: false, detail: "Type what you think the program prints, one line per printed line.", line: null };
  if (got === want) return { ok: true, detail: "That's exactly what the program prints.", line: null };
  const w = want.split("\n");
  const g = got.split("\n");
  for (let i = 0; i < Math.max(w.length, g.length); i++) {
    if (w[i] === g[i]) continue;
    if (g[i] === undefined) return { ok: false, detail: `Your prediction stops after line ${i}; the program prints more.`, line: i + 1 };
    if (w[i] === undefined) return { ok: false, detail: `Your prediction has more lines than the program prints, from line ${i + 1}.`, line: i + 1 };
    const spacing = w[i].replace(/\s+/g, "") === g[i].replace(/\s+/g, "") ? " The characters match; check the spaces." : "";
    return { ok: false, detail: `Line ${i + 1} isn't what the program prints.${spacing}`, line: i + 1 };
  }
  return { ok: false, detail: "Your prediction differs from the output.", line: null };
}
