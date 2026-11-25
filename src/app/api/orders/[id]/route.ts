import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      data.status = body.status
    }
    if (body.paymentStatus !== undefined) {
      data.paymentStatus = body.paymentStatus === 'paid' ? 'paid' : 'unpaid'
    }
    if (body.notes !== undefined) data.notes = String(body.notes)
    const order = await db.order.update({ where: { id }, data, include: { client: true, items: true } })
    return NextResponse.json(order)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const order = await db.order.findUnique({ where: { id }, select: { status: true } })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (order.status !== 'pending' && order.status !== 'cancelled') {
      return NextResponse.json({ error: 'Only pending or cancelled orders can be deleted' }, { status: 400 })
    }
    await db.order.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
