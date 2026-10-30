// DEMO MODE ONLY. Hand-authored, illustrative data so the app runs before a Qloo key is
// available. This is NOT Qloo data and the UI labels it clearly. Live mode never uses it.

import { CUISINES } from './dishes.mjs';

const E = (id, name, type, cuisines) => ({ id: `mock-${id}`, name, type, cuisines });

export const MOCK_ENTITIES = [
  E('ilaiyaraaja', 'Ilaiyaraaja', 'artist', { south_indian: 0.92, north_indian: 0.2 }),
  E('msv', 'M. S. Viswanathan', 'artist', { south_indian: 0.9 }),
  E('tmohanambal', 'Thillana Mohanambal', 'movie', { south_indian: 0.88 }),
  E('nayakan', 'Nayakan', 'movie', { south_indian: 0.8, north_indian: 0.25 }),
  E('lata', 'Lata Mangeshkar', 'artist', { north_indian: 0.8, mughlai: 0.55 }),
  E('kishore', 'Kishore Kumar', 'artist', { north_indian: 0.85, mughlai: 0.5 }),
  E('rafi', 'Mohammed Rafi', 'artist', { north_indian: 0.8, mughlai: 0.65 }),
  E('sholay', 'Sholay', 'movie', { north_indian: 0.8, mughlai: 0.4 }),
  E('pather', 'Pather Panchali', 'movie', { bengali: 0.9 }),
  E('hemanta', 'Hemanta Mukherjee', 'artist', { bengali: 0.88 }),
  E('sinatra', 'Frank Sinatra', 'artist', { western_comfort: 0.8, italian: 0.7 }),
  E('elvis', 'Elvis Presley', 'artist', { western_comfort: 0.85 }),
  E('beatles', 'The Beatles', 'artist', { western_comfort: 0.7, italian: 0.3 }),
  E('romanholiday', 'Roman Holiday', 'movie', { italian: 0.85 }),
  E('bocelli', 'Andrea Bocelli', 'artist', { italian: 0.9 }),
  E('teresateng', 'Teresa Teng', 'artist', { chinese: 0.9, japanese: 0.4 }),
  E('moodforlove', 'In the Mood for Love', 'movie', { chinese: 0.8, japanese: 0.3 }),
  E('spiritedaway', 'Spirited Away', 'movie', { japanese: 0.85 }),
  E('fairuz', 'Fairuz', 'artist', { mediterranean: 0.9 }),
  E('umm', 'Umm Kulthum', 'artist', { mediterranean: 0.85, mughlai: 0.3 }),
];

export const MOCK_PLACES = {
  south_indian: ['Udupi Tiffin Room', 'Meenakshi Mess'],
  north_indian: ['Punjab Dhaba Kitchen', 'Chandni Chowk Rasoi'],
  mughlai: ['Nawab Dastarkhwan', 'Awadhi Table'],
  bengali: ['Kolkata Bhojanalay', 'Ghare Baire Kitchen'],
  italian: ['Trattoria Nonna', 'Casa Risotto'],
  western_comfort: ['Sunday Diner', 'The Old Homestead Cafe'],
  chinese: ['Golden Congee House', 'Jade Garden'],
  japanese: ['Kodama Tea House', 'Sakura Home Kitchen'],
  mediterranean: ['Olive & Lemon', 'Cedar Mezze'],
};

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export class MockQlooClient {
  mock = true;

  constructor() {
    this.trace = [];
  }

  toJSON() {
    return { mock: true };
  }

  #log(step, path, params) {
    this.trace.push({ step, method: 'GET', path, params, status: 200, ms: 1, cached: false, mock: true });
  }

  async search(query, type) {
    this.#log(`resolve "${query}"`, '/search', { query, types: type ? `urn:entity:${type}` : undefined });
    const q = norm(query);
    return MOCK_ENTITIES.filter((e) => (!type || e.type === type) && (norm(e.name).includes(q) || q.includes(norm(e.name))))
      .map((e) => ({ id: e.id, name: e.name, type: e.type, tags: [], affinity: null, address: null, description: null, rating: null }));
  }

  #cuisineScores(entityIds) {
    const totals = {};
    const ents = MOCK_ENTITIES.filter((e) => entityIds.includes(e.id));
    for (const e of ents) for (const [c, w] of Object.entries(e.cuisines)) totals[c] = (totals[c] ?? 0) + w;
    const max = Math.max(0, ...Object.values(totals));
    return Object.entries(totals)
      .map(([c, v]) => [c, max ? v / max : 0])
      .sort((a, b) => b[1] - a[1]);
  }

  async placeInsights({ entityIds, location }) {
    this.#log('places for taste signals', '/v2/insights', {
      'filter.type': 'urn:entity:place',
      'signal.interests.entities': entityIds.join(','),
      'filter.location.query': location,
    });
    const out = [];
    for (const [c, score] of this.#cuisineScores(entityIds).slice(0, 4)) {
      (MOCK_PLACES[c] ?? []).forEach((name, i) => {
        out.push({
          id: `mock-place-${c}-${i}`,
          name: `${name} (demo)`,
          type: 'place',
          tags: [CUISINES[c].label],
          affinity: Number((score * (1 - 0.06 * i)).toFixed(3)),
          address: location ? `Demo listing, ${location}` : 'Demo listing',
          description: null,
          rating: null,
        });
      });
    }
    return out.sort((a, b) => b.affinity - a.affinity);
  }

  async tagInsights({ entityIds }) {
    this.#log('taste tags', '/v2/insights', {
      'filter.type': 'urn:tag',
      'signal.interests.entities': entityIds.join(','),
    });
    return this.#cuisineScores(entityIds).map(([c, score]) => ({
      id: `mock-tag-${c}`,
      name: `${CUISINES[c].label} cuisine`,
      type: 'tag',
      tags: [],
      affinity: Number(score.toFixed(3)),
      address: null,
      description: null,
      rating: null,
    }));
  }
}
