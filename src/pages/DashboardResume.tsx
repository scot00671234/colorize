import { useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ResumeEditor, { type ResumeEditorHandle } from '../components/ResumeEditor'
import ResumePreview from '../components/ResumePreview'
import { api } from '../api/client'
import type { Content } from '@tiptap/react'

const TEMPLATES = [
  { id: 'one-column', label: 'One column' },
  { id: 'two-column', label: 'Two column (skills sidebar)' },
  { id: 'creative', label: 'Creative' },
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
      const res = await api.ai.rewrite(text)
      if (res.rewritten) {
        editorRef.current?.replaceSelection(res.rewritten)
      }
      await refreshUser()
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setRewriteLoading(false)
    }
  }, [refreshUser])


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
    setExportLoading(true)
    try {
      const blob = await api.resume.exportPdf(editorText)
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

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setOriginalContent((prev) => (prev ? prev : text))
      setEditorContent(text)
      setEditorText(text)
    }
    if (file.type === 'application/pdf') {
      setEditorError('PDF: paste text from your PDF here, or upload a .txt file.')
      e.target.value = ''
      return
    }
    setEditorError(null)
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const [editorError, setEditorError] = useState<string | null>(null)

  const used = user?.rewriteCountToday ?? 0
  const limit = user?.rewriteLimit ?? 50

  return (
    <div className="dashboardPage dashboardResume">
      <header className="resumePageHeader">
        <h1 className="dashboardPageTitle">Resume AI</h1>
        <p className="dashboardPageSubtitle">
          Paste the job description, add your resume, then use the tools below to rewrite, score, and export.
        </p>
        <div className="resumeUsage">
          Rewrites today: {used} / {limit}
          {user?.isPro && ' (Pro)'}
        </div>
      </header>

      <div className="resumeFlow">
        <section className="resumeSection resumeCard">
          <h2 className="resumeStepTitle">1. Job description</h2>
          <p className="resumeStepHint">Paste the role description so we can score and tailor your resume.</p>
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
          <h2 className="resumeStepTitle">2. Resume content</h2>
          <p className="resumeStepHint">Upload a .txt file or paste your resume into the editor. Select text to rewrite with AI.</p>
          <div className="resumeToolbar">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="resumeFileInput"
              id="resume-upload"
            />
            <label htmlFor="resume-upload" className="dashboardBtn dashboardBtnSecondary">
              Upload .txt
            </label>
            <button
              type="button"
              className="dashboardBtn dashboardBtnPrimary"
              onClick={handleRewrite}
              disabled={rewriteLoading}
            >
              {rewriteLoading ? 'Rewriting…' : 'Rewrite with AI'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={handleScore}
              disabled={scoreLoading}
            >
              {scoreLoading ? 'Scoring…' : 'Get score'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnPrimary"
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
          {(rewriteError || scoreError || exportError || editorError) && (
            <div className="resumeErrors">
              {rewriteError && <p className="dashboardSettingsError">{rewriteError}</p>}
              {scoreError && <p className="dashboardSettingsError">{scoreError}</p>}
              {exportError && <p className="dashboardSettingsError">{exportError}</p>}
              {editorError && <p className="dashboardSettingsError">{editorError}</p>}
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
            <h2 className="resumeStepTitle">ATS Score</h2>
            <div className="resumeScore">
              <span className="resumeScoreValue">{score}</span>
              <span className="resumeScoreMax">/ 100</span>
              {scoreBreakdown && (
                <div className="resumeScoreBreakdown">
                  {Object.entries(scoreBreakdown).map(([k, v]) => (
                    <span key={k}>{k}: {v}</span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="resumeSection resumeCard">
          <h2 className="resumeStepTitle">3. Template & preview</h2>
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
