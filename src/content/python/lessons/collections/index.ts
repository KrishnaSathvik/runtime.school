import type { PyLesson } from "../../types";
import { listsCreateReadAndUpdate } from "./lists-create-read-and-update";
import { listSlicingCopyingAndSorting } from "./list-slicing-copying-and-sorting";
import { tuplesAndUnpacking } from "./tuples-and-unpacking";
import { setsMembershipAndDeduplication } from "./sets-membership-and-deduplication";
import { dictionariesKeysAndValues } from "./dictionaries-keys-and-values";
import { dictionaryIterationAndSafeLookup } from "./dictionary-iteration-and-safe-lookup";
import { nestedRecordsAndCollections } from "./nested-records-and-collections";
import { comprehensionsWithoutMystery } from "./comprehensions-without-mystery";

export const collections: PyLesson[] = [
  listsCreateReadAndUpdate,
  listSlicingCopyingAndSorting,
  tuplesAndUnpacking,
  setsMembershipAndDeduplication,
  dictionariesKeysAndValues,
  dictionaryIterationAndSafeLookup,
  nestedRecordsAndCollections,
  comprehensionsWithoutMystery,
];
