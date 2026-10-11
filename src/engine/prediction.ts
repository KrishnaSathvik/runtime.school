import type { SqlResult } from './grading';
export type Cell = string | number | null;
export type PredictionGrade = { ok:boolean; message:string };
/** JSON preserves numbers, text, empty strings and NULL without guessing. */
export function parsePrediction(text:string, columns:number):Cell[][] {
  let rows:unknown;
  try { rows=JSON.parse(text); } catch { throw new Error('Enter a JSON array of rows, such as [[1, "text", null]]. Use [] for no rows.'); }
  if (!Array.isArray(rows) || rows.length>200) throw new Error('Wrap your rows in square brackets and enter no more than 200 rows.');
  for (const row of rows) {
    if (!Array.isArray(row) || row.length!==columns) throw new Error(`Each row needs exactly ${columns} values, in the displayed column order.`);
    if (row.some(v=>v!==null && typeof v!=='string' && (typeof v!=='number' || !Number.isFinite(v)))) throw new Error('Use numbers, text in double quotes, or null. Do not use true, false, or extra brackets around a value.');
  }
  return rows as Cell[][];
}
export function gradePrediction(rows:Cell[][], columns:string[], expected:SqlResult, ordered:boolean):PredictionGrade {
  if (JSON.stringify(columns)!==JSON.stringify(expected.columns)) return {ok:false,message:'This exercise could not be checked because its column names do not match the query. This is a problem with the exercise, not your answer.'};
  if (rows.length!==expected.values.length) return {ok:false,message:`You predicted ${rows.length} rows; the query returns ${expected.values.length}. Recheck unmatched rows, filters and duplicate matches.`};
  const a=rows.map(r=>JSON.stringify(r)), b=expected.values.map(r=>JSON.stringify(r));
  if (!ordered) {a.sort();b.sort();}
  const diff=a.findIndex((r,i)=>r!==b[i]);
  if (diff<0) return {ok:true,message:'Correct prediction. Your rows match the query’s result, including NULLs, repeated rows, and any required order.'};
  return {ok:false,message:ordered ? `Row ${diff+1} differs. Check its values and types, then the ORDER BY. NULL, 0 and "0" are different.` : 'The row values or duplicate counts differ. Order is ignored here; NULL, numbers and text still need to match.'};
}
