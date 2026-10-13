# Runtime.school

Hands-on technical learning. Lessons, practice, and projects that run real code in the browser — starting with SQL.

**Site:** [https://www.runtime.school](https://www.runtime.school)  
**Repo:** [https://github.com/KrishnaSathvik/runtime.school](https://github.com/KrishnaSathvik/runtime.school)

## Product

- **Home** (`/`) — pick a subject; SQL is available today
- **Learn** (`/sql`) — lessons with examples, walkthroughs, two challenges, and a concept check
- **Practice** (`/sql/practice`) — graded questions on real sample data
- **Projects** (`/sql/projects`) — multi-milestone guided work
- **Tools** — playground, database lab, query plans, dialect syntax

Progress is local-first (this browser). No account required. SQL runs via SQLite (sql.js) in the browser.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port you pass, e.g. `npm run dev -- -p 3040`).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Vitest unit suite |
| `npm run lint` | ESLint |

Optional e2e suites need a running server and `BASE` (e.g. `BASE=http://127.0.0.1:3040 npm run test:e2e`).

## Stack

- Next.js (App Router) + React
- CodeMirror SQL editor with autocomplete
- sql.js (SQLite in WebAssembly)
- Zustand learning state + local persistence

## Content (SQL)

| Item | Count |
| --- | --- |
| Modules | 10 |
| Lessons | 88 |
| Challenges | 176 |
| Projects | 5 |
| Practice bank questions | 88+ |
| Concept quizzes | 88 |

## Project structure

```
src/app/           App Router (public site + /sql/* Runtime shell)
src/features/rt/   Runtime Learn / Practice / Projects UI
src/components/    Editor, shell, brand
src/content/       Curriculum and question bank
src/engine/        SQL client + grading helpers
src/lib/           Learning state, theme, routes
src/platform/      Brand, SEO, subjects
public/            Icons, OG images, fonts, sql.js worker
docs/              Design notes and audits
```

## Notes

- Canonical learner URLs live under `/sql/…`. Older paths remain as redirects or noindex fallbacks.
- `reference/` holds private source material and is gitignored.
- Brand assets: `public/logo.png`, `public/og.png`, `public/og-sql.png`.
