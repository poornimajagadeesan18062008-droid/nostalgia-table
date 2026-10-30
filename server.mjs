// Zero-dependency HTTP server: static UI, JSON API, and a stateless MCP endpoint.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QlooClient, QlooError, HACKATHON_BASE } from './src/qloo.mjs';
import { MockQlooClient } from './src/mock-graph.mjs';
import { planMeals, NoTasteSignalError } from './src/agent.mjs';
import { ValidationError } from './src/constraints.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

// Minimal .env loader (no dependencies). Real environment variables win.
const envFile = path.join(__dirname, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const API_KEY = process.env.QLOO_API_KEY || '';
const BASE = process.env.QLOO_API_BASE || HACKATHON_BASE;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const MAX_BODY = 20_000;

export function makeClient() {
  return API_KEY ? new QlooClient({ apiKey: API_KEY, baseUrl: BASE }) : new MockQlooClient();
}

// ---- tiny per-IP rate limiter (protects the hackathon key quota) ----
const hits = new Map();
function limited(ip, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'",
};

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new ValidationError('Request too large.');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ValidationError('Body must be valid JSON.');
  }
}

function errorBody(err) {
  if (err instanceof ValidationError) return [400, { error: err.message }];
  if (err instanceof NoTasteSignalError) return [422, { error: err.message, unresolved: err.unresolved }];
  if (err instanceof QlooError) {
    if (err.code === 'unauthorized') return [502, { error: 'The Qloo API key was rejected. Check QLOO_API_KEY and QLOO_API_BASE.' }];
    if (err.code === 'rate_limited') return [429, { error: 'Qloo is rate limiting this app. Please retry in a minute.' }];
    return [502, { error: `Qloo is unavailable right now (${err.code}). No suggestions were made up; please try again.` }];
  }
  console.error('Unexpected error:', err?.message);
  return [500, { error: 'Something went wrong.' }];
}

// ---- MCP (stateless Streamable HTTP, JSON responses) ----
const TOOLS = [
  {
    name: 'plan_senior_meals',
    description:
      "Plan senior-friendly meals grounded in Qloo's taste graph. Give favourite artists/films/shows from the person's life; returns dishes ranked by cultural taste that also satisfy texture, sodium, sugar, allergy and medication constraints.",
    inputSchema: {
      type: 'object',
      properties: {
        favourites: { type: 'array', items: { type: 'string' }, description: 'Up to 8 artists, films, shows or books. Prefix with "artist:", "movie:" etc. to disambiguate.' },
        location: { type: 'string', description: 'City for nearby place suggestions.' },
        constraints: {
          type: 'object',
          properties: {
            chew: { type: 'string', enum: ['regular', 'soft', 'very-soft'] },
            lowSodium: { type: 'boolean' },
            lowSugar: { type: 'boolean' },
            vegetarian: { type: 'boolean' },
            lowHeatDelivery: { type: 'boolean' },
            allergens: { type: 'array', items: { type: 'string' } },
            avoid: { type: 'array', items: { type: 'string' } },
            meds: {
              type: 'object',
              properties: { warfarin: { type: 'boolean' }, grapefruit: { type: 'boolean' }, potassiumRestricted: { type: 'boolean' } },
            },
          },
        },
      },
      required: ['favourites'],
    },
  },
];

async function handleMcp(msg) {
  const { id, method, params } = msg;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (method === 'initialize') {
    return ok({
      protocolVersion: params?.protocolVersion ?? '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'nostalgia-table', version: '1.0.0' },
    });
  }
  if (method === 'ping') return ok({});
  if (method === 'tools/list') return ok({ tools: TOOLS });
  if (method === 'tools/call') {
    if (params?.name !== 'plan_senior_meals') return fail(-32602, 'Unknown tool');
    try {
      const result = await planMeals(params.arguments ?? {}, { client: makeClient() });
      return ok({ content: [{ type: 'text', text: JSON.stringify(result) }] });
    } catch (err) {
      const [, body] = errorBody(err);
      return ok({ isError: true, content: [{ type: 'text', text: body.error }] });
    }
  }
  return fail(-32601, 'Method not found');
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').toString().split(',')[0].trim();

    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });
    if (req.method === 'GET' && url.pathname === '/api/status') {
      return send(res, 200, { mode: API_KEY ? 'live' : 'demo', qlooHost: API_KEY ? new URL(BASE).host : null });
    }

    if (url.pathname.startsWith('/api/') || url.pathname === '/mcp') {
      if (limited(ip)) return send(res, 429, { error: 'Too many requests. Please slow down.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/plan') {
      try {
        const body = await readJson(req);
        return send(res, 200, await planMeals(body, { client: makeClient() }));
      } catch (err) {
        const [status, body] = errorBody(err);
        return send(res, status, body);
      }
    }

    if (url.pathname === '/mcp') {
      if (req.method !== 'POST') return send(res, 405, { error: 'POST JSON-RPC to this endpoint.' }, undefined, { Allow: 'POST' });
      let msg;
      try {
        msg = await readJson(req);
      } catch {
        return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      }
      if (msg.id === undefined) return send(res, 202, ''); // notification
      return send(res, 200, await handleMcp(msg));
    }

    if (req.method === 'GET') {
      const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const file = path.join(PUBLIC_DIR, rel);
      if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 404, 'Not found', 'text/plain');
      try {
        const data = await readFile(file);
        return send(res, 200, data, MIME[path.extname(file)] ?? 'application/octet-stream', { 'Cache-Control': 'public, max-age=300' });
      } catch {
        return send(res, 404, 'Not found', 'text/plain');
      }
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Server error:', err?.message);
    return send(res, 500, { error: 'Something went wrong.' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`Nostalgia Table on http://${HOST}:${PORT}  (${API_KEY ? `LIVE Qloo via ${new URL(BASE).host}` : 'DEMO mode, no QLOO_API_KEY set'})`);
  });
}
