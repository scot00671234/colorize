/**
 * Blog posts for SEO. Aligned with Colorizer: photo colorization, restoration, and workspace.
 */

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'blockquote'; text: string }

export interface BlogArticle {
  slug: string
  title: string
  metaDescription: string
  date: string
  readTime: string
  keywords: string[]
  blocks: BlogBlock[]
}

export const blogArticles: BlogArticle[] = [
  {
    slug: 'colorize-black-and-white-photos',
    title: 'How AI Colorization Helps Black-and-White Photos',
    metaDescription:
      'Why historical and family photos benefit from modern colorization, and how to get natural-looking results from scans and phone pictures.',
    date: '2026-03-20',
    readTime: '5 min',
    keywords: ['ai photo colorizer', 'black and white photos', 'family archive', 'colorization'],
    blocks: [
      {
        type: 'p',
        text: 'Black-and-white images often hold emotional weight, but color can help viewers connect with faces, clothing, and places the way memory does. Modern colorization models infer plausible colors from structure and context—especially strong on portraits and outdoor scenes.',
      },
      {
        type: 'h2',
        text: 'Start from a decent source file',
      },
      {
        type: 'ul',
        items: [
          'Prefer scans or straight-on phone photos of prints over heavy glare or blur.',
          'Crop to the subject if the frame is mostly border or album page.',
          'JPEG or PNG is fine; very small thumbnails limit what the model can infer.',
        ],
      },
      {
        type: 'h2',
        text: 'Using Colorizer',
      },
      {
        type: 'p',
        text: 'In the workspace, upload your image and choose Colorize. Results are tuned for photo-realistic output; review the preview and download when you are happy. Heavily damaged originals may need a restore pass first.',
      },
    ],
  },
  {
    slug: 'restore-old-scanned-photos',
    title: 'Restoring Scanned Photos: Scratches, Fade, and Noise',
    metaDescription:
      'When to use restoration-focused AI on old prints, and how scratch-aware modes differ from simple colorization.',
    date: '2026-03-18',
    readTime: '5 min',
    keywords: ['restore old photos', 'photo restoration', 'scratches', 'scanned photos'],
    blocks: [
      {
        type: 'p',
        text: 'Physical prints pick up scratches, dust, and fading. A restoration model tries to stabilize edges and reduce defects before or alongside color work. If your scan shows clear tear lines or dark scratches, enable the “scratches / damage” option when restoring.',
      },
      {
        type: 'h2',
        text: 'Colorize vs restore',
      },
      {
        type: 'p',
        text: 'Colorize adds plausible color to grayscale or weak color. Restore targets structural damage and noise. Some images need restore first; others only need colorization. Experiment on a copy—you can always re-run with different settings.',
      },
      {
        type: 'blockquote',
        text: 'Always keep a backup of the original scan. AI output is a derivative, not a replacement for the archival file.',
      },
    ],
  },
  {
    slug: 'colorizer-workspace-quick-start',
    title: 'Colorizer Workspace: Upload, Process, Download',
    metaDescription:
      'Sign in, open the workspace, pick Colorize or Restore, and manage projects from the dashboard.',
    date: '2026-03-15',
    readTime: '3 min',
    keywords: ['colorizer', 'photo workspace', 'dashboard', 'image upload'],
    blocks: [
      {
        type: 'p',
        text: 'Create a free account, verify email if required, then open Dashboard → Workspace. Choose an image, select Colorize or Restore, and run processing. Your result opens at full size for download or sharing.',
      },
      {
        type: 'h2',
        text: 'Projects and billing',
      },
      {
        type: 'p',
        text: 'The dashboard lists saved projects for organization. Choose Starter, Pro, or Studio in Settings; Stripe handles subscription and plan changes. Image processing runs on the server within your plan’s monthly colorization allowance.',
      },
    ],
  },
]

export function getBlogArticlesSorted(): BlogArticle[] {
  return [...blogArticles].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return blogArticles.find((a) => a.slug === slug)
}
