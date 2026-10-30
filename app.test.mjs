import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDish, normaliseConstraints } from '../src/constraints.mjs';
import { DISHES } from '../src/dishes.mjs';
import { planMeals, cuisinesFromText, scoreCuisines } from '../src/agent.mjs';
import { MockQlooClient } from '../src/mock-graph.mjs';
import { QlooClient, QlooError } from '../src/qloo.mjs';

const dish = (id) => DISHES.find((d) => d.id === id);

test('warfarin excludes high vitamin K dishes', () => {
  const c = normaliseConstraints({ meds: { warfarin: true } });
  assert.equal(checkDish(dish('palak-paneer'), c).ok, false);
  assert.equal(checkDish(dish('moong-khichdi'), c).ok, true);
});

test('very-soft excludes firm food, soft allows soft food', () => {
  const vs = normaliseConstraints({ chew: 'very-soft' });
  const soft = normaliseConstraints({ chew: 'soft' });
  assert.equal(checkDish(dish('medu-vada'), soft).ok, false);
  assert.equal(checkDish(dish('chicken-korma'), vs).ok, false);
  assert.equal(checkDish(dish('chicken-korma'), soft).ok, true);
});

test('low sodium, allergens, avoid words and low-heat delivery are enforced', () => {
  assert.equal(checkDish(dish('haleem'), normaliseConstraints({ lowSodium: true })).ok, false);
  assert.equal(checkDish(dish('curd-rice'), normaliseConstraints({ allergens: ['dairy'] })).ok, false);
  assert.equal(checkDish(dish('rasam-rice'), normaliseConstraints({ avoid: 'garlic' })).ok, false);
  assert.equal(checkDish(dish('mushroom-risotto'), normaliseConstraints({ lowHeatDelivery: true })).ok, false);
});

test('invalid chew level is rejected', () => {
  assert.throws(() => normaliseConstraints({ chew: 'liquid' }), /chew/);
});

test('generic "indian" splits by region hint', () => {
  const south = Object.fromEntries(cuisinesFromText('Indian Restaurant', 'Chennai'));
  assert.ok(south.south_indian > south.north_indian);
  const north = Object.fromEntries(cuisinesFromText('Indian Restaurant', 'Delhi-NCR'));
  assert.ok(north.south_indian < north.north_indian || north.south_indian === 0.4);
});

test('scoreCuisines ranks the stronger cuisine first', () => {
  const places = [
    { name: 'A', tags: ['South Indian'], affinity: 0.9 },
    { name: 'B', tags: ['Italian'], affinity: 0.3 },
  ];
  const out = scoreCuisines({ places, tags: [], regionHint: '' });
  assert.equal(out[0].id, 'south_indian');
  assert.equal(out[0].score, 1);
});

test('end to end (demo graph): taste drives cuisine, constraints are never violated', async () => {
  const client = new MockQlooClient();
  const profile = {
    favourites: ['Ilaiyaraaja', 'Thillana Mohanambal'],
    location: 'Chennai',
    constraints: { chew: 'very-soft', lowSodium: true, meds: { warfarin: true }, lowHeatDelivery: true },
  };
  const out = await planMeals(profile, { client });
  assert.equal(out.mode, 'demo');
  assert.equal(out.taste.cuisines[0].label, 'South Indian');
  assert.ok(out.meals.length >= 3);
  const c = normaliseConstraints(profile.constraints);
  for (const m of out.meals) assert.equal(checkDish(dish(m.id), c).ok, true, `${m.name} must be safe`);
  assert.ok(!out.meals.some((m) => m.id === 'keerai-masiyal'), 'vitamin K greens excluded for warfarin');
  assert.ok(out.excluded.some((e) => e.name.includes('Keerai')));
  assert.ok(out.qlooCalls.length >= 3);
});

test('different taste gives different meals (not generic)', async () => {
  const a = await planMeals({ favourites: ['Andrea Bocelli', 'Roman Holiday'] }, { client: new MockQlooClient() });
  const b = await planMeals({ favourites: ['Ilaiyaraaja'] }, { client: new MockQlooClient() });
  assert.equal(a.taste.cuisines[0].label, 'Italian');
  assert.notEqual(a.meals[0].id, b.meals[0].id);
});

test('unknown favourites produce a clear error, not made-up meals', async () => {
  await assert.rejects(planMeals({ favourites: ['zzzz nothing'] }, { client: new MockQlooClient() }), /could not match/i);
});

test('validation: needs at least one favourite', async () => {
  await assert.rejects(planMeals({ favourites: [] }, { client: new MockQlooClient() }), /at least one/i);
});

test('live client: GET, X-Api-Key header, hackathon host, key never serialised', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url: String(url), opts });
    return { ok: true, status: 200, json: async () => ({ results: [{ entity_id: 'E1', name: 'Test', types: ['urn:entity:artist'] }] }) };
  };
  const client = new QlooClient({ apiKey: 'secret-key', fetchImpl, cache: new Map() });
  const hits = await client.search('Test', 'artist');
  assert.equal(hits[0].id, 'E1');
  assert.equal(hits[0].type, 'artist');
  assert.equal(calls[0].opts.method, 'GET');
  assert.equal(calls[0].opts.headers['X-Api-Key'], 'secret-key');
  assert.ok(calls[0].url.startsWith('https://hackathon.api.qloo.com/search'));
  assert.ok(calls[0].url.includes('types=urn%3Aentity%3Aartist'));
  assert.ok(!JSON.stringify(client).includes('secret-key'));
  assert.ok(!JSON.stringify(client.trace).includes('secret-key'));
  await client.search('Test', 'artist');
  assert.equal(client.trace[1].cached, true);
});

test('live client: retries without optional param on HTTP 400, maps 401', async () => {
  let n = 0;
  const fetchImpl = async (url) => {
    n++;
    if (String(url).includes('feature.explainability')) return { ok: false, status: 400 };
    return { ok: true, status: 200, json: async () => ({ results: { entities: [{ entity_id: 'P1', name: 'Udupi Tiffin', tags: [{ name: 'South Indian' }], query: { affinity: 0.8 } }] } }) };
  };
  const client = new QlooClient({ apiKey: 'k', fetchImpl, cache: new Map() });
  const places = await client.placeInsights({ entityIds: ['E1'], location: 'Chennai' });
  assert.equal(n, 2);
  assert.equal(places[0].affinity, 0.8);
  assert.deepEqual(places[0].tags, ['South Indian']);

  const bad = new QlooClient({ apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 401 }), cache: new Map() });
  await assert.rejects(bad.search('x'), (e) => e instanceof QlooError && e.code === 'unauthorized');
});

test('live mode never silently falls back to demo data on Qloo failure', async () => {
  const bad = new QlooClient({ apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 500 }), cache: new Map() });
  await assert.rejects(planMeals({ favourites: ['Ilaiyaraaja'], location: 'Chennai' }, { client: bad }));
});
