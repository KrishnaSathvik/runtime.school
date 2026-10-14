import type { PyLesson } from "../../types";
import { arraysShapesAndDtypes } from "./arrays-shapes-and-dtypes";
import { vectorizedArithmeticAndBroadcasting } from "./vectorized-arithmetic-and-broadcasting";
import { indexingMasksAndViews } from "./indexing-masks-and-views";
import { reshapingAndAggregating } from "./reshaping-and-aggregating";
import { nansAndNumericalReliability } from "./nans-and-numerical-reliability";

export const numpy: PyLesson[] = [
  arraysShapesAndDtypes,
  vectorizedArithmeticAndBroadcasting,
  indexingMasksAndViews,
  reshapingAndAggregating,
  nansAndNumericalReliability,
];
