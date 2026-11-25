import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Sales journal CSV export — designed to be imported into an accounting system.
 * Optional filters: ?from=YYYY-MM-DD&to=YYYY-MM-DD&status=delivered
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const from = sp.get('from')
  const to = sp.get('to')
  const status = sp.get('status')

  const orders = await db.order.findMany({
    include: { client: true, items: true },
    where: {
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'asc' },
  })

  const header = [
    'Order Number', 'Date', 'Customer', 'Phone', 'Email',
    'Items', 'Subtotal', 'Delivery Fee', 'Discount', 'Total',
    'Payment Method', 'Payment Status', 'Order Status', 'Notes',
  ]
  const rows = orders.map((o) => [
    o.orderNumber,
    new Date(o.createdAt).toISOString().slice(0, 10),
    o.client.name,
    o.client.phone,
    o.client.email ?? '',
    o.items.map((i) => `${i.quantity}x ${i.productName}`).join(' | '),
    o.subtotal.toFixed(2),
    o.deliveryFee.toFixed(2),
    o.discount.toFixed(2),
    o.total.toFixed(2),
    o.paymentMethod.toUpperCase(),
    o.paymentStatus,
    o.status,
    o.notes ?? '',
  ])

  const total = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
  const summary = ['', `TOTAL (${orders.length} orders)`, '', '', '', '', '', '', '', total.toFixed(2), '', '', '', '']
  const body = [header, ...rows, summary]
    .map((r) => r.map(csvEscape).join(','))
    .join('\n')

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fitfuel-sales-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
