"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChartNoAxesColumn,
  Database,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  SquareTerminal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { tools } from "@/lib/tools";
import { bankQuestions, DIFFICULTY_LABEL } from "@/content/question-bank";
import { courseOrder, groups, lessons } from "@/content";
import { useLearning } from "@/lib/learning-state";
import { useShortcutModifier } from "@/lib/keyboard-shortcuts";
import { ThemeProvider } from "@/lib/theme";

const mainNav = [
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: SquareTerminal },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
] as const;

const exploreNav = tools;

const phoneQuery = "(max-width: 640px)";
function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(phoneQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const isPhoneScreen = () => window.matchMedia(phoneQuery).matches;
const serverPhoneScreen = () => false;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const modifier = useShortcutModifier();
  const pathname = usePathname();
  const router = useRouter();
  const savedCollapsed = useLearning((s) => s.preferences.collapsed);
  const isPhone = useSyncExternalStore(subscribePhone, isPhoneScreen, serverPhoneScreen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = isPhone ? !mobileOpen : savedCollapsed;
  const sidebarToggle = useRef<HTMLButtonElement>(null);
  const setCollapsed = useLearning((s) => s.setCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchTrigger = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const openSearch = () => {
    searchTrigger.current = document.activeElement as HTMLElement | null;
    setSearchOpen(true);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    searchTrigger.current?.focus?.();
  };

  // A phone disclosure does not overwrite the desktop/tablet preference.
  useEffect(() => {
    if (!isPhone || !mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        sidebarToggle.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPhone, mobileOpen]);

  // Move focus to the page heading after client-side navigation.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const h1 = document.querySelector<HTMLElement>("#main-content h1");
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const destinations = [
      ...mainNav,
      ...exploreNav,
      { href: "/practice/questions", label: "Browse questions", icon: SquareTerminal },
      { href: "/practice/tracks", label: "Practice tracks", icon: SquareTerminal },
      { href: "/practice/cases", label: "Practice case studies", icon: SquareTerminal },
      { href: "/explore", label: "Explore SQL", icon: Database },
      { href: "/review", label: "Reviews", icon: Database },
      { href: "/placement", label: "Find my level", icon: Database },
      { href: "/settings", label: "Settings", icon: Settings2 },
    ]
      .filter((d) => !q || d.label.toLowerCase().includes(q))
      .map((d) => ({ href: d.href, label: d.label, detail: "Page" }));
    const moduleHits = groups
      .map((label, i) => ({
        href: `/learn/${i}`,
        label,
        detail: `Module ${i + 1}`,
      }))
      .filter((m) => !q || m.label.toLowerCase().includes(q));
    const lessonHits = q
      ? courseOrder
          .map((id) => lessons[id])
          .filter((l) =>
            `${l.title} ${l.concept} ${groups[l.group]}`
              .toLowerCase()
              .includes(q),
          )
          .slice(0, 10)
          .map((l) => ({
            href: `/lesson/${l.id}`,
            label: l.title,
            detail: groups[l.group],
          }))
      : [];
    const questionHits = q
      ? bankQuestions
          .filter((x) => `${x.title} ${x.task}`.toLowerCase().includes(q))
          .slice(0, 6)
          .map((x) => ({ href: `/practice/${x.slug}`, label: x.title, detail: `Practice · ${DIFFICULTY_LABEL[x.difficulty]}` }))
      : [];
    return [...destinations, ...moduleHits, ...lessonHits, ...questionHits].slice(0, 22);
  }, [query]);

  return (
    <ThemeProvider>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-shell">
        <aside
          className={`sidebar ${collapsed ? "collapsed" : ""}`}
          aria-label="Primary"
          data-mobile-open={isPhone && mobileOpen || undefined}
          onClickCapture={(event) => {
            if (isPhone && (event.target as HTMLElement).closest("a")) setMobileOpen(false);
          }}
        >
          <div className="sidebar-header">
            <Link href="/learn" className="sidebar-brand" aria-label="SQL Studio">
              <Database className="text-[var(--accent)]" size={22} strokeWidth={1.85} aria-hidden="true" />
              <span className="text-[15px] font-semibold tracking-tight">SQL Studio</span>
            </Link>
            <button
              type="button"
              className="sidebar-toggle"
              ref={sidebarToggle}
              onClick={() => isPhone ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={18} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          </div>
          <button
            type="button"
            className="nav-item sidebar-search"
            onClick={openSearch}
            aria-label="Open search"
            title={`Search (${modifier} + K)`}
            aria-keyshortcuts="Meta+K Control+K"
          >
            <Search size={17} strokeWidth={1.75} aria-hidden="true" />
            <span className="nav-text">Search</span>
            <kbd className="nav-text sidebar-kbd">{modifier} + K</kbd>
          </button>
          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {mainNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive(pathname, href) ? "active" : ""}`}
                title={label}
              >
                <Icon size={17} strokeWidth={1.75} />
                <span className="nav-text">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="nav-section">Explore SQL</div>
          <nav className="flex flex-col gap-0.5" aria-label="Explore SQL">
            {exploreNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive(pathname, href) ? "active" : ""}`}
                title={label}
              >
                <Icon size={17} strokeWidth={1.75} />
                <span className="nav-text">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-[var(--border)] pt-3">
            <Link
              href="/settings"
              className={`nav-item ${isActive(pathname, "/settings") ? "active" : ""}`}
              title="Settings"
            >
              <Settings2 size={17} strokeWidth={1.75} />
              <span className="nav-text">Settings</span>
            </Link>
            {!collapsed && (
              <p className="side-note px-3 pt-3 text-xs leading-relaxed text-[var(--muted)]">
                Learn SQL by writing SQL.
              </p>
            )}
          </div>
        </aside>

        {isPhone && mobileOpen && (
          <button
            className="sidebar-backdrop"
            aria-label="Close sidebar"
            onClick={() => {
              setMobileOpen(false);
              sidebarToggle.current?.focus();
            }}
          />
        )}
        <div className="work" inert={isPhone && mobileOpen}>
          <header className="topbar">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="md:hidden font-semibold text-[var(--text)]">
                SQL Studio
              </span>

            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn ghost"
                onClick={openSearch}
                aria-label="Open search"
                title={`Search (${modifier} + K)`}
                aria-keyshortcuts="Meta+K Control+K"
              >
                <Search size={16} strokeWidth={1.75} />

              </button>
            </div>
          </header>
          <main id="main-content" className="content" tabIndex={-1}>
            {children}
          </main>
        </div>

      </div>

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 p-4"
          onClick={closeSearch}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search SQL Studio"
            className="mx-auto mt-[12vh] max-w-xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--main)] shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeSearch();
                return;
              }
              if (e.key !== "Tab") return;
              const items = dialogRef.current?.querySelectorAll<HTMLElement>("input, button");
              if (!items?.length) return;
              const first = items[0];
              const last = items[items.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
          >
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
              <Search size={16} className="text-[var(--muted)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lessons, questions, or pages…"
                className="w-full border-0 bg-transparent py-3 outline-none"
                aria-label="Search"
              />
            </div>
            <ul className="max-h-80 overflow-auto py-2" aria-label="Results">
              {results.length === 0 && (
                <li className="metadata px-4 py-2.5" role="status">
                  No matches. Try a SQL keyword such as JOIN or GROUP BY.
                </li>
              )}
              {results.map((r) => (
                <li key={r.href + r.label}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--hover)]"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                      router.push(r.href);
                    }}
                  >
                    <span>{r.label}</span>
                    <span className="text-xs text-[var(--muted)]">{r.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}
