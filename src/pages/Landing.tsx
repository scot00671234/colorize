import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HOME_SEO_FAQ, HOME_SEO_KEYWORDS } from '../content/homeSeoFaq'
import { getSiteUrl } from '../utils/siteUrl'
import { setSeoMeta } from '../utils/seoMeta'

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
  { icon: '○', title: 'Save and export', description: 'Organize projects in your dashboard and download results when processing goes live.' },
] as const

const PLANS = [
  { name: 'Free', price: 0, period: 'month', description: 'Start with an account and saved projects. No credit card required.', features: ['1 saved project', 'Workspace access', 'Email support', 'Colorize & restore when live'], cta: 'Get started free', ctaTo: '/register', featured: false },
  { name: 'Pro', price: 29, period: 'month', description: 'For growing archives and frequent batches.', features: ['10 saved projects', 'Everything in Free', 'Higher limits when processing ships', 'Cancel anytime'], cta: 'Start free trial', ctaTo: '/register', featured: true },
  { name: 'Elite', price: 59, period: 'month', description: 'Maximum headroom for teams and power users.', features: ['100 saved projects', 'Everything in Pro', 'Priority for new features', 'Cancel anytime'], cta: 'Start free trial', ctaTo: '/register', featured: false },
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
  'Colorizer: AI photo colorization and restoration for old images and scans. Create a free account; upload and processing features are rolling out next.'

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
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
              <span className="heroBadge">Free to start · No credit card</span>
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
                <Link to="/register" className="heroCta heroCtaPrimary">Get started free</Link>
                <a href="#pricing" className="heroCtaGhost">See plans</a>
              </div>
            </div>

            <aside className="heroPreview" aria-label="Product preview">
              <div className="heroMediaCard" aria-hidden>
                <img
                  src="/landing/desk.png"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="heroPreviewCard">
                <div className="heroPreviewTop">
                  <div className="heroPreviewTitle">Example: Colorize</div>
                  <div className="heroPreviewScore" aria-label="Preview mode">
                    <span>AI</span>
                  </div>
                </div>
                <div className="heroPreviewBar" aria-hidden>
                  <span style={{ width: '72%' }} />
                </div>

                <div className="heroPreviewGrid" aria-label="Before and after colorization">
                  <div className="heroPreviewCol">
                    <div className="heroPreviewLabel">Before</div>
                    <p className="heroPreviewText">
                      Faded monochrome scan—faces and clothing lose warmth; the scene feels frozen in time.
                    </p>
                  </div>
                  <div className="heroPreviewCol heroPreviewColAfter">
                    <div className="heroPreviewLabel">After</div>
                    <p className="heroPreviewText">
                      Balanced color and contrast so skin tones, fabrics, and backgrounds feel natural on today’s displays.
                    </p>
                  </div>
                </div>

                <div className="heroPreviewTags" aria-label="What improves">
                  <span>Richer tones</span>
                  <span>Sharper detail</span>
                  <span>Share-ready</span>
                </div>
              </div>
            </aside>
          </div>
        </main>

        <section className="section pathSection" id="path" aria-label="Why photo restoration matters">
        <h2 className="pathSectionTitle">Every picture has a story</h2>
        <div className="pathImagesRow" aria-label="Professional workspace">
          <div className="landingPhotoCard pathImageTile">
            <img
              src="/landing/desk.png"
              alt="A clean desk with laptop and notebook"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="landingPhotoCard pathImageTile">
            <img
              src="/landing/conversation.png"
              alt="Two people collaborating over a laptop"
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
          <h2 className="landingTryTitle">Get ready to restore your archive</h2>
          <p className="landingTrySubtitle">Create a free account now. Upload and colorize flows are next on the roadmap.</p>
        </div>
        <div className="landingTryCard">
          <p className="landingTryHint" style={{ margin: 0, maxWidth: '42rem' }}>
            We are finishing the image pipeline. Meanwhile you can use the dashboard for projects and settings—no credit card required.
          </p>
          <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/register" className="landingTryCta" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Create free account
            </Link>
            <Link to="/login" className="landingTryLoginLink">
              Sign in
            </Link>
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
              src="/landing/typing.png"
              alt="Working at a desk with keyboard and computer"
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
            <li><strong>Save projects</strong> in your dashboard and export when processing is live.</li>
          </ul>
          <p className="aboutFootnote">
            <strong>Free tier:</strong> account and project slots today; heavier processing limits will align with plans when colorization ships. Cancel anytime.
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
          <h2 className="sectionTitle">Start free. Upgrade when you're ready.</h2>
        </div>
        <div className="pricingGrid">
          {PLANS.map((plan) => (
            <article key={plan.name} className={`pricingCard ${plan.featured ? 'pricingCardFeatured' : ''}`}>
              <p className="pricingName">{plan.name}</p>
              <p className="pricingPrice">
                {plan.price !== null ? <>${plan.price}<span>/{plan.period}</span></> : <span>Custom</span>}
              </p>
              <p className="pricingDesc">{plan.description}</p>
              <ul className="pricingList">
                {plan.features.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <Link to={plan.ctaTo} className="pricingCta">{plan.cta}</Link>
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
            Quick answers while we ship upload and processing. Policies may evolve as features go live.
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
          <p>Join free. Projects and settings work today; colorization is next. No credit card.</p>
          <Link to="/register" className="heroCta">Get started free</Link>
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
