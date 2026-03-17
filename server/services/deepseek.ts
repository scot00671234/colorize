import { config } from '../config'

const LANGUAGE_MAP: Record<string, string> = {
  same: 'the same language as the input text',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  ja: 'Japanese',
  zh: 'Chinese',
}

export type RewriteOptions = {
  language?: string
  context?: string
}

function buildRewritePrompt(text: string, options: RewriteOptions): string {
  const langKey = (options.language || 'same').toLowerCase()
  const languageInstruction = LANGUAGE_MAP[langKey] ?? (langKey === 'same' ? 'the same language as the input text' : langKey)
  const parts: string[] = [
    `You are an expert resume editor. Rewrite the following resume content so it is strong, ATS-friendly, and professional.`,
    `Rules:`,
    `- Output in ${languageInstruction}.`,
    `- PRESERVE STRUCTURE: Keep the same number of bullets, paragraphs, and line breaks. Do NOT merge multiple bullets or paragraphs into one sentence. Improve each bullet/paragraph in place.`,
    `- Use strong action verbs (e.g. Led, Delivered, Improved, Built, Launched).`,
    `- Add or keep concrete metrics and outcomes where relevant (%, $, time saved, team size).`,
    `- Be concise; remove filler. No generic phrases.`,
    `- Return ONLY the rewritten text, no preamble or explanation.`,
  ]
  if (options.context?.trim()) {
    parts.push('', 'Additional instructions from the user:', options.context.trim())
  }
  parts.push('', '---', '', 'Resume content to rewrite:', '', text)
  return parts.join('\n')
}

export type DeepSeekResult = { text: string; usage: { prompt_tokens: number; completion_tokens: number } }

export async function rewriteWithDeepSeek(text: string, options: RewriteOptions = {}): Promise<DeepSeekResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set')
  }

  const userContent = buildRewritePrompt(text, options)
  const maxTokens = Math.min(2048, 600 + Math.ceil(text.length / 4))

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: maxTokens,
      temperature: 0.35,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `DeepSeek API error: ${res.status}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  const content = data.choices?.[0]?.message?.content?.trim() ?? ''
  const usage = data.usage ?? {}
  const prompt_tokens = usage.prompt_tokens ?? 0
  const completion_tokens = usage.completion_tokens ?? 0

  return {
    text: content,
    usage: { prompt_tokens, completion_tokens },
  }
}

/** Generate a 2–4 sentence professional summary for the top of a resume. Optional job description for tailoring. */
export async function generateSummaryWithDeepSeek(
  resumeText: string,
  jobDescription?: string
): Promise<DeepSeekResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set')
  }

  const jobContext = jobDescription?.trim()
    ? `\n\nThe target job description (use to align the summary):\n${jobDescription.trim().slice(0, 2000)}`
    : ''

  const userContent = `You are an expert resume writer. Write a short professional summary (2–4 sentences, 50–80 words) for the top of this resume. It should highlight the candidate's key experience, strengths, and value. Use third person or first person consistently; prefer third person for a formal resume. Be specific, not generic. Do not repeat the word "summary" or "professional summary". Return ONLY the summary text, no heading or labels.${jobContext}

---
Resume content:
${resumeText.slice(0, 6000)}`

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 256,
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `DeepSeek API error: ${res.status}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  const content = data.choices?.[0]?.message?.content?.trim() ?? ''
  const usage = data.usage ?? {}
  return {
    text: content,
    usage: {
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
    },
  }
}
