import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === 'true'
  const plans = await db.subscriptionPlan.findMany({
    where: all ? {} : { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, emoji, mealsPerDay, daysPerMonth, targetCalories, monthlyPrice, features } = body
    if (!name?.trim() || monthlyPrice == null) {
      return NextResponse.json({ error: 'Name and monthly price are required' }, { status: 400 })
    }
    const count = await db.subscriptionPlan.count()
    const plan = await db.subscriptionPlan.create({
      data: {
        name: String(name).trim(),
        description: String(description ?? '').trim(),
        emoji: String(emoji || '📦'),
        mealsPerDay: Math.max(2, Math.min(5, Math.round(Number(mealsPerDay) || 2))),
        daysPerMonth: Math.max(1, Math.min(31, Math.round(Number(daysPerMonth) || 22))),
        targetCalories: Math.max(200, Math.round(Number(targetCalories) || 1500)),
        monthlyPrice: Number(monthlyPrice),
        features: String(features ?? ''),
        sortOrder: count + 1,
      },
    })
    return NextResponse.json(plan, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}
