import type { PyLesson } from "../../types";
import { seriesAndDataframes } from "./series-and-dataframes";
import { readingAndInspectingData } from "./reading-and-inspecting-data";
import { selectingAndFilteringRows } from "./selecting-and-filtering-rows";
import { missingValuesAndDataTypes } from "./missing-values-and-data-types";
import { cleaningStringsDatesAndDuplicates } from "./cleaning-strings-dates-and-duplicates";
import { groupbyAndAggregation } from "./groupby-and-aggregation";
import { mergingAndReshapingData } from "./merging-and-reshaping-data";
import { exploratoryDataAnalysisAndExports } from "./exploratory-data-analysis-and-exports";

export const pandas: PyLesson[] = [
  seriesAndDataframes,
  readingAndInspectingData,
  selectingAndFilteringRows,
  missingValuesAndDataTypes,
  cleaningStringsDatesAndDuplicates,
  groupbyAndAggregation,
  mergingAndReshapingData,
  exploratoryDataAnalysisAndExports,
];
