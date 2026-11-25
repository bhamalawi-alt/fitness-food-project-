'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Beef, Check, Flame, Lock, Search, Wheat } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORIES, type Product } from '@/lib/types'

interface MealPickerProps {
  products: Product[] | null
  /** product ids currently selected */
  selected: string[]
  onToggle: (productId: string) => void
  /** compact cards (used inside dashboard dialogs) */
  compact?: boolean
  /** render for the mobile app shell: single column, no responsive prefixes */
  inApp?: boolean
  /** exact number of meals the plan allows (e.g. plan.mealsPerDay).
   * Once selected.length reaches it, every OTHER meal is locked
   * (grayed out + unclickable) until one of the chosen ones is deselected. */
  maxSelected?: number
}

/**
 * Listing of meals the client chooses from after picking a plan.
 * Same menu data the storefront uses — fully managed from the dashboard.
 */
export function MealPicker({ products, selected, onToggle, compact, inApp, maxSelected }: MealPickerProps) {
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const atLimit = maxSelected !== undefined && selected.length >= maxSelected

  const filtered = useMemo(() => {
    if (!products) return []
    return products.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (query.trim() === '' || p.name.toLowerCase().includes(query.trim().toLowerCase()))
    )
  }, [products, category, query])

  return (
    <div>
      {maxSelected !== undefined && atLimit && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          You&apos;ve picked all {maxSelected} meals for this plan — deselect one if you want to swap it.
        </div>
      )}

      {/* Search + category tabs */}
      <div className={inApp ? 'flex flex-col gap-3' : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'}>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Meal categories">
          <button
            role="tab"
            aria-selected={category === 'all'}
            onClick={() => setCategory('all')}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              category === 'all'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            All meals
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              role="tab"
              aria-selected={category === c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                category === c.value
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div className={inApp ? 'relative w-full' : 'relative w-full sm:w-60'}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search meals..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search meals"
          />
        </div>
      </div>

      {/* Meal listing */}
      {!products ? (
        <div className={`mt-6 grid gap-3 ${inApp ? 'grid-cols-1' : compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 text-center text-muted-foreground">
          <p className="text-lg">🍽️ No meals match your search.</p>
          <Button variant="outline" className="mt-3" onClick={() => { setQuery(''); setCategory('all') }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className={`mt-6 grid gap-3 ${inApp ? 'grid-cols-1' : compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {filtered.map((p, idx) => {
            const isOn = selectedSet.has(p.id)
            const locked = atLimit && !isOn
            return (
              <motion.button
                key={p.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.25) }}
                onClick={() => { if (!locked) onToggle(p.id) }}
                disabled={locked}
                aria-pressed={isOn}
                aria-disabled={locked}
                aria-label={locked ? `Meal box full — deselect a meal to add ${p.name}` : `${isOn ? 'Remove' : 'Add'} ${p.name}${isOn ? ' from' : ' to'} your meal selection`}
                title={locked ? 'Deselect one of your meals to swap in this one' : undefined}
                className={`group relative flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  locked
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50/80 opacity-50'
                    : isOn
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl ${
                    isOn ? 'bg-emerald-100' : 'bg-gradient-to-br from-emerald-50 to-lime-50'
                  }`}
                >
                  {p.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-snug">{p.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                      <Flame className="h-3 w-3" /> {p.calories} kcal
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Beef className="h-3 w-3" /> {p.protein}g protein
                    </span>
                    {!compact && (
                      <span className="inline-flex items-center gap-1">
                        <Wheat className="h-3 w-3" /> {p.carbs}g carbs
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    locked
                      ? 'border-gray-200 bg-gray-100 text-gray-400'
                      : isOn
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-gray-200 text-transparent group-hover:border-emerald-300'
                  }`}
                >
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />}
                </div>
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
