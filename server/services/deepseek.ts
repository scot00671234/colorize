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

export type EditorMode = 'resume' | 'job_application'

export type RewriteOptions = {
  language?: string
  context?: string
  tone?: string
  mode?: EditorMode
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: 'Tone: Formal and polished. Sound authoritative and experienced. Standard for corporate roles.',
  'business-casual': 'Tone: Approachable and confident but still polished. Slightly warmer than formal corporate; good for startups and culture-fit roles.',
  academic: 'Tone: Formal and scholarly. Emphasize research, publications, teaching, and credentials. Suited for academic or research positions.',
  technical: 'Tone: Precise and impact-focused. Lead with metrics, tools, and systems. Emphasize scale, performance, and concrete outcomes.',
  concise: 'Tone: Short and punchy. Fewer words per bullet; maximum impact. Cut filler and redundancy.',
  'achievement-focused': 'Tone: Lead with results and numbers. Start bullets with outcomes (%, $, time saved). Quantify impact wherever possible.',
}

function buildRewritePrompt(text: string, options: RewriteOptions): string {
  const langKey = (options.language || 'same').toLowerCase()
  const languageInstruction = LANGUAGE_MAP[langKey] ?? (langKey === 'same' ? 'the same language as the input text' : langKey)
  const mode = options.mode === 'job_application' ? 'job_application' : 'resume'

  const resumeIntro = `You are an expert resume editor. Rewrite the following resume content so it is strong, ATS-friendly, and professional.`
  const jobAppIntro = `You are an expert at job applications and cover letters. The following text is from a job application (e.g. cover letter, application form answers, or personal statement). Rewrite it to be strong, tailored to the role, and professional. For cover letters: keep a letter tone and address the reader. For application answers: keep answers concise and impact-focused.`

  const parts: string[] = [
    mode === 'job_application' ? jobAppIntro : resumeIntro,
    `Rules:`,
    `- Output in ${languageInstruction}.`,
    `- PRESERVE STRUCTURE: Keep the same number of bullets, paragraphs, and line breaks. Do NOT merge multiple bullets or paragraphs into one sentence. Improve each bullet/paragraph in place.`,
    `- Use strong action verbs (e.g. Led, Delivered, Improved, Built, Launched).`,
    `- Add or keep concrete metrics and outcomes where relevant (%, $, time saved, team size).`,
    `- Be concise; remove filler. No generic phrases.`,
    `- Return ONLY the rewritten text, no preamble or explanation.`,
  ]
  const toneKey = (options.tone || 'professional').toLowerCase().replace(/\s+/g, '-')
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] ?? TONE_INSTRUCTIONS.professional
  parts.push('', toneInstruction)
  if (options.context?.trim()) {
    parts.push('', 'Additional instructions from the user:', options.context.trim())
  }
  const contentLabel = mode === 'job_application' ? 'Job application content to rewrite:' : 'Resume content to rewrite:'
  parts.push('', '---', '', contentLabel, '', text)
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

/** Generate a 2–4 sentence professional summary (resume) or opening paragraph (job application). Optional job description for tailoring. */
export async function generateSummaryWithDeepSeek(
  resumeText: string,
  jobDescription?: string,
  mode: EditorMode = 'resume'
): Promise<DeepSeekResult> {
  const apiKey = config.deepseek?.apiKey
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set')
  }

  const jobContext = jobDescription?.trim()
    ? `\n\nThe target job description (use to align the output):\n${jobDescription.trim().slice(0, 2000)}`
    : ''

  const resumePrompt = `You are an expert resume writer. Write a short professional summary (2–4 sentences, 50–80 words) for the top of this resume. It should highlight the candidate's key experience, strengths, and value. Use third person or first person consistently; prefer third person for a formal resume. Be specific, not generic. Do not repeat the word "summary" or "professional summary". Return ONLY the summary text, no heading or labels.${jobContext}

---
Resume content:
${resumeText.slice(0, 6000)}`

  const jobAppPrompt = `You are an expert at cover letters and job applications. Write a strong opening paragraph (2–4 sentences, 50–80 words) for a cover letter or job application. It should hook the reader, show fit for the role, and lead into the rest of the application. Be specific to the candidate and the job. Do not use "I am writing to apply" or similar clichés. Return ONLY the paragraph text, no greeting or labels.${jobContext}

---
Application/cover letter content:
${resumeText.slice(0, 6000)}`

  const userContent = mode === 'job_application' ? jobAppPrompt : resumePrompt

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
