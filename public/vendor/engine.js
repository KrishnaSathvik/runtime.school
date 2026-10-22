importScripts('sql-wasm.js','grading.js','plan-validation.js');
let SQL;
const ready=initSqlJs({locateFile:f=>f}).then(s=>{SQL=s;postMessage({ready:true})}).catch(()=>postMessage({error:'The SQL engine could not load. Refresh and try again.'}));

/* Canonical datasets. A seed may start with "-- runtime:database <url> <sha256>": the worker loads that
 * SQLite file once (gzip, verified by hash), then applies the rest of the seed as a small overlay. */
const DIRECTIVE=/^-- runtime:database (\S+) ([0-9a-f]{64})[^\n]*(?:\n|$)/;
function splitSeed(seed){const m=DIRECTIVE.exec(seed||'');return m?{url:m[1],sha:m[2],overlay:seed.slice(m[0].length)}:{url:null,sha:null,overlay:seed||''};}
const files=new Map();// url -> Promise<Uint8Array>, most recent last
async function readFile(url,sha){
 const response=await fetch(url);
 if(!response.ok)throw Error('The dataset could not load. Check your connection and press Run again.');
 let bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes[0]===0x1f&&bytes[1]===0x8b){
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 }
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==sha)throw Error('The dataset download was incomplete or outdated. Refresh the page and run again.');
 return bytes;
}
function loadFile(url,sha){
 let p=files.get(url);
 if(p){files.delete(url);files.set(url,p);return p;}
 p=readFile(url,sha);files.set(url,p);p.catch(()=>files.delete(url));
 while(files.size>3)files.delete(files.keys().next().value);
 return p;
}
/* One live read-only connection per dataset + overlay. Learner queries cannot write (query_only, single
 * read statement), so Run and Check reuse it; changed-data checks happen inside a savepoint. */
const live=new Map();
/* sql.js keeps the array it is given as the database file and writes into it, so every connection gets
 * its own copy: a write, an overlay or a CREATE INDEX must never change the cached download. */
const openFile=bytes=>bytes?new SQL.Database(new Uint8Array(bytes)):new SQL.Database();
function liveDB(key,bytes,overlay){
 let entry=live.get(key);
 if(entry){live.delete(key);live.set(key,entry);return entry.db;}
 const db=openFile(bytes);
 try{if(overlay.trim())db.exec(overlay);db.exec('PRAGMA foreign_keys=ON; PRAGMA query_only=ON');}catch(e){db.close();throw e;}
 entry={db,changes:db.exec('SELECT total_changes()')[0].values[0][0]};live.set(key,entry);
 while(live.size>2){const [k,v]=live.entries().next().value;v.db.close();live.delete(k);}
 return db;
}
function dropLive(key){const entry=live.get(key);if(entry){entry.db.close();live.delete(key);}}

function rows(statement){const columns=statement.getColumnNames(),values=[];while(statement.step())if(columns.length)values.push(statement.get());return {columns,values};}
function query(db,code){
 const clean=code.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g,'').trim();
 if(/^(INSERT|REPLACE|UPDATE|DELETE|CREATE|DROP|ALTER|ATTACH|DETACH|REINDEX|VACUUM|BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE|ANALYZE|PRAGMA)\b/i.test(clean))throw Error('Use a read-only SELECT, WITH, or EXPLAIN query here. To change data, use Database Lab.');
 let count=0;for(const statement of db.iterateStatements(code)){count++;statement.free();}if(count!==1)throw Error('Run one SQL statement at a time outside the disposable lab.');
 const statement=db.prepare(code);try{const r=rows(statement);if(!r.columns.length)throw Error('The query must return one table.');return r;}finally{statement.free()}
}
const stripSQL=t=>t.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g,'').trim();
function script(db,code,explain=false,capture=null){let result=null,count=0,lastSQL='',done=0,tx=false;
 // Preparation and execution are interleaved: later statements can use newly created objects.
 const iterator=db.iterateStatements(code);
 try{for(const statement of iterator){count++;if(count>60)throw Error('Limit lab scripts to 60 statements.');lastSQL=statement.getSQL();let r;try{r=rows(statement)}catch(e){e.stepFailed=true;throw e}finally{statement.free()}if(r.columns.length)result=r;done++;
  const head=stripSQL(lastSQL).toUpperCase();if(/^(BEGIN|SAVEPOINT)\b/.test(head))tx=true;else if(/^(COMMIT|END)\b/.test(head)||/^ROLLBACK\b(?!\s+(TRANSACTION\s+)?TO\b)/.test(head))tx=false;}}
 catch(e){
  // Report what actually ran: earlier statements are not undone unless a transaction was still open.
  let failed=e.stepFailed?lastSQL:'',rest='';try{rest=iterator.getRemainingSQL()||''}catch{}
  if(!e.stepFailed){const i=rest.indexOf(';');failed=i<0?rest:rest.slice(0,i+1);rest=i<0?'':rest.slice(i+1);}
  if(/\bOR\s+ROLLBACK\b/i.test(failed))tx=false;
  e.failure={statement:done+1,sql:stripSQL(failed).slice(0,300),completed:done,later:!!stripSQL(rest),openTransaction:tx};throw e;}
 if(capture)capture(lastSQL);
 if(!result)throw Error('End your lab script with a SELECT or EXPLAIN query so the result can be inspected.');
 if(explain){const final=lastSQL.trim();if(/^EXPLAIN\s+QUERY\s+PLAN\b/i.test(final))result=query(db,final);else{if(!/^(SELECT|WITH)\b/i.test(final))throw Error('For a query plan, end the lab script with SELECT, WITH, or EXPLAIN QUERY PLAN.');result=query(db,'EXPLAIN QUERY PLAN '+final);}}
 return result;
}
function makeDB(data,changed,bytes,overlay){const db=openFile(bytes);db.exec(overlay);if(changed&&data.mutation)db.exec(data.mutation);db.exec('PRAGMA foreign_keys=ON');if(!data.allowWrites)db.exec('PRAGMA query_only=ON');return db;}
function validate(db,checks=[]){for(const c of checks){if(c.mustFail||c.mustSucceed){db.exec('SAVEPOINT validation_probe');let failed=false;try{db.exec(c.sql)}catch(e){failed=true}finally{db.exec('ROLLBACK TO validation_probe; RELEASE validation_probe');}if(c.mustFail&&!failed)return 'The result matches, but a required constraint is missing: an invalid write succeeded.';if(c.mustSucceed&&failed)return 'The result matches, but a valid write was rejected by the database definition.';}else{let r;try{r=query(db,c.sql)}catch(e){return 'A required database object was not created correctly.'}if(r.values[0]?.[0]!==c.value)return 'The result matches, but the required object, column definition, or index is missing. Build the requested object, not only its output.';}}return null;}
/* Applies the changed-data fixture to a live connection for the duration of fn, then restores it. */
function withMutation(db,mutation,fn){
 db.exec('PRAGMA query_only=OFF; PRAGMA foreign_keys=OFF; SAVEPOINT runtime_changed;');
 try{db.exec(mutation);db.exec('PRAGMA query_only=ON');return fn();}
 finally{db.exec('PRAGMA query_only=OFF; ROLLBACK TO runtime_changed; RELEASE runtime_changed; PRAGMA foreign_keys=ON; PRAGMA query_only=ON;');}
}
onmessage = async ({ data }) => {
  await ready;
  const databases = [];
  const { url, sha, overlay } = splitSeed(data.seed);
  let bytes = null, liveKey = null;
  try {
    if (url) {
      bytes = await loadFile(url, sha);
      postMessage({ phase: 'database-ready' });
    }
    const open = changed => { const db = makeDB(data, changed, bytes, overlay); databases.push(db); return db; };
    if (data.compare) {
      const outputs = data.compare.map(spec => {
        const db = makeDB({ ...data, allowWrites: true }, false, bytes, overlay); databases.push(db);
        const out = { label: spec.label, result: script(db, spec.query), plan: script(db, spec.plan) };
        // Free each copy before the next: two full datasets need not be in memory at once.
        db.close(); databases.splice(databases.indexOf(db), 1);
        return out;
      });
      const equivalent = compareResults(outputs[0].result, outputs[1].result).ok;
      postMessage({ comparison: outputs.map(o => ({ ...o, total: o.result.values.length, result: { columns: o.result.columns, values: o.result.values.slice(0, 200) } })), equivalent });
      return;
    }
    const code = data.query.trim();
    if (!code) throw Error('Write a query first, then run it.');
    // Read-only tasks on a canonical dataset share one live connection; everything else gets disposable copies.
    const shared = bytes && !data.allowWrites && !data.validate && !data.planValidation && !data.stateQueries?.length;
    if (shared) {
      liveKey = url + '\n' + overlay;
      const db = liveDB(liveKey, bytes, overlay);
      db.exec('PRAGMA query_only=ON');
      const run = sql => query(db, data.explain ? 'EXPLAIN QUERY PLAN ' + sql : sql);
      const result = run(code);
      let grade = null, expected = null;
      if (data.answer && !data.explain) {
        expected = query(db, data.answer);
        grade = compareResults(result, expected, data.ordered);
        if (grade.ok && data.required) {
          const clean = code.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').replace(/'(?:''|[^'])*'/g, '');
          const missing = data.required.find(term => !new RegExp('\\b' + term.replace(/ /g, '\\s+') + '\\b', 'i').test(clean));
          if (missing) grade = { ok: false, message: 'The result matches, but this exercise requires you to use ' + missing + ' in the actual script.' };
        }
        if (grade.ok) grade = { ok: true, message: 'Exactly right. Your query returns the requested result.' };
        if (grade.ok && data.mutation) {
          grade = withMutation(db, data.mutation, () => {
            let actual; try { actual = query(db, code); } catch { actual = null; }
            const target = query(db, data.answer);
            const outcome = compareResults(actual, target, data.ordered);
            return outcome.ok ? { ok: true, message: 'Exactly right. Your query returns the requested result.' }
              : { ok: false, variationFailed: true, message: 'Your visible result matches, but the changed-data check failed. Derive the answer from the tables instead of hardcoding sample output.' };
          });
        }
      }
      const entry = live.get(liveKey);
      if (entry && db.exec('SELECT total_changes()')[0].values[0][0] !== entry.changes) dropLive(liveKey); // defensive: never reuse a modified connection
      postMessage({ result: { columns: result.columns, values: result.values.slice(0, 200) }, total: result.values.length, expectedTotal: expected ? expected.values.length : null,
        grade, expected: expected ? { columns: expected.columns, values: expected.values.slice(0, 200) } : null });
      return;
    }
    const lastQueries = new Map();
    const execute = (db, sql, plan = false) => {
      lastQueries.set(db, sql);
      return data.allowWrites
        ? script(db, sql, plan, last => lastQueries.set(db, last))
        : query(db, plan ? 'EXPLAIN QUERY PLAN ' + sql : sql);
    };
    const db = open(false);
    let result;
    try { result = execute(db, code, data.explain); }
    catch (e) { if (data.allowWrites && e.failure) e.report = e.failure; throw e; }
    let grade = null, expected = null;
    const checks = [];
    const compareState = (actualDb, oracleDb) => {
      for (const sql of data.stateQueries ?? []) {
        try { if (!compareResults(query(actualDb, sql), query(oracleDb, sql), false).ok) return false; }
        catch { return false; }
      }
      return true;
    };
    const inspect = (actualDb, oracleDb, actual, target, changed) => {
      const fixture = changed ? 'changed' : 'original';
      let outcome = compareResults(actual, target, data.ordered);
      if (data.planValidation) checks.push({ label: 'Query output', ok: outcome.ok, fixture,
        detail: outcome.ok ? 'All requested columns and rows match.' : outcome.message });
      if (!outcome.ok) return changed ? { ok: false, variationFailed: true,
        message: 'Your visible result matches, but the changed-data check failed. Derive the answer from the tables instead of hardcoding sample output.' } : outcome;
      if (data.required) {
        const clean = code.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').replace(/'(?:''|[^'])*'/g, '');
        const missing = data.required.find(term => !new RegExp('\\b' + term.replace(/ /g, '\\s+') + '\\b', 'i').test(clean));
        if (missing) return { ok: false, message: 'The result matches, but this exercise requires you to use ' + missing + ' in the actual script.' };
      }
      if (data.planValidation) {
        const issue = validatePlan(actualDb, lastQueries.get(actualDb), data.planValidation, checks, fixture);
        if (issue) return { ...issue, ...(changed ? { variationFailed: true } : {}) };
      }
      if (data.validate) {
        const issue = validate(actualDb, data.validate);
        if (issue) return { ok: false, message: issue, ...(changed ? { variationFailed: true } : {}) };
      }
      if (!compareState(actualDb, oracleDb)) return { ok: false, message: 'The output matches, but the required database state does not. Check all affected tables and preserve the source data.', variationFailed: changed };
      if (data.repeatCheck) {
        let repeated;
        try { repeated = execute(actualDb, code); }
        catch { return { ok: false, message: 'The first run worked, but repeating the load on the same database failed. Make the script safe to rerun.', variationFailed: changed }; }
        const repeatedTarget = execute(oracleDb, data.answer);
        outcome = compareResults(repeated, repeatedTarget, data.ordered);
        const issue = outcome.ok && data.validate ? validate(actualDb, data.validate) : null;
        if (!outcome.ok || issue || !compareState(actualDb, oracleDb)) return { ok: false, message: 'Repeated execution changed the required state or output. The load must be idempotent.', variationFailed: changed };
      }
      return { ok: true, message: 'Exactly right. Your query returns the requested result.' };
    };
    if (data.answer && !data.explain) {
      const oracle = open(false);
      expected = execute(oracle, data.answer);
      grade = inspect(db, oracle, result, expected, false);
      if (grade.ok && data.mutation) {
        // Free the original copies first: large datasets need not hold four databases at once.
        for (const d of databases.splice(0)) d.close();
        const changed = open(true), changedOracle = open(true);
        let actual;
        try { actual = execute(changed, code); } catch { actual = null; }
        const target = execute(changedOracle, data.answer);
        grade = inspect(changed, changedOracle, actual, target, true);
      }
      if (data.planValidation) grade.checks = checks;
    }
    postMessage({ result: { columns: result.columns, values: result.values.slice(0, 200) }, total: result.values.length, expectedTotal: expected ? expected.values.length : null,
      grade, expected: expected ? { columns: expected.columns, values: expected.values.slice(0, 200) } : null });
  } catch (e) {
    if (liveKey) { const entry = live.get(liveKey); if (entry) { try { entry.db.exec('PRAGMA query_only=ON'); } catch { dropLive(liveKey); } } }
    let message = e.message;
    if (/no such column/i.test(message)) message += ' Check the schema and aliases.';
    if (/ambiguous column/i.test(message)) message += ' Qualify the column with its table alias.';
    postMessage(e.report ? { error: message, failure: e.report } : { error: message });
  } finally { databases.forEach(db => { try { db.close(); } catch { /* already closed */ } }); }
};
