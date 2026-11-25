import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    for (const key of ['name', 'description', 'emoji', 'features']) {
      if (body[key] !== undefined) data[key] = String(body[key]).trim()
    }
    if (body.mealsPerDay !== undefined) data.mealsPerDay = Math.max(2, Math.min(5, Math.round(Number(body.mealsPerDay) || 2)))
    if (body.daysPerMonth !== undefined) data.daysPerMonth = Math.max(1, Math.min(31, Math.round(Number(body.daysPerMonth) || 22)))
    if (body.targetCalories !== undefined) data.targetCalories = Math.max(200, Math.round(Number(body.targetCalories) || 1500))
    if (body.monthlyPrice !== undefined) data.monthlyPrice = Number(body.monthlyPrice)
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    const plan = await db.subscriptionPlan.update({ where: { id }, data })
    return NextResponse.json(plan)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const inSubs = await db.subscription.count({ where: { planId: id } })
    if (inSubs > 0) {
      await db.subscriptionPlan.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ deactivated: true })
    }
    await db.subscriptionPlan.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
