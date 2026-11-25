import type { Product } from './types'

export type Gender = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'
export type Goal = 'lose' | 'maintain' | 'gain'

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; hint: string; factor: number }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Desk job, little exercise', factor: 1.2 },
  { value: 'light', label: 'Lightly Active', hint: '1–3 workouts / week', factor: 1.375 },
  { value: 'moderate', label: 'Moderately Active', hint: '3–5 workouts / week', factor: 1.55 },
  { value: 'active', label: 'Very Active', hint: '6–7 workouts / week', factor: 1.725 },
  { value: 'athlete', label: 'Athlete', hint: 'Twice-a-day training / physical job', factor: 1.9 },
]

export const GOALS: { value: Goal; label: string; hint: string; kcal: number; macro: { p: number; c: number; f: number } }[] = [
  { value: 'lose', label: 'Lose Weight', hint: '≈ 0.5 kg / week deficit', kcal: -500, macro: { p: 0.4, c: 0.3, f: 0.3 } },
  { value: 'maintain', label: 'Maintain', hint: 'Stay at current weight', kcal: 0, macro: { p: 0.3, c: 0.4, f: 0.3 } },
  { value: 'gain', label: 'Gain Muscle', hint: 'Lean bulk surplus', kcal: 400, macro: { p: 0.3, c: 0.45, f: 0.25 } },
]

export interface CalcInput {
  gender: Gender
  age: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: Goal
}

export interface CalcResult {
  bmr: number
  tdee: number
  target: number
  bmi: number
  bmiCategory: string
  bmiColor: string
  macros: { protein: number; carbs: number; fat: number }
  weeklyChange: string
}

/** Mifflin–St Jeor basal metabolic rate */
export function calcBMR({ gender, age, heightCm, weightKg }: CalcInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(gender === 'male' ? base + 5 : base - 161)
}

export function activityFactor(a: ActivityLevel): number {
  return ACTIVITY_LEVELS.find((x) => x.value === a)?.factor ?? 1.375
}

export function goalConfig(g: Goal) {
  return GOALS.find((x) => x.value === g) ?? GOALS[1]
}

export function calcBMI(weightKg: number, heightCm: number) {
  const m = heightCm / 100
  const bmi = weightKg / (m * m)
  let category = 'Normal weight'
  let color = 'text-emerald-600'
  if (bmi < 18.5) { category = 'Underweight'; color = 'text-amber-600' }
  else if (bmi >= 25 && bmi < 30) { category = 'Overweight'; color = 'text-orange-600' }
  else if (bmi >= 30) { category = 'Obese'; color = 'text-red-600' }
  return { bmi: Math.round(bmi * 10) / 10, category, color }
}

export function calculateCalories(input: CalcInput): CalcResult {
  const bmr = calcBMR(input)
  const tdee = Math.round(bmr * activityFactor(input.activity))
  const g = goalConfig(input.goal)
  // safety floors
  const floor = input.gender === 'male' ? 1500 : 1200
  const target = Math.max(floor, tdee + g.kcal)
  const macros = {
    protein: Math.round((target * g.macro.p) / 4),
    carbs: Math.round((target * g.macro.c) / 4),
    fat: Math.round((target * g.macro.f) / 9),
  }
  const { bmi, category, color } = calcBMI(input.weightKg, input.heightCm)
  const weeklyChange =
    g.kcal === 0 ? 'Weight stays stable' : `${g.kcal > 0 ? '+' : ''}${((g.kcal * 7) / 7700).toFixed(2)} kg / week`
  return { bmr, tdee, target, bmi, bmiCategory: category, bmiColor: color, macros, weeklyChange }
}

export interface PlanSlot {
  slot: string
  targetShare: number
  categories: string[]
  product: Product | null
}

/**
 * Greedy day-plan builder: breakfast ≈ 27%, lunch ≈ 33%, dinner ≈ 30%, snack ≈ 10%
 * jitter (0..1) randomises slot targets slightly to produce alternative plans.
 */
export function buildMealPlan(products: Product[], target: number, jitter = 0): PlanSlot[] {
  const slots: PlanSlot[] = [
    { slot: 'Breakfast', targetShare: 0.27, categories: ['breakfast'], product: null },
    { slot: 'Lunch', targetShare: 0.33, categories: ['main', 'salad'], product: null },
    { slot: 'Dinner', targetShare: 0.3, categories: ['main', 'salad'], product: null },
    { slot: 'Snack', targetShare: 0.1, categories: ['snack'], product: null },
  ]
  const used = new Set<string>()
  for (const slot of slots) {
    const jitterFactor = jitter > 0 ? 1 + (Math.random() * 2 - 1) * jitter : 1
    const slotTarget = target * slot.targetShare * jitterFactor
    const candidates = products.filter((p) => slot.categories.includes(p.category) && !used.has(p.id))
    let best: Product | null = null
    let bestDiff = Infinity
    for (const p of candidates) {
      const diff = Math.abs(p.calories - slotTarget)
      if (diff < bestDiff) { bestDiff = diff; best = p }
    }
    if (best) { used.add(best.id); slot.product = best }
  }
  return slots
}

/**
 * Flexible-count plan builder for subscriptions: pick `count` meals (1–5)
 * that together approach `target` calories. Priority when fewer meals:
 * lunch → dinner → breakfast → snack → extra snack. Returns products in day order.
 */
export function buildPlanForCount(products: Product[], target: number, count: number, jitter = 0): Product[] {
  const defs = [
    { slot: 'Breakfast', share: 0.27, categories: ['breakfast'] },
    { slot: 'Lunch', share: 0.33, categories: ['main', 'salad'] },
    { slot: 'Dinner', share: 0.3, categories: ['main', 'salad'] },
    { slot: 'Snack', share: 0.06, categories: ['snack'] },
    { slot: 'Extra snack', share: 0.04, categories: ['snack'] },
  ]
  const priority = [1, 2, 0, 3, 4] // Lunch, Dinner, Breakfast, Snack, Extra snack
  const n = Math.max(1, Math.min(5, Math.round(count)))
  const chosen = priority.slice(0, n).map((i) => defs[i])
  const totalShare = chosen.reduce((s, d) => s + d.share, 0)
  const used = new Set<string>()
  const picked: { def: (typeof defs)[number]; product: Product }[] = []
  for (const def of chosen) {
    const jitterFactor = jitter > 0 ? 1 + (Math.random() * 2 - 1) * jitter : 1
    const slotTarget = ((target * def.share) / totalShare) * jitterFactor
    const candidates = products.filter((p) => def.categories.includes(p.category) && !used.has(p.id))
    let best: Product | null = null
    let bestDiff = Infinity
    for (const p of candidates) {
      const diff = Math.abs(p.calories - slotTarget)
      if (diff < bestDiff) { bestDiff = diff; best = p }
    }
    if (best) { used.add(best.id); picked.push({ def, product: best }) }
  }
  return picked
    .sort((a, b) => defs.indexOf(a.def) - defs.indexOf(b.def))
    .map((p) => p.product)
}
