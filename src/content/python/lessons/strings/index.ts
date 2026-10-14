import type { PyLesson } from "../../types";
import { creatingAndCombiningStrings } from "./creating-and-combining-strings";
import { stringIndexingAndSlicing } from "./string-indexing-and-slicing";
import { stringMethodsForCleaningText } from "./string-methods-for-cleaning-text";
import { splittingAndJoiningText } from "./splitting-and-joining-text";
import { fStringsAndFormatting } from "./f-strings-and-formatting";
import { textValidationAndUnicodeBasics } from "./text-validation-and-unicode-basics";

export const strings: PyLesson[] = [
  creatingAndCombiningStrings,
  stringIndexingAndSlicing,
  stringMethodsForCleaningText,
  splittingAndJoiningText,
  fStringsAndFormatting,
  textValidationAndUnicodeBasics,
];
