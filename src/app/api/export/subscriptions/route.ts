import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Subscription revenue journal CSV — for the accounting system.
 * One row per subscription: plan, price, status, payment and renewal dates.
 */
export async function GET() {
  const subs = await db.subscription.findMany({
    include: { client: true, plan: true, meals: true },
    orderBy: { createdAt: 'asc' },
  })

  const header = [
    'Reference', 'Client', 'Phone', 'Email', 'Plan', 'Meals/Day', 'Days/Month',
    'Monthly Price', 'Status', 'Payment Status', 'Paid At', 'Start Date', 'Next Renewal', 'Chosen Meals', 'Notes',
  ]
  const rows = subs.map((s) => [
    s.reference,
    s.client.name,
    s.client.phone,
    s.client.email ?? '',
    s.plan.name,
    s.mealsPerDay,
    s.plan.daysPerMonth,
    s.price.toFixed(2),
    s.status,
    s.paymentStatus,
    s.paidAt ? new Date(s.paidAt).toISOString().slice(0, 10) : '',
    new Date(s.startDate).toISOString().slice(0, 10),
    new Date(s.renewalDate).toISOString().slice(0, 10),
    s.meals.map((m) => m.name).join('; '),
    s.notes ?? '',
  ])

  const activeValue = subs
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + s.price, 0)
  const summary = ['', `ACTIVE MRR (${subs.filter((s) => s.status === 'active').length} active)`, '', '', '', '', '', activeValue.toFixed(2), '', '', '', '', '', '', '', '']

  const body = [header, ...rows, summary].map((r) => r.map(csvEscape).join(',')).join('\n')

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fitfuel-subscriptions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
