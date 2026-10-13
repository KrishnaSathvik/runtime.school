# Task Pane Clarity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make practice/lesson task sections and table schemas easy to scan without changing the quiet course design.

**Architecture:** CSS-first section separators in `.task-pane`; shared schema row markup/styles used by `QuestionWorkspace` and `TableInspector` so practice and lessons stay consistent.

**Tech Stack:** React (Next.js), existing CSS tokens in `globals.css`, no new dependencies.

**Design:** @docs/plans/2026-10-12-task-pane-clarity-design.md

---

### Task 1: Schema row styles

**Files:**
- Modify: `src/app/globals.css` (`.schema-columns`, `.task-pane` section/eyebrow rules)

**Step 1: Update schema list layout**

Replace wrap-row `.schema-columns` with a stacked list:

```css
.schema-columns {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-wrap: anywhere;
}
.schema-columns li {
  display: grid;
  grid-template-columns: minmax(7rem, max-content) minmax(4rem, max-content) auto;
  column-gap: 12px;
  align-items: baseline;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.45;
}
.schema-columns .schema-name { color: var(--text); font-weight: 600; }
.schema-columns .schema-type { color: var(--muted); }
.schema-columns .schema-key { color: var(--accent-strong); font-weight: 650; }
.schema-columns .schema-ref { color: var(--text-secondary); }
```

**Step 2: Section separation in task pane**

```css
.task-pane .task-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.task-pane .task-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
.task-pane .eyebrow {
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}
.task-pane .schema-columns { font-size: 12px; }
```

Remove or override older conflicting rules (`.task-pane .schema-columns { gap:… }`, compact-task eyebrow margins that fight `.task-section`).

**Step 3: Visual check**

Open a practice question with `employees` in light theme; schema should be one column per line; sections should show hairline separators.

---

### Task 2: Practice question markup

**Files:**
- Modify: `src/features/practice/QuestionWorkspace.tsx` (~233–325)

**Step 1: Wrap each block in `task-section`**

Wrap: Your task (+ rules/jump/case meta), Required output, Rules (if long), Expected output, Tables and sample data.

**Step 2: Schema rows**

```tsx
<ul className="schema-columns mt-2">
  {(schema()[t] ?? []).map((c) => (
    <li key={c.name}>
      <code className="schema-name">{c.name}</code>
      <span className="schema-type">{c.type.toLowerCase()}</span>
      <span>
        {c.key && <span className="schema-key">{c.key}</span>}
        {c.references && <span className="schema-ref"> → {c.references}</span>}
      </span>
    </li>
  ))}
</ul>
```

**Step 3: Required output cue**

Under the eyebrow, keep chips; add `<p className="metadata mt-1">Columns to return</p>` only if it does not duplicate the eyebrow awkwardly — prefer eyebrow “Required output” + chips + existing grade note (skip extra label if redundant).

---

### Task 3: TableInspector parity

**Files:**
- Modify: `src/components/editor/TableInspector.tsx` (~62–64)

**Step 1: Match schema row markup**

Use the same `.schema-name` / `.schema-type` / `.schema-key` / `.schema-ref` structure as practice.

**Step 2: Confirm lessons/playground**

Open a JOIN lesson or Playground tables panel; expanded schema should stack, not wrap as one line.

---

### Task 4: Docs touch-up

**Files:**
- Modify: `docs/DESIGN_SYSTEM.md` (short note under learning/task UI if present, or add one line)

**Step 1:** Note that task panes use hairline section breaks and stacked schema rows.

---

### Task 5: Verify

**Step 1:** Spot-check light + dark on a compact single-table question and a multi-table question.

**Step 2:** Run any existing test that snapshots task pane copy if present; otherwise manual browser check.

```sh
# if related tests exist
npx vitest run tests/workspace-context.test.ts
```

**Step 3:** Commit only if the user asks.
