import Replicate from 'replicate'
import { config } from '../config.js'

/** DDColor — photo-realistic colorization (grayscale / B&W → color). */
const DEFAULT_COLORIZE_MODEL =
  'piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695'

/** Microsoft — scratch / damage restoration for old photos. */
const DEFAULT_RESTORE_MODEL =
  'microsoft/bringing-old-photos-back-to-life:c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799'

function getClient(): Replicate {
  const token = config.replicate.apiToken
  if (!token) {
    throw new Error('REPLICATE_API_TOKEN is not set')
  }
  return new Replicate({ auth: token })
}

/** Normalize Replicate file output (URL string, FileOutput, or array). */
function outputToUrl(raw: unknown): string {
  if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) {
    return raw
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      try {
        return outputToUrl(item)
      } catch {
        /* try next */
      }
    }
  }
  if (raw && typeof raw === 'object') {
    const o = raw as { url?: unknown }
    if (typeof o.url === 'function') {
      return (o.url as () => string)()
    }
    if (typeof o.url === 'string') {
      return o.url
    }
  }
  throw new Error('Unexpected model output (expected image URL)')
}

export type ImageProcessMode = 'colorize' | 'restore'

export async function runReplicateImage(
  mode: ImageProcessMode,
  image: Buffer,
  options: { withScratch?: boolean } = {}
): Promise<string> {
  const replicate = getClient()
  const colorizeModel = config.replicate.colorizeModel || DEFAULT_COLORIZE_MODEL
  const restoreModel = config.replicate.restoreModel || DEFAULT_RESTORE_MODEL

  if (mode === 'colorize') {
    const out = await replicate.run(colorizeModel as `${string}/${string}:${string}`, {
      input: { image },
    })
    return outputToUrl(out)
  }

  const withScratch = options.withScratch !== false
  const out = await replicate.run(restoreModel as `${string}/${string}:${string}`, {
    input: {
      image,
      HR: false,
      with_scratch: withScratch,
    },
  })
  return outputToUrl(out)
}
