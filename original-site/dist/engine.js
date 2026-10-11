importScripts('vendor/sql-wasm.js','grading.js');
let SQL;
const ready=initSqlJs({locateFile:f=>'vendor/'+f}).then(s=>{SQL=s;postMessage({ready:true})}).catch(()=>postMessage({error:'The SQL engine could not load. Refresh and try again.'}));
function rows(statement){const columns=statement.getColumnNames(),values=[];while(statement.step())if(columns.length)values.push(statement.get());return {columns,values};}
function query(db,code){
 const clean=code.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g,'').trim();
 if(!/^(SELECT|WITH|EXPLAIN)\b/i.test(clean))throw Error('Use a read-only SELECT, WITH, or EXPLAIN query, or open an Engineering Lab lesson for writes.');
 let count=0;for(const statement of db.iterateStatements(code)){count++;statement.free();}if(count!==1)throw Error('Run one SQL statement at a time outside the disposable lab.');
 const statement=db.prepare(code);try{const r=rows(statement);if(!r.columns.length)throw Error('The query must return one table.');return r;}finally{statement.free()}
}
function script(db,code,explain=false){let result=null,count=0,lastSQL='';
 // Preparation and execution are interleaved: later statements can use newly created objects.
 const iterator=db.iterateStatements(code);
 for(const statement of iterator){count++;if(count>60)throw Error('Limit lab scripts to 60 statements.');lastSQL=statement.getSQL();const r=rows(statement);if(r.columns.length)result=r;statement.free();}
 if(!result)throw Error('End your lab script with a SELECT or EXPLAIN query so the result can be inspected.');
 if(explain){const final=lastSQL.trim();if(/^EXPLAIN\s+QUERY\s+PLAN\b/i.test(final))result=query(db,final);else{if(!/^(SELECT|WITH)\b/i.test(final))throw Error('For a query plan, end the lab script with SELECT, WITH, or EXPLAIN QUERY PLAN.');result=query(db,'EXPLAIN QUERY PLAN '+final);}}
 return result;
}
function makeDB(data,changed=false){const db=new SQL.Database();db.exec(data.seed);if(changed&&data.mutation)db.exec(data.mutation);db.exec('PRAGMA foreign_keys=ON');if(!data.allowWrites)db.exec('PRAGMA query_only=ON');return db;}
function validate(db,checks=[]){for(const c of checks){if(c.mustFail){db.exec('SAVEPOINT validation_probe');let failed=false;try{db.exec(c.sql)}catch(e){failed=true}finally{db.exec('ROLLBACK TO validation_probe; RELEASE validation_probe');}if(!failed)return 'The result matches, but a required constraint is missing: an invalid write succeeded.';}else{let r;try{r=query(db,c.sql)}catch(e){return 'A required database object was not created correctly.'}if(r.values[0]?.[0]!==c.value)return 'The result matches, but the required object, column definition, or index is missing. Build the requested object, not only its output.';}}return null;}
onmessage=async({data})=>{await ready;const databases=[];try{
 if(data.compare){const outputs=data.compare.map(spec=>{const d=makeDB({...data,allowWrites:true});databases.push(d);const output=script(d,spec.query);const plan=script(d,spec.plan);return {label:spec.label,result:output,plan};});postMessage({comparison:outputs,equivalent:compareResults(outputs[0].result,outputs[1].result).ok});return;}
 const db=makeDB(data);databases.push(db);const code=data.query.trim();if(!code)throw Error('Write a query first, then run it.');const execute=(database,sql,plan=false)=>data.allowWrites?script(database,sql,plan):query(database,plan?'EXPLAIN QUERY PLAN '+sql:sql);
 const result=execute(db,code,data.explain);let grade=null,expected=null;
 if(data.answer&&!data.explain){const oracle=makeDB(data);databases.push(oracle);expected=execute(oracle,data.answer);grade=compareResults(result,expected,data.ordered);if(grade.ok&&data.required){const clean=code.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g,'').replace(/'(?:''|[^'])*'/g,'');const missing=data.required.find(term=>!new RegExp('\\b'+term.replace(/ /g,'\\s+')+'\\b','i').test(clean));if(missing)grade={ok:false,message:'The result matches, but this exercise requires you to use '+missing+' in the actual script.'};}
 if(grade.ok&&data.validate){const issue=validate(db,data.validate);if(issue)grade={ok:false,message:issue};}
 if(grade.ok&&data.mutation){const changed=makeDB(data,true),changedOracle=makeDB(data,true);databases.push(changed,changedOracle);let actual;try{actual=execute(changed,code)}catch(e){actual=null}const variation=compareResults(actual,execute(changedOracle,data.answer),data.ordered);if(!variation.ok)grade={ok:false,message:'Your visible result matches, but the changed-data check failed. Derive the answer from the tables instead of hardcoding sample output.',variationFailed:true};else if(data.validate){const issue=validate(changed,data.validate);if(issue)grade={ok:false,message:issue,variationFailed:true};}}
 }
 postMessage({result:{columns:result.columns,values:result.values.slice(0,200)},total:result.values.length,grade,expected:expected?{columns:expected.columns,values:expected.values.slice(0,200)}:null});
 }catch(e){let message=e.message;if(/no such column/i.test(message))message+=' Check the schema and aliases.';if(/ambiguous column/i.test(message))message+=' Qualify the column with its table alias.';postMessage({error:message})}finally{databases.forEach(db=>db.close())}};
