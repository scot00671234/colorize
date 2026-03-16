import { Link } from 'react-router-dom'

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
  { icon: '◇', title: 'Analytics', description: 'Real-time insights and dashboards so you can make decisions with confidence.' },
  { icon: '◆', title: 'Integrations', description: 'Connect your tools with a single API. Slack, Notion, and 50+ apps ready to go.' },
  { icon: '○', title: 'Security', description: 'SOC 2 compliant with encryption at rest and in transit. Your data stays yours.' },
] as const

const PLANS = [
  { name: 'Starter', price: 0, period: 'month', description: 'For individuals and side projects.', features: ['Up to 3 projects', '1 GB storage', 'Email support', 'Basic analytics'], cta: 'Get started', ctaTo: '/register', featured: false },
  { name: 'Pro', price: 29, period: 'month', description: 'For growing teams that need more.', features: ['Unlimited projects', '50 GB storage', 'Priority support', 'Advanced analytics', 'API access', 'Custom integrations'], cta: 'Start free trial', ctaTo: '/register', featured: true },
  { name: 'Enterprise', price: 59, period: 'month', description: 'For organizations with advanced needs.', features: ['Everything in Pro', 'Dedicated success manager', 'SSO & SAML', 'Audit logs', 'SLA guarantee'], cta: 'Start free trial', ctaTo: '/register', featured: false },
] as const

export default function Landing() {
  return (
    <>
      <main className="hero">
        <div className="heroBg" aria-hidden>
          <div className="heroOrb heroOrbTop" />
          <div className="heroOrb heroOrbBottom" />
          <div className="heroOrb heroOrbCenter" />
        </div>
        <div className="blobs">
          <BlobTop />
          <BlobBottom />
        </div>
        <div className="heroContent">
          <span className="heroBadge">Now in public beta</span>
          <h1 className="heroTitle">Build and ship faster, without the chaos</h1>
          <p className="heroSubtitle">
            One platform for your team, your tools, and your workflow. Get clarity from day one.
          </p>
          <Link to="/register" className="heroCta">Start free trial</Link>
        </div>
      </main>

      <section className="section" id="about">
        <div className="sectionHeader">
          <p className="sectionLabel">About</p>
          <h2 className="sectionTitle">Built for teams who care about clarity</h2>
        </div>
        <div className="aboutContent">
          <p className="aboutText">
            Frosted started with a simple idea: great tools should feel calm, not chaotic. We combine a clean interface with the power teams need—analytics, integrations, and security—so you can focus on what matters.
          </p>
          <p className="aboutText">
            Whether you’re a small team or a growing company, we’re here to help you move faster without the overhead.
          </p>
        </div>
      </section>

      <section className="section" id="features">
        <div className="sectionHeader">
          <p className="sectionLabel">Features</p>
          <h2 className="sectionTitle">Everything you need to move fast</h2>
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
          <h2 className="sectionTitle">Simple, transparent pricing</h2>
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

      <section className="section ctaSection">
        <div className="ctaBox">
          <h2>Ready to get started?</h2>
          <p>Start your free trial. No credit card required.</p>
          <Link to="/register">Start free trial</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footerInner">
          <Link to="/" className="footerBrand">Frosted</Link>
          <div className="footerLinks">
            <a href="/#about">About</a>
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <span className="footerCopy">© {new Date().getFullYear()} Frosted. All rights reserved.</span>
        </div>
      </footer>
    </>
  )
}
