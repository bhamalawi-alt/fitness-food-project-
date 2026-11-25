export interface Product {
  id: string
  name: string
  description: string
  category: string
  calories: number
  protein: number
  carbs: number
  fat: number
  price: number
  emoji: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  productId: string
  name: string
  emoji: string
  category: string
  price: number
  calories: number
  protein: number
  carbs: number
  fat: number
  quantity: number
}

// A meal the CLIENT chose for their subscription (snapshot at subscribe time)
export interface SubscriptionMealDTO {
  id: string
  productId: string | null
  name: string
  emoji: string
  category: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface OrderItemDTO {
  id: string
  productName: string
  emoji: string
  category: string
  unitPrice: number
  quantity: number
  lineTotal: number
  calories: number
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'

export interface OrderDTO {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentMethod: string
  paymentStatus: 'unpaid' | 'paid'
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  totalCalories: number
  notes: string | null
  subscriptionId: string | null
  createdAt: string
  client: {
    id: string
    name: string
    phone: string
    email: string | null
    address: string | null
  }
  items: OrderItemDTO[]
}

export interface ClientDTO {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  createdAt: string
  orderCount: number
  totalSpent: number
  lastOrderAt: string | null
}

export interface SubscriptionPlanDTO {
  id: string
  name: string
  description: string
  emoji: string
  mealsPerDay: number
  daysPerMonth: number
  targetCalories: number
  monthlyPrice: number
  features: string
  isActive: boolean
  sortOrder: number
}

export interface SubscriptionDTO {
  id: string
  reference: string
  status: 'active' | 'paused' | 'cancelled'
  paymentStatus: 'unpaid' | 'paid'
  startDate: string
  renewalDate: string
  price: number
  mealsPerDay: number
  targetCalories: number
  notes: string | null
  paidAt: string | null
  createdAt: string
  meals: SubscriptionMealDTO[]
  client: {
    id: string
    name: string
    phone: string
    email: string | null
    address: string | null
  }
  plan: {
    id: string
    name: string
    emoji: string
    mealsPerDay: number
    daysPerMonth: number
  }
}

export interface StatsDTO {
  revenue: number
  paidRevenue: number
  orderCount: number
  clientCount: number
  avgOrderValue: number
  pendingCount: number
  deliveredCount: number
  activeProducts: number
  revenueByDay: { date: string; revenue: number; orders: number }[]
  statusBreakdown: { status: string; count: number }[]
  topProducts: { name: string; emoji: string; qty: number; revenue: number }[]
  subscriptionMRR: number
  activeSubscriptions: number
  expiringSubscriptions: number
  subscriptionCollectedThisMonth: number
  todayDeliveries: number
}

export const CATEGORIES = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'main', label: 'Main Meals', emoji: '🍽️' },
  { value: 'salad', label: 'Salads', emoji: '🥗' },
  { value: 'snack', label: 'Snacks', emoji: '⚡' },
] as const

export const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'preparing', label: 'Preparing', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  { value: 'delivering', label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' },
]

export const DELIVERY_FEE = 30
export const CURRENCY = 'EGP'
