import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  await db.subscriptionPlan.update({ where: { id: 'plan-lunch-only' }, data: { sortOrder: 0 } })
  const subs = await db.subscription.findMany({ include: { plan: true, _count: { select: { meals: true } } }, orderBy: { reference: 'asc' } })
  for (const s of subs) {
    console.log(`${s.reference} · ${s.plan.name} (${s.mealsPerDay} meals/day snapshot) · ${s._count.meals} meals selected · ${s.status}`)
  }
}
main().catch(console.error).finally(() => db.$disconnect())
