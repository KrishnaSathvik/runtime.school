"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderKanban, Search, Settings2, SquareTerminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { HeaderMenu } from "@/components/shell/HeaderMenu";
import { searchResults } from "@/components/shell/search-index";
import { useShortcutModifier } from "@/lib/keyboard-shortcuts";
import { ThemeProvider } from "@/lib/theme";
import { BRAND_NAME } from "@/platform/brand";
import { formatDocumentTitle } from "@/platform/route-title";
import { subjectById, subjectFromPath, subjects } from "@/platform/subjects";

const mainNav = [
  { href: "/sql", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: SquareTerminal },
  { href: "/projects", label: "Projects", icon: FolderKanban },
] as const;

function isLearnPath(pathname: string) {
  return (
    pathname === "/sql" ||
    pathname === "/learn" ||
    pathname.startsWith("/learn/") ||
    pathname.startsWith("/lesson/") ||
    pathname.startsWith("/review") ||
    pathname === "/placement" ||
    pathname.startsWith("/placement/")
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/sql") return isLearnPath(pathname);
  if (href === "/practice") return pathname === "/practice" || pathname.startsWith("/practice/");
  if (href === "/projects") return pathname === "/projects" || pathname.startsWith("/projects/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Runtime shell: one quiet header (wordmark, subject, Learn · Practice · Projects, tools, search)
 * instead of a dashboard sidebar. The public homepage at `/` has its own marketing header.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const modifier = useShortcutModifier();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchTrigger = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const subject = subjectById[subjectFromPath(pathname) ?? "sql"];
  const home = pathname === "/";

  const openSearch = () => {
    searchTrigger.current = document.activeElement as HTMLElement | null;
    setSearchOpen(true);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    searchTrigger.current?.focus?.();
  };

  useEffect(() => {
    const title = formatDocumentTitle(pathname);
    if (!title) return;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname]);

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

  const results = useMemo(() => searchResults(query), [query]);

  // Runtime UI at / and /sql/* brings its own shell.
  if (pathname === "/" || pathname === "/sql" || pathname.startsWith("/sql/")) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  return (
    <ThemeProvider>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="rt-shell">
        {home ? (
          <HomeHeader />
        ) : (
          <header className="rt-header">
            <div className="rt-header-start">
              <Wordmark />
              <span className="rt-header-sep" aria-hidden="true">/</span>
              <HeaderMenu label={subject.title} buttonLabel={`Subject: ${subject.title}. Change subject`}>
                <p className="rt-menu-label">Subjects</p>
                {subjects.map((s) =>
                  s.availability === "available" ? (
                    <Link
                      key={s.id}
                      href={s.courseHref ?? s.href}
                      className="rt-menu-item"
                      aria-current={s.id === subject.id ? "true" : undefined}
                    >
                      <span>{s.title}</span>
                      <span className="rt-menu-hint">{s.id === subject.id ? "Current" : "Open"}</span>
                    </Link>
                  ) : (
                    <span key={s.id} className="rt-menu-item disabled" aria-disabled="true">
                      <span>{s.title}</span>
                      <span className="rt-menu-hint">{s.availabilityLabel}</span>
                    </span>
                  ),
                )}
                <Link href="/" className="rt-menu-footer">
                  All subjects →
                </Link>
              </HeaderMenu>
            </div>

            <nav className="rt-nav" aria-label="Main">
              {mainNav.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`rt-nav-item ${isActive(pathname, href) ? "active" : ""}`}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="rt-header-end">
              {subject.tools.length > 0 && (
                <HeaderMenu label="Tools" buttonLabel={`${subject.title} tools`} align="end" className="rt-tools-menu">
                  <p className="rt-menu-label">{subject.title} tools</p>
                  {subject.tools.map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      className="rt-menu-item stacked"
                      aria-current={pathname === t.href ? "page" : undefined}
                    >
                      <span>{t.label}</span>
                      {t.purpose && <span className="rt-menu-hint">{t.purpose}</span>}
                    </Link>
                  ))}
                </HeaderMenu>
              )}
              <button
                type="button"
                className="rt-icon-button"
                onClick={openSearch}
                aria-label="Open search"
                title={`Search (${modifier} + K)`}
                aria-keyshortcuts="Meta+K Control+K"
              >
                <Search size={17} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <Link
                href="/settings"
                className={`rt-icon-button ${pathname === "/settings" ? "active" : ""}`}
                aria-label="Settings"
                title="Settings"
              >
                <Settings2 size={17} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
          </header>
        )}

        <main id="main-content" className={`content ${home ? "" : "has-mobile-nav"}`} tabIndex={-1}>
          {children}
        </main>

        {!home && (
          <nav className="mobile-bottom-nav" aria-label="Primary mobile">
            {mainNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`mobile-nav-item ${isActive(pathname, href) ? "active" : ""}`}
                aria-current={isActive(pathname, href) ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 p-4" onClick={closeSearch}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Search ${BRAND_NAME}`}
            className="mx-auto mt-[12vh] max-w-xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--main)] shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeSearch();
                return;
              }
              if (e.key !== "Tab") return;
              const items = dialogRef.current?.querySelectorAll<HTMLElement>("input, button, a[href]");
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
                  No matches. Try a skill or keyword such as JOIN or GROUP BY.
                </li>
              )}
              {results.map((r) => (
                <li key={r.href + r.label}>
                  <Link
                    href={r.href}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--hover)]"
                    onClick={() => closeSearch()}
                  >
                    <span>{r.label}</span>
                    <span className="text-xs text-[var(--muted)]">{r.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}

/** Landing header: just the brand. Choosing a subject happens on the page. */
function HomeHeader() {
  return (
    <header className="rt-header rt-home-header">
      <div className="rt-header-start">
        <Wordmark />
      </div>
    </header>
  );
}
