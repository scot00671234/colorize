import { config } from './config'

export type PaidPlan = 'starter' | 'pro' | 'studio'

export const PLAN_COLORIZE_MONTHLY: Record<PaidPlan, number> = {
  starter: 400,
  pro: 1500,
  studio: 8000,
}

export const PLAN_PROJECT_MAX: Record<PaidPlan, number> = {
  starter: 5,
  pro: 25,
  studio: 100,
}

/** Stripe Price ID configured for Studio (new name); falls back to legacy Elite price. */
export function studioPriceId(): string {
  return config.stripe.priceStudio || config.stripe.priceElite
}

export function planFromPriceId(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null
  const starter = config.stripe.priceStarter
  const pro = config.stripe.pricePro
  const studio = studioPriceId()
  const eliteOnly = config.stripe.priceElite
  if (starter && priceId === starter) return 'starter'
  if (pro && priceId === pro) return 'pro'
  if (studio && priceId === studio) return 'studio'
  if (eliteOnly && priceId === eliteOnly && !config.stripe.priceStudio) return 'studio'
  return null
}

/** Map API / UI plan keys to PaidPlan (accepts legacy elite/enterprise). */
export function normalizeCheckoutPlan(raw: string | undefined): PaidPlan | null {
  const p = (raw || '').trim().toLowerCase()
  if (p === 'elite' || p === 'enterprise') return 'studio'
  if (p === 'starter' || p === 'pro' || p === 'studio') return p
  return null
}

export function priceIdForPlan(plan: PaidPlan): string {
  if (plan === 'starter') return config.stripe.priceStarter
  if (plan === 'pro') return config.stripe.pricePro
  return studioPriceId()
}

export function envVarHintForPlan(plan: PaidPlan): string {
  if (plan === 'starter') return 'STRIPE_PRICE_STARTER'
  if (plan === 'pro') return 'STRIPE_PRICE_PRO'
  return config.stripe.priceStudio ? 'STRIPE_PRICE_STUDIO' : 'STRIPE_PRICE_STUDIO or STRIPE_PRICE_ELITE'
}

/** Effective plan for limits: DB column first, then legacy is_pro / is_team flags. */
export function effectivePaidPlan(
  subscriptionPlan: string | null | undefined,
  isPro: boolean,
  isTeam: boolean
): PaidPlan | null {
  const raw = subscriptionPlan?.trim().toLowerCase()
  if (raw === 'starter' || raw === 'pro' || raw === 'studio') return raw
  if (isTeam) return 'studio'
  if (isPro) return 'pro'
  return null
}

export function projectLimitForPlan(plan: PaidPlan | null): number {
  if (!plan) return 1
  return PLAN_PROJECT_MAX[plan]
}

export function colorizeLimitForPlan(plan: PaidPlan | null): number {
  if (!plan) return 0
  return PLAN_COLORIZE_MONTHLY[plan]
}
