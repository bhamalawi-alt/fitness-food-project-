import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const subs = await db.subscription.findMany({
    include: { client: true, plan: true, meals: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(subs)
}

/**
 * Start a subscription. Flow: the client picks a PLAN first, then CHOOSES
 * THEIR MEALS from the menu listing (mealIds), then provides details.
 * Prices/meals/calories are snapshotted from live catalog data on the
 * server — dashboard edits always win over whatever the browser cached.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planId, customer, startDate, notes, mealIds } = body
    const { name, phone, email, address } = customer ?? {}

    if (!planId) return NextResponse.json({ error: 'Please choose a plan' }, { status: 400 })
    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }
    if (!address?.trim()) {
      return NextResponse.json({ error: 'Delivery address is required for subscriptions' }, { status: 400 })
    }

    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'This plan is not available' }, { status: 400 })
    }

    // ---- Meal selection (chosen by the client after picking the plan) ----
    // The plan includes EXACTLY mealsPerDay meals — mandatory, not a minimum.
    if (!Array.isArray(mealIds) || mealIds.length === 0) {
      return NextResponse.json({ error: 'Please choose the meals for your plan' }, { status: 400 })
    }
    const uniqueIds = [...new Set(mealIds.map((m: unknown) => String(m)))]
    if (uniqueIds.length !== plan.mealsPerDay) {
      return NextResponse.json(
        {
          error: `The ${plan.name} plan includes exactly ${plan.mealsPerDay} meal${plan.mealsPerDay > 1 ? 's' : ''} — please choose exactly ${plan.mealsPerDay}`,
        },
        { status: 400 }
      )
    }
    // Validate against the live menu managed from the dashboard
    const products = await db.product.findMany({ where: { id: { in: uniqueIds }, isActive: true } })
    if (products.length < uniqueIds.length) {
      return NextResponse.json(
        { error: 'Some of the chosen meals are no longer on the menu — please review your selection' },
        { status: 400 }
      )
    }

    // Start date: today by default, or YYYY-MM-DD from the form
    let start = new Date()
    if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const s = new Date(`${startDate}T00:00:00`)
      if (!Number.isNaN(s.getTime())) start = s
    }
    const renewal = new Date(start)
    renewal.setDate(renewal.getDate() + 30)

    const client = await db.client.upsert({
      where: { phone: String(phone).trim() },
      update: {
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        address: String(address).trim(),
      },
      create: {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        address: String(address).trim(),
      },
    })

    const count = await db.subscription.count()

    const subscription = await db.subscription.create({
      data: {
        reference: `FS-${String(count + 1001).padStart(4, '0')}`,
        clientId: client.id,
        planId: plan.id,
        status: 'active',
        paymentStatus: 'unpaid',
        startDate: start,
        renewalDate: renewal,
        price: plan.monthlyPrice,
        mealsPerDay: plan.mealsPerDay,
        targetCalories: plan.targetCalories,
        notes: notes ? String(notes).trim() : null,
        meals: {
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
        },
      },
      include: { client: true, plan: true, meals: true },
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}
