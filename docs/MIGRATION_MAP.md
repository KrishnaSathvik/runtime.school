# Migration map

| Original | New |
| --- | --- |
| `dist/curriculum.js` + related | `src/content/content-pack.json` |
| `dist/grading.js` | `src/engine/grading.ts` |
| `dist/engine.js` | `public/vendor/engine.js` + `src/engine/sql-client.ts` |
| `dist/learning-state.js` | `src/lib/learning-state.ts` |
| `dist/ux.js` screens | `src/app/**`, `src/features/**` |
| `dist/ux.css` tokens | `src/app/globals.css` |
| `#/lab` | `/database-lab` |
| `#/query-plans` | `/query-performance` |
| `#/dialects` | `/sql-syntax` |
| `#/warehouse` | Integrated into `/projects/3` and `/projects/4` |
