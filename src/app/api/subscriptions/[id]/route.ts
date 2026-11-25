import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const STATUSES = ['active', 'paused', 'cancelled']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.subscription.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      data.status = body.status
    }
    if (body.paymentStatus !== undefined) {
      if (body.paymentStatus === 'paid') {
        data.paymentStatus = 'paid'
        data.paidAt = new Date()
      } else {
        data.paymentStatus = 'unpaid'
        data.paidAt = null
      }
    }
    if (body.renew === true) {
      // Extend 30 days from the later of (current renewal, today)
      const base = existing.renewalDate > new Date() ? existing.renewalDate : new Date()
      const next = new Date(base)
      next.setDate(next.getDate() + 30)
      data.renewalDate = next
      data.paymentStatus = 'unpaid'
      data.paidAt = null
    }
    if (body.notes !== undefined) data.notes = String(body.notes)

    // ---- Replace the client's meal selection (from the dashboard) ----
    // The plan includes EXACTLY mealsPerDay meals — mandatory, not a minimum.
    if (Array.isArray(body.mealIds)) {
      const rawIds: unknown[] = body.mealIds
      const uniqueIds = [...new Set(rawIds.map((m) => String(m)))]
      if (uniqueIds.length !== existing.mealsPerDay) {
        return NextResponse.json(
          {
            error: `A plan with ${existing.mealsPerDay} meals/day needs exactly ${existing.mealsPerDay} meals — currently ${uniqueIds.length}`,
          },
          { status: 400 }
        )
      }
      const products = await db.product.findMany({ where: { id: { in: uniqueIds }, isActive: true } })
      if (products.length < uniqueIds.length) {
        return NextResponse.json({ error: 'Some of the chosen meals are no longer on the menu' }, { status: 400 })
      }
      data.meals = {
        deleteMany: {},
        create: products.map((p) => ({
          productId: p.id,
          name: p.name,
          emoji: p.emoji,
          category: p.category,
          calories: p.calories,
          protein: p.protein,
          carbs: p.carbs,
          fat: p.fat,
        })),
      }
    }

    const subscription = await db.subscription.update({
      where: { id },
      data,
      include: { client: true, plan: true, meals: true },
    })
    return NextResponse.json(subscription)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sub = await db.subscription.findUnique({ where: { id }, select: { status: true } })
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (sub.status === 'active') {
      return NextResponse.json({ error: 'Cancel the subscription before deleting it' }, { status: 400 })
    }
    const orderCount = await db.order.count({ where: { subscriptionId: id } })
    if (orderCount > 0) {
      return NextResponse.json({ error: 'This subscription has delivery history and cannot be deleted' }, { status: 400 })
    }
    await db.subscription.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
  }
}
