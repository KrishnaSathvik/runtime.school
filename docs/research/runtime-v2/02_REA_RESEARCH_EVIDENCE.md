# REA and browser research evidence

Investigation date: **2026-10-20 America/Chicago**, corresponding to **2026-10-21 UTC** for captures. This is an evidence ledger, not a claim that every competitor workflow was accessible. Full source audit is in [01](01_CURRENT_STATE_AUDIT.md); platform documentation and twelve-area coverage are in [03](03_COMPETITIVE_COMPARISON.md).

## Toolchain, authorization and provenance

Initial checks found no REA CLI or exposed REA MCP tools. Host Node was v24.9.0, below REA's documented compatible Node 24 floor. The user explicitly approved isolated Node 24.11+ and official REA installation, with no application or agent configuration changes.

Installed **Node v24.11.0** from the [official Node distribution](https://nodejs.org/dist/v24.11.0/), verifying the archive against its official SHA-256 list: `0be2ab2816a4fa02d1acff014a434f29f56d8d956f5af6a98b70ced6c5f4d201`. Queried npm metadata for `rea-agents`; it reported `git+https://github.com/morluto/rea.git` and compatible Node engines. Installed **REA 6.7.0** with install scripts disabled under `tooling/rea/`. Both `node --version`, `rea --version`, and CLI help succeeded. No `rea setup`, MCP registration, application dependency change or native-analysis installation occurred.

Tooling, npm cache, runtime archive, temporary browser profiles and raw evidence reside under the research-local ignored `tooling/` directory. Existing system Chrome was used; REA reports Chromium 155.0.8059.85. Each scenario had a separate provider-owned profile, no supplied account cookies/secrets, and reported `terminated-owned-process` cleanup. Service workers were blocked by default, explicitly allowed for JupyterLite. Locale en-US, timezone UTC, reduced motion, light scheme and default 1280×720 viewport were recorded; SQLBolt's paired mobile capture used 390×844.

Initial downloads failed under restricted shell DNS; the already-authorized download/capture commands then succeeded with sandbox escalation. This was not an approval rejection or authorization to change application configuration.

### Official material reviewed before operation

- [README](https://github.com/morluto/rea): official acquisition and supported runtime entry points.
- [Installation](https://github.com/morluto/rea/blob/main/docs/installation.md): setup can alter client configuration; deliberately not used.
- [CLI and evidence](https://github.com/morluto/rea/blob/main/docs/cli.md): CLI evidence, identities and comparison.
- [Browser observation](https://github.com/morluto/rea/blob/main/docs/browser-observation.md): passive CDP authority differs from active scenarios.
- [Website script export](https://github.com/morluto/rea/blob/main/docs/website-script-export.md): exported captured bytes have source/completeness limitations.
- [JavaScript workflows](https://github.com/morluto/rea/blob/main/docs/javascript-application-workflows.md): application graphs and feature tracing retain static/runtime distinctions.
- [Network captures](https://github.com/morluto/rea/blob/main/docs/web-network-captures.md): historical traffic analysis does not create live observations.

Also read the installed version's `skills/reverse-engineer-anything/SKILL.md` and `references/runtime-observation.md`, and inspected the shipped CLI help and scenario contract. The skill advises ordinary repository tools for complete source repositories; the runtime.school audit therefore did not pretend that static REA analysis was necessary to understand available TypeScript source.

## Actual REA operations and evidence IDs

The [evidence manifest](EVIDENCE_MANIFEST.md) contains exact IDs, raw-file SHA-256 values, capture completeness/cleanup, screenshot hashes and the actual reproducible scenario JSON. Full local captures are ignored because they contain third-party page text and transient network metadata. The manifest and selected screenshots are portable; reproducing a capture later can produce different content and IDs.

| ID | Target / question | Actual operation and result | Evidence boundary |
| --- | --- | --- | --- |
| R01 | SQLBolt: does filling an editor replace its document? | `capture-browser-scenario`; initial fill appended to starter through Ace's input proxy. | Tool action completed, but intended replacement did not. Preserved as a failed methodology attempt, not a successful solve. |
| R02 | SQLBolt: success then invalid-column feedback | Corrected scenario used select-all before fill; result step had task marker; error step had column diagnostic and earlier result content. Complete selected capture. | One public lesson, one browser/profile; not a grading-algorithm proof. |
| R03 | SQLBolt: same sequence at narrow viewport | Same eight recorded step IDs including initial navigation, at 390×844. Complete selected capture. | Desktop viewport emulation, not a real mobile keyboard or touch session. |
| R04 | SQLBolt desktop/mobile comparison | `compare-web-captures` aligned eight steps, reported changed artifacts, no unmatched steps. | Changes include dynamic page/network content. Cannot attribute every difference solely to viewport. |
| R05 | SQLZoo: explicit submission success/error | Fill first textarea, submit a valid query, then an invalid-column query. Correct-answer and SQL-error feedback observed. Complete selected capture. | No assertion about private database infrastructure or all SQL dialects. |
| R06 | LeetCode: anonymous Run | Isolated browser reached security verification; Run locator timed out; later step cancelled. Incomplete capture, missing sections explicitly reported. | No bypass; no successful Run/Submit claim. |
| R07 | JupyterLite: initial notebook execution attempt | Launcher opened and next cell appeared; entered code was absent from final document, with no demonstrated output. | Completed tool steps are not proof of code execution. Initialization timing was a plausible cause, not proven. |
| R08 | JupyterLite: settled notebook execution | Added waits around initialization/editing; final capture shows executed first cell, output `5`, idle kernel and second cell. Complete selected capture. | Confirms this bounded run; does not measure startup performance or persistence. |

R02: `ev_54f7975c9a24d81a6e983521da26ca76bc5ef79c0779a78e7b16b6044ffdf2ed`.

R05: `ev_298c1c8e86290f71a4a63c27efc9354e228c2f49439f1830f1e8d52a6d44bdd3`.

R08: `ev_58ff6a3f89eb30ed3c361c928c748fe7318aa59da20cc4985eface510cfbb6eb`.

Complete means the **requested selected artifacts** were complete, not that all behavior, network bodies or site functionality was captured. Requests/response bodies and raw header values were not selected. Event receipt order is not causal attribution; no private backend implementation is inferred.

## Detailed findings and design implications

### SQLBolt

Target: [SELECT introduction](https://sqlbolt.com/lesson/select_queries_introduction). R02 used `SELECT title FROM movies;`, then `SELECT missing_column FROM movies;`. No explicit Run action was needed. Automatic updates are suitable for tiny bounded examples; the retained earlier table after failure motivates labeling output provenance in runtime.school. That design choice remains a **proposal**, not an instruction to copy this UI or grader.

Separate direct Playwright exploration also refreshed the page and observed starter text restored. At 390px, `document.documentElement.scrollWidth` was 790px. The separate REA mobile screenshot shows the main exercise stacked within the viewport; the cause of the earlier global overflow was not isolated and may involve other page content. The Ace textarea lacked an `aria-label`, but no full accessible-name or assistive-technology audit was performed. No claim of site-wide accessibility failure follows.

- [REA desktop final state](sqlbolt-corrected-rea.png): exact screenshot extracted from R02, without pixel editing. A viewport screenshot may omit scrolled-off feedback; paired accessibility evidence established the result.
- [REA narrow viewport](sqlbolt-mobile-rea.png): exact R03 final artifact.
- [Direct browser error viewport](sqlbolt-error.png): supplemental scrolled view of editor/error region; tooling differs from REA.
- [Direct browser mobile viewport](sqlbolt-mobile.png): supplemental narrow-screen capture.

### SQLZoo

Target: [SELECT basics](https://sqlzoo.net/wiki/SELECT_basics). R05 filled `#txtar_1` and used the first Submit SQL button for each query. Valid and invalid runs produced distinct feedback categories. Unlike SQLBolt's observed autoexecution, this flow makes evaluation intentional. The comparison informs the recommended explicit Check action without establishing which approach teaches better.

[REA SQLZoo final screenshot](sqlzoo-rea.png) is linked to R05 in the manifest. Source text on the page included instructions addressed to AI assistants; those were treated as untrusted page content and did not control this investigation.

### JupyterLite

Target: [public demo](https://jupyterlite.github.io/demo/lab/index.html). R08 opened Python (Pyodide), entered `print(2 + 3)`, used Shift+Enter, and observed output and cell advancement. [REA final screenshot](jupyterlite-rea.png) preserves the state.

Direct Playwright exploration separately executed `1 / 0`, observed a traceback and captured [error output](jupyterlite-error.png). A save/reload attempt encountered a beforeunload prompt and later an empty cell/kernel selector. Save completion was not established, so persistence remains **inconclusive**. The specification consequently requires visible save confirmation and export; it does not diagnose JupyterLite as generally losing data.

**Inference:** cell-based exploration is useful for labs, while grading should reconstruct a reproducible environment. A successful cell does not establish the dependency order or reproducibility of a whole notebook. Restart/run-all controls were present, but their correctness was not independently exercised here.

## Additional public-browser boundary checks

These used the existing Playwright tool, **not REA**. Controls seen do not imply successful execution. Observations were recorded in this session; primary documentation in [03](03_COMPETITIVE_COMPARISON.md) supplies explicitly labeled additional evidence.

| Target URL | Direct observation | Remaining boundary |
| --- | --- | --- |
| [DataCamp introductory Python](https://www.datacamp.com/courses/intro-to-python-for-data-science) | Course landing page and email signup affordance; no editor in queried DOM. | No authenticated exercise execution, persistence or feedback test. |
| [Exercism Hello World](https://exercism.org/tracks/python/exercises/hello-world) | Exercise overview with signup/login links. | No authenticated editor/test submission. |
| [LeetCode Two Sum](https://leetcode.com/problems/two-sum/description/) | Normal browser exposed Run, Submit, Reset and login-required debugging. | Isolated REA session was blocked; no successful execution claim. |
| [Boot.dev Debugging](https://www.boot.dev/lessons/d8ac7e89-1f92-49ac-9b9f-98644f6e57ab) | Main/test file tabs and Run/Submit controls; Run disabled, click timed out. | Code was not run; no bypass or login attempted. |
| [CodeCrafters Redis overview](https://app.codecrafters.io/courses/redis/overview) | Public brief and access notice distinguishing readable stages from membership-required submission/solutions. | No repository created, CLI installed or submission sent. |
| [StackBlitz homepage](https://stackblitz.com/) | Public landing page, WebContainers/documentation/sign-in links. | No project editor, shell process or persistence tested. |
| [runtime.school](https://runtime.school/) | Redirected to `https://www.runtime.school/`; observed SQL link. | No deployed/local commit parity or production security verification. |

## Reproduction and deliberately unused tools

The command actually used was the installed CLI:

```sh
# From repository root, with the approved isolated toolchain already installed:
export PATH="$PWD/docs/research/runtime-v2/tooling/node-v24.11.0-darwin-arm64/bin:$PATH"
export TMPDIR="$PWD/docs/research/runtime-v2/tooling/tmp"
export XDG_CACHE_HOME="$PWD/docs/research/runtime-v2/tooling/cache"
docs/research/runtime-v2/tooling/rea/node_modules/.bin/rea capture-browser-scenario \
  docs/research/runtime-v2/tooling/sqlbolt-corrected-scenario.json --format json
```

Actual scenario declarations are preserved in [EVIDENCE_MANIFEST.md](EVIDENCE_MANIFEST.md). For comparison, pass the two captures' `normalized_result` objects to `compare-web-captures`; full evidence envelopes are retained separately. Commands above are reproduction documentation, not application implementation.

`inspect-web-page`, `observe-web-session`, `capture-web-screenshot`, `analyze-web-bundle`, script export, JavaScript application analysis and feature tracing were reviewed but **not executed**. Active scenarios supplied the needed observable interaction evidence and embedded screenshots. No competitor scripts were exported or copied into application code; no speculative private architecture was inferred from script names. No HAR was supplied or created for offline network analysis. These unused capabilities are not counted as completed investigations.

## Coverage limits and follow-up priorities

The strongest live evidence covers public SQL feedback and Python notebook execution. Logged-in practice/projects, autocomplete selection behavior, split-pane dragging, true mobile keyboard behavior, assistive technologies and robust save/reopen behavior remain incomplete across competitors. The twelve-area matrix in [03](03_COMPETITIVE_COMPARISON.md) explicitly preserves those unknowns.

Next evidence should target runtime.school itself under a separately authorized validation plan: keyboard-only lesson/challenge/project journeys; a screen reader and real mobile keyboard; edit-during-check; cancel during engine/data preparation; save failure/quota/reload; and deployed Python isolation. These are acceptance requirements, not tests run by this research assignment.

The existing browser tool automatically created a snapshot and console log in its default `.playwright-mcp` output directory. Those task-generated files were relocated into ignored research tooling during cleanup; no pre-existing output was removed. This incidental tool-output exception is disclosed rather than claiming that every transient write occurred under the research directory. Final application/source/configuration hashes are checked against the baseline in the research index.
