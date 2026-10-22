/** Python URLs. Kept apart from content.ts so shared code (the shell) can link without loading the course. */
export const pyLessonHref = (slug: string) => `/python/learn/${slug}`;
export const pyQuestionHref = (slug: string) => `/python/practice/${slug}`;
export const pyProjectHref = (slug: string) => `/python/projects/${slug}`;
export const pyDatasetHref = (id: string) => `/python/tools/datasets/${id}`;
export const PY_PLAYGROUND_HREF = "/python/tools/playground";
export const PY_DATASETS_HREF = "/python/tools/datasets";
export const PY_DBLAB_HREF = "/python/tools/database-lab";
export const PY_PERF_HREF = "/python/tools/performance-lab";
export const PY_COMPARE_HREF = "/python/tools/compare";
