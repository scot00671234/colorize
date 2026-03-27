/**
 * Blog posts for SEO + AEO. Every article is intent-tagged and answer-first.
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
  lastReviewed: string
  readTime: string
  searchIntent: 'informational' | 'problem-solving' | 'commercial' | 'transactional'
  primaryQuestion: string
  quickAnswer: string
  keyTakeaways: string[]
  whoFor: string
  steps?: string[]
  limitations?: string[]
  faq: { q: string; a: string }[]
  relatedSlugs: string[]
  ctaVariant: 'register' | 'pricing' | 'workspace'
  keywords: string[]
  blocks: BlogBlock[]
}

export const blogArticles: BlogArticle[] = [
  {
    slug: 'colorize-black-and-white-photos',
    title: 'How AI Colorization Helps Black-and-White Photos',
    metaDescription:
      'How to colorize black-and-white photos with better results, including source prep, review steps, and realistic quality expectations.',
    date: '2026-03-20',
    lastReviewed: '2026-03-24',
    readTime: '5 min',
    searchIntent: 'informational',
    primaryQuestion: 'How do I colorize black-and-white photos so they look natural?',
    quickAnswer:
      'Use the highest-quality scan or photo you have, run Colorize in the workspace, and compare output against the original before export. Strong source quality, clear faces, and clean lighting usually produce the most believable results.',
    keyTakeaways: [
      'Source quality matters more than post-processing tweaks.',
      'Run colorization on a cropped subject when the full frame has borders or noise.',
      'Review skin tones, uniforms, sky, and vegetation against historical context before sharing.',
    ],
    whoFor:
      'Families, archive volunteers, and creators who want a practical workflow for turning monochrome photos into color while keeping original files untouched.',
    steps: [
      'Scan or photograph the print straight-on with minimal glare.',
      'Upload the file in Dashboard → Workspace.',
      'Run Colorize, inspect details, and export the result.',
    ],
    limitations: [
      'AI output is plausible, not guaranteed historical truth for every object tone.',
      'Very small or heavily compressed inputs reduce output quality.',
    ],
    faq: [
      {
        q: 'Does Colorizer overwrite my original?',
        a: 'No. You keep the original file and export a separate colorized result.',
      },
      {
        q: 'Can I colorize phone photos of prints?',
        a: 'Yes. Straight-on photos with even lighting usually work better than angled shots with glare.',
      },
    ],
    relatedSlugs: ['best-scan-settings-for-old-photos', 'what-to-do-when-colorized-photo-looks-wrong'],
    ctaVariant: 'workspace',
    keywords: ['ai photo colorizer', 'black and white photos', 'family archive', 'colorization'],
    blocks: [
      {
        type: 'p',
        text: 'Black-and-white images often hold emotional weight, but color can help viewers connect with faces, clothing, and places. Modern colorization models infer plausible color from structure and context, especially on portraits and outdoor scenes.',
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
      { type: 'h2', text: 'Using Colorizer' },
      { type: 'p', text: 'In the workspace, upload your image and run Colorize. Review the preview before exporting full size.' },
    ],
  },
  {
    slug: 'best-scan-settings-for-old-photos',
    title: 'Best Scan Settings Before You Colorize Old Photos',
    metaDescription:
      'Scanner and phone-capture settings that improve AI colorization results, plus common quality mistakes to avoid.',
    date: '2026-03-18',
    lastReviewed: '2026-03-24',
    readTime: '6 min',
    searchIntent: 'informational',
    primaryQuestion: 'What scan settings give the best colorization results?',
    quickAnswer:
      'Capture clean, high-resolution inputs with even lighting, no glare, and minimal compression. For prints, 300-600 DPI scans are usually enough for strong AI colorization quality.',
    keyTakeaways: [
      'Avoid over-compressed files and screenshots.',
      'Use straight framing and neutral white balance where possible.',
      'Crop distracting borders before upload.',
    ],
    whoFor: 'People digitizing albums and archives who want better output before running AI colorization.',
    steps: [
      'Scan at 300-600 DPI if possible.',
      'If using a phone, shoot straight-on in soft, even light.',
      'Export as JPEG or PNG with minimal recompression.',
    ],
    limitations: [
      'Severe motion blur or blown highlights cannot be fully recovered.',
      'Tiny source files may produce flat or uncertain color detail.',
    ],
    faq: [
      { q: 'Is PNG always better than JPEG?', a: 'Not always. A high-quality JPEG often works well; avoid repeated recompression.' },
      { q: 'Should I upscale first?', a: 'Usually no. Start with the best native capture and evaluate output before any upscaling.' },
    ],
    relatedSlugs: ['colorize-black-and-white-photos', 'what-to-do-when-colorized-photo-looks-wrong'],
    ctaVariant: 'workspace',
    keywords: ['scan settings old photos', 'photo scan dpi', 'prepare photos for ai colorization', 'archive digitization'],
    blocks: [
      { type: 'p', text: 'Capture quality sets the ceiling for AI output. Most colorization problems start before upload: glare, blur, low resolution, or heavy compression.' },
      { type: 'h2', text: 'Scan and capture checklist' },
      { type: 'ul', items: ['Use 300-600 DPI for flatbed scans when possible.', 'Keep the photo plane flat and camera parallel.', 'Avoid shadows and reflections on glossy prints.'] },
      { type: 'blockquote', text: 'Keep your untouched original. A colorized image is a derivative for viewing and sharing.' },
    ],
  },
  {
    slug: 'colorizer-workspace-quick-start',
    title: 'Colorizer Workspace Quick Start: Upload, Colorize, Export',
    metaDescription:
      'Step-by-step guide to using the Colorizer workspace and saving named projects to your dashboard.',
    date: '2026-03-15',
    lastReviewed: '2026-03-24',
    readTime: '3 min',
    searchIntent: 'transactional',
    primaryQuestion: 'How do I use the Colorizer workspace from start to finish?',
    quickAnswer:
      'Open Dashboard → Workspace, upload an image, run Colorize, review the preview, and export. If you want to keep the run organized, name the project and save it to your dashboard.',
    keyTakeaways: [
      'Colorization runs from the workspace after upload.',
      'Saved projects help organize repeat work by name.',
      'Plan limits apply to monthly colorizations and saved project count.',
    ],
    whoFor: 'New users who want a fast onboarding path and clear workflow checkpoints.',
    steps: [
      'Create an account and subscribe to Starter, Pro, or Studio.',
      'Upload one image in Workspace and run Colorize.',
      'Optionally name the project and save it to Dashboard.',
      'Export full size when satisfied.',
    ],
    limitations: [
      'Hosted output links can expire over time; export files you need to keep permanently.',
    ],
    faq: [
      { q: 'Can I save project names?', a: 'Yes. Workspace includes project naming and save-to-dashboard actions.' },
      { q: 'Do monthly usage counts reset?', a: 'Yes. Colorization counts reset each calendar month.' },
    ],
    relatedSlugs: ['how-colorizer-pricing-and-limits-work', 'colorize-black-and-white-photos'],
    ctaVariant: 'register',
    keywords: ['colorizer', 'photo workspace', 'dashboard', 'image upload'],
    blocks: [
      {
        type: 'p',
        text: 'Create an account, subscribe to a plan, then open Dashboard → Workspace. Choose an image, run Colorize, and export your result when ready.',
      },
      {
        type: 'h2',
        text: 'Projects and billing',
      },
      {
        type: 'p',
        text: 'The dashboard lists saved projects for organization. Choose Starter, Pro, or Studio in Settings; Stripe handles subscription and plan changes. Colorization runs within your plan’s monthly allowance.',
      },
    ],
  },
  {
    slug: 'how-colorizer-pricing-and-limits-work',
    title: 'How Colorizer Pricing and Limits Work',
    metaDescription:
      'Clear explanation of Starter, Pro, and Studio plan limits for monthly colorizations and saved projects.',
    date: '2026-03-22',
    lastReviewed: '2026-03-24',
    readTime: '4 min',
    searchIntent: 'commercial',
    primaryQuestion: 'Which Colorizer plan should I choose?',
    quickAnswer:
      'Choose based on monthly colorization volume and project storage needs: Starter for light usage, Pro for regular archives, Studio for high-volume workflows.',
    keyTakeaways: [
      'Starter: 400 monthly colorizations and 5 saved projects.',
      'Pro: 1,500 monthly colorizations and 25 saved projects.',
      'Studio: 8,000 monthly colorizations and 100 saved projects.',
    ],
    whoFor: 'Buyers comparing plan fit before subscribing or upgrading.',
    faq: [
      { q: 'Does usage reset monthly?', a: 'Yes. Colorization usage resets each calendar month.' },
      { q: 'Can I switch plans later?', a: 'Yes. Manage plan changes from Settings via Stripe billing.' },
    ],
    relatedSlugs: ['colorizer-workspace-quick-start', 'colorize-black-and-white-photos'],
    ctaVariant: 'pricing',
    keywords: ['colorizer pricing', 'ai colorization subscription', 'monthly colorization limits'],
    blocks: [
      { type: 'p', text: 'Colorizer pricing is volume-based. Higher tiers increase both monthly colorizations and saved project capacity.' },
      { type: 'h2', text: 'When to choose each plan' },
      { type: 'ul', items: ['Starter: occasional family photo batches.', 'Pro: regular archive work each month.', 'Studio: teams, studios, and high-volume collections.'] },
    ],
  },
  {
    slug: 'what-to-do-when-colorized-photo-looks-wrong',
    title: 'What to Do When a Colorized Photo Looks Wrong',
    metaDescription:
      'Troubleshooting guide for unnatural tones, muddy contrast, and weak detail in AI colorization output.',
    date: '2026-03-21',
    lastReviewed: '2026-03-24',
    readTime: '6 min',
    searchIntent: 'problem-solving',
    primaryQuestion: 'How can I improve a colorized result that looks off?',
    quickAnswer:
      'Start by improving source quality: recapture without glare, crop distractions, and upload a cleaner file. Most quality issues come from input conditions rather than the final export step.',
    keyTakeaways: [
      'Recapturing the source often improves output more than editing after export.',
      'Large borders and album backgrounds can confuse subject colors.',
      'Run another pass after cropping and lighting fixes.',
    ],
    whoFor: 'Users who already ran Colorize but want better realism.',
    steps: [
      'Check for glare, blur, and skew in the source image.',
      'Crop to the subject and remove large borders.',
      'Upload the improved source and compare again.',
    ],
    limitations: [
      'Heavy blur and severe compression may limit recoverable detail.',
      'Color inference can vary on unusual uniforms, objects, or damaged scenes.',
    ],
    faq: [
      { q: 'Should I edit before uploading?', a: 'Light crops and rotation help. Avoid aggressive filters before colorization.' },
      { q: 'Can I force exact historical colors?', a: 'Not perfectly. AI provides plausible color estimates based on visual context.' },
    ],
    relatedSlugs: ['best-scan-settings-for-old-photos', 'colorize-black-and-white-photos'],
    ctaVariant: 'workspace',
    keywords: ['colorized photo looks wrong', 'ai colorization troubleshooting', 'improve photo colorization'],
    blocks: [
      { type: 'p', text: 'When output looks unrealistic, the fastest fix is usually a better source capture. Re-shoot or rescan first, then run another colorization pass.' },
      { type: 'h2', text: 'High-impact fixes' },
      { type: 'ul', items: ['Reduce glare and shadows.', 'Crop distractions around the subject.', 'Use the highest-resolution original available.'] },
    ],
  },
  {
    slug: 'phone-camera-vs-flatbed-scan-for-colorization',
    title: 'Phone Camera vs Flatbed Scan for Photo Colorization',
    metaDescription:
      'Which source capture method is better before AI colorization, and when a phone photo can perform almost as well as a scanner.',
    date: '2026-03-25',
    lastReviewed: '2026-03-25',
    readTime: '6 min',
    searchIntent: 'commercial',
    primaryQuestion: 'Should I use a phone camera or a flatbed scanner before colorizing?',
    quickAnswer:
      'Use a flatbed scan when possible for consistency, especially for prints with fine detail. A phone photo can still work well if it is straight-on, evenly lit, and high resolution.',
    keyTakeaways: [
      'Flatbed scans usually provide more consistent detail and geometry.',
      'Phone captures are acceptable when lighting is controlled and glare-free.',
      'The best method is whichever gives the cleanest file with minimal compression.',
    ],
    whoFor: 'Anyone digitizing old prints and deciding how to capture files before colorization.',
    steps: [
      'If available, scan at 300-600 DPI.',
      'If using a phone, shoot perpendicular to the print in soft light.',
      'Compare both captures once in the workspace and keep the better source.',
    ],
    limitations: [
      'Glossy prints can reflect light even with careful phone setup.',
      'Some low-cost scanners introduce blur at edges; compare outputs.',
    ],
    faq: [
      { q: 'Do I need a scanner to use Colorizer?', a: 'No. You can upload phone photos of prints as long as they are clear and well lit.' },
      { q: 'Will higher DPI always win?', a: 'Not always. Clarity, focus, and low compression matter as much as DPI.' },
    ],
    relatedSlugs: ['best-scan-settings-for-old-photos', 'what-to-do-when-colorized-photo-looks-wrong'],
    ctaVariant: 'workspace',
    keywords: ['phone vs scanner old photos', 'flatbed scan colorization', 'best source for ai colorization'],
    blocks: [
      { type: 'p', text: 'Capture quality controls downstream colorization quality. Flatbeds are steady and repeatable, while phones are convenient and often good enough with proper setup.' },
      { type: 'h2', text: 'When flatbed scanning wins' },
      { type: 'ul', items: ['Large batches with consistent quality requirements.', 'Fine texture or small face detail.', 'Archival workflows where repeatability matters.'] },
      { type: 'h2', text: 'When phone capture is enough' },
      { type: 'ul', items: ['You only have a few prints to process.', 'You can shoot straight-on in diffuse daylight.', 'You can avoid glare and perspective skew.'] },
    ],
  },
  {
    slug: 'organize-family-photo-archive-with-projects',
    title: 'How to Organize a Family Photo Archive with Projects',
    metaDescription:
      'A practical naming and workflow system for keeping colorized outputs organized in your dashboard projects.',
    date: '2026-03-26',
    lastReviewed: '2026-03-26',
    readTime: '5 min',
    searchIntent: 'informational',
    primaryQuestion: 'How should I organize old family photos while colorizing them?',
    quickAnswer:
      'Use clear project names by family branch, decade, or event, then save each successful run to the dashboard. Keep original files separately and export final images with consistent naming.',
    keyTakeaways: [
      'Good naming reduces duplicate work and makes retrieval faster.',
      'Project limits differ by plan, so prioritize meaningful grouping.',
      'Store originals outside the app and use exports for long-term retention.',
    ],
    whoFor: 'Family historians and creators managing many photos over time.',
    steps: [
      'Choose a naming format (for example: Family-Year-Location).',
      'Save each finished image to the most relevant project.',
      'Export with a standard suffix like -colorized and back up externally.',
    ],
    faq: [
      { q: 'Can I rename projects later?', a: 'Yes. You can edit project names after saving.' },
      { q: 'Do projects count toward plan limits?', a: 'Yes. Starter, Pro, and Studio each have different saved-project limits.' },
    ],
    relatedSlugs: ['colorizer-workspace-quick-start', 'how-colorizer-pricing-and-limits-work'],
    ctaVariant: 'register',
    keywords: ['organize family photo archive', 'photo project naming', 'dashboard photo workflow'],
    blocks: [
      { type: 'p', text: 'Most archive friction comes from inconsistent naming. Decide a simple project structure first, then run colorization in batches that map to those projects.' },
      { type: 'h2', text: 'Recommended naming format' },
      { type: 'ul', items: ['Surname or branch (Patel, Miller, etc.)', 'Timeframe (1950s, 1978, etc.)', 'Event or location (Wedding, ChicagoTrip)'] },
      { type: 'blockquote', text: 'Keep originals unchanged in external storage. Use dashboard projects for organization and exports for deliverables.' },
    ],
  },
  {
    slug: 'starter-vs-pro-vs-studio-real-usage-examples',
    title: 'Starter vs Pro vs Studio: Real Usage Examples',
    metaDescription:
      'Examples of which Colorizer plan fits occasional family use, regular archive work, and high-volume monthly workflows.',
    date: '2026-03-27',
    lastReviewed: '2026-03-27',
    readTime: '5 min',
    searchIntent: 'commercial',
    primaryQuestion: 'Which Colorizer plan fits my monthly workload?',
    quickAnswer:
      'Pick based on monthly image volume and project count: Starter for light usage, Pro for steady archive sessions, and Studio for high-volume workflows that need larger monthly allowance and more saved projects.',
    keyTakeaways: [
      'Plan fit is mostly about monthly throughput.',
      'Project limit matters if you segment work into many named sets.',
      'You can switch plans from Settings with Stripe billing.',
    ],
    whoFor: 'Prospective buyers comparing plans before checkout.',
    faq: [
      { q: 'Can I upgrade later?', a: 'Yes. Plan changes are managed in Settings via Stripe.' },
      { q: 'What happens if I hit my monthly limit?', a: 'You can wait for reset next calendar month or change to a higher plan.' },
    ],
    relatedSlugs: ['how-colorizer-pricing-and-limits-work', 'colorizer-workspace-quick-start'],
    ctaVariant: 'pricing',
    keywords: ['starter vs pro vs studio', 'colorizer plan comparison', 'photo colorization plan'],
    blocks: [
      { type: 'p', text: 'You do not need to guess. Estimate your average monthly image count and how many projects you keep active, then match that against plan limits.' },
      { type: 'h2', text: 'Usage scenarios' },
      { type: 'ul', items: ['Starter: occasional weekend family archive sessions.', 'Pro: weekly archive work and regular exports.', 'Studio: continuous production-style workflows.'] },
      { type: 'h2', text: 'Decision shortcut' },
      { type: 'p', text: 'If you regularly exceed a plan limit for two months in a row, move up a tier to reduce workflow interruptions.' },
    ],
  },
  {
    slug: 'ai-colorization-limitations-what-to-expect',
    title: 'AI Colorization Limitations: What to Expect',
    metaDescription:
      'Understand what AI colorization can and cannot recover so you can set realistic expectations before processing old photos.',
    date: '2026-03-28',
    lastReviewed: '2026-03-28',
    readTime: '6 min',
    searchIntent: 'informational',
    primaryQuestion: 'What can AI colorization realistically recover from old photos?',
    quickAnswer:
      'AI colorization can infer plausible color from visible structure, but it cannot perfectly reconstruct missing detail or guarantee historical color certainty in every region of an image.',
    keyTakeaways: [
      'Plausible color is not the same as historically verified color.',
      'Missing or blurred detail cannot be fully recreated by colorization alone.',
      'Best results come from clean, high-quality source captures.',
    ],
    whoFor: 'Users who want accurate expectations before running or sharing colorized images.',
    limitations: [
      'Unclear objects can receive uncertain color estimates.',
      'Severely degraded prints may still look flat after colorization.',
      'Artifacts in the source often carry into output.',
    ],
    faq: [
      { q: 'Is AI output historically exact?', a: 'Not always. It is a plausible estimate based on visual context.' },
      { q: 'Should I keep the original file?', a: 'Yes. Keep originals and treat colorized output as a derivative for viewing and sharing.' },
    ],
    relatedSlugs: ['colorize-black-and-white-photos', 'what-to-do-when-colorized-photo-looks-wrong'],
    ctaVariant: 'workspace',
    keywords: ['ai colorization limitations', 'photo colorization accuracy', 'historical photo colorization'],
    blocks: [
      { type: 'p', text: 'Understanding limits helps avoid disappointment. AI colorization is strongest when source content is clear, but uncertainty increases when objects are obscured, damaged, or low-resolution.' },
      { type: 'h2', text: 'What AI does well' },
      { type: 'ul', items: ['Global tone reconstruction on portraits and outdoor scenes.', 'Plausible color for common materials (skin, sky, vegetation, clothing).', 'Fast iteration for archive and storytelling workflows.'] },
      { type: 'h2', text: 'Where human review is still required' },
      { type: 'ul', items: ['Historically sensitive uniforms and insignia.', 'Critical publishing contexts that require source citation.', 'Any image with significant missing detail.'] },
    ],
  },
]

export function getBlogArticlesSorted(): BlogArticle[] {
  return [...blogArticles].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return blogArticles.find((a) => a.slug === slug)
}
