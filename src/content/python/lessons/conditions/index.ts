import type { PyLesson } from "../../types";
import { comparisonsAndBooleanValues } from "./comparisons-and-boolean-values";
import { ifElseAndIndentation } from "./if-else-and-indentation";
import { elifAndMultiwayDecisions } from "./elif-and-multiway-decisions";
import { andOrNotAndTruthiness } from "./and-or-not-and-truthiness";
import { membershipAndNoneChecks } from "./membership-and-none-checks";
import { nestedDecisionsAndGuardConditions } from "./nested-decisions-and-guard-conditions";

export const conditions: PyLesson[] = [
  comparisonsAndBooleanValues,
  ifElseAndIndentation,
  elifAndMultiwayDecisions,
  andOrNotAndTruthiness,
  membershipAndNoneChecks,
  nestedDecisionsAndGuardConditions,
];
