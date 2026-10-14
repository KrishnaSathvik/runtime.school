import type { PyLesson } from "../../types";
import { classesAndDataModels } from "./classes-and-data-models";
import { methodsAndObjectState } from "./methods-and-object-state";
import { dataclassesAndTypeHints } from "./dataclasses-and-type-hints";
import { iteratorsAndGenerators } from "./iterators-and-generators";
import { contextManagersAndResourceSafety } from "./context-managers-and-resource-safety";
import { loggingConfigurationAndProjectStructure } from "./logging-configuration-and-project-structure";

export const patterns: PyLesson[] = [
  classesAndDataModels,
  methodsAndObjectState,
  dataclassesAndTypeHints,
  iteratorsAndGenerators,
  contextManagersAndResourceSafety,
  loggingConfigurationAndProjectStructure,
];
