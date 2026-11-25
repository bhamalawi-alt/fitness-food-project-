'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from './types'

interface CartState {
  items: CartItem[]
  add: (product: Product, qty?: number) => void
  addMany: (products: Product[]) => void
  remove: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  clear: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (product, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i
              ),
            }
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                name: product.name,
                emoji: product.emoji,
                category: product.category,
                price: product.price,
                calories: product.calories,
                protein: product.protein,
                carbs: product.carbs,
                fat: product.fat,
                quantity: qty,
              },
            ],
          }
        }),
      addMany: (products) =>
        set((state) => {
          const next = [...state.items]
          for (const product of products) {
            const idx = next.findIndex((i) => i.productId === product.id)
            if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
            else
              next.push({
                productId: product.id,
                name: product.name,
                emoji: product.emoji,
                category: product.category,
                price: product.price,
                calories: product.calories,
                protein: product.protein,
                carbs: product.carbs,
                fat: product.fat,
                quantity: 1,
              })
          }
          return { items: next }
        }),
      remove: (productId) => set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      setQty: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'fitfuel-cart' }
  )
)

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const calories = items.reduce((s, i) => s + i.calories * i.quantity, 0)
  const protein = items.reduce((s, i) => s + i.protein * i.quantity, 0)
  const carbs = items.reduce((s, i) => s + i.carbs * i.quantity, 0)
  const fat = items.reduce((s, i) => s + i.fat * i.quantity, 0)
  const count = items.reduce((s, i) => s + i.quantity, 0)
  return { subtotal, calories, protein, carbs, fat, count }
}
