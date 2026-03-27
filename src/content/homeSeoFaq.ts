import { PRODUCT_FACTS } from './productTruth'

/** Homepage FAQ: visible copy + FAQPage JSON-LD (AEO). */
export const HOME_SEO_FAQ = [
  {
    q: 'What does Colorizer do?',
    a: 'Colorizer uses AI to colorize black-and-white or faded photos. You upload an image in the workspace, run Colorize, preview the result, and export when you are happy.',
  },
  {
    q: 'Where do I run colorization?',
    a: 'After you sign in, open Dashboard → Workspace. Upload a JPEG, PNG, WebP, or GIF, then run Colorize. Preview the output on the same screen and export when you are ready.',
  },
  {
    q: 'How does pricing work?',
    a: `Colorizer is subscription-based: Starter (~${PRODUCT_FACTS.paidPlans.starter.colorizationsMonthly} colorizations/mo), Pro (~${PRODUCT_FACTS.paidPlans.pro.colorizationsMonthly.toLocaleString()}), and Studio (~${PRODUCT_FACTS.paidPlans.studio.colorizationsMonthly.toLocaleString()}). Each plan has a saved-project limit, and monthly colorization counts reset each calendar month.`,
  },
  {
    q: 'Will my photos stay private?',
    a: 'We treat uploads with care. Follow the Privacy Policy for retention, processing, and how long files may be kept.',
  },
  {
    q: 'What kinds of photos work best?',
    a: 'Scans of prints, phone photos of old pictures, and digital files with faded color are typical candidates. Final quality depends on source sharpness, lighting, and compression.',
  },
  {
    q: 'Do you store my originals?',
    a: 'Storage and retention policies are described in Privacy. Minimize sensitive uploads until you have reviewed those terms.',
  },
  {
    q: 'Who is Colorizer for?',
    a: 'Anyone with old photos to refresh: families, historians, designers, and creators who want a simple web workflow.',
  },
] as const

export const HOME_SEO_KEYWORDS =
  'ai photo colorizer, colorize black and white photo, colorize old photos, photo enhancement, vintage photo, family photos, scan colorization, image colorization, colorizer'
