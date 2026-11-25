import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const [orders, clientCount, activeProducts, subs] = await Promise.all([
    db.order.findMany({ include: { items: true } }),
    db.client.count(),
    db.product.count({ where: { isActive: true } }),
    db.subscription.findMany(),
  ])

  // Store orders = one-off purchases (subscription fulfilment orders carry EGP 0)
  const storeOrders = orders.filter((o) => !o.subscriptionId)
  const validStore = storeOrders.filter((o) => o.status !== 'cancelled')
  const revenue = validStore.reduce((s, o) => s + o.total, 0)
  const paidRevenue = validStore.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0)

  // Revenue by day (last 14 days)
  const days: { date: string; revenue: number; orders: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push({ date: d.toISOString().slice(0, 10), revenue: 0, orders: 0 })
  }
  for (const o of validStore) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10)
    const day = days.find((x) => x.date === key)
    if (day) { day.revenue += o.total; day.orders += 1 }
  }

  // Status breakdown (all orders, incl. subscription deliveries)
  const statusMap = new Map<string, number>()
  for (const o of orders) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1)

  // Top products
  const prodMap = new Map<string, { name: string; emoji: string; qty: number; revenue: number }>()
  for (const o of orders.filter((x) => x.status !== 'cancelled')) {
    for (const it of o.items) {
      const cur = prodMap.get(it.productName) ?? { name: it.productName, emoji: it.emoji, qty: 0, revenue: 0 }
      cur.qty += it.quantity
      cur.revenue += it.lineTotal
      prodMap.set(it.productName, cur)
    }
  }

  // Subscription metrics
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekAhead = new Date(todayStart)
  weekAhead.setDate(weekAhead.getDate() + 7)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const activeSubs = subs.filter((s) => s.status === 'active' && s.renewalDate >= todayStart)
  const subscriptionMRR = activeSubs.reduce((s, x) => s + x.price, 0)
  const expiringSubscriptions = activeSubs.filter((s) => s.renewalDate < weekAhead).length
  const subscriptionCollectedThisMonth = subs
    .filter((s) => s.paidAt && s.paidAt >= monthStart)
    .reduce((s, x) => s + x.price, 0)
  const todayDeliveries = orders.filter(
    (o) => o.subscriptionId && new Date(o.createdAt) >= todayStart
  ).length

  return NextResponse.json({
    revenue: Math.round(revenue * 100) / 100,
    paidRevenue: Math.round(paidRevenue * 100) / 100,
    orderCount: storeOrders.length,
    clientCount,
    avgOrderValue: validStore.length ? Math.round((revenue / validStore.length) * 100) / 100 : 0,
    pendingCount: orders.filter((o) => o.status === 'pending').length,
    deliveredCount: orders.filter((o) => o.status === 'delivered').length,
    activeProducts,
    revenueByDay: days,
    statusBreakdown: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
    topProducts: [...prodMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    subscriptionMRR: Math.round(subscriptionMRR * 100) / 100,
    activeSubscriptions: activeSubs.length,
    expiringSubscriptions,
    subscriptionCollectedThisMonth: Math.round(subscriptionCollectedThisMonth * 100) / 100,
    todayDeliveries,
  })
}
