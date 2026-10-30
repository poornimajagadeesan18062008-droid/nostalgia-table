# Devpost text: copy into your submission

## Project name
Nostalgia Table

## Tagline
Dinner that tastes like the songs they grew up with.

## Inspiration
Meal planning for older adults is almost always only about restrictions: soft, low-salt, no this, no that. The result is a plate that is safe and joyless. But taste is deeply tied to memory and culture. Someone who grew up on Ilaiyaraaja and Tamil cinema does not want the same comfort food as someone who grew up on Sinatra and Roman Holiday. Families and carers know this, yet no tool uses it.

## What it does
Nostalgia Table is an agent that plans meals for seniors from their lifetime taste. You give it the music, films, shows and books they loved, and any constraints: texture (soft or very soft), low sodium, low sugar, allergies, medicines (warfarin, grapefruit-interacting drugs, potassium limits), and whether food will be delivered lukewarm.

The agent resolves their favourites in Qloo's taste graph, asks Qloo which places and tastes people like them over-index on, turns that into cuisine affinities, and ranks dishes by cultural taste. A hard constraint engine then removes anything unsafe, and the agent re-verifies its own final list. The result is a ranked set of meals, a breakfast/lunch/dinner plan, nearby places Qloo associates with their taste, and a transparent list of what was left out and why.

## How Qloo powers it
- `GET /search` resolves each favourite to a taste-graph entity.
- `GET /v2/insights` (places and tags) with those entities as signals, plus the person's city, returns what people with that taste actually like. These affinities drive the ranking.
- The UI shows every Qloo call (endpoint, status, latency).
- Without Qloo the app has no signal to rank on. Different favourites produce different meals; a test proves it.
- No silent fakes: with a key, a Qloo failure is shown as an error, never replaced with made-up data.

## How we built it
Zero-dependency Node.js (server, agent loop, Qloo client, constraint engine) and a plain HTML/JS UI. The agent runs plan, resolve, discover, constrain, verify, compose. It also exposes a stateless MCP endpoint (`plan_senior_meals`) so other agents can call it. 18 automated tests cover the constraint rules, the Qloo client (headers, host, caching, retries, error mapping), the agent, and the server.

## Challenges
Keeping taste and safety separate: Qloo should never be able to override a medical constraint, and a safety rule should never flatten taste. We made taste a ranking signal and safety a hard filter with a final independent re-check.

## What's next
Menus from real meal-delivery kitchens, caregiver sharing, family-member taste profiles, and a dietitian review mode.

## Built with
Node.js, Qloo API (Taste AI), MCP, HTML/CSS/JS

## Links
- Live demo: <your deployed URL>
- Code: <your public repo URL>
- License: MIT
