import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Brain,
  Code2,
  Database,
  LineChart,
  Sparkles,
} from "lucide-react";
import { tools } from "@/lib/tools";

export type SubjectAvailability = "available" | "next" | "planned";

export type SubjectId =
  | "sql"
  | "python"
  | "pyspark"
  | "power-bi"
  | "ml"
  | "ai-engineering";

export type SubjectTool = {
  href: string;
  label: string;
  purpose?: string;
};

export type SubjectDefinition = {
  id: SubjectId;
  title: string;
  family: string;
  summary: string;
  availability: SubjectAvailability;
  availabilityLabel: string;
  href: string;
  courseHref?: string;
  practiceHref?: string;
  projectsHref?: string;
  icon: LucideIcon;
  tools: SubjectTool[];
};

export const subjects: SubjectDefinition[] = [
  {
    id: "sql",
    title: "SQL",
    family: "Data & Analytics",
    summary: "Query databases and analyze data through interactive lessons.",
    availability: "available",
    availabilityLabel: "Available",
    href: "/sql",
    courseHref: "/sql",
    practiceHref: "/sql/practice",
    projectsHref: "/sql/projects",
    icon: Database,
    tools: tools.map((t) => ({ href: t.href, label: t.label, purpose: t.purpose })),
  },
  {
    id: "python",
    title: "Python",
    family: "Data Engineering",
    summary: "Programming and working with data.",
    availability: "next",
    availabilityLabel: "Coming next",
    href: "/skills/python",
    icon: Code2,
    tools: [],
  },
  {
    id: "pyspark",
    title: "PySpark",
    family: "Data Engineering",
    summary: "Distributed processing and data pipelines.",
    availability: "planned",
    availabilityLabel: "Planned",
    href: "/skills/pyspark",
    icon: Sparkles,
    tools: [],
  },
  {
    id: "power-bi",
    title: "Power BI",
    family: "Data & Analytics",
    summary: "Data modeling, DAX reasoning, and report interpretation.",
    availability: "planned",
    availabilityLabel: "Planned",
    href: "/skills/power-bi",
    icon: LineChart,
    tools: [],
  },
  {
    id: "ml",
    title: "Machine Learning",
    family: "Machine Learning",
    summary: "Features, supervised learning, evaluation, and ML pipelines.",
    availability: "planned",
    availabilityLabel: "Planned",
    href: "/skills/ml",
    icon: Brain,
    tools: [],
  },
  {
    id: "ai-engineering",
    title: "AI Engineering",
    family: "AI Engineering",
    summary: "LLMs, embeddings, RAG, agents, and evaluation.",
    availability: "planned",
    availabilityLabel: "Planned",
    href: "/skills/ai-engineering",
    icon: Bot,
    tools: [],
  },
];

export const subjectById = Object.fromEntries(
  subjects.map((s) => [s.id, s]),
) as Record<SubjectId, SubjectDefinition>;

export const availableSubjects = subjects.filter((s) => s.availability === "available");

export function parseLessonRef(ref: string): { subjectId: SubjectId; lessonId: string } | null {
  const i = ref.indexOf(":");
  if (i <= 0) return null;
  const subjectId = ref.slice(0, i) as SubjectId;
  const lessonId = ref.slice(i + 1);
  if (!subjectById[subjectId] || !lessonId) return null;
  return { subjectId, lessonId };
}

export function lessonRef(subjectId: SubjectId, lessonId: string | number): string {
  return `${subjectId}:${lessonId}`;
}
