import type { PyLesson } from "../../types";
import { definingAndCallingFunctions } from "./defining-and-calling-functions";
import { parametersAndReturnValues } from "./parameters-and-return-values";
import { functionContractsAndEdgeCases } from "./function-contracts-and-edge-cases";
import { defaultsAndKeywordArguments } from "./defaults-and-keyword-arguments";
import { scopeAndMutableArguments } from "./scope-and-mutable-arguments";
import { importingAndUsingModules } from "./importing-and-using-modules";
import { writingSmallReusableModules } from "./writing-small-reusable-modules";
import { lambdaSortingKeysAndUsefulBuiltIns } from "./lambda-sorting-keys-and-useful-built-ins";

export const functions: PyLesson[] = [
  definingAndCallingFunctions,
  parametersAndReturnValues,
  functionContractsAndEdgeCases,
  defaultsAndKeywordArguments,
  scopeAndMutableArguments,
  importingAndUsingModules,
  writingSmallReusableModules,
  lambdaSortingKeysAndUsefulBuiltIns,
];
