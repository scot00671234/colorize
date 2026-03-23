import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setSeoMeta } from '../utils/seoMeta'

export default function Privacy() {
  useEffect(() => {
    setSeoMeta({
      title: 'Privacy Policy - Colorizer',
      description:
        'How Colorizer collects and uses data when you use our photo and account services. Read our privacy policy.',
      path: '/privacy',
    })
  }, [])

  return (
    <div className="contentPage">
      <div className="contentCard">
        <h1 className="contentTitle">Privacy Policy</h1>
        <p className="contentSubtitle">Last updated: {new Date().toLocaleDateString('en-US')}</p>
        <div className="contentBody">
          <p>
            This privacy policy describes how we collect, use, and protect your information when you use our service.
          </p>
          <h2>Information we collect</h2>
          <p>
            We collect information you provide directly, such as your email address when you register, and usage data (e.g. how you use the product) to improve our services.
          </p>
          <h2>How we use it</h2>
          <p>
            We use your information to provide, maintain, and improve our service; to communicate with you; and to comply with legal obligations.
          </p>
          <h2>Your rights</h2>
          <p>
            You may access, correct, or delete your personal data through your account settings or by contacting us.
          </p>
          <p>
            For questions about this policy, contact us at <a href="mailto:bioqz-customer@outlook.com" className="contentLink">bioqz-customer@outlook.com</a>.
          </p>
        </div>
        <Link to="/" className="contentBack">← Back to home</Link>
      </div>
    </div>
  )
}
