export const CHECKOUT_PLANS = ['starter', 'pro', 'studio'] as const

export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number]

export function isCheckoutPlan(s: string | null | undefined): s is CheckoutPlan {
  return s === 'starter' || s === 'pro' || s === 'studio'
}
