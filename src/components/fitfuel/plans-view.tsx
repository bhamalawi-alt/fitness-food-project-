'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, Check, Sparkles, UtensilsCrossed } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchJSON, fmtEGP } from '@/lib/api'
import { PlanSubscribeFlow } from '@/components/fitfuel/plan-subscribe-flow'
import type { SubscriptionPlanDTO } from '@/lib/types'

/**
 * Plans page — step 1: the client picks a plan, then the PlanSubscribeFlow
 * lets them CHOOSE THEIR MEALS from the menu listing and check out.
 */
export function PlansView() {
  const [plans, setPlans] = useState<SubscriptionPlanDTO[] | null>(null)
  const [picked, setPicked] = useState<SubscriptionPlanDTO | null>(null)

  useEffect(() => {
    fetchJSON<SubscriptionPlanDTO[]>('/api/plans')
      .then(setPlans)
      .catch(() => setPlans([]))
  }, [])

  // Step 2+3: meal selection + details for the picked plan
  if (picked) {
    return <PlanSubscribeFlow plan={picked} onExit={() => setPicked(null)} />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <Badge variant="outline" className="mb-3 border-emerald-300 bg-emerald-50 text-emerald-700">
          <Sparkles className="mr-1 h-3.5 w-3.5" /> Monthly subscriptions
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Monthly Meal Plans</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Pick a plan — <strong>2 to 5 meals a day</strong> — then <strong>choose exactly the meals in it</strong> from
          our menu. We deliver them fresh all month. Pause or cancel anytime.
        </p>
      </div>

      {!plans ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="mx-auto h-12 w-12 rounded-xl" />
              <Skeleton className="mx-auto mt-4 h-6 w-1/2" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-6 h-24 w-full" />
              <Skeleton className="mt-6 h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          Subscription plans are coming soon — please check back shortly.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p, idx) => {
            const popular = idx === 1
            const perDay = p.daysPerMonth > 0 ? p.monthlyPrice / p.daysPerMonth : p.monthlyPrice
            const features = p.features.split('|').map((f) => f.trim()).filter(Boolean)
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.06 }}
                className={popular ? 'md:-mt-3' : ''}
              >
                <Card className={`relative flex h-full flex-col ${popular ? 'border-emerald-500 shadow-lg shadow-emerald-100' : ''}`}>
                  {popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 bg-emerald-600 hover:bg-emerald-600">
                      <Sparkles className="h-3 w-3" /> Most popular
                    </Badge>
                  )}
                  <CardHeader className="items-center pb-2 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-lime-50 text-3xl">
                      {p.emoji}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{p.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <div className="text-center">
                      <span className="text-3xl font-extrabold tracking-tight text-emerald-700">{fmtEGP(p.monthlyPrice)}</span>
                      <span className="text-sm text-muted-foreground"> / month</span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        ≈ {fmtEGP(Math.round(perDay))} per delivery day
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-gray-50 p-2">
                        <p className="text-base font-bold">{p.mealsPerDay}</p>
                        <p className="text-muted-foreground">meals/day</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-2">
                        <p className="text-base font-bold">{p.daysPerMonth >= 30 ? '30' : p.daysPerMonth}</p>
                        <p className="text-muted-foreground">{p.daysPerMonth >= 30 ? 'days/month' : 'Sun–Thu'}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-2">
                        <p className="text-base font-bold">{p.targetCalories.toLocaleString()}</p>
                        <p className="text-muted-foreground">kcal/day</p>
                      </div>
                    </div>
                    {features.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                  <CardFooter className="mt-auto flex-col gap-2">
                    <Button className="w-full gap-2" size="lg" onClick={() => setPicked(p)}>
                      <UtensilsCrossed className="h-4 w-4" /> Choose your {p.mealsPerDay} meals
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Pick exactly {p.mealsPerDay} meals after selecting the plan · first payment on your first delivery
                    </p>
                  </CardFooter>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="mt-10 grid gap-3 rounded-xl border bg-gray-50 p-5 text-sm text-muted-foreground sm:grid-cols-3">
        <p className="flex items-start gap-2"><CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> 30-day cycles, renewed from your dashboard or by phone</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Pause anytime — travelling? Skip the days you need</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Your meals, your menu — pick exactly what arrives, swap anytime by phone</p>
      </div>
    </div>
  )
}
