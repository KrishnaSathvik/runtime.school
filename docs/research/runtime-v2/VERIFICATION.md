# Final research verification

Checked 2026-10-20T20:48:44-05:00. These are documentation and file-boundary checks, not application tests.

## Deliverables and links

- All 13 numbered documents (00–12) plus README exist and contain substantive findings/specifications.
- 198 local Markdown links checked after all deliverables and verification notes were written; no missing targets.
- 53 external source URLs checked with read-only HTTP requests: 49 returned HTTP 200; four returned HTTP 403. No HTTP 404 was found.
- The 403 sources were available through earlier web retrieval or browser observation where cited. Access restriction is not asserted to be a broken link.

- Restricted check: https://doi.org/10.1080/08993408.2019.1608781 — 403
- Restricted check: https://leetcode.com/problems/two-sum/description/ — 403
- Restricted check: https://support.leetcode.com/hc/en-us/articles/360012016874-Start-your-Coding-Practice — 403
- Restricted check: https://www.datacamp.com/courses/intro-to-python-for-data-science — 403

## Scope and concurrent workspace changes

- Research agents wrote only their assigned research Markdown documents. Parent writes comprised research documentation, evidence screenshots and approved isolated tooling. No application source/configuration/dependency edits, builds, tests, migrations, refactoring or deployments were performed by this team.
- No agent configuration or MCP registration was changed. Node 24.11.0 and REA 6.7.0 were installed only in ignored research tooling, with the user’s explicit approval.
- Browser tool auto-output briefly created one snapshot and one console log in `.playwright-mcp`; both task-owned files were relocated to ignored research tooling. Existing browser outputs were preserved.
- Baseline covered 1448 tracked/nonignored untracked paths. Final comparison found 17 changed baseline paths and 13 newly present paths outside research. These changes did not originate in the recorded research-agent writes; concurrent workspace activity is the likely explanation. They were not reverted or modified.
- Therefore, the repository as a whole cannot be certified unchanged. The accurate claim is that this research team made no application changes. Source findings describe the files at inspection time; affected content may have evolved during the audit.

### Changed baseline paths

- `scratchpad/m4650/dump.ts`
- `scripts/python-v2/quality-baseline.json`
- `src/content/python-v2/concepts.ts`
- `src/content/python-v2/lessons/M39.ts`
- `src/content/python-v2/lessons/M40.ts`
- `src/content/python-v2/lessons/M41.ts`
- `src/content/python-v2/lessons/M42.ts`
- `src/content/python-v2/lessons/M45.ts`
- `src/content/python-v2/lessons/M47.ts`
- `src/content/python-v2/m39-loop.ts`
- `src/content/python-v2/questions/M39.ts`
- `src/content/python-v2/questions/M42.ts`
- `src/content/python-v2/questions/M43.ts`
- `src/content/python-v2/questions/M45.ts`
- `src/content/python-v2/questions/M47.ts`
- `src/content/python-v2/registry.json`
- `src/content/python-v2/versions.ts`

### Newly present outside-research paths

- `scratchpad/m4145/counts.ts`
- `scratchpad/m4145/flights.csv`
- `scratchpad/m4145/t10.py`
- `scratchpad/m4145/t11.py`
- `scratchpad/m4650/m47/04.ts`
- `scratchpad/m4650/m47/05.ts`
- `scratchpad/m4650/m47/q1.ts`
- `scratchpad/m4650/m47/q2.ts`
- `scratchpad/m4650/m47/q3.ts`
- `scratchpad/m4650/m48/00.ts`
- `scratchpad/m4650/m48/01.ts`
- `scratchpad/m4650/m48/02.ts`
- `scratchpad/m4650/m48/03.ts`

## Stable architecture evidence and tooling exclusion

- Detected drift is concentrated in Python curricula/registry/version files and scratchpad/report work. The baseline comparison did not flag the audited engine clients, sandbox, graders, progress stores, subject catalog, Shell, package.json, package-lock.json, next.config.ts or root .gitignore.
- `git check-ignore` confirmed exclusion of the Node archive, REA node_modules and npm cache through `tooling/.gitignore`. The rule ignores all tooling contents except its own ignore file. No commit or staging action was performed.
- REA-owned browser captures reported cleanup of owned processes. The supplemental browser page was closed.
- Exact REA capture hashes, input declarations, completion limits and screenshot hashes are in [EVIDENCE_MANIFEST.md](EVIDENCE_MANIFEST.md). Screenshot review confirmed the settled notebook output and the mobile SQLBolt exercise state.

## Review results

- An independent source auditor corrected spare-interpreter wording, immutable-attempt semantics, SQL project stage distinctions and unproven cross-subject dataset equivalence.
- An independent architecture review found no major contradiction among summary, UX, engine/grading, platform and roadmap. Final refinements made preparation cancellation explicit and limited executable-check language so concept/written/rubric assessments remain valid.
- Minimum V2 remains SQL preservation plus safe Python integration. Advanced runtimes, notebooks, accounts and synchronization remain conditional later work.
- Real mobile keyboard/screen-reader testing, production Python isolation, performance measurements and authenticated competitor workflows remain documented gaps, not claimed test passes.
