import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildPlanForCount } from '@/lib/calories'

/**
 * Generate today's fulfilment orders for active subscriptions.
 * - Everyday plans (daysPerMonth >= 30) deliver every day.
 * - Weekday plans deliver Sun–Thu (Egyptian working week).
 * - Daily menus are built from the MEALS THE CLIENT CHOSE for their plan
 *   (falls back to the full menu for subscriptions without a selection).
 * - Skips subscriptions that already have an order today.
 * - Orders are operationally tracked at EGP 0 (subscription discount nets
 *   out the food value) so revenue is NOT double-counted with the MRR.
 */
type MenuProduct = {
  id: string
  name: string
  emoji: string
  category: string
  calories: number
  price: number
}

/** Pick `count` distinct meals close to the per-meal target, with a
 *  category-agnostic fallback if the client's picks don't cover a slot. */
function pickMeals(pool: MenuProduct[], target: number, count: number): MenuProduct[] {
  let meals = buildPlanForCount(pool as never, target, count) as unknown as MenuProduct[]
  if (meals.length < count && pool.length > meals.length) {
    const perMeal = target / Math.max(1, count)
    const seen = new Set(meals.map((m) => m.id))
    const extra: MenuProduct[] = []
    for (const p of [...pool].sort((a, b) => Math.abs(a.calories - perMeal) - Math.abs(b.calories - perMeal))) {
      if (meals.length + extra.length >= count) break
      if (!seen.has(p.id)) {
        seen.add(p.id)
        extra.push(p)
      }
    }
    meals = [...meals, ...extra]
  }
  return meals
}

export async function POST() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const subs = await db.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true, client: true, meals: true },
    })
    const menu = await db.product.findMany({ where: { isActive: true } })
    const menuById = new Map(menu.map((p) => [p.id, p]))

    let created = 0
    let skipped = 0
    let notDue = 0

    for (const sub of subs) {
      const start = new Date(sub.startDate)
      start.setHours(0, 0, 0, 0)
      const renewalEnd = new Date(sub.renewalDate)
      renewalEnd.setHours(23, 59, 59, 999)

      if (today < start || today > renewalEnd) { notDue++; continue }

      const everyday = sub.plan.daysPerMonth >= 30
      const dow = today.getDay() // 0 Sun ... 5 Fri, 6 Sat
      if (!everyday && (dow === 5 || dow === 6)) { notDue++; continue }

      const existing = await db.order.findFirst({
        where: { subscriptionId: sub.id, createdAt: { gte: today, lte: todayEnd } },
        select: { id: true },
      })
      if (existing) { skipped++; continue }

      // The client's chosen meals drive the daily menu (live menu entries only;
      // if every pick was removed from the menu we fall back to the full menu)
      let pool: MenuProduct[] = menu
      if (sub.meals.length > 0) {
        const chosen = sub.meals
          .map((m) => (m.productId ? menuById.get(m.productId) : undefined))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
        if (chosen.length > 0) pool = chosen
      }

      const meals = pickMeals(pool, sub.targetCalories, sub.mealsPerDay)
      if (meals.length === 0) { notDue++; continue }

      const subtotal = meals.reduce((s, p) => s + p.price, 0)
      const orderCount = await db.order.count()

      await db.order.create({
        data: {
          orderNumber: `FF-${String(orderCount + 1001).padStart(4, '0')}`,
          clientId: sub.clientId,
          status: 'pending',
          paymentMethod: 'sub',
          paymentStatus: 'paid',
          subtotal: Math.round(subtotal * 100) / 100,
          deliveryFee: 0,
          discount: Math.round(subtotal * 100) / 100,
          total: 0,
          totalCalories: meals.reduce((s, p) => s + p.calories, 0),
          notes: `Subscription delivery ${sub.reference} · ${sub.plan.name}`,
          subscriptionId: sub.id,
          items: {
            create: meals.map((p) => ({
              productId: p.id,
              productName: p.name,
              emoji: p.emoji,
              category: p.category,
              unitPrice: p.price,
              quantity: 1,
              lineTotal: p.price,
              calories: p.calories,
            })),
          },
        },
      })
      created++
    }

    return NextResponse.json({ created, skipped, notDue, activeTotal: subs.length })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to generate orders' }, { status: 500 })
  }
}
