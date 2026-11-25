import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  // remove the API-test artifacts
  for (const ref of ['FS-1007', 'FS-1008']) {
    const sub = await db.subscription.findUnique({ where: { reference: ref } })
    if (!sub) { console.log(`• ${ref} already gone`); continue }
    const orders = await db.order.findMany({ where: { subscriptionId: sub.id }, select: { id: true, orderNumber: true } })
    for (const o of orders) {
      await db.orderItem.deleteMany({ where: { orderId: o.id } })
      await db.order.delete({ where: { id: o.id } })
      console.log(`  removed order ${o.orderNumber}`)
    }
    await db.subscriptionMeal.deleteMany({ where: { subscriptionId: sub.id } })
    await db.subscription.delete({ where: { id: sub.id } })
    console.log(`  removed subscription ${ref}`)
  }
  for (const phone of ['01000000001', '01000000002']) {
    const c = await db.client.findUnique({ where: { phone } })
    if (!c) continue
    const remaining = await db.subscription.count({ where: { clientId: c.id } }) + await db.order.count({ where: { clientId: c.id } })
    if (remaining === 0) { await db.client.delete({ where: { id: c.id } }); console.log(`  removed client ${c.name} (${phone})`) }
    else console.log(`  kept client ${c.name} (${remaining} records)`)
  }
  const subs = await db.subscription.findMany({ orderBy: { reference: 'asc' } })
  console.log(`\nFinal state: ${subs.length} subscriptions (${subs.map(s => s.reference).join(', ')})`)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
