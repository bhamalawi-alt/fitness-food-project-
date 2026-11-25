# CLAUDE.md — FitFuel

Handoff context for AI coding agents (Claude Code). Read this fully before touching anything.

## What this is

**FitFuel** — a fitness meal ordering & monthly subscription service for the Egyptian market (English UI, **EGP** currency). One Next.js app containing both the client storefront and the admin CRM. Everything about the catalog (products, plans) is CMS-managed from the in-app Dashboard.

## Stack

- Next.js 16 (App Router, single page `/` with client-side view switching) + TypeScript
- Tailwind CSS 4 + shadcn/ui (Radix) + Framer Motion + lucide-react icons
- Prisma ORM + SQLite — DB file `db/custom.db`, connection string in `.env` (`DATABASE_URL=file:../db/custom.db`)
- Zustand (persisted to localStorage, key `fitfuel-cart`) for the one-time-order cart
- Package manager: **bun** (`bun.lock`)

## Commands

```bash
bun run dev            # dev server on http://localhost:3000 (logs tee'd to dev.log)
bun run lint           # eslint
bunx tsc --noEmit      # typecheck — src/ must stay clean; errors in examples/ and skills/ are pre-existing template noise, ignore them
bunx prisma db push    # apply schema.prisma to SQLite
bun prisma/seed.ts     # reseed products + plans (upserts — safe to re-run)
bun run build          # production build (standalone output)
```

Run bun/node commands **from the project root** — scripts outside the project resolve a stale globally-cached `@prisma/client` and crash.

## App structure

```
src/app/page.tsx                        # shell; View = 'menu' | 'calculator' | 'plans' | 'admin' | 'app'
src/components/fitfuel/
  storefront.tsx                        # menu listing + single cart button
  cart-sheet.tsx                        # ONE-TIME order cart drawer (checkout → FF-#### order)
  plans-view.tsx                        # subscriptions step 1: pick a plan
  plan-subscribe-flow.tsx               # steps 2+3: choose exactly N meals → details → success
                                         #   (optional `inApp` prop: single-column, sticky bottom bar for the mobile app)
  meal-picker.tsx                       # meal selection grid with quota lock (shared client + admin; `inApp` = 1 column)
  calculator.tsx                        # Mifflin–St Jeor → TDEE → target kcal → builds a day plan into cart
  admin/dashboard.tsx                   # CRM shell with tabs
  admin/{orders,clients,products,subscriptions}-tab.tsx
  mobile/                               # 📱 MOBILE APP (view: 'app', PWA-installable, opened via nav or /#app)
    app-shell.tsx                       #   phone frame on desktop / full-screen on phones; 5 bottom tabs
    onboarding.tsx                      #   5-step profile setup → daily kcal target
    home-screen.tsx                     #   calorie ring, suggested day (shuffle), recommended plan, weight journey
    menu-screen.tsx                     #   marketplace (same /api/products, same cart)
    plans-screen.tsx                    #   plans list → reuses PlanSubscribeFlow inApp
    cart-screen.tsx                     #   checkout prefilled from profile → FF-#### order
    profile-screen.tsx                  #   edit metrics (live recalc), weigh-in log, goal progress
src/app/api/
  products/ (+[id])                     # menu CRUD (admin)
  orders/   (+[id])                     # one-time orders, status flow pending→delivered
  clients/  (+[id])                     # CRM client profiles
  stats/, export/                       # dashboard KPIs, CSV export
  plans/    (+[id])                     # subscription plan CRUD (deleting a plan with subscribers → auto-hide instead)
  subscriptions/ (+[id], generate-today)
src/lib/{types,api,store,calories,db}.ts
src/lib/profile-store.ts                # mobile app profile (Zustand, localStorage 'fitfuel-app-profile')
public/manifest.webmanifest + icon-*.png  # PWA manifest — installable on phones, start_url /#app
```

## Domain rules — DO NOT BREAK

1. **CMS principle.** All products and plans are managed from the Dashboard. The server always trusts DB prices, never prices sent by the browser.
2. **Snapshot principle.** Orders and subscriptions snapshot name/price/macros at creation time (`OrderItem`, `SubscriptionMeal`). Editing or deleting a product later must never corrupt history. `productId` links are `SetNull` — the snapshotted name stays.
3. **Currency & fees.** EGP everywhere (`fmtEGP` in `src/lib/api.ts`). One-time orders add **EGP 30** delivery fee; subscriptions have free delivery.
4. **Mobile app profile is client-only.** The app stores the user profile in localStorage (`fitfuel-app-profile`) — there is NO server-side account. Orders/subscriptions created in the app go through the same APIs as the website (verified: FF-1004 + FS-1007 created from the app). Do not invent an auth system without asking.
5. **ONE cart only.** The single Zustand cart is for one-time meal orders. **Subscriptions do NOT use a cart.** An earlier implementation with a separate "plan cart" + dual header buttons was explicitly rejected by the client — never reintroduce it. (The mobile app reuses this same cart.)
6. **References.** Orders `FF-####`, subscriptions `FS-####` (count + 1001, zero-padded).

## Subscription flow — the core UX (recently reworked, keep exactly this shape)

Client journey: **pick ONE plan → choose exactly N meals from the full menu → enter details → done.**

1. `plans-view.tsx` — plan cards (2–5 meals/day tiers).
2. `plan-subscribe-flow.tsx` — 3-step stepper:
   - **Choose meals:** `MealPicker` with `maxSelected = plan.mealsPerDay`. Selecting exactly N is **mandatory, not a minimum**. When the quota is full, every *unselected* meal locks (grayed out, lock icon, `disabled` + `aria-disabled`); deselecting one unlocks swapping. Sticky counter bar shows "X of N meals selected", Continue disabled until `X === N`.
   - **Details:** name / phone / address required, email / start-date / notes optional. Sidebar summary lists chosen meals with per-meal remove.
   - **Success:** FS-#### reference, plan summary, next steps.
3. Server-side enforcement mirrors the UI: `POST /api/subscriptions` expects
   `{ planId, mealIds: string[], customer: {name, phone, email, address}, startDate, notes }`
   and rejects unless `unique(mealIds).length === plan.mealsPerDay` and all IDs are active products. Meals are snapshotted into `SubscriptionMeal` rows. `renewalDate = startDate + 30 days`.
4. Admin can edit a client's selection: `MealsEditDialog` in `subscriptions-tab.tsx` → `PATCH /api/subscriptions/[id]` with `mealIds` (same exact-N validation, full snapshot replace).
5. `POST /api/subscriptions/generate-today` — creates today's fulfilment orders (FF-####, `paymentMethod: 'sub'`, total 0 so revenue isn't double-counted with MRR) from each active subscription's chosen meals; everyday plans (daysPerMonth ≥ 30) deliver daily, weekday plans Sun–Thu; skips if an order already exists today.

### Plan tiers (seeded)

| Plan | mealsPerDay | daysPerMonth | monthlyPrice |
|---|---|---|---|
| Duo 🔥 | 2 | 22 (Sun–Thu) | 5,499 |
| Trio ⚡ | 3 | 22 (Sun–Thu) | 7,999 |
| Full Day 🚀 | 4 | 30 (every day) | 10,999 |
| Max Performance 🏆 | 5 | 30 (every day) | 13,499 |

A legacy 1-meal "Lunch Only" plan exists but is `isActive=false` (soft-hidden; FS-1002/FS-1005 still reference it).

## Data model (prisma/schema.prisma)

- `Product` — category `breakfast | main | salad | snack`, calories/protein/carbs/fat, price
- `Client` — CRM profile, unique phone (subscriptions/orders upsert by phone)
- `SubscriptionPlan` — `features` stored as pipe-separated string, split on render
- `Subscription` — status `active | paused | cancelled`, paymentStatus, 30-day renewal, price/mealsPerDay/targetCalories snapshots
- `SubscriptionMeal` — per-subscription meal snapshots (productId nullable, name/emoji/category/macros snapshotted)
- `Order` / `OrderItem` — one-time sales; status `pending | confirmed | preparing | delivering | delivered | cancelled`; optional `subscriptionId` links fulfilment orders

## Current state (verified working)

- 21 seeded products, 4 active plans, subscriptions FS-1001…FS-1006 (some are test/legacy rows)
- `bunx tsc --noEmit`: **zero errors in src/**
- Dev server runs clean; all API routes 200

## Environment gotchas

- `src/lib/db.ts` logs every Prisma query in dev — that's why `dev.log` is huge; drop the `log` level if it gets in your way.
- Don't hand-edit `db/custom.db`; use `prisma db push`, the seed script, or the app's APIs.
- `examples/`, `mini-services/`, `skills/`, `tests/`, `download/`, `upload/` at the repo root are **not part of this app** — ignore them when typechecking/searching.
- Deleting a plan that has subscribers is blocked server-side (it auto-hides instead); deleting an active subscription is blocked (cancel first); deleting a subscription with order history is blocked.

## Suggested next steps (not yet built — confirm with the client first)

- Client-facing "my subscription" self-service (pause/cancel by phone + reference code) — currently admin-only.
- Recurring billing / payment gateway integration (design assumes pay-on-first-delivery).
- Email/WhatsApp notifications on subscription start and renewal.
- Pagination + search on admin tables once data grows.
