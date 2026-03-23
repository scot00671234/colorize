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

const APP_NAME = 'Colorizer'

/** Build verification email — uses confirmUrl from config (set APP_BASE_URL in production). */
export function buildVerificationEmail(options: {
  email: string
  confirmUrl: string
  expiresInHours: number
}): { subject: string; html: string; text: string } {
  const { confirmUrl, expiresInHours } = options
  const subject = `Confirm your ${APP_NAME} account`
  const text = `Welcome to ${APP_NAME}. Confirm your email by opening this link: ${confirmUrl}. The link expires in ${expiresInHours} hours. If you didn't create an account, you can ignore this email.`
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">Confirm your email</h2>
      <p>Thanks for signing up for <strong>${APP_NAME}</strong>. Click the button below to verify your email and start using your account.</p>
      <p style="margin: 24px 0;">
        <a href="${confirmUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Confirm email</a>
      </p>
      <p style="color: #64748b; font-size: 14px;">This link expires in ${expiresInHours} hours. If you didn't create an account, you can ignore this email.</p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— ${APP_NAME}</p>
    </div>
  `.trim()
  return { subject, html, text }
}

/** Build password reset email — same branding, reset link. */
export function buildPasswordResetEmail(options: {
  resetUrl: string
  expiresInHours: number
}): { subject: string; html: string; text: string } {
  const { resetUrl, expiresInHours } = options
  const subject = `Reset your ${APP_NAME} password`
  const text = `You requested a password reset for ${APP_NAME}. Open this link to set a new password: ${resetUrl}. The link expires in ${expiresInHours} hour(s). If you didn't request this, you can ignore this email.`
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">Reset your password</h2>
      <p>Someone requested a password reset for your <strong>${APP_NAME}</strong> account. Click the button below to set a new password.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Reset password</a>
      </p>
      <p style="color: #64748b; font-size: 14px;">This link expires in ${expiresInHours} hour(s). If you didn't request a reset, you can ignore this email.</p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— ${APP_NAME}</p>
    </div>
  `.trim()
  return { subject, html, text }
}
