import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const sub = await db.subscription.findUnique({ where: { reference: 'FS-1007' }, include: { plan: true, meals: true, client: true } })
  if (!sub) { console.log('FS-1007 NOT FOUND'); return }
  console.log(`${sub.reference} · ${sub.client.name} · ${sub.plan.name} (${sub.mealsPerDay}/day) · ${sub.meals.length} meals: ${sub.meals.map(m => m.emoji + m.name).join(' · ')}`)
  // cleanup this UI test record
  await db.subscriptionMeal.deleteMany({ where: { subscriptionId: sub.id } })
  await db.subscription.delete({ where: { id: sub.id } })
  await db.client.deleteMany({ where: { phone: '01000000099' } })
  console.log('→ cleaned up UI test record')
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
