"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { CANONICAL_VERSION } from "@/data/datasets/learning";
import { CENTRAL_TABLE, STARTER_QUERY, datasetName, tableQuery, toolDataset } from "@/content/tools/datasets";
import { preloadDatabase } from "@/engine/sql-client";
import { useLearning } from "@/lib/learning-state";
import { ConfirmDialog, NameDialog } from "@/features/python/Dialogs";
import { Shell } from "../Shell";
import { TaskCell } from "../Cells";
import { PLAYGROUND_EDITOR_HEIGHT } from "../editor-height";
import { DatasetPicker, DatasetSummary, RelationshipList, TableList } from "../DatasetBrowser";
import { ReplaceConfirm, useScriptSlot, useSqlParam } from "../ScriptSlot";

type Tab = { id: string; name: string };
type Tabs = { tabs: Tab[]; active: string };
type Dialog = null | { kind: "new" } | { kind: "rename"; tab: Tab } | { kind: "delete"; tab: Tab };

const FIRST: Tabs = { tabs: [{ id: "0", name: "query.sql" }], active: "0" };
const MAX_TABS = 12;

/**
 * Saved queries per dataset, kept with the learner's other drafts. The first tab keeps the Playground's
 * original draft key, so queries written before tabs existed open as query.sql.
 */
function useQueryTabs(dataset: CanonicalDatasetId) {
  const base = `sql-playground-${dataset}@${CANONICAL_VERSION}`;
  const listKey = `${base}#tabs`;
  const raw = useLearning((s) => s.drafts[listKey]);
  const setDraft = useLearning((s) => s.setDraft);
  let state = FIRST;
  try {
    const parsed = raw ? (JSON.parse(raw) as Tabs) : null;
    if (parsed?.tabs?.length) state = { tabs: parsed.tabs, active: parsed.tabs.some((t) => t.id === parsed.active) ? parsed.active : parsed.tabs[0].id };
  } catch { /* a damaged list falls back to the single first tab */ }
  const save = (next: Tabs) => setDraft(listKey, JSON.stringify(next));
  const sqlKey = (id: string) => (id === "0" ? base : `${base}#${id}`);
  const active = state.tabs.find((t) => t.id === state.active)!;
  return {
    ...state,
    activeTab: active,
    sqlKey,
    open: (id: string) => save({ ...state, active: id }),
    add: (name: string, sql: string) => {
      const id = String(Math.max(...state.tabs.map((t) => Number(t.id) || 0)) + 1);
      setDraft(sqlKey(id), sql);
      save({ tabs: [...state.tabs, { id, name }], active: id });
    },
    rename: (id: string, name: string) => save({ ...state, tabs: state.tabs.map((t) => (t.id === id ? { ...t, name } : t)) }),
    remove: (id: string) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      setDraft(sqlKey(id), "");
      save({ tabs, active: state.active === id ? tabs[0].id : state.active });
    },
  };
}

const withSql = (name: string) => (/\.sql$/i.test(name) ? name : `${name}.sql`);

function freshName(tabs: Tab[]) {
  for (let i = 2; ; i++) if (!tabs.some((t) => t.name === `query-${i}.sql`)) return `query-${i}.sql`;
}

/** Pick one of Runtime's twelve datasets and write SQL against it, in as many saved queries as you need. Nothing is graded. */
export function Playground({ dataset }: { dataset: CanonicalDatasetId }) {
  const router = useRouter();
  const d = toolDataset(dataset);
  const tables = d.metadata.tables.map((t) => t.name);
  const tabs = useQueryTabs(dataset);
  const fresh = tabs.activeTab.id === "0" ? STARTER_QUERY[dataset] : tableQuery(CENTRAL_TABLE[dataset]);
  const loaded = new Set([STARTER_QUERY[dataset], ...tables.map(tableQuery)]);
  const untouched = (sql: string) => loaded.has(sql);
  const slot = useScriptSlot(tabs.sqlKey(tabs.activeTab.id), fresh, untouched);
  const [dialog, setDialog] = useState<Dialog>(null);
  // SQL brought from another page opens in its own tab rather than over the learner's work.
  useSqlParam((sql) => {
    if (slot.value.trim() && !untouched(slot.value) && sql !== slot.value && tabs.tabs.length < MAX_TABS) tabs.add(freshName(tabs.tabs), sql);
    else slot.load(sql);
  });
  // Start the download while the learner reads the schema.
  useEffect(() => preloadDatabase(d.seed), [d.seed]);

  const nameProblem = (name: string, except?: string) => {
    if (!name) return "Give the query a name.";
    if (name.length > 40) return "Keep the name under 40 characters.";
    if (tabs.tabs.some((t) => t.id !== except && t.name === withSql(name))) return "Another query already has that name.";
    return null;
  };

  return (
    <Shell
      path={[{ label: "sql" }, { label: "playground" }, { label: dataset }]}
      section="tools"
      status={["SQL", "playground · not graded", `sqlite · ${datasetName(dataset)}`, "read-only"]}
    >
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="pg-title">
            <p className="rx-prompt-line"><b>playground</b> write SQL freely · no grades</p>
            <h1 id="pg-title" className="rx-task-title">SQL Playground</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Write SQL against any Runtime dataset. Keep several queries side by side; they&apos;re saved in this browser. Nothing here affects course progress.</p>
            <DatasetPicker value={dataset} onChange={(id) => router.push(`/sql/playground/${id}`, { scroll: false })} />
            <DatasetSummary id={dataset} />
            <p className="rx-label sec">tables</p>
            <p className="rx-cap">Open a table to see what one row means, its columns and keys, and a preview. Start from <b className="mono">{CENTRAL_TABLE[dataset]}</b>: it is the dataset&apos;s central table.</p>
            <TableList id={dataset} onQuery={(t) => slot.load(tableQuery(t))} />
            <p className="rx-label sec">relationships</p>
            <p className="rx-cap">How to join these tables. Left column matches the right column.</p>
            <RelationshipList id={dataset} />
          </article>
          <section className="rx-work rx-lesson-work rx-tool-work" aria-label="Query editor">
            <ReplaceConfirm sql={slot.pending} onConfirm={slot.confirm} onCancel={slot.cancel} />
            <div className="rx-sqltabs">
              <div role="tablist" aria-label="Your queries" style={{ display: "contents" }}>
                {tabs.tabs.map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={t.id === tabs.active} onClick={() => tabs.open(t.id)}>{t.name}</button>
                ))}
              </div>
              {tabs.tabs.length < MAX_TABS && (
                <button type="button" onClick={() => setDialog({ kind: "new" })} aria-label="New query"><Plus size={13} aria-hidden="true" /></button>
              )}
            </div>
            <TaskCell
              key={`${dataset}-${tabs.activeTab.id}`}
              name={tabs.activeTab.name}
              value={slot.value}
              onChange={slot.set}
              graded={false}
              minHeight={PLAYGROUND_EDITOR_HEIGHT}
              tables={tables}
              task={{ seedSql: d.seed }}
              analytics={{ subject: "sql", surface: "playground", dataset }}
              footer={
                <>
                  <button type="button" className="rx-btn ghost" onClick={() => setDialog({ kind: "rename", tab: tabs.activeTab })}>Rename</button>
                  {tabs.tabs.length > 1 && <button type="button" className="rx-btn ghost" onClick={() => setDialog({ kind: "delete", tab: tabs.activeTab })}>Delete</button>}
                </>
              }
            />
            <p className="rx-small">Runs one SELECT or WITH query at a time on all {d.metadata.totals.rows.toLocaleString("en-US")} rows. Results show up to 200 rows. To change data, use Database Lab.</p>
          </section>
        </div>
        <NameDialog
          open={dialog?.kind === "new" || dialog?.kind === "rename"}
          title={dialog?.kind === "rename" ? `Rename ${dialog.tab.name}` : "New query"}
          label="Query name"
          initial={dialog?.kind === "rename" ? dialog.tab.name : freshName(tabs.tabs)}
          confirm={dialog?.kind === "rename" ? "Rename" : "Create"}
          problem={(n) => nameProblem(n, dialog?.kind === "rename" ? dialog.tab.id : undefined)}
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            if (dialog?.kind === "rename") tabs.rename(dialog.tab.id, withSql(name));
            else tabs.add(withSql(name), tableQuery(CENTRAL_TABLE[dataset]));
            setDialog(null);
          }}
        />
        <ConfirmDialog
          open={dialog?.kind === "delete"}
          title={dialog?.kind === "delete" ? `Delete ${dialog.tab.name}?` : ""}
          onClose={() => setDialog(null)}
          actions={[{ label: "Delete", danger: true, onClick: () => { if (dialog?.kind === "delete") tabs.remove(dialog.tab.id); } }]}
        >
          <p>The query is deleted. This can&apos;t be undone.</p>
        </ConfirmDialog>
      </div>
    </Shell>
  );
}
