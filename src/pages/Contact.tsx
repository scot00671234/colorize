import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setSeoMeta } from '../utils/seoMeta'

export default function Contact() {
  useEffect(() => {
    setSeoMeta({
      title: 'Contact - Colorizer | Support',
      description:
        'Contact Colorizer support for questions about photo tools, billing, or your account. We reply within about one business day.',
      path: '/contact',
    })
  }, [])

  return (
    <div className="contentPage">
      <div className="contentCard">
        <h1 className="contentTitle">Contact</h1>
        <p className="contentSubtitle">Get in touch with our team.</p>
        <div className="contentBody">
          <p>
            Have a question, feedback, or need support? We’d love to hear from you.
          </p>
          <p>
            <strong>Email</strong><br />
            <a href="mailto:bioqz-customer@outlook.com" className="contentLink">bioqz-customer@outlook.com</a>
          </p>
          <p>
            We typically respond within one business day.
          </p>
        </div>
        <Link to="/" className="contentBack">← Back to home</Link>
      </div>
    </div>
  )
}
