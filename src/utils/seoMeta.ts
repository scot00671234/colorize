import { getSiteUrl } from './siteUrl'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

export type SeoMetaOptions = {
  title: string
  description: string
  path?: string
  /** Comma-separated; optional */
  keywords?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

export function setSeoMeta(opts: SeoMetaOptions): void {
  const base = getSiteUrl().replace(/\/$/, '')
  const raw = opts.path ?? '/'
  const path = raw.startsWith('/') ? raw : `/${raw}`
  const url = `${base}${path === '/' ? '/' : path}`
  const image = opts.image || `${base}/logo.svg`

  document.title = opts.title

  setMeta('name', 'description', opts.description)
  if (opts.keywords) setMeta('name', 'keywords', opts.keywords)
  if (opts.noindex) {
    setMeta('name', 'robots', 'noindex, nofollow')
  } else {
    const robots = document.querySelector('meta[name="robots"]')
    if (robots?.getAttribute('content') === 'noindex, nofollow') {
      robots.setAttribute('content', 'index, follow')
    }
  }

  const canonical = url.includes('?') ? url.slice(0, url.indexOf('?')) : url
  setLink('canonical', canonical)

  setMeta('property', 'og:type', opts.type || 'website')
  setMeta('property', 'og:url', canonical)
  setMeta('property', 'og:title', opts.title)
  setMeta('property', 'og:description', opts.description)
  setMeta('property', 'og:image', image)
  setMeta('property', 'og:site_name', 'Colorizer')
  setMeta('property', 'og:locale', 'en_US')

  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', opts.title)
  setMeta('name', 'twitter:description', opts.description)
}
