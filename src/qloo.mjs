// Qloo client (live) with tracing, caching, timeouts and graceful errors.
// The API key is only ever sent in the X-Api-Key header and never logged or returned.

export const HACKATHON_BASE = 'https://hackathon.api.qloo.com';

const TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 500;
const sharedCache = new Map();

export class QlooError extends Error {
  constructor(message, { status = null, code = 'qloo_error' } = {}) {
    super(message);
    this.name = 'QlooError';
    this.status = status;
    this.code = code;
  }
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const shortType = (t) => (typeof t === 'string' ? t.replace(/^urn:entity:/, '') : null);

export function normalizeEntity(e) {
  if (!e || typeof e !== 'object') return null;
  const name = e.name ?? e.properties?.name;
  if (!name) return null;
  const types = Array.isArray(e.types) ? e.types : e.type ? [e.type] : [];
  const tags = (Array.isArray(e.tags) ? e.tags : [])
    .map((t) => (typeof t === 'string' ? t : t?.name ?? t?.tag_id ?? ''))
    .filter(Boolean);
  const id = e.entity_id ?? e.id ?? null;
  return {
    id: id ? String(id) : null,
    name: String(name),
    type: shortType(types[0]),
    tags,
    affinity: num(e.query?.affinity ?? e.affinity ?? e.score),
    address: e.properties?.address ?? e.location?.address ?? null,
    description: e.properties?.short_description ?? e.properties?.description ?? null,
    rating: num(e.properties?.business_rating ?? e.properties?.rating),
  };
}

export function listFrom(json) {
  const r = json?.results;
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.entities)) return r.entities;
  if (Array.isArray(r?.tags)) return r.tags;
  return [];
}

export class QlooClient {
  mock = false;

  constructor({
    apiKey,
    baseUrl = HACKATHON_BASE,
    fetchImpl = globalThis.fetch,
    timeoutMs = 8000,
    cache = sharedCache,
  } = {}) {
    if (!apiKey) throw new QlooError('QLOO_API_KEY is not set', { code: 'missing_api_key' });
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.cache = cache;
    this.trace = [];
  }

  // Never serialise the key.
  toJSON() {
    return { mock: false, baseUrl: this.baseUrl };
  }

  async get(path, params, step, optional = []) {
    try {
      return await this.#request(path, params, step);
    } catch (err) {
      // If the API rejects an optional parameter, retry once without it.
      if (err instanceof QlooError && err.status === 400 && optional.length) {
        const reduced = { ...params };
        for (const k of optional) delete reduced[k];
        return this.#request(path, reduced, `${step} (retry without ${optional.join(', ')})`);
      }
      throw err;
    }
  }

  async #request(path, params, step) {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const cacheKey = url.toString();
    const hit = this.cache.get(cacheKey);
    const entry = { step, method: 'GET', path, params: { ...params }, status: null, ms: 0, cached: false };
    if (hit && hit.exp > Date.now()) {
      entry.status = 200;
      entry.cached = true;
      this.trace.push(entry);
      return hit.data;
    }
    const started = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        method: 'GET',
        headers: { 'X-Api-Key': this.apiKey, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      entry.status = res.status;
      entry.ms = Date.now() - started;
      if (!res.ok) {
        const code = res.status === 401 || res.status === 403 ? 'unauthorized' : res.status === 429 ? 'rate_limited' : 'http_error';
        entry.error = code;
        this.trace.push(entry);
        throw new QlooError(`Qloo responded with HTTP ${res.status}`, { status: res.status, code });
      }
      const data = await res.json();
      if (this.cache.size >= MAX_CACHE) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(cacheKey, { data, exp: Date.now() + TTL_MS });
      this.trace.push(entry);
      return data;
    } catch (err) {
      if (err instanceof QlooError) throw err;
      entry.ms = Date.now() - started;
      entry.error = err?.name === 'AbortError' ? 'timeout' : 'network';
      this.trace.push(entry);
      throw new QlooError(entry.error === 'timeout' ? 'Qloo request timed out' : 'Could not reach Qloo', {
        code: entry.error,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // Resolve a name to taste-graph entities. `type` is optional (artist, movie, tv_show, book...).
  async search(query, type) {
    const json = await this.get(
      '/search',
      { query, types: type ? `urn:entity:${type}` : undefined, take: 5 },
      `resolve "${query}"`,
    );
    return listFrom(json).map(normalizeEntity).filter(Boolean);
  }

  // Places (restaurants etc.) that people with these tastes over-index on, near a location.
  async placeInsights({ entityIds, location, take = 20 }) {
    const json = await this.get(
      '/v2/insights',
      {
        'filter.type': 'urn:entity:place',
        'signal.interests.entities': entityIds.join(','),
        'filter.location.query': location,
        'feature.explainability': 'true',
        take,
      },
      'places for taste signals',
      ['feature.explainability'],
    );
    return listFrom(json).map(normalizeEntity).filter(Boolean);
  }

  // Tags (genres, cuisines...) that describe the taste of these entities.
  async tagInsights({ entityIds, take = 25 }) {
    const json = await this.get(
      '/v2/insights',
      { 'filter.type': 'urn:tag', 'signal.interests.entities': entityIds.join(','), take },
      'taste tags',
    );
    return listFrom(json).map(normalizeEntity).filter(Boolean);
  }
}
