import type { PyLesson } from "../../types";
import { forLoopsAndRange } from "./for-loops-and-range";
import { countingAndRunningTotals } from "./counting-and-running-totals";
import { iteratingOverStringsAndLists } from "./iterating-over-strings-and-lists";
import { whileLoopsAndState } from "./while-loops-and-state";
import { breakContinueAndLoopElse } from "./break-continue-and-loop-else";
import { enumerateAndZip } from "./enumerate-and-zip";
import { nestedLoopsAndSimplePatterns } from "./nested-loops-and-simple-patterns";

export const loops: PyLesson[] = [
  forLoopsAndRange,
  countingAndRunningTotals,
  iteratingOverStringsAndLists,
  whileLoopsAndState,
  breakContinueAndLoopElse,
  enumerateAndZip,
  nestedLoopsAndSimplePatterns,
];
