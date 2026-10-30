import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../server.mjs';

let base;
before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('status reports demo mode without a key', async () => {
  const r = await (await fetch(base + '/api/status')).json();
  assert.equal(r.mode, process.env.QLOO_API_KEY ? 'live' : 'demo');
});

test('serves the UI with security headers', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.ok((await r.text()).includes('Nostalgia Table'));
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('blocks path traversal', async () => {
  const r = await fetch(base + '/..%2Fserver.mjs');
  assert.equal(r.status, 404);
});

test('POST /api/plan returns a plan, 400 on bad input', async () => {
  if (process.env.QLOO_API_KEY) return; // live key present: avoid spending quota in unit tests
  const ok = await post('/api/plan', { favourites: ['Ilaiyaraaja'], location: 'Chennai', constraints: { chew: 'soft' } });
  assert.equal(ok.status, 200);
  assert.ok((await ok.json()).meals.length > 0);
  const bad = await post('/api/plan', { favourites: [] });
  assert.equal(bad.status, 400);
});

test('MCP: initialize, tools/list, tools/call', async () => {
  const init = await (await post('/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })).json();
  assert.equal(init.result.serverInfo.name, 'nostalgia-table');
  const list = await (await post('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
  assert.equal(list.result.tools[0].name, 'plan_senior_meals');
  const note = await post('/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(note.status, 202);
  if (process.env.QLOO_API_KEY) return;
  const call = await (await post('/mcp', { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'plan_senior_meals', arguments: { favourites: ['Lata Mangeshkar'] } } })).json();
  assert.ok(JSON.parse(call.result.content[0].text).meals.length > 0);
});
