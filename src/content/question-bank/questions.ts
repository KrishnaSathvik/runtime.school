import { canonicalQuestions } from "./canonical";
import type { BankQuestion } from "./types";

/** Every Practice question, authored against the canonical datasets (qb-0001 … qb-0139). */
export const bankQuestions: BankQuestion[] = canonicalQuestions;
