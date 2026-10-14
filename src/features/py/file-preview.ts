/** Small read-only preview of curriculum fixtures for the data cards. */
export function filePreview(name: string, text: string): { columns:string[]; rows:unknown[][] } | null {
  if (name.endsWith('.json')) {
    try {
      const value:unknown = JSON.parse(text);
      const records = Array.isArray(value) ? value : [value];
      if (!records.length || !records.every(r => r && typeof r === 'object' && !Array.isArray(r))) return null;
      const columns = [...new Set(records.flatMap(r => Object.keys(r)))];
      return {columns,rows:records.map(r => columns.map(c => (r as Record<string,unknown>)[c] ?? null))};
    } catch {return null;}
  }
  if (!name.endsWith('.csv')) return null;
  const rows:string[][]=[];
  let row:string[]=[], field='', quoted=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (c==='"') {
      if (quoted && text[i+1]==='"') {field+='"';i++;} else quoted=!quoted;
    } else if(c===','&&!quoted){row.push(field);field='';}
    else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)return null;
  if(field || row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  const columns=rows.shift();
  return columns?.length ? {columns,rows} : null;
}
