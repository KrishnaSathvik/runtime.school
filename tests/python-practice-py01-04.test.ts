import { pythonQuestions } from "@/content/python/practice";
import { describeQuestions } from "./helpers/python-bank";

describeQuestions("py01-04", pythonQuestions.filter((q) => ["foundations", "strings", "conditions", "loops"].includes(q.module)));
