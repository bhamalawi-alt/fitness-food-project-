'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Plus, Search, Calculator, CalendarCheck, Beef, Wheat, Droplets } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/lib/store'
import { CATEGORIES, type Product } from '@/lib/types'
import { fetchJSON, fmtEGP } from '@/lib/api'

interface StorefrontProps {
  goToCalculator: () => void
  goToPlans: () => void
}

export function Storefront({ goToCalculator, goToPlans }: StorefrontProps) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [query, setQuery] = useState('')
  const add = useCart((s) => s.add)
  const { toast } = useToast()

  useEffect(() => {
    fetchJSON<Product[]>('/api/products')
      .then(setProducts)
      .catch(() => toast({ title: 'Could not load the menu', description: 'Please refresh the page.', variant: 'destructive' }))
  }, [toast])

  const filtered = useMemo(() => {
    if (!products) return []
    return products.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (query.trim() === '' || p.name.toLowerCase().includes(query.trim().toLowerCase()))
    )
  }, [products, category, query])

  const handleAdd = (p: Product) => {
    add(p)
    toast({ title: `${p.emoji} ${p.name} added`, description: `${p.calories} kcal · ${fmtEGP(p.price)}`, duration: 2000 })
  }

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-emerald-50 via-white to-lime-50">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgba(16,185,129,0.18) 0, transparent 45%), radial-gradient(circle at 85% 75%, rgba(132,204,22,0.15) 0, transparent 40%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 gap-1.5 border-emerald-300 bg-white/70 text-emerald-700">
              <Flame className="h-3.5 w-3.5" /> Macro-tracked meal prep
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Eat for your <span className="text-emerald-600">goals</span>,<br className="hidden sm:block" /> not against them.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
              Every meal is calorie-counted and macro-balanced. Calculate your daily target, build your box,
              and we deliver it fresh — the numbers are already done for you.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="gap-2" onClick={goToCalculator}>
                <Calculator className="h-4 w-4" /> Calculate my calories
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-emerald-300 bg-white/70 text-emerald-700 hover:bg-emerald-50"
                onClick={() => document.getElementById('menu-grid')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Browse meals
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-emerald-300 bg-white/70 text-emerald-700 hover:bg-emerald-50"
                onClick={goToPlans}
              >
                <CalendarCheck className="h-4 w-4" /> Monthly plans
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-gray-500">
              <span>🥗 20+ ready meals</span>
              <span>📏 Portion-accurate macros</span>
              <span>🚚 Fresh daily delivery</span>
              <span>📦 Monthly plans from EGP 5,499</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Menu ---------- */}
      <section id="menu-grid" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Today&apos;s Menu</h2>
            <p className="text-sm text-muted-foreground">Calories and macros are shown per full portion.</p>
          </div>
          <div className="relative w-full sm:w-72">
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

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Meal categories">
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

        {!products ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="mt-4 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-4 h-9 w-full" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">
            <p className="text-lg">🍽️ No meals match your search.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setQuery(''); setCategory('all') }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
              >
                <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-emerald-100 via-lime-50 to-amber-50 text-6xl">
                    <span className="drop-shadow-sm transition-transform duration-300 group-hover:scale-110" role="img" aria-label={p.name}>
                      {p.emoji}
                    </span>
                    <Badge className="absolute left-3 top-3 gap-1 bg-white/90 text-emerald-700 shadow-sm hover:bg-white/90">
                      <Flame className="h-3.5 w-3.5" /> {p.calories} kcal
                    </Badge>
                  </div>
                  <CardContent className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-snug">{p.name}</h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 font-medium text-red-700">
                        <Beef className="h-3 w-3" /> {p.protein}g protein
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-700">
                        <Wheat className="h-3 w-3" /> {p.carbs}g carbs
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 font-medium text-sky-700">
                        <Droplets className="h-3 w-3" /> {p.fat}g fat
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t bg-gray-50/60 p-4">
                    <span className="text-lg font-bold text-emerald-700">{fmtEGP(p.price)}</span>
                    <Button size="sm" className="gap-1.5" onClick={() => handleAdd(p)} aria-label={`Add ${p.name} to cart`}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
