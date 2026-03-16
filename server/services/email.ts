/**
 * Email service interface. Replace the implementation below with your provider:
 * - SendGrid, Resend, AWS SES, Nodemailer (SMTP), etc.
 */

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text?: string
}

export type EmailService = {
  send(options: SendEmailOptions): Promise<void>
}

/**
 * Stub: logs to console. Replace with real implementation and wire in server/index.ts.
 */
export const stubEmailService: EmailService = {
  async send({ to, subject, html, text }) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Email]', { to, subject, text: text || html.slice(0, 80) + '...' })
    }
  },
}

/** Build verification email HTML (can be replaced with a template engine). */
export function buildVerificationEmail(options: {
  email: string
  confirmUrl: string
  expiresInHours: number
}): { subject: string; html: string; text: string } {
  const { confirmUrl, expiresInHours } = options
  const subject = 'Confirm your email'
  const text = `Confirm your email by opening this link: ${confirmUrl}. It expires in ${expiresInHours} hours.`
  const html = `
    <p>Thanks for signing up. Please confirm your email by clicking the link below.</p>
    <p><a href="${confirmUrl}">Confirm email</a></p>
    <p>This link expires in ${expiresInHours} hours. If you didn't create an account, you can ignore this email.</p>
  `.trim()
  return { subject, html, text }
}
