/** Fingerprint helper for abuse / cooldown logic (reusable for future image or text flows). */
export function hashJobDesc(text: string): string {
  let h = 0
  const s = text.trim().toLowerCase().replace(/\s+/g, ' ')
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h = ((h << 5) - h) + c
    h = h & h
  }
  return String(Math.abs(h))
}

/** Per-user fingerprint counts for spam detection (>10 same in 24h → cooldown) */
const jobDescCounts = new Map<string, { count: number; resetAt: number }>()
const JOB_DESC_WINDOW_MS = 24 * 60 * 60 * 1000
const JOB_DESC_COOLDOWN_THRESHOLD = 10

export function recordJobDescHash(userId: string, hash: string): { cooldown: boolean } {
  const now = Date.now()
  const key = `${userId}:${hash}`
  const entry = jobDescCounts.get(key)
  if (!entry) {
    jobDescCounts.set(key, { count: 1, resetAt: now + JOB_DESC_WINDOW_MS })
    return { cooldown: false }
  }
  if (now > entry.resetAt) {
    entry.count = 1
    entry.resetAt = now + JOB_DESC_WINDOW_MS
    return { cooldown: false }
  }
  entry.count++
  return { cooldown: entry.count > JOB_DESC_COOLDOWN_THRESHOLD }
}

/** Lockout and suspend in-memory (key by userId) */
const lockoutUntil = new Map<string, number>()
const suspendUntil = new Map<string, number>()
const LOCKOUT_MS = 5 * 60 * 1000  // 5 min

export function isLockedOut(userId: string): boolean {
  const until = lockoutUntil.get(userId)
  return until != null && Date.now() < until
}

export function setLockout(userId: string): void {
  lockoutUntil.set(userId, Date.now() + LOCKOUT_MS)
}

export function isSuspended(userId: string): boolean {
  const until = suspendUntil.get(userId)
  return until != null && Date.now() < until
}

export function setSuspended(userId: string): void {
  suspendUntil.set(userId, Date.now() + 24 * 60 * 60 * 1000)  // 24h
}

export function getLockoutRemaining(userId: string): number {
  const until = lockoutUntil.get(userId)
  if (until == null) return 0
  const rem = until - Date.now()
  return rem > 0 ? Math.ceil(rem / 1000) : 0
}
