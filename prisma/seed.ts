import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const products = [
  // ---- Breakfast ----
  { name: 'Protein Pancakes & Berries', description: 'Oat & egg-white pancakes topped with fresh berries and a light honey drizzle.', category: 'breakfast', calories: 340, protein: 28, carbs: 42, fat: 8, price: 120, emoji: '🥞' },
  { name: 'Overnight Oats & Whey', description: 'Rolled oats soaked in milk with whey protein, chia seeds and banana.', category: 'breakfast', calories: 310, protein: 26, carbs: 40, fat: 7, price: 90, emoji: '🥣' },
  { name: 'Egg White Power Muffins', description: 'Spinach, bell pepper and egg-white muffins with a side of avocado.', category: 'breakfast', calories: 220, protein: 24, carbs: 8, fat: 9, price: 85, emoji: '🍳' },
  { name: 'Greek Yogurt Protein Parfait', description: 'Non-fat Greek yogurt layered with granola, mixed berries and peanut butter.', category: 'breakfast', calories: 280, protein: 24, carbs: 30, fat: 8, price: 95, emoji: '🍨' },
  // ---- Mains ----
  { name: 'Grilled Chicken & Quinoa Bowl', description: 'Herb-grilled chicken breast, quinoa, roasted vegetables and tahini dressing.', category: 'main', calories: 450, protein: 42, carbs: 38, fat: 14, price: 180, emoji: '🍗' },
  { name: 'Lean Beef & Sweet Potato', description: 'Lean beef strips with baked sweet potato wedges and steamed broccoli.', category: 'main', calories: 520, protein: 40, carbs: 46, fat: 18, price: 195, emoji: '🥩' },
  { name: 'Salmon, Rice & Asparagus', description: 'Oven-baked salmon fillet with brown rice and grilled asparagus.', category: 'main', calories: 480, protein: 38, carbs: 42, fat: 19, price: 260, emoji: '🐟' },
  { name: 'Turkey Whole-Wheat Wrap', description: 'Smoked turkey, lettuce, tomato and light garlic sauce in a whole-wheat wrap.', category: 'main', calories: 390, protein: 32, carbs: 41, fat: 11, price: 140, emoji: '🌯' },
  { name: 'Chicken & Rice Fitness Plate', description: 'Classic meal-prep plate: grilled chicken, basmati rice and green salad.', category: 'main', calories: 520, protein: 47, carbs: 55, fat: 10, price: 170, emoji: '🍱' },
  { name: 'Zoodle Pesto Chicken', description: 'Courgette noodles with grilled chicken and a light basil pesto.', category: 'main', calories: 380, protein: 36, carbs: 16, fat: 19, price: 165, emoji: '🍝' },
  { name: 'Lean Beef Stir-Fry', description: 'Wok-tossed lean beef with mixed peppers in a low-sodium soy glaze.', category: 'main', calories: 470, protein: 41, carbs: 32, fat: 20, price: 210, emoji: '🥘' },
  { name: 'Shrimp & Veggie Bowl', description: 'Sautéed shrimp with stir-fried vegetables and cauliflower rice.', category: 'main', calories: 340, protein: 34, carbs: 18, fat: 14, price: 220, emoji: '🍤' },
  // ---- Salads ----
  { name: 'Light Chicken Caesar', description: 'Romaine, grilled chicken strips, parmesan and a light Caesar dressing.', category: 'salad', calories: 320, protein: 34, carbs: 12, fat: 15, price: 150, emoji: '🥗' },
  { name: 'Tuna Protein Salad', description: 'Tuna, mixed greens, chickpeas, olives and lemon-olive oil dressing.', category: 'salad', calories: 290, protein: 32, carbs: 18, fat: 10, price: 130, emoji: '🥙' },
  { name: 'Cottage Cheese Garden Bowl', description: 'Cottage cheese with cucumber, tomato, mint and whole-grain crackers.', category: 'salad', calories: 240, protein: 26, carbs: 18, fat: 7, price: 90, emoji: '🧀' },
  // ---- Snacks ----
  { name: 'Post-Workout Smoothie', description: 'Whey protein, banana, oats and peanut butter smoothie.', category: 'snack', calories: 250, protein: 27, carbs: 30, fat: 6, price: 80, emoji: '🥤' },
  { name: 'Protein Snack Box', description: 'Boiled eggs, nuts, cheese cube and dates portioned for recovery.', category: 'snack', calories: 260, protein: 18, carbs: 20, fat: 13, price: 75, emoji: '🥚' },
  { name: 'Banana Oat Bar', description: 'Homemade energy bar with banana, oats, honey and almonds.', category: 'snack', calories: 190, protein: 8, carbs: 32, fat: 5, price: 50, emoji: '🍫' },
  { name: 'Rice Cakes & Peanut Butter', description: 'Brown rice cakes with a thin peanut butter spread.', category: 'snack', calories: 180, protein: 6, carbs: 24, fat: 7, price: 45, emoji: '🍘' },
  { name: 'Green Detox Juice', description: 'Spinach, cucumber, green apple, celery and lemon cold-pressed juice.', category: 'snack', calories: 110, protein: 2, carbs: 24, fat: 1, price: 55, emoji: '🥬' },
]

// Plans run from 2 to 5 meals per day. The client must select EXACTLY
// mealsPerDay meals when subscribing — see /api/subscriptions.
const plans = [
  {
    id: 'plan-duo', name: 'Duo', emoji: '🔥',
    description: 'Lunch + dinner daily — our most popular weight-management plan.',
    mealsPerDay: 2, daysPerMonth: 22, targetCalories: 1300, monthlyPrice: 5499, sortOrder: 1,
    features: 'Pick exactly 2 meals|Sun–Thu deliveries|≈1,300 kcal per day|Free delivery|Pause anytime',
  },
  {
    id: 'plan-trio', name: 'Trio', emoji: '⚡',
    description: 'Breakfast, lunch and dinner daily — balanced full-day coverage.',
    mealsPerDay: 3, daysPerMonth: 22, targetCalories: 1600, monthlyPrice: 7999, sortOrder: 2,
    features: 'Pick exactly 3 meals|Sun–Thu deliveries|≈1,600 kcal per day|Free delivery|Pause anytime',
  },
  {
    id: 'plan-full-day', name: 'Full Day', emoji: '🚀',
    description: 'Breakfast, lunch, dinner and a snack — full coverage, every day of the month.',
    mealsPerDay: 4, daysPerMonth: 30, targetCalories: 1900, monthlyPrice: 10999, sortOrder: 3,
    features: 'Pick exactly 4 meals (3 + snack)|Every day, 30 days a month|≈1,900 kcal per day|Free delivery|Pause anytime',
  },
  {
    id: 'plan-max', name: 'Max Performance', emoji: '🏆',
    description: 'Three meals and two snacks daily — maximum fuel for hard training.',
    mealsPerDay: 5, daysPerMonth: 30, targetCalories: 2400, monthlyPrice: 13499, sortOrder: 4,
    features: 'Pick exactly 5 meals (3 + 2 snacks)|Every day, 30 days a month|≈2,400 kcal per day|Free delivery|Pause anytime',
  },
]

async function main() {
  for (const p of products) {
    await db.product.upsert({
      where: { id: `seed-${p.category}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}` },
      update: p,
      create: { id: `seed-${p.category}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`, ...p },
    })
  }
  console.log(`Seeded ${products.length} products`)

  for (const pl of plans) {
    await db.subscriptionPlan.upsert({ where: { id: pl.id }, update: pl, create: pl })
  }
  console.log(`Seeded ${plans.length} subscription plans`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())