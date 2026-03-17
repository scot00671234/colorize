import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="contentPage">
      <div className="contentCard">
        <h1 className="contentTitle">Privacy Policy</h1>
        <p className="contentSubtitle">Last updated: {new Date().toLocaleDateString('en-US')}</p>
        <div className="contentBody">
          <p>
            This privacy policy describes how we collect, use, and protect your information when you use Wish Wello (our photo colorization and restoration service).
          </p>
          <h2>Information we collect</h2>
          <p>
            We collect information you provide directly, such as your email address when you register, and usage data (e.g. uploads and processing) to provide and improve our service.
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
            For questions about this policy, contact us at <a href="mailto:support@yourdomain.com" className="contentLink">support@yourdomain.com</a>.
          </p>
        </div>
        <Link to="/" className="contentBack">← Back to home</Link>
      </div>
    </div>
  )
}
