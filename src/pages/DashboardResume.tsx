import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ResumeEditor, { type ResumeEditorHandle } from '../components/ResumeEditor'
import ResumeAnalysisFeedback from '../components/ResumeAnalysisFeedback'
import { api } from '../api/client'
import { extractResumeText, RESUME_UPLOAD_ACCEPT } from '../utils/extractResumeText'

const UPLOAD_PASTE_HINT = ' Can\'t upload? Copy and paste your text into the editor below.'
import { getPendingRewrite, clearPendingRewrite } from '../utils/landingPendingRewrite'
import type { Content } from '@tiptap/react'

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

const REWRITE_TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'business-casual', label: 'Business casual' },
  { value: 'academic', label: 'Academic' },
  { value: 'technical', label: 'Technical' },
  { value: 'concise', label: 'Concise' },
  { value: 'achievement-focused', label: 'Achievement-focused' },
] as const

type EditorMode = 'resume' | 'job_application'

export default function DashboardResume() {
  const { user, refreshUser } = useAuth()
  const [editorMode, setEditorMode] = useState<EditorMode>('resume')
  const [editorContent, setEditorContent] = useState<Content>('')
  const [editorText, setEditorText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, number> | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [rewriteError, setRewriteError] = useState<string | null>(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [rewriteLanguage, setRewriteLanguage] = useState('same')
  const [rewriteTone, setRewriteTone] = useState('professional')
  const [rewriteContext, setRewriteContext] = useState('')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [landingRewriteLoading, setLandingRewriteLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>('')
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [projectLoading, setProjectLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectionPopupOpen, setSelectionPopupOpen] = useState(false)
  const [selectionPrompt, setSelectionPrompt] = useState('')
  const editorRef = useRef<ResumeEditorHandle>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectIdFromUrl = searchParams.get('projectId')

  const handleEditorChange = useCallback((html: string, text: string) => {
    setEditorContent(html)
    setEditorText(text)
  }, [])

  // Load projects list
  useEffect(() => {
    api.projects.list()
      .then((res) => setProjects(res.projects.map((p) => ({ id: p.id, title: p.title || 'Untitled' }))))
      .catch(() => {})
  }, [])

  // Load project when URL has projectId
  useEffect(() => {
    if (!projectIdFromUrl) {
      setCurrentProjectId(null)
      setCurrentProjectTitle('')
      setSaveError(null)
      return
    }
    setProjectLoading(true)
    setSaveError(null)
    api.projects.get(projectIdFromUrl)
      .then((proj) => {
        setCurrentProjectId(proj.id)
        setCurrentProjectTitle(proj.title || 'Untitled')
        setEditorContent(proj.content || '')
        setEditorText(proj.content ? (() => {
          const div = document.createElement('div')
          div.innerHTML = proj.content
          return div.textContent || ''
        })() : '')
        setProjects((prev) => prev.some((p) => p.id === proj.id) ? prev : [...prev, { id: proj.id, title: proj.title || 'Untitled' }])
      })
      .catch(() => setSaveError('Failed to load project'))
      .finally(() => setProjectLoading(false))
  }, [projectIdFromUrl])

  const handleSave = useCallback(async () => {
    setSaveError(null)
    setSaveLoading(true)
    const content = typeof editorContent === 'string' ? editorContent : ''
    try {
      if (currentProjectId) {
        await api.projects.update(currentProjectId, { content, title: currentProjectTitle || undefined })
      } else {
        const created = await api.projects.create(currentProjectTitle.trim() || 'Untitled')
        setCurrentProjectId(created.id)
        setCurrentProjectTitle(created.title || 'Untitled')
        setProjects((prev) => [...prev, { id: created.id, title: created.title || 'Untitled' }])
        navigate(`/dashboard/resume?projectId=${created.id}`, { replace: true })
        await api.projects.update(created.id, { content })
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaveLoading(false)
    }
  }, [currentProjectId, currentProjectTitle, editorContent, navigate])

  const handleSaveAs = useCallback(async () => {
    const title = window.prompt('Project title', currentProjectTitle || 'Untitled')?.trim() || 'Untitled'
    setSaveError(null)
    setSaveLoading(true)
    const content = typeof editorContent === 'string' ? editorContent : ''
    try {
      const created = await api.projects.create(title)
      await api.projects.update(created.id, { content })
      setCurrentProjectId(created.id)
      setCurrentProjectTitle(created.title || 'Untitled')
      setProjects((prev) => [...prev, { id: created.id, title: created.title || 'Untitled' }])
      navigate(`/dashboard/resume?projectId=${created.id}`, { replace: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save as new project')
    } finally {
      setSaveLoading(false)
    }
  }, [currentProjectTitle, editorContent, navigate])

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
        tone: rewriteTone,
        context: rewriteContext.trim() || undefined,
        mode: editorMode,
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
  }, [refreshUser, rewriteLanguage, rewriteTone, rewriteContext, editorMode])

  const handleRewriteWithPrompt = useCallback(async () => {
    setRewriteError(null)
    setRewriteLoading(true)
    const text = editorRef.current?.getSelectedText()?.trim()
    if (!text) {
      setRewriteError('Select some text in the editor first.')
      setRewriteLoading(false)
      return
    }
    try {
      const res = await api.ai.rewrite(text, {
        language: rewriteLanguage,
        tone: rewriteTone,
        context: selectionPrompt.trim() || rewriteContext.trim() || undefined,
        mode: editorMode,
      })
      if (res.rewritten) {
        editorRef.current?.replaceSelection(res.rewritten)
      }
      setSelectionPopupOpen(false)
      setSelectionPrompt('')
      await refreshUser()
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setRewriteLoading(false)
    }
  }, [refreshUser, rewriteLanguage, rewriteTone, rewriteContext, editorMode, selectionPrompt])


  const handleScore = useCallback(async () => {
    if (!editorText.trim() || !jobDescription.trim()) {
      setScoreError('Add content and a job description.')
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

  const getContentToExport = useCallback(() => editorRef.current?.getExportText?.() ?? editorText, [editorText])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportPdf = useCallback(async () => {
    setExportMenuOpen(false)
    const contentToExport = getContentToExport()
    if (!contentToExport?.trim()) {
      setExportError('Add content before exporting.')
      return
    }
    setExportError(null)
    setExportLoading(true)
    try {
      const blob = await api.resume.exportPdf(contentToExport)
      downloadBlob(blob, editorMode === 'job_application' ? 'application.pdf' : 'resume.pdf')
      await refreshUser()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }, [getContentToExport, editorMode, downloadBlob, refreshUser])

  const handleExportDocx = useCallback(async () => {
    setExportMenuOpen(false)
    const contentToExport = getContentToExport()
    if (!contentToExport?.trim()) {
      setExportError('Add content before exporting.')
      return
    }
    setExportError(null)
    setExportLoading(true)
    try {
      const blob = await api.resume.exportDocx(contentToExport)
      downloadBlob(blob, editorMode === 'job_application' ? 'application.docx' : 'resume.docx')
      await refreshUser()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }, [getContentToExport, editorMode, downloadBlob, refreshUser])

  const handleExportText = useCallback(() => {
    setExportMenuOpen(false)
    const contentToExport = getContentToExport()
    if (!contentToExport?.trim()) {
      setExportError('Add content before exporting.')
      return
    }
    setExportError(null)
    const blob = new Blob([contentToExport], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, editorMode === 'job_application' ? 'application.txt' : 'resume.txt')
  }, [getContentToExport, editorMode, downloadBlob])

  const handleGenerateSummary = useCallback(async () => {
    if (!editorText?.trim() || editorText.trim().length < 50) {
      setSummaryError('Add more resume content (at least a few lines) before generating a summary.')
      return
    }
    setSummaryError(null)
    setSummaryLoading(true)
    try {
      const { summary } = await api.ai.summary(editorText, {
        jobDescription: jobDescription.trim() || undefined,
        mode: editorMode,
      })
      if (summary?.trim()) {
        editorRef.current?.insertContentAtStart(summary.trim())
      }
      await refreshUser()
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Could not generate summary. Please try again.')
    } finally {
      setSummaryLoading(false)
    }
  }, [editorText, jobDescription, editorMode, refreshUser])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text?.trim()) return
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
        setEditorError('No text could be extracted from this file (it may be a scanned image).' + UPLOAD_PASTE_HINT)
        return
      }
      setEditorContent((prev) => {
        if (typeof prev === 'string' && prev.trim().length > 0) return prev
        return text
      })
      setEditorText((prev) => {
        if (prev.trim().length > 0) return prev
        return text
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read file.'
      setEditorError(message.includes('paste') ? message : message + UPLOAD_PASTE_HINT)
    } finally {
      setUploadLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!exportMenuOpen) return
    const onOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [exportMenuOpen])

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
          setEditorContent(res.rewritten)
          setEditorText(res.rewritten)
        }
      })
      .catch((err) => {
        setRewriteError(err instanceof Error ? err.message : 'Could not run your rewrite.')
        setEditorContent(text)
        setEditorText(text)
      })
      .finally(() => {
        setLandingRewriteLoading(false)
        refreshUser()
      })
  }, [refreshUser])

  const used = user?.rewriteCountToday ?? 0
  const limit = user?.rewriteLimit ?? 2

  return (
    <div className="dashboardPage dashboardResume">
      <header className="resumePageHeader">
        <div className="resumePageHeaderTop">
          <h1 className="dashboardPageTitle">Editor</h1>
          <div className="editorModeSwitch" role="group" aria-label="Editing mode">
            <button
              type="button"
              className={`editorModeBtn ${editorMode === 'resume' ? 'editorModeBtnActive' : ''}`}
              onClick={() => setEditorMode('resume')}
              aria-pressed={editorMode === 'resume'}
            >
              Resume
            </button>
            <button
              type="button"
              className={`editorModeBtn ${editorMode === 'job_application' ? 'editorModeBtnActive' : ''}`}
              onClick={() => setEditorMode('job_application')}
              aria-pressed={editorMode === 'job_application'}
            >
              Job application
            </button>
          </div>
        </div>
        <p className="dashboardPageSubtitle">
          {editorMode === 'resume'
            ? 'Edit your resume, analyze it against a job description, then export to PDF.'
            : 'Edit your cover letter or application answers. Paste the job description to score and tailor your text.'}
        </p>
        <div className="resumeUsage">
          Rewrites today: {used} / {limit}
          {user?.isPro && ' (Pro)'}
        </div>
        <div className="resumeProjectBar">
          <span className="resumeProjectTitle" aria-label="Current project">
            {projectLoading ? 'Loading…' : (currentProjectTitle || 'Untitled')}
          </span>
          <div className="resumeProjectActions">
            <select
              className="resumeProjectSelect"
              value={currentProjectId ?? ''}
              onChange={(e) => {
                const id = e.target.value
                if (id) navigate(`/dashboard/resume?projectId=${id}`)
                else navigate('/dashboard/resume')
              }}
              aria-label="Switch project"
            >
              <option value="">New (no project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <button type="button" className="dashboardBtn dashboardBtnSecondary" onClick={handleSave} disabled={saveLoading}>
              {saveLoading ? 'Saving…' : currentProjectId ? 'Save' : 'Save project'}
            </button>
            <button type="button" className="dashboardBtn dashboardBtnSecondary" onClick={handleSaveAs} disabled={saveLoading || (user?.projectLimit != null && projects.length >= user.projectLimit)}>
              Save as new
            </button>
          </div>
        </div>
        {saveError && <p className="dashboardSettingsError">{saveError}</p>}
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
          <h2 className="resumeStepTitle">{editorMode === 'resume' ? 'Your resume' : 'Your application'}</h2>
          <p className="resumeStepHint">
            {editorMode === 'resume'
              ? 'Upload a file or paste your resume. Use the toolbar to format (Title H1, Section H2, bold, bullets). Select text and click Rewrite to improve it with AI. Export to PDF, Word, or Text when ready.'
              : 'Paste your cover letter or application answers. Use the toolbar to format. Select text and click Rewrite; the AI will adapt to job application tone. Export to PDF, Word, or Text when ready.'}
          </p>
          <div className="resumeToolbar">
            <input
              type="file"
              accept={RESUME_UPLOAD_ACCEPT}
              onChange={handleFileUpload}
              className="resumeFileInput"
              id="resume-upload"
              disabled={uploadLoading}
              aria-describedby="resume-upload-hint"
            />
            <label htmlFor="resume-upload" className="dashboardBtn dashboardBtnSecondary">
              {uploadLoading ? 'Reading…' : 'Upload file'}
            </label>
            <p id="resume-upload-hint" className="resumeUploadHint">
              Word, Google Docs (.docx), Open Office (.odt), PDF (up to 20 pages), or Text. Can&apos;t upload? Paste your text into the editor below.
            </p>
            <button
              type="button"
              className="dashboardBtn dashboardBtnPrimary"
              onClick={handleScore}
              disabled={scoreLoading || !editorText.trim() || !jobDescription.trim()}
            >
              {scoreLoading ? 'Analyzing…' : editorMode === 'resume' ? 'Analyze resume' : 'Analyze application'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={handleGenerateSummary}
              disabled={summaryLoading || !editorText.trim() || editorText.trim().length < 50}
              title={editorMode === 'resume' ? 'Add a professional summary at the top' : 'Add a strong opening paragraph for your application'}
            >
              {summaryLoading ? 'Generating…' : editorMode === 'resume' ? 'Generate summary' : 'Generate opening'}
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
            <div className="resumeExportWrap" ref={exportMenuRef}>
              <button
                type="button"
                className="dashboardBtn dashboardBtnSecondary"
                onClick={() => setExportMenuOpen((o) => !o)}
                disabled={exportLoading || !editorText.trim()}
                aria-expanded={exportMenuOpen}
                aria-haspopup="true"
                aria-label="Export document"
              >
                {exportLoading ? 'Exporting…' : 'Export'}
              </button>
              {exportMenuOpen && (
                <div className="resumeExportDropdown" role="menu">
                  <button type="button" className="resumeExportItem" role="menuitem" onClick={handleExportPdf} disabled={exportLoading}>
                    PDF
                  </button>
                  <button type="button" className="resumeExportItem" role="menuitem" onClick={handleExportDocx} disabled={exportLoading}>
                    Word (.docx)
                  </button>
                  <button type="button" className="resumeExportItem" role="menuitem" onClick={handleExportText}>
                    Text (.txt)
                  </button>
                </div>
              )}
            </div>
            <p className="resumeExportHint">PDF, Word, or Text. Upload the Word file to Google Docs if you use it.</p>
          </div>
          <details className="resumeRewriteOptionsDetails">
            <summary className="resumeRewriteOptionsSummary">Rewrite options (style, language & instructions)</summary>
            <div className="resumeRewriteOptions">
              <label className="resumeRewriteOption">
                <span className="resumeRewriteOptionLabel">Style / tone</span>
                <select
                  className="resumeRewriteSelect"
                  value={rewriteTone}
                  onChange={(e) => setRewriteTone(e.target.value)}
                  aria-label="Tone or style for AI rewrite"
                >
                  {REWRITE_TONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
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
          <div onPaste={handlePaste} className="resumeEditorWrap resumeEditorWrapWithPopover">
            <ResumeEditor
              ref={editorRef}
              content={editorContent}
              onChange={handleEditorChange}
              onSelectionChange={(hasSelection) => setSelectionPopupOpen(hasSelection)}
            />
            {selectionPopupOpen && (
              <div className="resumeRewritePopover" role="dialog" aria-label="Rewrite selection with custom instruction">
                <label className="resumeRewritePopoverLabel">
                  <span className="resumeRewritePopoverLabelText">Instruction (e.g. make this more academic)</span>
                  <input
                    type="text"
                    className="resumeRewritePopoverInput"
                    placeholder="e.g. make this more academic, more concise, focus on leadership"
                    value={selectionPrompt}
                    onChange={(e) => setSelectionPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRewriteWithPrompt()}
                  />
                </label>
                <div className="resumeRewritePopoverActions">
                  <button type="button" className="dashboardBtn dashboardBtnPrimary" onClick={handleRewriteWithPrompt} disabled={rewriteLoading}>
                    {rewriteLoading ? 'Rewriting…' : 'Rewrite selection'}
                  </button>
                  <button type="button" className="dashboardBtn dashboardBtnSecondary" onClick={() => { setSelectionPopupOpen(false); setSelectionPrompt(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <p className="resumeEditorWordCount" aria-live="polite">
              {editorText.trim() ? `${editorText.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
            </p>
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

      </div>
    </div>
  )
}
