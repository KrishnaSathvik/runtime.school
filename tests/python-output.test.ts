import { expect, it } from 'vitest';
import { appendChunk } from '@/features/py/Output';
it('keeps consecutive tables and figures separate while joining text chunks', () => {
  const table = {stream:'table' as const,text:'{"columns":["a"],"rows":[["1"]]}'};
  expect(appendChunk([table],table)).toEqual([table,table]);
  const figure = {stream:'figure' as const,text:'data:image/png;base64,abc'};
  expect(appendChunk([figure],figure)).toHaveLength(2);
  expect(appendChunk([{stream:'stdout',text:'a'}],{stream:'stdout',text:'b'})).toEqual([{stream:'stdout',text:'ab'}]);
});

it('renders the worker table index separately from data columns', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { Stream } = await import('@/features/py/Output');
  const text = JSON.stringify({columns:['item','qty'],dtypes:['str','int64'],rows:[['0','Lamp','2']],shape:[1,2],index:'order',series:false});
  const html = renderToStaticMarkup(createElement(Stream,{chunks:[{stream:'table',text},{stream:'table',text}]}));
  expect(html).toContain('<th scope="col">order</th>');
  expect(html).toContain('<th scope="row">0</th><td>Lamp</td><td>2</td>');
  expect(html).toContain('aria-label="Data table 1"');
  expect(html).toContain('aria-label="Data table 2"');
});
