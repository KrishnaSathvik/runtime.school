import { bankQuestions, DIFFICULTY_LABEL } from "@/content/question-bank";
import { courseOrder, groups, lessons } from "@/content";
import { tools } from "@/lib/tools";
import { seoLessonPath } from "@/platform/sql-slugs";

const pages: { href: string; label: string; searchOnly?: boolean }[] = [
  { href: "/sql", label: "Learn" },
  { href: "/sql", label: "Learning path", searchOnly: true },
  { href: "/sql", label: "SQL", searchOnly: true },
  { href: "/", label: "All subjects" },
  { href: "/practice", label: "Practice" },
  { href: "/projects/sql", label: "Projects" },
  ...tools.map((tool) => ({ href: tool.href, label: tool.label })),
  { href: "/practice/questions", label: "Browse questions" },
  { href: "/review", label: "Reviews" },
  { href: "/placement", label: "Find my level" },
  { href: "/settings", label: "Settings" },
];

export type SearchHit = { href: string; label: string; detail: string };

export function searchResults(raw: string): SearchHit[] {
  const q = raw.trim().toLowerCase();
  const destinations = pages
    .filter((page) => (q ? page.label.toLowerCase().includes(q) : !page.searchOnly))
    .map((page) => ({ href: page.href, label: page.label, detail: "Page" }));
  const moduleHits = groups
    .map((label, i) => ({ href: `/learn/${i}`, label, detail: `Module ${i + 1}` }))
    .filter((module) => !q || module.label.toLowerCase().includes(q));
  const lessonHits = q
    ? courseOrder
        .map((id) => lessons[id])
        .filter((lesson) =>
          `${lesson.title} ${lesson.concept} ${groups[lesson.group]}`.toLowerCase().includes(q),
        )
        .slice(0, 10)
        .map((lesson) => ({
          href: seoLessonPath(lesson.id) ?? `/lesson/${lesson.id}`,
          label: lesson.title,
          detail: groups[lesson.group],
        }))
    : [];
  const questionHits = q
    ? bankQuestions
        .filter((question) => `${question.title} ${question.task}`.toLowerCase().includes(q))
        .slice(0, 6)
        .map((question) => ({
          href: `/practice/${question.slug}`,
          label: question.title,
          detail: `Practice · ${DIFFICULTY_LABEL[question.difficulty]}`,
        }))
    : [];
  return [...destinations, ...moduleHits, ...lessonHits, ...questionHits].slice(0, 22);
}
