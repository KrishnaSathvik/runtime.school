/**
 * Each project's overview (src/content/python-v2/overviews/<id>.json): the task, what the learner produces, a line per
 * step, what's wrong with its data and the lessons that help. The shared project frame shows it, as in SQL and PySpark.
 */
import p01 from "./overviews/P01.json";
import p02 from "./overviews/P02.json";
import p03 from "./overviews/P03.json";
import p04 from "./overviews/P04.json";
import p05 from "./overviews/P05.json";
import p06 from "./overviews/P06.json";
import p07 from "./overviews/P07.json";
import p08 from "./overviews/P08.json";
import p09 from "./overviews/P09.json";
import p10 from "./overviews/P10.json";

export type PyOverview = {
  id: string;
  task: string;
  produce: { name: string; about: string }[];
  steps: Record<string, string>;
  problems: string[];
  preparation: string[];
};

const FILES: PyOverview[] = [p01, p02, p03, p04, p05, p06, p07, p08, p09, p10];

export const pyOverview = (id: string): PyOverview | undefined => FILES.find((o) => o.id === id);
