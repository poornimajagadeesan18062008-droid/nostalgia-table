// Live smoke test: run this the moment your Qloo hackathon key arrives.
//   QLOO_API_KEY=xxxx node scripts/smoke.mjs "Chennai"
// It prints every Qloo call so you can confirm parameter names against the docs.
import { QlooClient, HACKATHON_BASE } from '../src/qloo.mjs';
import { planMeals } from '../src/agent.mjs';

const key = process.env.QLOO_API_KEY;
if (!key) {
  console.error('Set QLOO_API_KEY first.');
  process.exit(1);
}
const location = process.argv[2] ?? 'Chennai';
const client = new QlooClient({ apiKey: key, baseUrl: process.env.QLOO_API_BASE || HACKATHON_BASE });

try {
  const out = await planMeals(
    {
      favourites: ['Ilaiyaraaja', 'Kishore Kumar', 'Mohammed Rafi'],
      location,
      constraints: { chew: 'soft', lowSodium: true },
    },
    { client },
  );
  console.log(JSON.stringify({ taste: out.taste, firstMeals: out.meals.slice(0, 3).map((m) => m.name), places: out.places }, null, 2));
} catch (err) {
  console.error('FAILED:', err.message);
} finally {
  console.log('\nQloo calls:');
  for (const c of client.trace) console.log(` ${c.status ?? 'ERR'} ${c.ms}ms ${c.path} ${JSON.stringify(c.params)} ${c.error ?? ''}`);
}
