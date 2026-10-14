import type {ProjectDataset} from '@/content/python/projects-v2/model';

function csvRows(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
function display(value:unknown){return value===null?'null':typeof value==='object'?JSON.stringify(value):String(value);}
export function DataPreview({dataset}:{dataset:ProjectDataset}){
 let records:Record<string,unknown>[]|null=null;
 try{
  if(dataset.format.toLowerCase()==='json'){
   const parsed:unknown=JSON.parse(dataset.sample);
   if(Array.isArray(parsed)&&parsed.every(r=>r&&typeof r==='object'&&!Array.isArray(r)))records=parsed;
   else if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return <dl className="pv-config">{Object.entries(parsed).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{display(value)}</dd></div>)}</dl>;
  }else if(dataset.format.toLowerCase()==='csv'){
   const [headers,...rows]=csvRows(dataset.sample);records=rows.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??''])));
  }
 }catch{/* Malformed source lines must remain visible exactly as supplied. */}
 if(!records?.length)return <pre className="pv-data-raw">{dataset.sample}</pre>;
 const columns=[...new Set(records.flatMap(r=>Object.keys(r)))].sort();
 return <table className="pv-data-table"><thead><tr>{columns.map(c=><th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{records.map((row,i)=><tr key={i}>{columns.map(c=><td key={c} data-field={c}>{Object.hasOwn(row,c)?display(row[c]):<span className="pv-missing">missing</span>}</td>)}</tr>)}</tbody></table>;
}
