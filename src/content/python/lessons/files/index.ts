import type { PyLesson } from "../../types";
import { workingWithTextFilesSafely } from "./working-with-text-files-safely";
import { csvRowsAndHeaders } from "./csv-rows-and-headers";
import { jsonDataAndNestedObjects } from "./json-data-and-nested-objects";
import { datesTimesAndTimeZones } from "./dates-times-and-time-zones";
import { regularExpressionsForValidation } from "./regular-expressions-for-validation";
import { workingWithFilePathsAndMultipleFiles } from "./working-with-file-paths-and-multiple-files";
import { writingDataExports } from "./writing-data-exports";
import { consumingApiShapedResponsesOffline } from "./consuming-api-shaped-responses-offline";

export const files: PyLesson[] = [
  workingWithTextFilesSafely,
  csvRowsAndHeaders,
  jsonDataAndNestedObjects,
  datesTimesAndTimeZones,
  regularExpressionsForValidation,
  workingWithFilePathsAndMultipleFiles,
  writingDataExports,
  consumingApiShapedResponsesOffline,
];
