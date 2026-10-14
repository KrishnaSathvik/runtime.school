"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Moon, Search, Sun } from "lucide-react";
import { courseOrder, getLesson, projects } from "@/content";
import { bankQuestions } from "@/content/question-bank";
import { rtSectionHrefs } from "@/features/rt/entry";
import { pythonQuestions, pythonTracks, pythonQuestionHref, pythonTrackHref } from "@/content/python/practice";
import { pythonJourneys, journeyHref } from "@/content/python/journeys";
import { pythonLessonHref, pythonLessons } from "@/content/python";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { projectHref } from "@/platform/project-paths";
import { useTheme } from "@/lib/theme";
import { Keys } from "./Keys";

export type Crumb = { label: string; href?: string };
type Section = "learn" | "practice" | "projects" | "tools";
/** Which subject's navigation, tools and search the shell shows. SQL is the default. */
export type ShellSubject = "sql" | "python";

const NAV_FALLBACK: { id: Exclude<Section, "tools">; label: string; href: string }[] = [
  { id: "learn", label: "Learn", href: "/sql" },
  { id: "practice", label: "Practice", href: "/sql/practice" },
  { id: "projects", label: "Projects", href: "/sql/projects" },
];

/**
 * Python navigation stays within its own subject. Its playground is available from home and search.
 */
const PYTHON_NAV: { id: Exclude<Section, "tools">; label: string; href: string }[] = [
  { id: "learn", label: "Learn", href: "/python" },
  { id: "practice", label: "Practice", href: "/python/practice" },
  { id: "projects", label: "Projects", href: "/python/projects" },
];

export const TOOLS = [
  { href: "/sql/playground", label: "SQL Playground", purpose: "Explore data freely. No grades." },
  { href: "/sql/lab", label: "Database Lab", purpose: "Create tables, change data, test transactions." },
  { href: "/sql/query-plans", label: "Query Performance", purpose: "Why some queries are faster." },
  { href: "/sql/syntax", label: "Compare SQL Syntax", purpose: "One concept in three SQL dialects." },
];

/**
 * Runtime shell: a path bar (where you are, as a path), the work, and a status line.
 * Everything is reachable by click; ⌘K is a faster way, never the only way.
 */
export function Shell({
  path,
  section,
  status,
  children,
  bare = false,
  subject = "sql",
}: {
  path: Crumb[];
  section?: Section;
  status?: ReactNode[];
  children: ReactNode;
  /** Landing page: brand only, no subject navigation. */
  bare?: boolean;
  subject?: ShellSubject;
}) {
  const ready = useHydrated();
  // String slices only — avoid re-rendering the shell on every draft keystroke.
  const learnHref = useLearning((s) => rtSectionHrefs(s).learn);
  const practiceHref = useLearning((s) => rtSectionHrefs(s).practice);
  const projectsHref = useLearning((s) => rtSectionHrefs(s).projects);
  const nav = useMemo(() => {
    if (subject === "python") return PYTHON_NAV;
    if (!ready) return NAV_FALLBACK;
    const hrefs = { learn: learnHref, practice: practiceHref, projects: projectsHref };
    return NAV_FALLBACK.map((n) => ({ ...n, href: hrefs[n.id] }));
  }, [subject, ready, learnHref, practiceHref, projectsHref]);
  const showTools = subject === "sql";
  const [palette, setPalette] = useState(false);
  const [tools, setTools] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Close the tools menu on outside click or Escape.
  useEffect(() => {
    if (!tools) return;
    const down = (e: PointerEvent) => { if (!toolsRef.current?.contains(e.target as Node)) setTools(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setTools(false); };
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("pointerdown", down); window.removeEventListener("keydown", key); };
  }, [tools]);
  const { resolved, setPreference } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="rx">
      <header className="rx-bar">
        <Link href="/" className="rx-brand" aria-label="Runtime home">
          <Image src="/logo.png" alt="" width={26} height={26} className="rx-brand-mark" priority />
          runtime<span className="rx-caret" aria-hidden="true" />
        </Link>
        {path.length > 0 && (
          <nav className="rx-path" aria-label="You are here">
            <span className="sep">~</span>
            {path.map((c, i) => (
              <Fragment key={i}>
                <span className="sep">/</span>
                {c.href && i < path.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span className="here" aria-current="page">{c.label}</span>}
              </Fragment>
            ))}
          </nav>
        )}
        <div className="rx-bar-end">
          {!bare && (
            <nav className="rx-nav" aria-label="Main">
              {nav.map((n) => (
                <Link key={n.id} href={n.href} aria-current={section === n.id ? "page" : undefined}>{n.label}</Link>
              ))}
              {showTools && (
                <div className="rx-tools" ref={toolsRef}>
                  <button type="button" className={`rx-tools-btn ${section === "tools" ? "on" : ""}`} aria-expanded={tools} aria-haspopup="true" onClick={() => setTools((t) => !t)}>
                    Tools <ChevronDown size={13} aria-hidden="true" />
                  </button>
                  {tools && <ToolList onPick={() => setTools(false)} className="rx-tools-menu" />}
                </div>
              )}
            </nav>
          )}
          {!bare && (
            <button type="button" className="rx-bar-btn" onClick={() => setPalette(true)} aria-label="Open command palette">
              <Search size={14} aria-hidden="true" /> <Keys keys={["mod", "k"]} />
            </button>
          )}
          <button
            type="button"
            className="rx-bar-btn"
            onClick={() => setPreference(resolved === "dark" ? "light" : "dark")}
            aria-label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={resolved === "dark" ? "Light theme" : "Dark theme"}
          >
            {resolved === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>
      <main id="main-content" className="rx-main" tabIndex={-1}>{children}</main>
      {status && status.length > 0 && (
        <footer className="rx-status" aria-label="Status">
          {status.map((s, i) => <span key={i} className={i === status.length - 1 && status.length > 2 ? "push" : undefined}>{s}</span>)}
        </footer>
      )}
      {palette && (subject === "python" ? <PythonPalette onClose={() => setPalette(false)} /> : <Palette onClose={() => setPalette(false)} />)}
    </div>
  );
}

function ToolList({ onPick, className = "" }: { onPick: () => void; className?: string }) {
  return (
    <ul className={`rx-toollist ${className}`}>
      {TOOLS.map((t) => (
        <li key={t.href}>
          <Link href={t.href} onClick={onPick}>
            <span className="t">{t.label}</span>
            <span className="p">{t.purpose}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type Item = { label: string; href: string; kind: string };

/** Search on Python pages: Python destinations that exist, plus the way back to other subjects. No SQL tools. */
function PythonPalette({ onClose }: { onClose: () => void }) {
  const all: Item[] = [
    ...PYTHON_NAV.map((n) => ({ label: `Python · ${n.label}`, href: n.href, kind: "go" })),
    { label: "Python playground", href: "/python/playground", kind: "tool" },
    ...pythonQuestions.map(q => ({ label: q.title, href: pythonQuestionHref(q.slug), kind: "practice" })),
    ...pythonTracks.map(t => ({ label: t.title, href: pythonTrackHref(t.slug), kind: "track" })),
    ...pythonJourneys.map(j => ({ label: j.title, href: journeyHref(j), kind: j.kind })),
    ...pythonLessons.map((l) => ({ label: `${String(l.number).padStart(2, "0")} ${l.title}`, href: pythonLessonHref(l.slug), kind: "lesson" })),
    { label: "Choose a subject", href: "/", kind: "go" },
    { label: "SQL course", href: "/sql", kind: "subject" },
  ];
  return <PaletteDialog all={all} onClose={onClose} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const ready = useHydrated();
  const learnHref = useLearning((s) => rtSectionHrefs(s).learn);
  const practiceHref = useLearning((s) => rtSectionHrefs(s).practice);
  const projectsHref = useLearning((s) => rtSectionHrefs(s).projects);
  const items = useMemo<Item[]>(() => {
    const continueTo = ready
      ? { learn: learnHref, practice: practiceHref, projects: projectsHref }
      : { learn: "/sql", practice: "/sql/practice", projects: "/sql/projects" };
    const all: Item[] = [
      { label: "Learn: my current lesson", href: continueTo.learn, kind: "go" },
      { label: "Practice: next question", href: continueTo.practice, kind: "go" },
      { label: "Projects: continue", href: continueTo.projects, kind: "go" },
      ...TOOLS.map((t) => ({ label: t.label, href: t.href, kind: "tool" })),
      { label: "Choose a subject", href: "/", kind: "go" },
      ...courseOrder.map((id, i) => ({ label: `${String(i + 1).padStart(2, "0")} ${getLesson(id)?.title ?? ""}`, href: `/sql/lesson/${id}`, kind: "lesson" })),
      ...projects.map((p) => ({ label: p.title, href: projectHref(p.id), kind: "project" })),
      ...bankQuestions.map((b) => ({ label: b.title, href: `/sql/practice/${b.slug}`, kind: "practice" })),
    ];
    return all;
  }, [ready, learnHref, practiceHref, projectsHref]);
  return <PaletteDialog all={items} onClose={onClose} />;
}

function PaletteDialog({ all, onClose }: { all: Item[]; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (needle ? all.filter((i) => i.label.toLowerCase().includes(needle) || i.kind.includes(needle)) : all).slice(0, 60);
  }, [q, all]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  return (
    <div className="rx-palette-backdrop" onClick={onClose}>
      <div className="rx-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <div className="rx-palette-input">
          <span aria-hidden="true">›</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Go to a lesson, question, project or tool…"
            aria-label="Search Runtime"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter" && items[sel]) { router.push(items[sel].href); onClose(); }
            }}
          />
        </div>
        <ul ref={listRef} role="listbox" aria-label="Results">
          {items.length === 0 && <li style={{ padding: "8px 10px", fontSize: 13 }}>No matches.</li>}
          {items.map((it, i) => (
            <li key={it.href + it.label}>
              <Link href={it.href} data-i={i} role="option" aria-selected={i === sel} onClick={onClose} onMouseEnter={() => setSel(i)}>
                <span>{it.label}</span>
                <span className="k">{it.kind}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
