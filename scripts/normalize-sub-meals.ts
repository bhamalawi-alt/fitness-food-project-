/**
 * Normalize the existing (test) subscriptions to the new exact-count rule:
 * every subscription gets EXACTLY mealsPerDay meal selections, snapshotted
 * from live menu products. FS-1006 (5 meals on a 2-meal Duo plan) is trimmed.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

/** menu product ids by category, seeded catalog */
const PICKS: Record<string, string[]> = {
  // FS-1001 · Full Day (4/day): breakfast + main + salad + snack
  'FS-1001': [
    'seed-breakfast-protein-pancakes-berries',
    'seed-main-grilled-chicken-quinoa-bowl',
    'seed-salad-light-chicken-caesar',
    'seed-snack-post-workout-smoothie',
  ],
  // FS-1002 · Lunch Only (1/day)
  'FS-1002': ['seed-main-chicken-rice-fitness-plate'],
  // FS-1003 · Duo (2/day)
  'FS-1003': ['seed-main-grilled-chicken-quinoa-bowl', 'seed-salad-tuna-protein-salad'],
  // FS-1004 · Duo (2/day)
  'FS-1004': ['seed-main-turkey-whole-wheat-wrap', 'seed-salad-cottage-cheese-garden-bowl'],
  // FS-1005 · Lunch Only (1/day)
  'FS-1005': ['seed-main-lean-beef-sweet-potato'],
  // FS-1006 · Duo (2/day) — trim from 5 to exactly 2
  'FS-1006': ['seed-main-salmon-rice-asparagus', 'seed-breakfast-overnight-oats-whey'],
}

async function main() {
  for (const [reference, ids] of Object.entries(PICKS)) {
    const sub = await db.subscription.findUnique({ where: { reference }, include: { meals: true, plan: true } })
    if (!sub) { console.log(`• ${reference} not found, skipped`); continue }

    const products = await db.product.findMany({ where: { id: { in: ids }, isActive: true } })
    if (products.length !== ids.length) {
      console.log(`✗ ${reference}: only ${products.length}/${ids.length} products found — skipped`)
      continue
    }

    await db.subscriptionMeal.deleteMany({ where: { subscriptionId: sub.id } })
    await db.subscriptionMeal.createMany({
      data: products.map((p) => ({
        subscriptionId: sub.id,
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        category: p.category,
        calories: p.calories,
        protein: p.protein,
        carbs: p.carbs,
        fat: p.fat,
      })),
    })
    console.log(`✔ ${reference} (${sub.plan.name}, ${sub.mealsPerDay}/day) → ${products.length} meals: ${products.map((p) => p.emoji + ' ' + p.name).join(' · ')}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
