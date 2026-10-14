import type { PyLesson } from "../../types";
import { defineInputAndOutputContracts } from "./define-input-and-output-contracts";
import { parseAndNormalizeRawRecords } from "./parse-and-normalize-raw-records";
import { dataQualityRulesAndRejections } from "./data-quality-rules-and-rejections";
import { incrementalProcessingAndIdempotence } from "./incremental-processing-and-idempotence";
import { pipelineTestsAndObservability } from "./pipeline-tests-and-observability";
import { buildAReproducibleDataDeliverable } from "./build-a-reproducible-data-deliverable";

export const pipelines: PyLesson[] = [
  defineInputAndOutputContracts,
  parseAndNormalizeRawRecords,
  dataQualityRulesAndRejections,
  incrementalProcessingAndIdempotence,
  pipelineTestsAndObservability,
  buildAReproducibleDataDeliverable,
];
