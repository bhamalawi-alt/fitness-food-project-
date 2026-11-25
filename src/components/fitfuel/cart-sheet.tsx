'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, Truck, Store, Loader2, CheckCircle2, Flame } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { cartTotals, useCart } from '@/lib/store'
import { DELIVERY_FEE, type OrderDTO } from '@/lib/types'
import { fetchJSON, fmtEGP } from '@/lib/api'

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const items = useCart((s) => s.items)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const clear = useCart((s) => s.clear)
  const { toast } = useToast()

  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery')
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [payment, setPayment] = useState('cod')
  const [submitting, setSubmitting] = useState(false)
  const [placed, setPlaced] = useState<OrderDTO | null>(null)

  const totals = useMemo(() => cartTotals(items), [items])
  const deliveryFee = mode === 'delivery' ? DELIVERY_FEE : 0
  const grandTotal = totals.subtotal + deliveryFee

  const handleCheckout = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: 'Name and phone are required', variant: 'destructive' })
      return
    }
    if (mode === 'delivery' && !form.address.trim()) {
      toast({ title: 'Delivery address is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const order = await fetchJSON<OrderDTO>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer: { name: form.name, phone: form.phone, email: form.email, address: form.address },
          items: items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
          deliveryFee,
          paymentMethod: payment,
          notes: form.notes,
        }),
      })
      setPlaced(order)
      clear()
      toast({ title: '🎉 Order placed!', description: `Order ${order.orderNumber} received.` })
    } catch (e) {
      toast({ title: 'Could not place order', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const closeSheet = (v: boolean) => {
    onOpenChange(v)
    if (!v) setTimeout(() => setPlaced(null), 300)
  }

  return (
    <Sheet open={open} onOpenChange={closeSheet}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md" aria-describedby={undefined}>
        <SheetHeader className="pb-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-600" /> Your Box
          </SheetTitle>
          <SheetDescription>
            {placed ? 'Order confirmation' : `${totals.count} item${totals.count === 1 ? '' : 's'} · ${totals.calories.toLocaleString()} kcal total`}
          </SheetDescription>
        </SheetHeader>

        {/* ---------- Success state ---------- */}
        {placed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Order confirmed!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Thanks {placed.client.name.split(' ')[0]}! Your order reference is
              </p>
              <p className="mt-2 rounded-lg bg-emerald-50 px-4 py-2 font-mono text-lg font-bold tracking-wider text-emerald-700">
                {placed.orderNumber}
              </p>
            </div>
            <div className="w-full rounded-lg border bg-gray-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{fmtEGP(placed.total)}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-semibold uppercase">{placed.paymentMethod === 'cod' ? 'Cash on delivery' : placed.paymentMethod}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Total calories</span><span className="font-semibold">{placed.totalCalories.toLocaleString()} kcal</span></div>
            </div>
            <p className="text-xs text-muted-foreground">We&apos;ll call you on {placed.client.phone} to confirm the delivery time.</p>
            <Button className="w-full" onClick={() => closeSheet(false)}>Done</Button>
          </div>
        ) : items.length === 0 ? (
          /* ---------- Empty cart ---------- */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl">🥗</div>
            <h3 className="text-lg font-semibold">Your box is empty</h3>
            <p className="text-sm text-muted-foreground">Add some meals from the menu, or let the calorie calculator build a day plan for you.</p>
            <Button variant="outline" onClick={() => closeSheet(false)}>Browse meals</Button>
          </div>
        ) : (
          <>
            {/* ---------- Items ---------- */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ul className="space-y-3">
                {items.map((i) => (
                  <li key={i.productId} className="flex gap-3 rounded-lg border bg-white p-3 shadow-sm">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-100 to-lime-50 text-2xl">
                      {i.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.calories} kcal · {fmtEGP(i.price)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex items-center rounded-md border">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-l-md text-muted-foreground hover:bg-gray-50"
                            onClick={() => setQty(i.productId, i.quantity - 1)}
                            aria-label={`Decrease ${i.name} quantity`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-r-md text-muted-foreground hover:bg-gray-50"
                            onClick={() => setQty(i.productId, i.quantity + 1)}
                            aria-label={`Increase ${i.name} quantity`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => remove(i.productId)}
                          aria-label={`Remove ${i.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <span className="ml-auto text-sm font-bold">{fmtEGP(i.price * i.quantity)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Nutrition summary */}
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                  <Flame className="h-4 w-4" /> Day nutrition total
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                  <div><p className="font-bold text-emerald-900">{totals.calories.toLocaleString()}</p><p className="text-emerald-700">kcal</p></div>
                  <div><p className="font-bold text-emerald-900">{totals.protein}g</p><p className="text-emerald-700">protein</p></div>
                  <div><p className="font-bold text-emerald-900">{totals.carbs}g</p><p className="text-emerald-700">carbs</p></div>
                  <div><p className="font-bold text-emerald-900">{totals.fat}g</p><p className="text-emerald-700">fat</p></div>
                </div>
              </div>

              {/* Delivery mode */}
              <div className="mt-4">
                <Label className="text-sm font-semibold">Fulfilment</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'delivery' | 'pickup')} className="mt-2 grid grid-cols-2 gap-2">
                  <Label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-normal ${mode === 'delivery' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'}`}
                  >
                    <RadioGroupItem value="delivery" />
                    <Truck className="h-4 w-4 text-emerald-600" />
                    <span>Delivery<br /><span className="text-xs text-muted-foreground">{fmtEGP(DELIVERY_FEE)}</span></span>
                  </Label>
                  <Label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-normal ${mode === 'pickup' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'}`}
                  >
                    <RadioGroupItem value="pickup" />
                    <Store className="h-4 w-4 text-emerald-600" />
                    <span>Pickup<br /><span className="text-xs text-muted-foreground">Free</span></span>
                  </Label>
                </RadioGroup>
              </div>

              {/* Customer details */}
              <div className="mt-4 space-y-3">
                <Label className="text-sm font-semibold">Your details</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="ck-name" className="text-xs text-muted-foreground">Full name *</Label>
                    <Input id="ck-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Ali" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ck-phone" className="text-xs text-muted-foreground">Phone *</Label>
                    <Input id="ck-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" inputMode="tel" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ck-email" className="text-xs text-muted-foreground">Email (optional)</Label>
                  <Input id="ck-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
                </div>
                {mode === 'delivery' && (
                  <div className="space-y-1">
                    <Label htmlFor="ck-address" className="text-xs text-muted-foreground">Delivery address *</Label>
                    <Textarea id="ck-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Area, street, building, floor, apartment" rows={2} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment method</Label>
                  <RadioGroup value={payment} onValueChange={setPayment} className="grid grid-cols-3 gap-2">
                    {[
                      { v: 'cod', label: 'Cash on delivery' },
                      { v: 'card', label: 'Card on delivery' },
                      { v: 'wallet', label: 'Mobile wallet' },
                    ].map((p) => (
                      <Label
                        key={p.v}
                        className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-normal ${payment === p.v ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'}`}
                      >
                        <RadioGroupItem value={p.v} className="sr-only" />
                        {p.label}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ck-notes" className="text-xs text-muted-foreground">Notes (allergies, delivery time...)</Label>
                  <Textarea id="ck-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. no nuts, deliver after 6 PM" rows={2} />
                </div>
              </div>
            </div>

            {/* ---------- Summary & CTA ---------- */}
            <div className="border-t bg-white p-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtEGP(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{deliveryFee === 0 ? 'Free' : fmtEGP(deliveryFee)}</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-emerald-700">{fmtEGP(grandTotal)}</span></div>
              </div>
              <Button className="mt-3 w-full gap-2" size="lg" onClick={handleCheckout} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Placing order...</> : <>Place order · {fmtEGP(grandTotal)}</>}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
