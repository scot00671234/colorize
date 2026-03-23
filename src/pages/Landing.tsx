import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ColorizeBeforeAfter } from '../components/ColorizeBeforeAfter'
import { PricingPlanCta } from '../components/PricingPlanCta'
import { HOME_SEO_FAQ, HOME_SEO_KEYWORDS } from '../content/homeSeoFaq'
import { getSiteUrl } from '../utils/siteUrl'
import { setSeoMeta } from '../utils/seoMeta'
import type { CheckoutPlan } from '../constants/plans'

const PATH_STEPS = [
  { id: 1, title: 'Memories deserve color', body: 'Faded prints and monochrome scans can feel distant. Thoughtful color brings people and places back into focus.' },
  { id: 2, title: 'Damage is not the end', body: 'Scratches, noise, and wear show up in every archive. Restoration can stabilize faces, edges, and detail before you share.' },
  { id: 3, title: 'Built for real files', body: 'Phone shots of albums, flatbed scans, and digital copies all land in one workflow—no lab required.' },
  { id: 4, title: 'You keep control', body: 'Preview results, save projects, and export when you are happy. Your archive stays yours.' },
] as const

function BlobTop() {
  return (
    <svg
      className="blob blobTop"
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="blobTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a8c4d0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6b8f9e" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path
        d="M30 60c0-22 18-45 45-45s55 20 70 35c12 12 25 30 25 50s-15 35-40 35c-22 0-45-15-65-25-18-9-35-20-35-50z"
        fill="url(#blobTopGrad)"
      />
    </svg>
  )
}

function BlobBottom() {
  return (
    <svg
      className="blob blobBottom"
      viewBox="0 0 180 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="blobBottomGrad" x1="20%" y1="80%" x2="80%" y2="20%">
          <stop offset="0%" stopColor="#9ab8c8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#5a7a8a" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        d="M90 20c35 0 70 25 70 60s-25 70-60 70c-30 0-55-20-70-45-12-20-20-45-20-65s15-50 80-50z"
        fill="url(#blobBottomGrad)"
      />
    </svg>
  )
}

const FEATURES = [
  { icon: '◇', title: 'Colorize', description: 'Turn black-and-white or faded images into full-color versions with AI tuned for portraits and scenes.' },
  { icon: '◆', title: 'Restore', description: 'Reduce cracks, blur, and noise so faces and detail read clearly on modern screens.' },
  { icon: '○', title: 'Save and export', description: 'Organize projects in your dashboard and download finished images from the workspace.' },
] as const

const PLANS: readonly {
  name: string
  planKey: CheckoutPlan
  price: number
  period: string
  description: string
  features: readonly string[]
  cta: string
  featured: boolean
}[] = [
  {
    name: 'Starter',
    planKey: 'starter',
    price: 19,
    period: 'month',
    description: 'For occasional albums and small batches.',
    features: [
      '~400 AI colorizations per month',
      'Up to 5 saved projects',
      'Workspace: upload, preview, full-size download',
      'Email support',
      'Cancel anytime',
    ],
    cta: 'Get Starter',
    featured: false,
  },
  {
    name: 'Pro',
    planKey: 'pro',
    price: 29,
    period: 'month',
    description: 'Best value for families and active archives.',
    features: [
      '~1,500 AI colorizations per month',
      'Up to 25 saved projects',
      'Everything in Starter',
      'Cancel anytime',
    ],
    cta: 'Get Pro',
    featured: true,
  },
  {
    name: 'Studio',
    planKey: 'studio',
    price: 99,
    period: 'month',
    description: 'High volume for studios, resellers, and large collections.',
    features: [
      '~8,000 AI colorizations per month',
      'Up to 100 saved projects',
      'Everything in Pro',
      'Cancel anytime',
    ],
    cta: 'Get Studio',
    featured: false,
  },
] as const

function usePathStepVisible() {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [visible, setVisible] = useState<Set<number>>(new Set())

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null
      const ob = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setVisible((v) => new Set([...v, i]))
          })
        },
        { rootMargin: '-10% 0px -10% 0px', threshold: 0.1 }
      )
      ob.observe(el)
      return ob
    })
    return () => observers.forEach((ob) => ob?.disconnect())
  }, [])

  return { refs, visible }
}

const HOME_META_DESC =
  'Colorizer: AI photo colorization and restoration for old images and scans. Paid plans from $19/mo with clear monthly usage limits; save projects and download from your workspace.'

export default function Landing() {
  const { refs, visible } = usePathStepVisible()

  useEffect(() => {
    setSeoMeta({
      title: 'Colorizer - AI Photo Colorizer & Restoration | Old Photos & Archives',
      description: HOME_META_DESC,
      path: '/',
      keywords: HOME_SEO_KEYWORDS,
    })
  }, [])

  useEffect(() => {
    document.body.dataset.page = 'landing'
    return () => {
      if (document.body.dataset.page === 'landing') delete document.body.dataset.page
    }
  }, [])

  const homeJsonLd = useMemo(() => {
    const base = getSiteUrl().replace(/\/$/, '')
    const orgId = `${base}/#organization`
    const org = { '@id': orgId, '@type': 'Organization', name: 'Colorizer', url: base }
    return {
      '@context': 'https://schema.org',
      '@graph': [
        org,
        {
          '@type': 'WebSite',
          '@id': `${base}/#website`,
          name: 'Colorizer',
          url: `${base}/`,
          description: HOME_META_DESC,
          publisher: { '@id': orgId },
          inLanguage: 'en-US',
        },
        {
          '@type': 'SoftwareApplication',
          name: 'Colorizer',
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'Web browser',
          offers: [
            { '@type': 'Offer', name: 'Starter', price: '19', priceCurrency: 'USD' },
            { '@type': 'Offer', name: 'Pro', price: '29', priceCurrency: 'USD' },
            { '@type': 'Offer', name: 'Studio', price: '99', priceCurrency: 'USD' },
          ],
          description:
            'Colorize and restore old photos with AI: upload scans and family pictures, preview results, and export from your browser.',
          featureList: [
            'Photo colorization',
            'Image restoration',
            'Saved projects',
            'Dashboard and exports',
          ],
          provider: { '@id': orgId },
          url: `${base}/`,
        },
        {
          '@type': 'FAQPage',
          mainEntity: HOME_SEO_FAQ.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        },
      ],
    }
  }, [])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <div className="landingPage">
        <main className="hero" data-hero-bg="false">
          <div className="heroBackdrop" aria-hidden />
          <div className="heroBg" aria-hidden>
            <div className="heroOrb heroOrbTop" />
            <div className="heroOrb heroOrbBottom" />
            <div className="heroOrb heroOrbCenter" />
          </div>
          <div className="blobs">
            <BlobTop />
            <BlobBottom />
          </div>
          <div className="heroInner">
            <div className="heroContent heroContentSplit">
              <span className="heroBadge">Simple plans · Stripe billing</span>
              <h1 className="heroTitle">
                Bring old photos back with <span className="heroTitleAccent">color</span> and clarity.
              </h1>
              <p className="heroSubtitle">
                Colorizer is becoming your place to colorize black-and-white pictures and restore damaged scans—built for family albums, archives, and creative projects.
              </p>
              <ul className="heroValueChips" aria-label="What Colorizer does">
                <li>AI colorization</li>
                <li>Restoration</li>
                <li>Projects &amp; export</li>
              </ul>
              <div className="heroCtaRow">
                <Link to="/register" className="heroCta heroCtaPrimary">Create account</Link>
                <a href="#pricing" className="heroCtaGhost">See plans</a>
              </div>
            </div>

            <aside className="heroPreview" aria-label="Colorize before and after demo">
              <ColorizeBeforeAfter
                imageSrc="/landing/examples/example-detroit-cadillac-square.png"
                imageDescription="Historic city square with streetcars and buildings: drag the slider to compare grayscale with full color."
              />
              <div className="heroPreviewTags heroPreviewTagsBelow" aria-label="What you get">
                <span>AI colorization</span>
                <span>Street scenes &amp; portraits</span>
                <span>Download from workspace</span>
              </div>
            </aside>
          </div>
        </main>

        <section className="section pathSection" id="path" aria-label="Why photo restoration matters">
        <h2 className="pathSectionTitle">Every picture has a story</h2>
        <div className="pathImagesRow" aria-label="Colorized archival photography examples">
          <div className="landingPhotoCard pathImageTile">
            <img
              src="/landing/examples/example-buffalo-niagara-street.png"
              alt="Colorized historical photograph of Niagara Street, Buffalo, with streetcars and ornate architecture"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="landingPhotoCard pathImageTile">
            <img
              src="/landing/examples/example-london-1945.png"
              alt="Colorized photograph of a child with a stuffed toy amid ruined buildings"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <div className="pathSectionInner">
          <div className="pathSteps">
            <div className="pathLine" aria-hidden />
            {PATH_STEPS.map((step, i) => (
              <div
                key={step.id}
                className={`pathStep pathStep${i % 2 === 0 ? 'Left' : 'Right'} ${visible.has(i) ? 'pathStepVisible' : ''}`}
                ref={(el) => { refs.current[i] = el }}
              >
                <div className="pathNode" aria-hidden />
                <div className="pathCard">
                  <h3 className="pathCardTitle">{step.title}</h3>
                  <p className="pathCardBody">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

        <section className="section landingTrySection" id="try">
        <div className="landingTryHeader">
          <h2 className="landingTryTitle">Try it on your own photos</h2>
          <p className="landingTrySubtitle">
            Subscribe to a plan, then open the workspace: upload a scan or vintage shot and run <strong>Colorize</strong>. Limits are per month and shown in Settings.
          </p>
        </div>
        <div className="landingTryCard">
          <div className="landingTrySplit">
            <div className="landingTryThumb" aria-hidden>
              <img
                src="/landing/examples/example-einstein-portrait.png"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="landingTryBody">
              <ul className="landingTrySteps">
                <li><span className="landingTryStepNum">1</span> Create an account and pick a plan</li>
                <li><span className="landingTryStepNum">2</span> Go to <strong>Dashboard → Workspace</strong></li>
                <li><span className="landingTryStepNum">3</span> Upload an image and pick colorize or restore</li>
                <li><span className="landingTryStepNum">4</span> Preview the result and download when you are happy</li>
              </ul>
              <p className="landingTryNote">
                Upload from your device; processing runs in the cloud so your machine stays light. Save projects in your account and come back anytime.
              </p>
              <div className="landingTryActions">
                <Link to="/register?plan=pro" className="heroCta heroCtaPrimary landingTryPrimaryCta">
                  Start with Pro
                </Link>
                <Link to="/login" className="landingTryLoginLink landingTrySignIn">
                  Sign in
                </Link>
                <a href="#pricing" className="landingTryWorkspaceLink">
                  Compare plans
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

        <section className="section aboutSection" id="about">
        <div className="sectionHeader aboutSectionHeader">
          <p className="sectionLabel">Why Colorizer</p>
          <h2 className="sectionTitle">One place for fragile photos</h2>
          <p className="aboutLead">
            You bring the files. We help them look right on modern screens—without a desktop lab.
          </p>
        </div>
        <div className="aboutImageCenter">
          <div className="landingPhotoCard aboutImageCard">
            <img
              src="/landing/examples/example-migrant-mother.png"
              alt="Colorized documentary-style photograph of a mother with children"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <div className="aboutContent aboutContentSimple">
          <ul className="aboutPoints" aria-label="What Colorizer does for you">
            <li><strong>Upload</strong> scans, phone photos of prints, or digital files from your archive.</li>
            <li><strong>Colorize</strong> monochrome or washed-out images with models tuned for people and scenes.</li>
            <li><strong>Restore</strong> cracks, blur, and noise so detail comes through.</li>
            <li><strong>Save projects</strong> in your dashboard, preview results, and download from the workspace.</li>
          </ul>
          <p className="aboutFootnote">
            <strong>Paid plans:</strong> monthly colorization allowances and project limits are listed on each plan. Manage billing anytime in Settings (Stripe). Cancel anytime.
          </p>
        </div>
      </section>

        <section className="section" id="features">
        <div className="sectionHeader">
          <p className="sectionLabel">How it works</p>
          <h2 className="sectionTitle">Built for photos you actually keep</h2>
        </div>
        <div className="featureGrid">
          {FEATURES.map((f) => (
            <article key={f.title} className="featureCard">
              <div className="featureIcon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </div>
      </section>

        <section className="section" id="pricing">
        <div className="sectionHeader">
          <p className="sectionLabel">Pricing</p>
          <h2 className="sectionTitle">Starter, Pro, and Studio — pick the volume you need.</h2>
          <p className="landingPricingIntro" style={{ textAlign: 'center', maxWidth: '36rem', margin: '-0.5rem auto 1.5rem', color: 'var(--muted, #5c6b73)', fontSize: '0.95rem' }}>
            Colorizing uses your plan&apos;s monthly allowance. Create an account first, then checkout opens in Stripe for the plan you choose.
          </p>
        </div>
        <div className="pricingGrid">
          {PLANS.map((plan) => (
            <article key={plan.name} className={`pricingCard ${plan.featured ? 'pricingCardFeatured' : ''}`}>
              <p className="pricingName">{plan.name}</p>
              <p className="pricingPrice">
                ${plan.price}<span>/{plan.period}</span>
              </p>
              <p className="pricingDesc">{plan.description}</p>
              <ul className="pricingList">
                {plan.features.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <PricingPlanCta plan={plan.planKey} className="pricingCta">
                {plan.cta}
              </PricingPlanCta>
            </article>
          ))}
        </div>
      </section>

        <section className="section landingFaqSection" id="faq" aria-labelledby="landing-faq-heading">
        <div className="sectionHeader">
          <p className="sectionLabel">FAQ</p>
          <h2 id="landing-faq-heading" className="sectionTitle">
            Common questions about photo AI
          </h2>
          <p className="landingFaqIntro">
            Straight answers about colorizing, restoring, privacy, and plans.
          </p>
        </div>
        <dl className="landingFaqList">
          {HOME_SEO_FAQ.map((item) => (
            <div key={item.q} className="landingFaqItem">
              <dt className="landingFaqQ">{item.q}</dt>
              <dd className="landingFaqA">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

        <section className="section ctaSection">
        <div className="ctaBox">
          <h2>Your archive deserves another life.</h2>
          <p>Create an account, choose Starter, Pro, or Studio, and start colorizing in the workspace.</p>
          <Link to="/register?plan=pro" className="heroCta heroCtaPrimary">Get Pro</Link>
        </div>
      </section>

        <footer className="footer">
        <div className="footerInner">
          <Link to="/" className="footerBrand">Colorizer</Link>
          <div className="footerLinks">
            <a href="/#about">About</a>
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
            <Link to="/contact">Contact</Link>
            <Link to="/blog">Blog</Link>
            <a href="/#faq">FAQ</a>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <span className="footerCopy">© {new Date().getFullYear()} Colorizer. All rights reserved.</span>
        </div>
        </footer>
      </div>
    </>
  )
}
