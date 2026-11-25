import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const sub = await db.subscription.findUnique({ where: { reference: 'FS-1006' }, include: { meals: true } })
  console.log(`FS-1006 now has ${sub?.meals.length} meals: ${sub?.meals.map(m => m.emoji + m.name).join(' · ')}`)
}
main().finally(() => db.$disconnect())
