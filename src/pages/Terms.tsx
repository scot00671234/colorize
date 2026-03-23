import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setSeoMeta } from '../utils/seoMeta'

export default function Terms() {
  useEffect(() => {
    setSeoMeta({
      title: 'Terms of Service - Colorizer',
      description: 'Terms of service for using Colorizer and related services.',
      path: '/terms',
    })
  }, [])

  return (
    <div className="contentPage">
      <div className="contentCard">
        <h1 className="contentTitle">Terms of Service</h1>
        <p className="contentSubtitle">Last updated: {new Date().toLocaleDateString('en-US')}</p>
        <div className="contentBody">
          <p>
            By using Colorizer, you agree to these terms. Please read them carefully.
          </p>
          <h2>Acceptance</h2>
          <p>
            By creating an account or using our service, you agree to be bound by these terms and our privacy policy.
          </p>
          <h2>Use of the service</h2>
          <p>
            You agree to use the service only for lawful purposes and in accordance with these terms. You are responsible for keeping your account credentials secure and for all activity under your account.
          </p>
          <h2>Account termination</h2>
          <p>
            We may suspend or terminate your account if you breach these terms or for other operational or legal reasons. You may close your account at any time through your account settings.
          </p>
          <h2>Contact</h2>
          <p>
            Questions about these terms? Email us at{' '}
            <a href="mailto:bioqz-customer@outlook.com" className="contentLink">bioqz-customer@outlook.com</a>.
          </p>
        </div>
        <Link to="/" className="contentBack">← Back to home</Link>
      </div>
    </div>
  )
}
