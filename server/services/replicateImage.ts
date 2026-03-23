import Replicate from 'replicate'
import { config } from '../config.js'

/** DDColor — photo-realistic colorization (grayscale / B&W → color). */
const DEFAULT_COLORIZE_MODEL =
  'piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695'

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

export async function runReplicateColorize(image: Buffer): Promise<string> {
  const replicate = getClient()
  const colorizeModel = config.replicate.colorizeModel || DEFAULT_COLORIZE_MODEL
  const out = await replicate.run(colorizeModel as `${string}/${string}:${string}`, {
    input: { image },
  })
  return outputToUrl(out)
}
