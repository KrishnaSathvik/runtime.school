import { pythonQuestions } from "@/content/python/practice";
import { describeQuestions } from "./helpers/python-bank";

describeQuestions("py09-12", pythonQuestions.filter((q) => ["patterns", "numpy", "pandas", "pipelines"].includes(q.module)));
