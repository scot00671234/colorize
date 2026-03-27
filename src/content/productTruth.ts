export const PRODUCT_FACTS = {
  appName: 'Colorizer',
  focus: 'AI photo colorization',
  supportsFormats: ['JPEG', 'PNG', 'WebP', 'GIF'] as const,
  paidPlans: {
    starter: { priceUsdMonthly: 19, colorizationsMonthly: 400, savedProjects: 5 },
    pro: { priceUsdMonthly: 29, colorizationsMonthly: 1500, savedProjects: 25 },
    studio: { priceUsdMonthly: 99, colorizationsMonthly: 8000, savedProjects: 100 },
  },
  billingProvider: 'Stripe',
} as const

export const PRODUCT_TRUTH_NOTES = [
  'Colorizer is a web app focused on colorizing black-and-white or faded photos.',
  'Users process images in Dashboard → Workspace and can export full-size results.',
  'Saved projects are capped by plan (Starter 5, Pro 25, Studio 100).',
  'Colorization usage is capped per calendar month by plan (Starter 400, Pro 1500, Studio 8000).',
] as const

