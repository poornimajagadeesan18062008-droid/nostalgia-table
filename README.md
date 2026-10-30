# Nostalgia Table

**Dinner that tastes like the songs they grew up with.**

An agent for families, carers and meal services that plans senior-friendly meals from a person's *lifetime taste*, not just their diagnosis. Qloo's taste graph decides what they are likely to love. A hard constraint engine decides what is safe: texture, sodium, sugar, allergies, medicine interactions, and low-heat delivery.

Built for the Qloo Agentic Hackathon.

## Why Qloo is the point

Meal planning for seniors is usually *only* about restrictions, so people end up with the same bland "soft, low-salt" plate. Taste is the missing half. A 78-year-old who grew up on Ilaiyaraaja and Tamil cinema does not want the same dinner as someone who grew up on Sinatra and Roman Holiday.

1. The agent takes favourite artists, films, shows and books from the person's life.
2. It resolves them in Qloo (`GET /search`).
3. It asks Qloo what people with that taste over-index on: nearby places (`GET /v2/insights`, `urn:entity:place`) and taste tags (`GET /v2/insights`, `urn:tag`).
4. Those signals become cuisine affinities that rank the dishes.
5. Every dish is then checked against hard safety rules. Nothing unsafe is shown, however strongly Qloo likes it.
6. The agent re-verifies its own final list, and shows exactly what it excluded and why.

Remove Qloo and the app has no idea what this person would enjoy, so it cannot rank anything. Different favourites give different meals (covered by a test).

## What it does

- **Taste to table:** favourites in, ranked dishes and a breakfast/lunch/dinner plan out, each with a reason grounded in the Qloo signal.
- **Constraint engine:** very-soft or soft texture, low sodium, low sugar, vegetarian, 8 allergen groups, custom avoid-list, warfarin (vitamin K), grapefruit-interacting medicines, potassium restriction, and dishes that hold up when delivered lukewarm.
- **Transparent:** a panel lists the dishes left out and the reason, the agent's steps, and every Qloo call (endpoint, status, latency).
- **Nearby places:** restaurants Qloo associates with their taste, with a reminder to call ahead about soft and low-salt cooking.
- **Agent tool:** a stateless MCP endpoint (`POST /mcp`) exposes `plan_senior_meals` so any agent can use it.
- **No silent fakes:** with a key, any Qloo failure surfaces as an error. It never falls back to demo data. Without a key, the UI shows an amber "Demo data (not Qloo)" badge.

## Run it

Requires Node 20+. No dependencies to install.

```bash
git clone <this repo>
cd nostalgia-table
cp .env.example .env        # put your Qloo hackathon key in QLOO_API_KEY
npm start                   # http://127.0.0.1:3000
npm test
```

Get a hackathon key from the [Qloo developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide#getting-your-api-key). Hackathon keys only work against `https://hackathon.api.qloo.com` (the default).

Once your key is set, verify the live integration and see every request:

```bash
QLOO_API_KEY=... npm run smoke -- "Chennai"
```

## Deploy (free)

**Render:** New > Blueprint > pick this repo (`render.yaml` is included), then set `QLOO_API_KEY` as a secret environment variable. The key stays server-side only.

Any host that runs `npm start` works (Railway, Fly.io, Cloud Run). Set `QLOO_API_KEY`; `PORT` is read automatically.

## Architecture

```
public/index.html      UI (no framework, no innerHTML with data)
server.mjs             HTTP server, JSON API, MCP endpoint, rate limiting
src/qloo.mjs           Qloo client: GET + X-Api-Key, cache, timeout, retry, trace
src/agent.mjs          plan > resolve > discover > constrain > verify > compose
src/constraints.mjs    hard safety rules
src/dishes.mjs         dish catalogue with texture / sodium / sugar / allergens / flags
src/mock-graph.mjs     DEMO ONLY illustrative data (clearly labelled, never used with a key)
```

## API

- `POST /api/plan` with `{ name, favourites: [..], location, constraints: {..} }`
- `GET /api/status` reports `live` or `demo`
- `POST /mcp` JSON-RPC (`initialize`, `tools/list`, `tools/call` for `plan_senior_meals`)

## Safety and limits

Educational suggestions only. This is not medical or dietetic advice. The medicine rules are deliberately simple (vitamin K, grapefruit, potassium), and the person's doctor or dietitian should confirm them. The dish catalogue is a starting set of typical home-style preparations; real menus vary.

## License

MIT. See [LICENSE](LICENSE).
