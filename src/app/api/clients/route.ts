import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const clients = await db.client.findMany({
    include: { orders: { select: { total: true, createdAt: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const result = clients.map((c) => {
    const valid = c.orders.filter((o) => o.status !== 'cancelled')
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      createdAt: c.createdAt,
      orderCount: valid.length,
      totalSpent: Math.round(valid.reduce((s, o) => s + o.total, 0) * 100) / 100,
      lastOrderAt: valid.length ? valid.map((o) => o.createdAt).sort((a, b) => b.getTime() - a.getTime())[0] : null,
    }
  })
  return NextResponse.json(result)
}
