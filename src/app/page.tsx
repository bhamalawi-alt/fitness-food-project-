'use client'

import { useState, useSyncExternalStore } from 'react'
import { Calculator, Leaf, ClipboardList, ShoppingBag, Smartphone, UtensilsCrossed, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Storefront } from '@/components/fitfuel/storefront'
import { CartSheet } from '@/components/fitfuel/cart-sheet'
import { CalorieCalculator } from '@/components/fitfuel/calculator'
import { PlansView } from '@/components/fitfuel/plans-view'
import { AdminDashboard } from '@/components/fitfuel/admin/dashboard'
import { MobileAppShell } from '@/components/fitfuel/mobile/app-shell'
import { cartTotals, useCart } from '@/lib/store'

type View = 'menu' | 'calculator' | 'plans' | 'admin' | 'app'

const NAV: { value: View; label: string; icon: typeof Leaf }[] = [
  { value: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { value: 'calculator', label: 'Calorie Calculator', icon: Calculator },
  { value: 'plans', label: 'Plans', icon: CalendarCheck },
  { value: 'admin', label: 'Dashboard', icon: ClipboardList },
  { value: 'app', label: 'Mobile App', icon: Smartphone },
]

const emptySubscribe = () => () => {}

export default function Home() {
  const [explicitView, setExplicitView] = useState<View | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  // Hydration-safe mounted flag (server snapshot = false, client = true)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  // Deep link: /#app (e.g. the installed PWA) opens the app directly until the user navigates
  const hashIsApp = useSyncExternalStore(emptySubscribe, () => window.location.hash === '#app', () => false)
  const view: View = explicitView ?? (hashIsApp ? 'app' : 'menu')
  const items = useCart((s) => s.items)
  const totals = cartTotals(items)

  const switchView = (v: View) => {
    setExplicitView(v)
    window.history.replaceState(null, '', v === 'app' ? '#app' : window.location.pathname)
    window.scrollTo({ top: 0 })
  }

  const goToCalculator = () => {
    setExplicitView('calculator')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToPlans = () => {
    setExplicitView('plans')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ---------- Mobile app mode: takes over the whole page ---------- */
  if (view === 'app') {
    return <MobileAppShell onExit={() => switchView('menu')} />
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <button className="flex items-center gap-2" onClick={() => switchView('menu')} aria-label="FitFuel home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Fit<span className="text-emerald-600">Fuel</span>
            </span>
          </button>

          <nav className="hidden gap-1 sm:flex" aria-label="Main navigation">
            {NAV.map((n) => (
              <button
                key={n.value}
                onClick={() => switchView(n.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  view === n.value ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-current={view === n.value ? 'page' : undefined}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </nav>

          <Button className="relative gap-2" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${mounted ? totals.count : 0} items`}>
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Box</span>
            {mounted && totals.count > 0 && (
              <Badge className="absolute -right-2 -top-2 min-w-5 justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white hover:bg-orange-500">
                {totals.count}
              </Badge>
            )}
          </Button>
        </div>

        {/* Mobile nav */}
        <nav className="flex gap-1 border-t bg-white px-2 py-1.5 sm:hidden" aria-label="Mobile navigation">
          {NAV.map((n) => (
            <button
              key={n.value}
              onClick={() => switchView(n.value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                view === n.value ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
              }`}
              aria-current={view === n.value ? 'page' : undefined}
            >
              <n.icon className="h-4 w-4" />
              {n.label === 'Calorie Calculator' ? 'Calculator' : n.label === 'Mobile App' ? 'App' : n.label}
            </button>
          ))}
        </nav>
      </header>
      {/* ---------- Main ---------- */}
      <main className="flex-1">
        {view === 'menu' && <Storefront goToCalculator={goToCalculator} goToPlans={goToPlans} />}
        {view === 'calculator' && <CalorieCalculator onOrderPlaced={() => setCartOpen(true)} goToPlans={goToPlans} />}
        {view === 'plans' && <PlansView />}
        {view === 'admin' && <AdminDashboard />}
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="mt-auto border-t bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="flex items-center gap-1.5 font-bold">
                <Leaf className="h-4 w-4 text-emerald-600" /> FitFuel
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Calorie-calculated meals, delivered fresh.</p>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} FitFuel · Prices in EGP · Nutrition values are estimates per portion
            </p>
          </div>
        </div>
      </footer>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  )
}
