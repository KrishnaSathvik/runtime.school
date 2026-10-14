import { describe, expect, it } from 'vitest';
import { filePreview } from '@/features/py/file-preview';
describe('read-only fixture previews',()=>{
 it('preserves CSV quoted commas, quotes, CRLF and multiline fields',()=>{
  expect(filePreview('orders.csv','name,note\r\n"A, B","said ""hello"""\r\nC,"two\nlines"\r\n')).toEqual({columns:['name','note'],rows:[['A, B','said "hello"'],['C','two\nlines']]});
 });
 it('shows heterogeneous JSON records without discarding columns',()=>{
  expect(filePreview('data.json','[{"a":1},{"b":2}]')).toEqual({columns:['a','b'],rows:[[1,null],[null,2]]});
 });
 it('falls back to source text for malformed or non-tabular fixtures',()=>{
  for(const [name,text] of [['a.json','{'],['a.json','[1,2]'],['a.txt','hello'],['a.csv','a\n"unfinished']])expect(filePreview(name,text)).toBeNull();
 });
});
