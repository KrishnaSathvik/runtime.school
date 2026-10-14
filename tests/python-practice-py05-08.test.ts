import { pythonQuestions } from "@/content/python/practice";
import { describeQuestions } from "./helpers/python-bank";

describeQuestions("py05-08", pythonQuestions.filter((q) => ["collections", "functions", "debugging", "files"].includes(q.module)));
