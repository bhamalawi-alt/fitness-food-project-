import { NextRequest, NextResponse } from 'next/server'
import type { Product } from '@prisma/client'
import { db } from '@/lib/db'

export async function GET() {
  const orders = await db.order.findMany({
    include: { client: true, items: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(orders)
}

interface IncomingItem {
  productId: string
  name: string
  emoji?: string
  category?: string
  price: number
  calories: number
  quantity: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer, items, deliveryFee = 0, paymentMethod = 'cod', notes } = body
    const { name, phone, email, address } = customer ?? {}
    const cart: IncomingItem[] = Array.isArray(items) ? items : []

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Customer name and phone are required' }, { status: 400 })
    }
    if (cart.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Validate against live prices from DB (never trust client prices for accounting)
    const priced: { p: Product; qty: number }[] = []
    for (const it of cart) {
      const p = await db.product.findUnique({ where: { id: it.productId } })
      if (!p || !p.isActive) {
        return NextResponse.json({ error: `${it.name} is no longer available` }, { status: 400 })
      }
      const qty = Math.max(1, Math.min(99, Math.round(Number(it.quantity) || 1)))
      priced.push({ p, qty })
    }

    const subtotal = priced.reduce((s, { p, qty }) => s + p.price * qty, 0)
    const totalCalories = priced.reduce((s, { p, qty }) => s + p.calories * qty, 0)
    const fee = Math.max(0, Number(deliveryFee) || 0)
    const total = subtotal + fee

    // CRM: upsert client by phone
    const client = await db.client.upsert({
      where: { phone: String(phone).trim() },
      update: {
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
      },
      create: {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
      },
    })

    const count = await db.order.count()
    const orderNumber = `FF-${String(count + 1001).padStart(4, '0')}`

    const order = await db.order.create({
      data: {
        orderNumber,
        clientId: client.id,
        status: 'pending',
        paymentMethod: ['cod', 'card', 'wallet'].includes(paymentMethod) ? paymentMethod : 'cod',
        paymentStatus: 'unpaid',
        subtotal: Math.round(subtotal * 100) / 100,
        deliveryFee: fee,
        discount: 0,
        total: Math.round(total * 100) / 100,
        totalCalories,
        notes: notes ? String(notes).trim() : null,
        items: {
          create: priced.map(({ p, qty }) => ({
            productId: p.id,
            productName: p.name,
            emoji: p.emoji,
            category: p.category,
            unitPrice: p.price,
            quantity: qty,
            lineTotal: Math.round(p.price * qty * 100) / 100,
            calories: p.calories,
          })),
        },
      },
      include: { client: true, items: true },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
