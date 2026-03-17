import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BeforeAfterSlider from '../components/BeforeAfterSlider'

const PRODUCT_NAME = 'Wish Wello'

export default function Landing() {
  const { user } = useAuth()

  return (
    <>
      <main className="hero" data-hero-bg="true">
        <div className="heroBackdrop" aria-hidden />
        <div className="heroBg" aria-hidden>
          <div className="heroOrb heroOrbTop" />
          <div className="heroOrb heroOrbBottom" />
          <div className="heroOrb heroOrbCenter" />
        </div>
        <div className="heroContent">
          <span className="heroBadge">AI photo colorize & restore</span>
          <h1 className="heroTitle">Bring old photos back to life.</h1>
          <p className="heroSubtitle">
            Upload black & white or damaged photos. {PRODUCT_NAME} colorizes and restores them in seconds. No design skills—just your memories, in color.
          </p>
          {user ? (
            <Link to="/dashboard/colorize" className="heroCta">Colorize a photo</Link>
          ) : (
            <Link to="/register" className="heroCta">Get started</Link>
          )}
        </div>
      </main>

      <BeforeAfterSlider />

      <section className="section" id="about">
        <div className="sectionHeader">
          <p className="sectionLabel">About</p>
          <h2 className="sectionTitle">Colorize and restore your photos with AI</h2>
        </div>
        <div className="aboutContent">
          <p className="aboutText">
            {PRODUCT_NAME} uses deep learning to add natural color to black & white photos and to restore damaged or faded images. Upload a photo, and our AI returns a colorized or restored version you can download. Your photos stay private and are processed securely.
          </p>
          <p className="aboutText">
            Choose a plan that fits your usage—from personal archives to teams. All plans include colorization and restoration; higher tiers include more photos per month.
          </p>
        </div>
      </section>

      <section className="section" id="features">
        <div className="sectionHeader">
          <p className="sectionLabel">Features</p>
          <h2 className="sectionTitle">What you can do</h2>
        </div>
        <div className="featureGrid">
          <article className="featureCard">
            <h3>Colorize B&W photos</h3>
            <p>Turn black & white images into natural, full-color photos. Works on portraits, landscapes, and old family photos.</p>
          </article>
          <article className="featureCard">
            <h3>Photo restoration</h3>
            <p>Reduce noise, fix damage, and improve clarity. Face restoration for portraits on Pro and Team plans.</p>
          </article>
          <article className="featureCard">
            <h3>Secure dashboard</h3>
            <p>Upload, process, and download from your dashboard. Your originals and results are stored securely.</p>
          </article>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="sectionHeader">
          <p className="sectionLabel">Pricing</p>
          <h2 className="sectionTitle">Plans that fit how you use photos</h2>
        </div>
        <div className="pricingGrid">
          <article className="pricingCard">
            <p className="pricingName">Starter</p>
            <p className="pricingPrice">$19<span>/month</span></p>
            <p className="pricingDesc">For occasional use. Colorize and restore a set number of photos each month.</p>
            <ul className="pricingList">
              <li>50 photos per month</li>
              <li>Colorize + restore</li>
              <li>Dashboard access</li>
              <li>Download all results</li>
            </ul>
            <Link to="/register" className="pricingCta">Get started</Link>
          </article>
          <article className="pricingCard pricingCardFeatured">
            <p className="pricingName">Pro</p>
            <p className="pricingPrice">$29<span>/month</span></p>
            <p className="pricingDesc">For regular use and family archives. More photos and priority processing.</p>
            <ul className="pricingList">
              <li>150 photos per month</li>
              <li>Colorize + restore</li>
              <li>Priority processing</li>
              <li>Manage via Stripe</li>
            </ul>
            <Link to="/register" className="pricingCta">Get Pro</Link>
          </article>
          <article className="pricingCard">
            <p className="pricingName">Team</p>
            <p className="pricingPrice">$59<span>/month</span></p>
            <p className="pricingDesc">For studios and teams. Highest quota and all features.</p>
            <ul className="pricingList">
              <li>400 photos per month</li>
              <li>All Pro features</li>
              <li>Billing portal</li>
              <li>Cancel anytime</li>
            </ul>
            <Link to="/register" className="pricingCta">Get Team</Link>
          </article>
        </div>
      </section>

      <section className="section ctaSection">
        <div className="ctaBox">
          <h2>Ready to colorize your memories?</h2>
          <p>Create an account and choose a plan. Start with Starter at $19/month.</p>
          {user ? (
            <Link to="/dashboard/colorize" className="heroCta">Go to Colorize</Link>
          ) : (
            <Link to="/register" className="heroCta">Get started</Link>
          )}
        </div>
      </section>

      <footer className="footer">
        <div className="footerInner">
          <Link to="/" className="footerBrand">{PRODUCT_NAME}</Link>
          <div className="footerLinks">
            <a href="/#about">About</a>
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
            <a href="/#demo">Demo</a>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <span className="footerCopy">© {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.</span>
        </div>
      </footer>
    </>
  )
}
