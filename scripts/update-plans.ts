/**
 * One-off migration: subscription plans now run 2–5 meals/day and clients
 * must pick EXACTLY mealsPerDay meals. Upserts the new lineup and retires
 * the old 1-meal "Lunch Only" plan (deleted when unreferenced, hidden when
 * subscriptions still reference it — their snapshots keep history intact).
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

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
  for (const pl of plans) {
    await db.subscriptionPlan.upsert({ where: { id: pl.id }, update: pl, create: pl })
    console.log(`✔ upserted ${pl.id} (${pl.name}, ${pl.mealsPerDay} meals/day)`)
  }

  const lunchOnly = await db.subscriptionPlan.findUnique({ where: { id: 'plan-lunch-only' } })
  if (lunchOnly) {
    const refs = await db.subscription.count({ where: { planId: 'plan-lunch-only' } })
    if (refs > 0) {
      await db.subscriptionPlan.update({ where: { id: 'plan-lunch-only' }, data: { isActive: false } })
      console.log(`✔ plan-lunch-only hidden (${refs} subscription(s) still reference it — snapshots kept)`)
    } else {
      await db.subscriptionPlan.delete({ where: { id: 'plan-lunch-only' } })
      console.log('✔ plan-lunch-only deleted (no references)')
    }
  } else {
    console.log('• plan-lunch-only not present')
  }

  const all = await db.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } })
  console.log('\nCurrent plan catalog:')
  for (const p of all) {
    console.log(`  ${p.isActive ? '🟢' : '⚪'} ${p.sortOrder}. ${p.name} — ${p.mealsPerDay} meals/day · EGP ${p.monthlyPrice}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
