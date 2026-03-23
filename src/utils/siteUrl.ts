/**
 * Canonical site origin for SEO (sitemap, JSON-LD, Open Graph).
 * Set VITE_SITE_URL in production (e.g. https://colorizer.cc) — no trailing slash.
 */
export function getSiteUrl(): string {
  const env = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  if (env) return env
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return 'https://colorizer.cc'
}

