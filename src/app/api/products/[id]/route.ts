import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    for (const key of ['name', 'description', 'category', 'emoji']) {
      if (body[key] !== undefined) data[key] = String(body[key]).trim()
    }
    for (const key of ['calories', 'protein', 'carbs', 'fat']) {
      if (body[key] !== undefined) data[key] = Math.round(Number(body[key]) || 0)
    }
    if (body.price !== undefined) data.price = Number(body.price)
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    const product = await db.product.update({ where: { id }, data })
    return NextResponse.json(product)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const inOrders = await db.orderItem.count({ where: { productId: id } })
    if (inOrders > 0) {
      // keep history intact — just deactivate
      await db.product.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ deactivated: true })
    }
    await db.product.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
