import Replicate from 'replicate'
import { config } from '../config'

const DDCOLOR_MODEL = 'piddnad/ddcolor'

/** Run DDColor on a single image URL. Returns the colorized image URL from Replicate. */
export async function runColorize(imageUrl: string): Promise<string> {
  const token = config.replicate.apiToken
  if (!token) throw new Error('Replicate not configured. Set REPLICATE_API_TOKEN.')
  const replicate = new Replicate({ auth: token })
  const output = await replicate.run(DDCOLOR_MODEL as `${string}/${string}`, {
    input: { image: imageUrl },
  })
  if (typeof output === 'string') return output
  if (output && typeof (output as { output?: string }).output === 'string') {
    return (output as { output: string }).output
  }
  const url = Array.isArray(output) ? output[0] : (output as { url?: string })?.url
  if (typeof url === 'string') return url
  throw new Error('Unexpected Replicate output shape')
}
