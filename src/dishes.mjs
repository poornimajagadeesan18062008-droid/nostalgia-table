// Dish catalogue with the attributes needed for senior-safe filtering.
// chew: 1 = very soft / mashable, 2 = soft, 3 = needs real chewing
// sodium / sugar: 'low' | 'medium' | 'high' (typical home-style preparation)
// flags: vitaminK, grapefruit, highPotassium, spicy, fried
// warmOk: still good lukewarm after delivery

export const CUISINES = {
  south_indian: {
    label: 'South Indian',
    keywords: ['south indian', 'tamil', 'chettinad', 'kerala', 'udupi', 'andhra', 'dosa', 'idli', 'tiffin', 'dravidian', 'karnataka'],
  },
  north_indian: {
    label: 'North Indian',
    keywords: ['north indian', 'punjabi', 'dhaba', 'tandoor', 'delhi', 'rajasthani', 'gujarati'],
  },
  mughlai: {
    label: 'Mughlai',
    keywords: ['mughlai', 'hyderabadi', 'awadhi', 'biryani', 'kebab', 'lucknow', 'nawabi'],
  },
  bengali: { label: 'Bengali', keywords: ['bengali', 'kolkata', 'bangladeshi'] },
  italian: { label: 'Italian', keywords: ['italian', 'pizza', 'pasta', 'trattoria', 'risotto', 'osteria'] },
  western_comfort: {
    label: 'Western comfort',
    keywords: ['american', 'diner', 'british', 'steakhouse', 'brunch', 'comfort food', 'western', 'continental', 'european'],
  },
  chinese: { label: 'Chinese', keywords: ['chinese', 'cantonese', 'dim sum', 'szechuan', 'sichuan', 'hakka', 'taiwanese'] },
  japanese: { label: 'Japanese', keywords: ['japanese', 'sushi', 'ramen', 'izakaya'] },
  mediterranean: {
    label: 'Mediterranean',
    keywords: ['mediterranean', 'greek', 'lebanese', 'middle eastern', 'turkish', 'falafel', 'mezze'],
  },
};

const D = (o) => ({ flags: [], allergens: [], vegetarian: true, warmOk: true, sugar: 'low', ...o });

export const DISHES = [
  // South Indian
  D({ id: 'idli-sambar', name: 'Idli with sambar', cuisine: 'south_indian', chew: 1, sodium: 'medium', ingredients: ['rice', 'urad dal', 'lentils', 'vegetables', 'tamarind'], meals: ['breakfast', 'dinner'], tip: 'Soak the idli in warm sambar until it can be mashed with a spoon.' }),
  D({ id: 'curd-rice', name: 'Curd rice (thayir sadam)', cuisine: 'south_indian', chew: 1, sodium: 'low', ingredients: ['rice', 'curd', 'ginger', 'curry leaves', 'mustard seeds'], allergens: ['dairy'], meals: ['lunch', 'dinner'], tip: 'Skip the pomegranate and chilli; it is happy served at room temperature.' }),
  D({ id: 'ven-pongal', name: 'Ven pongal', cuisine: 'south_indian', chew: 1, sodium: 'medium', ingredients: ['rice', 'moong dal', 'ghee', 'pepper', 'cashew', 'ginger'], allergens: ['dairy', 'nuts'], meals: ['breakfast'], tip: 'Leave out whole peppercorns and cashews for a smoother texture.' }),
  D({ id: 'rasam-rice', name: 'Rasam rice', cuisine: 'south_indian', chew: 1, sodium: 'medium', ingredients: ['rice', 'tomato', 'tamarind', 'pepper', 'cumin', 'garlic'], meals: ['lunch', 'dinner'], tip: 'Use a mild rasam and mash the rice into it.' }),
  D({ id: 'sambar-sadam', name: 'Sambar sadam', cuisine: 'south_indian', chew: 1, sodium: 'medium', ingredients: ['rice', 'toor dal', 'vegetables', 'tamarind', 'drumstick'], meals: ['lunch', 'dinner'], tip: 'Cook the vegetables until they fall apart; remove drumstick fibres.' }),
  D({ id: 'keerai-masiyal', name: 'Keerai masiyal (mashed greens)', cuisine: 'south_indian', chew: 1, sodium: 'low', ingredients: ['spinach', 'moong dal', 'garlic', 'cumin'], flags: ['vitaminK'], meals: ['lunch'], tip: 'Rich in leafy greens, so check against any blood-thinner advice.' }),
  D({ id: 'vegetable-kootu', name: 'Vegetable kootu', cuisine: 'south_indian', chew: 2, sodium: 'low', ingredients: ['bottle gourd', 'chana dal', 'coconut', 'cumin'], meals: ['lunch', 'dinner'], tip: 'Bottle gourd and pumpkin cook down to a very soft texture.' }),
  D({ id: 'ragi-kanji', name: 'Ragi porridge (kanji)', cuisine: 'south_indian', chew: 1, sodium: 'low', ingredients: ['finger millet', 'buttermilk', 'water'], allergens: ['dairy'], meals: ['breakfast'], tip: 'Unsweetened and savoury keeps sugar low; serve warm or lukewarm.' }),
  D({ id: 'medu-vada', name: 'Medu vada', cuisine: 'south_indian', chew: 3, sodium: 'medium', ingredients: ['urad dal', 'pepper', 'curry leaves', 'oil'], flags: ['fried'], meals: ['breakfast'], warmOk: false, tip: 'Crisp, fried and best eaten hot.' }),
  D({ id: 'paal-payasam', name: 'Paal payasam', cuisine: 'south_indian', chew: 1, sodium: 'low', sugar: 'high', ingredients: ['milk', 'rice', 'sugar', 'cardamom', 'cashew'], allergens: ['dairy', 'nuts'], meals: ['dinner'], tip: 'A festive treat, high in sugar.' }),

  // North Indian
  D({ id: 'moong-khichdi', name: 'Moong dal khichdi', cuisine: 'north_indian', chew: 1, sodium: 'low', ingredients: ['rice', 'moong dal', 'ghee', 'turmeric', 'cumin'], allergens: ['dairy'], meals: ['breakfast', 'lunch', 'dinner'], tip: 'Cook it extra soft; the ultimate comfort meal that holds warmth well.' }),
  D({ id: 'dal-tadka-roti', name: 'Dal tadka with soft roti', cuisine: 'north_indian', chew: 2, sodium: 'medium', ingredients: ['lentils', 'wheat', 'tomato', 'garlic', 'ghee'], allergens: ['gluten', 'dairy'], meals: ['lunch', 'dinner'], tip: 'Tear the roti into the dal so it softens.' }),
  D({ id: 'palak-paneer', name: 'Palak paneer', cuisine: 'north_indian', chew: 2, sodium: 'medium', ingredients: ['spinach', 'paneer', 'onion', 'cream'], flags: ['vitaminK'], allergens: ['dairy'], meals: ['lunch', 'dinner'], tip: 'Spinach is high in vitamin K, so check against any blood-thinner advice.' }),
  D({ id: 'paneer-bhurji', name: 'Soft paneer bhurji', cuisine: 'north_indian', chew: 2, sodium: 'medium', ingredients: ['paneer', 'onion', 'tomato', 'cumin'], allergens: ['dairy'], meals: ['breakfast', 'lunch'], tip: 'Crumble finely and cook with a little water for a moist texture.' }),
  D({ id: 'rajma-chawal', name: 'Rajma chawal', cuisine: 'north_indian', chew: 2, sodium: 'medium', ingredients: ['kidney beans', 'rice', 'tomato', 'onion'], flags: ['highPotassium'], meals: ['lunch'], tip: 'Beans and tomato are high in potassium.' }),

  // Mughlai
  D({ id: 'chicken-korma', name: 'Chicken korma (soft, mild)', cuisine: 'mughlai', chew: 2, sodium: 'medium', vegetarian: false, ingredients: ['chicken', 'yogurt', 'almonds', 'onion', 'cardamom'], allergens: ['dairy', 'nuts'], meals: ['lunch', 'dinner'], tip: 'Use minced or shredded chicken and a smooth almond-free gravy if needed.' }),
  D({ id: 'haleem', name: 'Haleem', cuisine: 'mughlai', chew: 1, sodium: 'high', vegetarian: false, ingredients: ['wheat', 'lentils', 'mutton', 'ghee'], allergens: ['gluten', 'dairy'], meals: ['lunch', 'dinner'], tip: 'Already a smooth porridge, but traditionally salty.' }),

  // Bengali
  D({ id: 'macher-jhol', name: 'Macher jhol with rice', cuisine: 'bengali', chew: 2, sodium: 'medium', vegetarian: false, ingredients: ['fish', 'rice', 'potato', 'turmeric', 'mustard oil'], allergens: ['fish'], flags: ['highPotassium'], meals: ['lunch', 'dinner'], tip: 'Choose boneless fillets for safety.' }),

  // Italian
  D({ id: 'mushroom-risotto', name: 'Mushroom risotto', cuisine: 'italian', chew: 2, sodium: 'medium', ingredients: ['arborio rice', 'mushrooms', 'parmesan', 'stock', 'butter'], allergens: ['dairy'], meals: ['lunch', 'dinner'], warmOk: false, tip: 'Best served creamy and hot; thickens as it cools.' }),
  D({ id: 'minestrone', name: 'Minestrone (well cooked)', cuisine: 'italian', chew: 2, sodium: 'medium', ingredients: ['beans', 'carrot', 'celery', 'tomato', 'small pasta'], allergens: ['gluten'], meals: ['lunch', 'dinner'], tip: 'Simmer until vegetables are tender; blend half for body.' }),
  D({ id: 'polenta-veg', name: 'Soft polenta with stewed vegetables', cuisine: 'italian', chew: 1, sodium: 'low', ingredients: ['cornmeal', 'tomato', 'zucchini', 'olive oil'], meals: ['lunch', 'dinner'], tip: 'Naturally smooth and easy to swallow.' }),
  D({ id: 'pasta-fagioli', name: 'Pasta e fagioli', cuisine: 'italian', chew: 2, sodium: 'medium', ingredients: ['small pasta', 'white beans', 'tomato', 'garlic'], allergens: ['gluten'], meals: ['lunch', 'dinner'], tip: 'Cook the pasta past al dente.' }),

  // Western comfort
  D({ id: 'oatmeal-berries', name: 'Warm oatmeal with soft berries', cuisine: 'western_comfort', chew: 1, sodium: 'low', ingredients: ['oats', 'milk', 'berries'], allergens: ['dairy'], meals: ['breakfast'], tip: 'Cook with extra milk or water for a creamy texture.' }),
  D({ id: 'citrus-cup', name: 'Citrus fruit cup', cuisine: 'western_comfort', chew: 2, sodium: 'low', sugar: 'medium', ingredients: ['orange', 'grapefruit', 'mint'], flags: ['grapefruit'], meals: ['breakfast'], tip: 'Contains grapefruit, which interacts with some medicines.' }),
  D({ id: 'baked-fish-mash', name: 'Baked fish with mashed potato', cuisine: 'western_comfort', chew: 2, sodium: 'medium', vegetarian: false, ingredients: ['white fish', 'potato', 'butter', 'peas'], flags: ['highPotassium'], allergens: ['fish', 'dairy'], meals: ['lunch', 'dinner'], tip: 'Flake the fish and check for bones.' }),
  D({ id: 'chicken-stew', name: 'Chicken and vegetable stew', cuisine: 'western_comfort', chew: 2, sodium: 'medium', vegetarian: false, ingredients: ['chicken', 'carrot', 'celery', 'peas', 'stock'], meals: ['lunch', 'dinner'], tip: 'Slow-cooked until the chicken shreds with a fork.' }),
  D({ id: 'scrambled-eggs', name: 'Soft scrambled eggs on toast', cuisine: 'western_comfort', chew: 2, sodium: 'medium', ingredients: ['eggs', 'bread', 'butter'], allergens: ['egg', 'gluten', 'dairy'], meals: ['breakfast'], warmOk: false, tip: 'Cut crusts off, serve straight away.' }),

  // Chinese
  D({ id: 'chicken-congee', name: 'Chicken congee', cuisine: 'chinese', chew: 1, sodium: 'medium', vegetarian: false, ingredients: ['rice', 'chicken', 'ginger', 'scallion'], meals: ['breakfast', 'lunch', 'dinner'], tip: 'Go easy on soy sauce; reheats and travels well.' }),
  D({ id: 'egg-drop-soup', name: 'Egg drop soup', cuisine: 'chinese', chew: 1, sodium: 'medium', ingredients: ['eggs', 'stock', 'corn starch', 'scallion'], allergens: ['egg'], meals: ['lunch', 'dinner'], tip: 'Make it with low-salt stock.' }),
  D({ id: 'steamed-fish-tofu', name: 'Steamed fish with silken tofu', cuisine: 'chinese', chew: 2, sodium: 'medium', vegetarian: false, ingredients: ['white fish', 'silken tofu', 'ginger', 'soy sauce'], allergens: ['fish', 'soy'], meals: ['lunch', 'dinner'], tip: 'Steaming keeps it tender and low in oil.' }),

  // Japanese
  D({ id: 'chawanmushi', name: 'Chawanmushi (steamed egg custard)', cuisine: 'japanese', chew: 1, sodium: 'medium', ingredients: ['eggs', 'dashi', 'shiitake'], allergens: ['egg'], meals: ['lunch', 'dinner'], warmOk: false, tip: 'Silky and easy to swallow; best fresh and warm.' }),
  D({ id: 'miso-tofu-soup', name: 'Miso soup with tofu', cuisine: 'japanese', chew: 1, sodium: 'high', ingredients: ['miso', 'silken tofu', 'wakame', 'dashi'], flags: ['vitaminK'], allergens: ['soy'], meals: ['breakfast', 'dinner'], tip: 'Miso is salty; wakame seaweed contains vitamin K.' }),

  // Mediterranean
  D({ id: 'lentil-soup', name: 'Smooth red lentil soup', cuisine: 'mediterranean', chew: 1, sodium: 'medium', ingredients: ['red lentils', 'carrot', 'cumin', 'lemon'], meals: ['lunch', 'dinner'], tip: 'Blend until smooth; reheats and travels well.' }),
  D({ id: 'hummus-pita', name: 'Hummus with soft pita', cuisine: 'mediterranean', chew: 2, sodium: 'medium', ingredients: ['chickpeas', 'tahini', 'lemon', 'olive oil', 'wheat'], allergens: ['sesame', 'gluten'], meals: ['lunch', 'snack'], tip: 'Warm the pita and tear it into small pieces.' }),
];
