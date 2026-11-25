import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === 'true'
  const products = await db.product.findMany({
    where: all ? {} : { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, category, calories, protein, carbs, fat, price, emoji } = body
    if (!name?.trim() || !category || calories == null || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const product = await db.product.create({
      data: {
        name: String(name).trim(),
        description: String(description ?? '').trim(),
        category,
        calories: Math.round(Number(calories)),
        protein: Math.round(Number(protein) || 0),
        carbs: Math.round(Number(carbs) || 0),
        fat: Math.round(Number(fat) || 0),
        price: Number(price),
        emoji: String(emoji || '🍽️'),
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
