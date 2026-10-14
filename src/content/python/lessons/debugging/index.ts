import type { PyLesson } from "../../types";
import { readingTracebacksAndLocatingErrors } from "./reading-tracebacks-and-locating-errors";
import { commonExceptionsAndDefensiveChecks } from "./common-exceptions-and-defensive-checks";
import { tryExceptElseAndFinally } from "./try-except-else-and-finally";
import { raisingUsefulErrors } from "./raising-useful-errors";
import { assertionsAndUnitTestThinking } from "./assertions-and-unit-test-thinking";
import { testingEdgeCasesAndAvoidingBrittleCode } from "./testing-edge-cases-and-avoiding-brittle-code";

export const debugging: PyLesson[] = [
  readingTracebacksAndLocatingErrors,
  commonExceptionsAndDefensiveChecks,
  tryExceptElseAndFinally,
  raisingUsefulErrors,
  assertionsAndUnitTestThinking,
  testingEdgeCasesAndAvoidingBrittleCode,
];
