import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { aiRateLimiter } from '../middleware/rateLimit'
import { checkRewriteLimits, checkScoreCooldown, insertUsageLog } from '../middleware/usage'
import type { JwtPayload } from '../middleware/auth'
import { config } from '../config'
import { rewriteWithDeepSeek, generateSummaryWithDeepSeek } from '../services/deepseek'
import { computeScore } from '../services/score'
import { getCachedScore, setCachedScore, hashJobDesc } from '../services/jobDescCache'

const router = Router()

router.use(aiRateLimiter)
router.use(requireAuth)

/** POST /api/ai/rewrite */
router.post('/rewrite', checkRewriteLimits, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { text, language, context } = req.body as { text?: string; language?: string; context?: string }
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing or invalid text' })
    return
  }
  if (text.length > 4000) {
    res.status(400).json({ error: 'Text is too long. Select a shorter passage to rewrite.' })
    return
  }
  const contextStr = typeof context === 'string' ? context.slice(0, 500) : undefined

  if (!config.deepseek?.apiKey) {
    res.status(503).json({ error: 'AI service is not configured. Please set DEEPSEEK_API_KEY.' })
    return
  }

  try {
    const result = await rewriteWithDeepSeek(text, { language, context: contextStr })
    const tokensUsed = result.usage.prompt_tokens + result.usage.completion_tokens
    await insertUsageLog(user.userId, 'rewrite', tokensUsed)
    res.json({ rewritten: result.text, tokensUsed })
  } catch (err) {
    console.error('Rewrite error:', err)
    res.status(502).json({ error: 'Something went wrong. Please try again.' })
  }
})

/** POST /api/ai/summary — generate professional summary for top of resume. Uses same daily cap as rewrite. */
router.post('/summary', checkRewriteLimits, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { resumeText, jobDescription } = req.body as { resumeText?: string; jobDescription?: string }
  if (!resumeText || typeof resumeText !== 'string') {
    res.status(400).json({ error: 'Resume text is required.' })
    return
  }
  const trimmed = resumeText.trim()
  if (trimmed.length < 50) {
    res.status(400).json({ error: 'Add more resume content before generating a summary.' })
    return
  }
  if (trimmed.length > 100_000) {
    res.status(400).json({ error: 'Resume is too long.' })
    return
  }
  const jobDesc = typeof jobDescription === 'string' ? jobDescription.slice(0, 5000) : undefined

  if (!config.deepseek?.apiKey) {
    res.status(503).json({ error: 'AI service is not configured. Please set DEEPSEEK_API_KEY.' })
    return
  }

  try {
    const result = await generateSummaryWithDeepSeek(trimmed, jobDesc)
    const tokensUsed = result.usage.prompt_tokens + result.usage.completion_tokens
    await insertUsageLog(user.userId, 'summary', tokensUsed)
    res.json({ summary: result.text })
  } catch (err) {
    console.error('Summary error:', err)
    res.status(502).json({ error: 'Something went wrong. Please try again.' })
  }
})

/** POST /api/ai/score */
router.post('/score', checkScoreCooldown, async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  const { resumeText, jobDescription } = req.body as { resumeText?: string; jobDescription?: string }
  if (typeof resumeText !== 'string' || typeof jobDescription !== 'string') {
    res.status(400).json({ error: 'Missing resumeText or jobDescription' })
    return
  }
  if (resumeText.length > 100_000 || jobDescription.length > 50_000) {
    res.status(400).json({ error: 'Resume or job description is too long.' })
    return
  }

  const cacheKey = `score:${user.userId}:${hashJobDesc(jobDescription)}`
  const cached = getCachedScore(cacheKey)
  if (cached) {
    res.json({ score: cached.score, breakdown: cached.breakdown, keywords: cached.keywords })
    return
  }

  const result = computeScore(resumeText, jobDescription)
  setCachedScore(cacheKey, { score: result.score, breakdown: result.breakdown, keywords: result.keywords })
  await insertUsageLog(user.userId, 'score', null)
  res.json({ score: result.score, breakdown: result.breakdown, keywords: result.keywords })
})

export default router
