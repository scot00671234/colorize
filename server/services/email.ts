import { Resend } from 'resend'
import { config } from '../config'

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text?: string
}

export type EmailService = {
  send(options: SendEmailOptions): Promise<void>
}

/** Stub: logs to console. Used when RESEND_API_KEY is not set. */
const stubEmailService: EmailService = {
  async send({ to, subject, html, text }) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Email]', { to, subject, text: text || html.slice(0, 80) + '...' })
      const match = typeof text === 'string' && text.match(/(https?:\/\/\S+?)\.?\s/)
      if (match) console.log('[Email] Verification link (copy this):', match[1])
    }
  },
}

/** Resend: sends via Resend API when RESEND_API_KEY is set. */
function createResendService(): EmailService {
  const resend = new Resend(config.resend.apiKey)
  return {
    async send({ to, subject, html, text }) {
      const { error } = await resend.emails.send({
        from: config.resend.from,
        to: [to],
        subject,
        html,
        text: text ?? undefined,
      })
      if (error) throw new Error(error.message)
    },
  }
}

/** Use Resend if API key is set, otherwise stub (log only). */
export const emailService: EmailService = config.resend.apiKey
  ? createResendService()
  : stubEmailService

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
