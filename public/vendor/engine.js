importScripts('sql-wasm.js','grading.js','plan-validation.js');
let SQL;
const ready=initSqlJs({locateFile:f=>f}).then(s=>{SQL=s;postMessage({ready:true})}).catch(()=>postMessage({error:'The SQL engine could not load. Refresh and try again.'}));
function rows(statement){const columns=statement.getColumnNames(),values=[];while(statement.step())if(columns.length)values.push(statement.get());return {columns,values};}
function query(db,code){
 const clean=code.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g,'').trim();
 if(!/^(SELECT|WITH|EXPLAIN)\b/i.test(clean))throw Error('Use a read-only SELECT, WITH, or EXPLAIN query, or open an Engineering Lab lesson for writes.');
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
function makeDB(data,changed=false){const db=new SQL.Database();db.exec(data.seed);if(changed&&data.mutation)db.exec(data.mutation);db.exec('PRAGMA foreign_keys=ON');if(!data.allowWrites)db.exec('PRAGMA query_only=ON');return db;}
function validate(db,checks=[]){for(const c of checks){if(c.mustFail||c.mustSucceed){db.exec('SAVEPOINT validation_probe');let failed=false;try{db.exec(c.sql)}catch(e){failed=true}finally{db.exec('ROLLBACK TO validation_probe; RELEASE validation_probe');}if(c.mustFail&&!failed)return 'The result matches, but a required constraint is missing: an invalid write succeeded.';if(c.mustSucceed&&failed)return 'The result matches, but a valid write was rejected by the database definition.';}else{let r;try{r=query(db,c.sql)}catch(e){return 'A required database object was not created correctly.'}if(r.values[0]?.[0]!==c.value)return 'The result matches, but the required object, column definition, or index is missing. Build the requested object, not only its output.';}}return null;}
onmessage = async ({ data }) => {
  await ready;
  const databases = [];
  const open = changed => { const db = makeDB(data, changed); databases.push(db); return db; };
  try {
    if (data.compare) {
      const outputs = data.compare.map(spec => {
        const db = makeDB({ ...data, allowWrites: true }); databases.push(db);
        return { label: spec.label, result: script(db, spec.query), plan: script(db, spec.plan) };
      });
      postMessage({ comparison: outputs, equivalent: compareResults(outputs[0].result, outputs[1].result).ok });
      return;
    }
    const code = data.query.trim();
    if (!code) throw Error('Write a query first, then run it.');
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
        const changed = open(true), changedOracle = open(true);
        let actual;
        try { actual = execute(changed, code); } catch { actual = null; }
        const target = execute(changedOracle, data.answer);
        grade = inspect(changed, changedOracle, actual, target, true);
      }
      if (data.planValidation) grade.checks = checks;
    }
    postMessage({ result: { columns: result.columns, values: result.values.slice(0, 200) }, total: result.values.length,
      grade, expected: expected ? { columns: expected.columns, values: expected.values.slice(0, 200) } : null });
  } catch (e) {
    let message = e.message;
    if (/no such column/i.test(message)) message += ' Check the schema and aliases.';
    if (/ambiguous column/i.test(message)) message += ' Qualify the column with its table alias.';
    postMessage(e.report ? { error: message, failure: e.report } : { error: message });
  } finally { databases.forEach(db => db.close()); }
};
