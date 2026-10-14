import type { PyLesson } from "../../types";
import { variablesAndValues } from "./variables-and-values";
import { printCommentsAndExecutionOrder } from "./print-comments-and-execution-order";
import { numbersAndArithmetic } from "./numbers-and-arithmetic";
import { typesAndTypeConversion } from "./types-and-type-conversion";
import { expressionsAndAFirstProgram } from "./expressions-and-a-first-program";

export const foundations: PyLesson[] = [variablesAndValues, printCommentsAndExecutionOrder, numbersAndArithmetic, typesAndTypeConversion, expressionsAndAFirstProgram];
