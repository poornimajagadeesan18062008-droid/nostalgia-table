// The Nostalgia Table agent: plan -> resolve -> discover -> constrain -> verify -> compose.
// Qloo decides WHAT this person is likely to love; the constraint engine decides what is SAFE.

import { CUISINES, DISHES } from './dishes.mjs';
import { checkDish, describeConstraints, normaliseConstraints, ValidationError } from './constraints.mjs';
import { QlooError } from './qloo.mjs';

const SIGNAL_TYPES = new Set(['artist', 'movie', 'tv_show', 'book', 'podcast', 'videogame']);
const SOUTH_HINT = /chennai|tamil|madurai|coimbatore|trichy|salem|kerala|kochi|bengaluru|bangalore|mysuru|andhra|vizag|hyderabad|telangana/i;
const MEALS = ['breakfast', 'lunch', 'dinner'];

export class NoTasteSignalError extends Error {
  constructor(message, unresolved) {
    super(message);
    this.name = 'NoTasteSignalError';
    this.unresolved = unresolved;
  }
}

export function normaliseProfile(input = {}) {
  const raw = Array.isArray(input.favourites) ? input.favourites : String(input.favourites ?? '').split(/[\n;]+/);
  const favourites = raw.map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
  if (favourites.length === 0) {
    throw new ValidationError('Add at least one favourite artist, film, show or book.');
  }
  if (favourites.some((f) => f.length > 80)) throw new ValidationError('Each favourite must be under 80 characters.');
  const location = String(input.location ?? '').trim().slice(0, 80);
  const name = String(input.name ?? '').trim().slice(0, 40);
  return { name, favourites, location, constraints: normaliseConstraints(input.constraints) };
}

function parseFavourite(text) {
  const m = text.match(/^(artist|movie|film|tv|show|book|podcast)\s*:\s*(.+)$/i);
  if (!m) return { query: text, type: null };
  const t = m[1].toLowerCase();
  const map = { artist: 'artist', movie: 'movie', film: 'movie', tv: 'tv_show', show: 'tv_show', book: 'book', podcast: 'podcast' };
  return { query: m[2].trim(), type: map[t] };
}

export function cuisinesFromText(text, regionHint = '') {
  const t = text.toLowerCase();
  const hits = [];
  for (const [id, c] of Object.entries(CUISINES)) {
    if (c.keywords.some((k) => t.includes(k))) hits.push([id, 1]);
  }
  if (hits.length === 0 && /\bindian\b/.test(t)) {
    const south = SOUTH_HINT.test(regionHint);
    hits.push(['south_indian', south ? 0.7 : 0.4], ['north_indian', south ? 0.3 : 0.6]);
  }
  return hits;
}

function fallbackAffinity(entity, index, total) {
  return entity.affinity ?? 0.2 + 0.8 * (1 - index / Math.max(total, 1));
}

export function scoreCuisines({ places, tags, regionHint }) {
  const totals = {};
  const add = (cuisine, w, evidence) => {
    const t = (totals[cuisine] ??= { sum: 0, evidence: [], support: 0 });
    t.sum += w;
    t.support += 1;
    if (evidence && t.evidence.length < 3 && !t.evidence.includes(evidence)) t.evidence.push(evidence);
  };
  places.forEach((p, i) => {
    const w = fallbackAffinity(p, i, places.length);
    const hits = cuisinesFromText(`${p.name} ${p.tags.join(' ')}`, regionHint);
    for (const [c, f] of hits) add(c, w * f, p.name);
  });
  tags.forEach((tg, i) => {
    const w = fallbackAffinity(tg, i, tags.length);
    for (const [c, f] of cuisinesFromText(tg.name, regionHint)) add(c, w * f, tg.name);
  });
  const max = Math.max(0, ...Object.values(totals).map((t) => t.sum));
  return Object.entries(totals)
    .map(([id, t]) => ({ id, label: CUISINES[id].label, score: max ? t.sum / max : 0, support: t.support, evidence: t.evidence }))
    .sort((a, b) => b.score - a.score);
}

export async function planMeals(rawProfile, { client }) {
  const steps = [];
  const log = (name, detail) => steps.push({ name, detail });
  const src = client.mock ? 'the DEMO taste graph (illustrative, not Qloo)' : "Qloo's taste graph";
  const srcName = client.mock ? 'The demo graph' : 'Qloo';

  // 1. PLAN
  const profile = normaliseProfile(rawProfile);
  const constraintList = describeConstraints(profile.constraints);
  log('plan', `Resolve ${profile.favourites.length} favourite(s) in ${src}, find the food tastes they imply, then keep only dishes that satisfy: ${constraintList.join(', ') || 'no special constraints'}.`);

  // 2. RESOLVE favourites to taste-graph entities
  const lookups = await Promise.all(
    profile.favourites.map(async (fav) => {
      const { query, type } = parseFavourite(fav);
      try {
        const hits = await client.search(query, type);
        const pick = hits.find((h) => h.id && SIGNAL_TYPES.has(h.type)) ?? hits.find((h) => h.id && !h.type);
        return pick ? { ok: true, input: fav, entity: pick } : { ok: false, input: fav };
      } catch (err) {
        if (err instanceof QlooError && ['unauthorized', 'missing_api_key'].includes(err.code)) throw err;
        return { ok: false, input: fav, error: err.message };
      }
    }),
  );
  const resolved = lookups.filter((l) => l.ok).map((l) => l.entity);
  const unresolved = lookups.filter((l) => !l.ok).map((l) => l.input);
  log('resolve', `Matched ${resolved.length} of ${profile.favourites.length} favourites${unresolved.length ? `; not found: ${unresolved.join(', ')}` : ''}.`);
  if (resolved.length === 0) {
    throw new NoTasteSignalError('Qloo could not match any of the favourites. Try the exact title or artist name.', unresolved);
  }
  const entityIds = resolved.map((r) => r.id);

  // 3. DISCOVER what people with this taste over-index on
  const [placesR, tagsR] = await Promise.allSettled([
    profile.location ? client.placeInsights({ entityIds, location: profile.location }) : Promise.resolve([]),
    client.tagInsights({ entityIds }),
  ]);
  const places = placesR.status === 'fulfilled' ? placesR.value : [];
  const tags = tagsR.status === 'fulfilled' ? tagsR.value : [];
  const failures = [placesR, tagsR].filter((r) => r.status === 'rejected');
  if (places.length === 0 && tags.length === 0) {
    if (failures.length) throw failures[0].reason;
    throw new NoTasteSignalError('Qloo returned no taste signals for these favourites. Try adding more, or a nearby city.', unresolved);
  }
  const cuisines = scoreCuisines({ places, tags, regionHint: profile.location });
  if (cuisines.length === 0) {
    throw new NoTasteSignalError('Qloo returned taste signals, but none mapped to a cuisine we can cook for. Try adding a location or more favourites.', unresolved);
  }
  log('discover', `${srcName} points to: ${cuisines.slice(0, 3).map((c) => `${c.label} (${Math.round(c.score * 100)}%)`).join(', ')}.`);

  // 4. CONSTRAIN (hard rules) with a widening loop on taste only, never on safety
  const eligible = [];
  const excluded = [];
  const consider = (cuisine) => {
    for (const dish of DISHES.filter((d) => d.cuisine === cuisine.id)) {
      const res = checkDish(dish, profile.constraints);
      if (res.ok) eligible.push({ dish, cuisine, cautions: res.cautions });
      else excluded.push({ dish, cuisine, reasons: res.reasons });
    }
  };
  const primary = cuisines.filter((c) => c.score >= 0.25);
  const rest = cuisines.filter((c) => c.score < 0.25);
  (primary.length ? primary : cuisines.slice(0, 2)).forEach(consider);
  let widened = false;
  for (const c of rest) {
    if (eligible.length >= 5) break;
    consider(c);
    widened = true;
  }
  log('constrain', `${eligible.length} dishes pass every constraint; ${excluded.length} excluded${widened ? ' (widened to lower-affinity cuisines to find enough safe options)' : ''}.`);

  // 5. VERIFY: independent re-check of everything we are about to show
  const verified = eligible.filter((e) => checkDish(e.dish, profile.constraints).ok);
  if (verified.length !== eligible.length) log('verify', `Removed ${eligible.length - verified.length} dish(es) that failed the final safety re-check.`);
  else log('verify', `Re-checked all ${verified.length} suggestions against the constraints: all pass.`);

  // 6. COMPOSE
  const names = resolved.slice(0, 3).map((r) => r.name);
  const ranked = verified
    .map((e) => ({ ...e, score: e.cuisine.score + (4 - e.dish.chew) * 0.005 }))
    .sort((a, b) => b.score - a.score);

  const toMeal = (e) => ({
    id: e.dish.id,
    name: e.dish.name,
    cuisine: e.cuisine.label,
    meals: e.dish.meals,
    texture: e.dish.chew === 1 ? 'very soft' : e.dish.chew === 2 ? 'soft' : 'regular',
    sodium: e.dish.sodium,
    sugar: e.dish.sugar,
    allergens: e.dish.allergens,
    tasteMatch: Math.round(e.cuisine.score * 100),
    why: `People who love ${names.join(', ')}${resolved.length > 3 ? ' and more' : ''} over-index on ${e.cuisine.label} food in ${src}${e.cuisine.evidence.length ? ` (for example ${e.cuisine.evidence.join(', ')})` : ''}.`,
    tip: e.dish.tip,
    cautions: e.cautions,
  });

  const meals = ranked.slice(0, 8).map(toMeal);
  const used = new Set();
  const dayPlan = {};
  for (const m of MEALS) {
    const pick = ranked.find((e) => e.dish.meals.includes(m) && !used.has(e.dish.id));
    if (pick) {
      used.add(pick.dish.id);
      dayPlan[m] = toMeal(pick);
    }
  }

  const excludedOut = excluded
    .map((e) => ({ name: e.dish.name, cuisine: e.cuisine.label, reasons: e.reasons, tasteMatch: Math.round(e.cuisine.score * 100) }))
    .sort((a, b) => b.tasteMatch - a.tasteMatch)
    .slice(0, 8);

  const notes = [];
  if (meals.length < 3) notes.push('Very few dishes passed every constraint. A dietitian can widen this safely.');
  if (unresolved.length) notes.push(`Not found in Qloo: ${unresolved.join(', ')}.`);
  if (!profile.location) notes.push('Add a city to also see nearby restaurants that match their taste.');

  return {
    mode: client.mock ? 'demo' : 'live',
    profile: { name: profile.name, location: profile.location, constraints: constraintList },
    taste: {
      resolved: resolved.map((r) => ({ name: r.name, type: r.type })),
      unresolved,
      cuisines: cuisines.slice(0, 5).map((c) => ({ label: c.label, score: Math.round(c.score * 100), evidence: c.evidence })),
    },
    meals,
    dayPlan,
    excluded: excludedOut,
    places: places.slice(0, 6).map((p) => ({ name: p.name, address: p.address, tags: p.tags.slice(0, 4), affinity: p.affinity })),
    steps,
    qlooCalls: client.trace,
    notes,
    disclaimer:
      'Educational suggestions only, not medical or dietetic advice. Confirm medicine and diet rules with the person\'s doctor or dietitian.',
  };
}
