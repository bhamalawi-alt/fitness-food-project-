import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const ps = await db.product.findMany({ select: { id: true, name: true, category: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] })
  for (const p of ps) console.log(`${p.id}  [${p.category}]  ${p.name}`)
}
main().finally(() => db.$disconnect())
