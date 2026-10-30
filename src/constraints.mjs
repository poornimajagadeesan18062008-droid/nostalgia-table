// Hard dietary / safety constraints for seniors. Taste (Qloo) ranks dishes; these rules
// decide what may be shown at all. Educational only; not medical advice.

export const CHEW_LEVELS = { regular: 3, soft: 2, 'very-soft': 1 };
export const ALLERGENS = ['dairy', 'nuts', 'gluten', 'egg', 'fish', 'shellfish', 'soy', 'sesame'];

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

const bool = (v) => v === true || v === 'true' || v === 'on' || v === 1;

export function normaliseConstraints(input = {}) {
  const chew = input.chew ?? 'regular';
  if (!(chew in CHEW_LEVELS)) throw new ValidationError(`chew must be one of: ${Object.keys(CHEW_LEVELS).join(', ')}`);
  const meds = input.meds ?? {};
  const allergens = (Array.isArray(input.allergens) ? input.allergens : [])
    .map((a) => String(a).toLowerCase())
    .filter((a) => ALLERGENS.includes(a));
  const avoidRaw = Array.isArray(input.avoid) ? input.avoid : String(input.avoid ?? '').split(/[,\n;]+/);
  const avoid = avoidRaw.map((s) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 15);
  return {
    chew,
    lowSodium: bool(input.lowSodium),
    lowSugar: bool(input.lowSugar),
    vegetarian: bool(input.vegetarian),
    lowHeatDelivery: bool(input.lowHeatDelivery),
    noSpicy: bool(input.noSpicy),
    avoid,
    allergens: [...new Set(allergens)],
    meds: {
      warfarin: bool(meds.warfarin),
      grapefruit: bool(meds.grapefruit),
      potassiumRestricted: bool(meds.potassiumRestricted),
    },
  };
}

// Returns { ok, reasons: [why excluded], cautions: [still ok, but note] }
export function checkDish(dish, c) {
  const reasons = [];
  const cautions = [];

  if (dish.chew > CHEW_LEVELS[c.chew]) {
    reasons.push(c.chew === 'very-soft' ? 'Too firm for a very-soft / mashable diet' : 'Needs more chewing than a soft diet allows');
  }
  if (c.lowSodium) {
    if (dish.sodium === 'high') reasons.push('High sodium');
    else if (dish.sodium === 'medium') cautions.push('Ask for no added salt');
  }
  if (c.lowSugar) {
    if (dish.sugar === 'high') reasons.push('High sugar');
    else if (dish.sugar === 'medium') cautions.push('Moderate sugar; keep the portion small');
  }
  if (c.vegetarian && !dish.vegetarian) reasons.push('Not vegetarian');
  if (c.noSpicy && dish.flags.includes('spicy')) reasons.push('Spicy');
  if (c.lowHeatDelivery && !dish.warmOk) reasons.push('Does not hold up when delivered lukewarm');
  for (const a of c.allergens) {
    if (dish.allergens.includes(a)) reasons.push(`Contains ${a}`);
  }
  for (const word of c.avoid) {
    if (dish.ingredients.some((i) => i.includes(word)) || dish.name.toLowerCase().includes(word)) {
      reasons.push(`Contains or is built around "${word}"`);
    }
  }
  if (c.meds.warfarin && dish.flags.includes('vitaminK')) {
    reasons.push('High in vitamin K (can affect warfarin; confirm with their doctor)');
  }
  if (c.meds.grapefruit && dish.flags.includes('grapefruit')) {
    reasons.push('Contains grapefruit (interacts with some medicines)');
  }
  if (c.meds.potassiumRestricted && dish.flags.includes('highPotassium')) {
    reasons.push('High in potassium');
  }
  return { ok: reasons.length === 0, reasons, cautions };
}

export function describeConstraints(c) {
  const out = [];
  if (c.chew !== 'regular') out.push(c.chew === 'very-soft' ? 'very soft / mashable' : 'soft texture');
  if (c.lowSodium) out.push('low sodium');
  if (c.lowSugar) out.push('low sugar');
  if (c.vegetarian) out.push('vegetarian');
  if (c.lowHeatDelivery) out.push('fine lukewarm after delivery');
  if (c.noSpicy) out.push('not spicy');
  if (c.meds.warfarin) out.push('warfarin (limit vitamin K)');
  if (c.meds.grapefruit) out.push('grapefruit-interacting medicine');
  if (c.meds.potassiumRestricted) out.push('potassium restricted');
  for (const a of c.allergens) out.push(`no ${a}`);
  for (const a of c.avoid) out.push(`avoid ${a}`);
  return out;
}
