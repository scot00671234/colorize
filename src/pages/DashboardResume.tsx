import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ResumeEditor, { type ResumeEditorHandle } from '../components/ResumeEditor'
import ResumePreview from '../components/ResumePreview'
import ResumeAnalysisFeedback from '../components/ResumeAnalysisFeedback'
import { api } from '../api/client'
import { extractResumeText, RESUME_UPLOAD_ACCEPT } from '../utils/extractResumeText'
import { getPendingRewrite, clearPendingRewrite } from '../utils/landingPendingRewrite'
import type { Content } from '@tiptap/react'

const TEMPLATES = [
  { id: 'one-column', label: 'One column' },
  { id: 'two-column', label: 'Two column (skills sidebar)' },
  { id: 'creative', label: 'Creative' },
] as const

const REWRITE_LANGUAGES = [
  { value: 'same', label: 'Same as input' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
] as const

export default function DashboardResume() {
  const { user, refreshUser } = useAuth()
  const [originalContent, setOriginalContent] = useState('')
  const [editorContent, setEditorContent] = useState<Content>('')
  const [editorText, setEditorText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, number> | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [template, setTemplate] = useState<string>(TEMPLATES[0].id)
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [rewriteError, setRewriteError] = useState<string | null>(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [rewriteLanguage, setRewriteLanguage] = useState('same')
  const [rewriteContext, setRewriteContext] = useState('')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [landingRewriteLoading, setLandingRewriteLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const editorRef = useRef<ResumeEditorHandle>(null)

  const handleEditorChange = useCallback((html: string, text: string) => {
    setEditorContent(html)
    setEditorText(text)
  }, [])

  const handleRewrite = useCallback(async () => {
    const text = editorRef.current?.getSelectedText()?.trim()
    if (!text) {
      setRewriteError('Select some text in the editor first.')
      return
    }
    setRewriteError(null)
    setRewriteLoading(true)
    try {
      const res = await api.ai.rewrite(text, {
        language: rewriteLanguage,
        context: rewriteContext.trim() || undefined,
      })
      if (res.rewritten) {
        editorRef.current?.replaceSelection(res.rewritten)
      }
      await refreshUser()
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setRewriteLoading(false)
    }
  }, [refreshUser, rewriteLanguage, rewriteContext])


  const handleScore = useCallback(async () => {
    if (!editorText.trim() || !jobDescription.trim()) {
      setScoreError('Add resume content and a job description.')
      return
    }
    setScoreError(null)
    setScoreLoading(true)
    try {
      const res = await api.ai.score(editorText, jobDescription)
      setScore(res.score)
      setScoreBreakdown(res.breakdown ?? null)
      setKeywords(res.keywords ?? [])
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setScoreLoading(false)
    }
  }, [editorText, jobDescription])

  const handleExport = useCallback(async () => {
    setExportError(null)
    const contentToExport = editorRef.current?.getExportText?.() ?? editorText
    if (!contentToExport?.trim()) {
      setExportError('Add resume content before exporting.')
      return
    }
    setExportLoading(true)
    try {
      const blob = await api.resume.exportPdf(contentToExport)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      a.click()
      URL.revokeObjectURL(url)
      await refreshUser()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }, [editorText, refreshUser])

  const handleGenerateSummary = useCallback(async () => {
    if (!editorText?.trim() || editorText.trim().length < 50) {
      setSummaryError('Add more resume content (at least a few lines) before generating a summary.')
      return
    }
    setSummaryError(null)
    setSummaryLoading(true)
    try {
      const { summary } = await api.ai.summary(editorText, jobDescription.trim() || undefined)
      if (summary?.trim()) {
        editorRef.current?.insertContentAtStart(summary.trim())
      }
      await refreshUser()
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Could not generate summary. Please try again.')
    } finally {
      setSummaryLoading(false)
    }
  }, [editorText, jobDescription, refreshUser])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text?.trim()) return
    setOriginalContent((prev) => (prev ? prev : text))
    setEditorContent((prev) => {
      if (typeof prev === 'string' && prev.trim().length > 0) return prev
      return text
    })
    setEditorText((prev) => {
      if (prev.trim().length > 0) return prev
      return text
    })
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setEditorError(null)
    setUploadLoading(true)
    try {
      const text = await extractResumeText(file)
      if (!text.trim()) {
        setEditorError('No text could be extracted from this file.')
        return
      }
      setOriginalContent((prev) => (prev ? prev : text))
      setEditorContent((prev) => {
        if (typeof prev === 'string' && prev.trim().length > 0) return prev
        return text
      })
      setEditorText((prev) => {
        if (prev.trim().length > 0) return prev
        return text
      })
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Could not read file. Try .txt, .pdf, .doc, .docx, or .odt.')
    } finally {
      setUploadLoading(false)
    }
  }, [])

  useEffect(() => {
    const pending = getPendingRewrite()
    if (!pending?.text?.trim()) return
    clearPendingRewrite()
    const text = pending.text.trim()
    setLandingRewriteLoading(true)
    setRewriteError(null)
    api.ai
      .rewrite(text)
      .then((res) => {
        if (res.rewritten) {
          setOriginalContent(text)
          setEditorContent(res.rewritten)
          setEditorText(res.rewritten)
        }
      })
      .catch((err) => {
        setRewriteError(err instanceof Error ? err.message : 'Could not run your rewrite.')
        setOriginalContent(text)
        setEditorContent(text)
        setEditorText(text)
      })
      .finally(() => {
        setLandingRewriteLoading(false)
        refreshUser()
      })
  }, [refreshUser])

  const used = user?.rewriteCountToday ?? 0
  const limit = user?.rewriteLimit ?? 50

  return (
    <div className="dashboardPage dashboardResume">
      <header className="resumePageHeader">
        <h1 className="dashboardPageTitle">Resume</h1>
        <p className="dashboardPageSubtitle">
          Edit your resume, analyze it against a job description, then export to PDF.
        </p>
        <div className="resumeUsage">
          Rewrites today: {used} / {limit}
          {user?.isPro && ' (Pro)'}
        </div>
        {landingRewriteLoading && (
          <p className="resumeLandingBanner" role="status">
            Generating your rewrite from the landing page…
          </p>
        )}
      </header>

      <div className="resumeFlow">
        <section className="resumeSection resumeCard">
          <h2 className="resumeStepTitle">Job description</h2>
          <p className="resumeStepHint">Paste the role description to get a tailored score and keyword suggestions.</p>
          <textarea
            className="resumeJobDesc"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={4}
            aria-label="Job description"
          />
        </section>

        <section className="resumeSection resumeCard">
          <h2 className="resumeStepTitle">Your resume</h2>
          <p className="resumeStepHint">Upload a file or paste your resume. Use the toolbar to format (headings, bold, bullets). Select text and click Rewrite to improve it with AI.</p>
          <div className="resumeToolbar">
            <input
              type="file"
              accept={RESUME_UPLOAD_ACCEPT}
              onChange={handleFileUpload}
              className="resumeFileInput"
              id="resume-upload"
              disabled={uploadLoading}
            />
            <label htmlFor="resume-upload" className="dashboardBtn dashboardBtnSecondary">
              {uploadLoading ? 'Reading…' : 'Upload file'}
            </label>
            <button
              type="button"
              className="dashboardBtn dashboardBtnPrimary"
              onClick={handleScore}
              disabled={scoreLoading || !editorText.trim() || !jobDescription.trim()}
            >
              {scoreLoading ? 'Analyzing…' : 'Analyze resume'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={handleGenerateSummary}
              disabled={summaryLoading || !editorText.trim() || editorText.trim().length < 50}
              title="Add a professional summary at the top of your resume"
            >
              {summaryLoading ? 'Generating…' : 'Generate summary'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={handleRewrite}
              disabled={rewriteLoading}
              title={editorRef.current?.getSelectedText()?.trim() ? 'Replace selection with AI rewrite' : 'Select text in the editor first'}
            >
              {rewriteLoading ? 'Rewriting…' : 'Rewrite selection'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={handleExport}
              disabled={exportLoading || !editorText.trim()}
            >
              {exportLoading ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
          <details className="resumeRewriteOptionsDetails">
            <summary className="resumeRewriteOptionsSummary">Rewrite options (language & instructions)</summary>
            <div className="resumeRewriteOptions">
              <label className="resumeRewriteOption">
                <span className="resumeRewriteOptionLabel">Language</span>
                <select
                  className="resumeRewriteSelect"
                  value={rewriteLanguage}
                  onChange={(e) => setRewriteLanguage(e.target.value)}
                  aria-label="Output language for AI rewrite"
                >
                  {REWRITE_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </label>
              <label className="resumeRewriteOption resumeRewriteContextWrap">
                <span className="resumeRewriteOptionLabel">Instructions (optional)</span>
                <input
                  type="text"
                  className="resumeRewriteContext"
                  placeholder="e.g. More formal, focus on leadership"
                  value={rewriteContext}
                  onChange={(e) => setRewriteContext(e.target.value)}
                  aria-label="Additional instructions for AI rewrite"
                />
              </label>
            </div>
          </details>
          {(rewriteError || scoreError || exportError || editorError || summaryError) && (
            <div className="resumeErrors">
              {rewriteError && <p className="dashboardSettingsError">{rewriteError}</p>}
              {scoreError && <p className="dashboardSettingsError">{scoreError}</p>}
              {exportError && <p className="dashboardSettingsError">{exportError}</p>}
              {editorError && <p className="dashboardSettingsError">{editorError}</p>}
              {summaryError && <p className="dashboardSettingsError">{summaryError}</p>}
            </div>
          )}
          <div onPaste={handlePaste} className="resumeEditorWrap">
            <ResumeEditor
              ref={editorRef}
              content={editorContent}
              onChange={handleEditorChange}
            />
          </div>
        </section>

        {score !== null && (
          <section className="resumeSection resumeCard resumeScoreCard">
            <h2 className="resumeStepTitle">Score & feedback</h2>
            <ResumeAnalysisFeedback
              score={score}
              breakdown={scoreBreakdown}
              keywords={keywords}
              resumeText={editorText}
            />
          </section>
        )}

        <section className="resumeSection resumeCard">
          <h2 className="resumeStepTitle">Preview</h2>
          <p className="resumeStepHint">How your resume looks. Keywords from the job description are highlighted when you run Analyze.</p>
          <div className="resumeTemplates">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`dashboardBtn dashboardBtnSecondary ${template === t.id ? 'dashboardNavLinkActive' : ''}`}
                onClick={() => setTemplate(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <ResumePreview
            originalContent={originalContent}
            currentContent={editorText}
            keywords={keywords.length > 0 ? keywords : undefined}
          />
        </section>
      </div>
    </div>
  )
}
