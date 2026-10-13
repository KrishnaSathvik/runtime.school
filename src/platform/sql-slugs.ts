import slugPack from "@/content/sql-lesson-slugs.json";

type SlugPack = {
  version: number;
  byId: Record<string, string>;
  bySlug: Record<string, number>;
};

const pack = slugPack as SlugPack;

export function slugForLessonId(id: number): string | undefined {
  return pack.byId[String(id)];
}

export function lessonIdForSlug(slug: string): number | undefined {
  const id = pack.bySlug[slug];
  return typeof id === "number" ? id : undefined;
}

export function seoLessonPath(id: number): string | undefined {
  const slug = slugForLessonId(id);
  return slug ? `/learn/sql/${slug}` : undefined;
}

export function allSqlLessonSlugs(): string[] {
  return Object.keys(pack.bySlug);
}
