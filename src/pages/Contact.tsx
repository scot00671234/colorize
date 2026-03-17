import { Link } from 'react-router-dom'

export default function Contact() {
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
            <a href="mailto:bioqz@outlook.com" className="contentLink">bioqz@outlook.com</a>
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
