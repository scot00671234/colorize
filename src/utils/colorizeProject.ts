/** Stored in `projects.content` for workspace colorize saves. */
export type ColorizeProjectPayloadV1 = {
  v: 1
  kind: 'colorize'
  resultUrl: string
  originalName: string
  /** Optional JPEG data URL (downscaled) so reopening shows the original. */
  originalDataUrl?: string | null
}

export function isColorizeProjectPayload(o: unknown): o is ColorizeProjectPayloadV1 {
  if (!o || typeof o !== 'object') return false
  const x = o as Record<string, unknown>
  return (
    x.v === 1 &&
    x.kind === 'colorize' &&
    typeof x.resultUrl === 'string' &&
    typeof x.originalName === 'string'
  )
}

export function parseColorizeProjectContent(content: string): ColorizeProjectPayloadV1 | null {
  if (!content?.trim()) return null
  try {
    const o = JSON.parse(content) as unknown
    return isColorizeProjectPayload(o) ? o : null
  } catch {
    return null
  }
}

export function stringifyColorizeProjectPayload(p: ColorizeProjectPayloadV1): string {
  return JSON.stringify(p)
}

/** Downscale to JPEG data URL; returns null if too large or on failure. */
export async function fileToStorableDataUrl(
  file: File,
  maxEdge = 1000,
  maxChars = 1_400_000
): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        let w = img.naturalWidth || img.width
        let h = img.naturalHeight || img.height
        if (!w || !h) {
          resolve(null)
          return
        }
        const scale = Math.min(1, maxEdge / Math.max(w, h))
        w = Math.max(1, Math.round(w * scale))
        h = Math.max(1, Math.round(h * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        let q = 0.82
        let data = canvas.toDataURL('image/jpeg', q)
        while (data.length > maxChars && q > 0.45) {
          q -= 0.06
          data = canvas.toDataURL('image/jpeg', q)
        }
        if (data.length > maxChars) resolve(null)
        else resolve(data)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

export function dashboardSnippetFromProjectContent(content: string): string | null {
  const p = parseColorizeProjectContent(content)
  if (!p) return null
  const name = p.originalName?.trim() || 'photo'
  return `Colorized: ${name}`
}
