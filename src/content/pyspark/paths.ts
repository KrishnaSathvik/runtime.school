/** PySpark URLs. Kept apart from content.ts so shared code (the shell) can link without loading the course. */
export const PS_HOME = "/pyspark";
export const PS_PRACTICE = "/pyspark/practice";
export const PS_PROJECTS = "/pyspark/projects";
export const PS_PLAYGROUND_HREF = "/pyspark/tools/playground";
export const PS_DATASETS_HREF = "/pyspark/tools/datasets";
export const psLessonHref = (slug: string) => `/pyspark/learn/${slug}`;
export const psQuestionHref = (slug: string) => `/pyspark/practice/${slug}`;
export const psProjectHref = (slug: string) => `/pyspark/projects/${slug}`;
/** `PS-D01` → `/pyspark/tools/datasets/d01`. */
export const psDatasetHref = (id: string) => `/pyspark/tools/datasets/${id.replace(/^PS-/, "").toLowerCase()}`;
export const psPlaygroundHref = (dataset?: string, edition?: string) =>
  dataset ? `${PS_PLAYGROUND_HREF}?dataset=${dataset.replace(/^PS-/, "").toLowerCase()}${edition ? `&edition=${edition}` : ""}` : PS_PLAYGROUND_HREF;
