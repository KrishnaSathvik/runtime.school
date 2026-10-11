function compareResults(actual,expected,ordered=false){
 if(!actual) return {ok:false,message:'Your query returned no table. Return the requested columns with SELECT.'};
 if(actual.columns.length!==expected.columns.length)return {ok:false,message:`Expected ${expected.columns.length} columns; your query returned ${actual.columns.length}. Select only the requested columns.`};
 if(actual.columns.some((c,i)=>c.toLowerCase()!==expected.columns[i].toLowerCase()))return {ok:false,message:`Check the column names and order. Expected: ${expected.columns.join(', ')}. Use AS for the requested aliases.`};
 if(actual.values.length!==expected.values.length)return {ok:false,message:`Expected ${expected.values.length} rows; got ${actual.values.length}. Check your filters, joins, grouping, and duplicate rows.`};
 const key=r=>JSON.stringify(r);
 const a=ordered?actual.values:[...actual.values].sort((a,b)=>key(a).localeCompare(key(b)));
 const e=ordered?expected.values:[...expected.values].sort((a,b)=>key(a).localeCompare(key(b)));
 const same=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)):a===b;
 if(a.some((r,i)=>r.some((v,j)=>!same(v,e[i][j]))))return {ok:false,message:ordered?'The rows or their order differ. Check ORDER BY and the direction of sorting.':'The row count is right, but some values differ. Check the calculation, matching keys, or window definition.'};
 return {ok:true,message:'Exactly right. Your query returns the requested result.'};
}
if(typeof module!=='undefined')module.exports={compareResults};
