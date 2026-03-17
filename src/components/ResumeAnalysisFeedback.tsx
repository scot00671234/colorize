import { useMemo } from 'react'

const BREAKDOWN_LABELS: Record<string, string> = {
  keyword: 'Keyword match',
  verbStrength: 'Strong verbs',
  length: 'Length & clarity',
  atsSafety: 'ATS-friendly',
}

type ResumeAnalysisFeedbackProps = {
  score: number
  breakdown: Record<string, number> | null
  keywords: string[]
  resumeText: string
  className?: string
}

/** Renders score, breakdown, missing keywords, and actionable tips. */
export default function ResumeAnalysisFeedback({
  score,
  breakdown,
  keywords,
  resumeText,
  className = '',
}: ResumeAnalysisFeedbackProps) {
  const lowerResume = resumeText.toLowerCase()

  const missingKeywords = useMemo(() => {
    if (!keywords.length) return []
    return keywords.filter((k) => !lowerResume.includes(k.toLowerCase()))
  }, [keywords, lowerResume])

  const tips = useMemo(() => {
    const list: string[] = []
    if (!breakdown) return list
    if ((breakdown.keyword ?? 100) < 70) {
      list.push('Add more terms from the job description so your resume matches what recruiters look for.')
    }
    if ((breakdown.verbStrength ?? 100) < 60) {
      list.push('Use stronger action verbs in your bullets (e.g. Led, Delivered, Achieved, Improved).')
    }
    if ((breakdown.length ?? 100) < 70) {
      list.push('Keep bullets concise. Avoid very long lines or single-word lines.')
    }
    if ((breakdown.atsSafety ?? 100) < 80) {
      list.push('Remove special characters and complex formatting so ATS systems can read your resume.')
    }
    return list
  }, [breakdown])

  return (
    <div className={`resumeAnalysisFeedback ${className}`}>
      <div className="resumeAnalysisScoreRow">
        <span className="resumeAnalysisScoreLabel">Resume score</span>
        <span className="resumeAnalysisScoreValue">
          {score}<span className="resumeAnalysisScoreMax">/100</span>
        </span>
      </div>

      {breakdown && Object.keys(breakdown).length > 0 && (
        <div className="resumeAnalysisBreakdown">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="resumeAnalysisBreakdownItem">
              <span className="resumeAnalysisBreakdownLabel">{BREAKDOWN_LABELS[key] ?? key}</span>
              <div className="resumeAnalysisBreakdownBarWrap">
                <div
                  className="resumeAnalysisBreakdownBar"
                  style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                  role="presentation"
                />
              </div>
              <span className="resumeAnalysisBreakdownValue">{value}</span>
            </div>
          ))}
        </div>
      )}

      {missingKeywords.length > 0 && (
        <div className="resumeAnalysisBlock">
          <h4 className="resumeAnalysisBlockTitle">Missing keywords</h4>
          <p className="resumeAnalysisBlockHint">Consider adding these terms from the job description.</p>
          <div className="resumeAnalysisTags">
            {missingKeywords.slice(0, 24).map((kw) => (
              <span key={kw} className="resumeAnalysisTag">{kw}</span>
            ))}
            {missingKeywords.length > 24 && (
              <span className="resumeAnalysisTag resumeAnalysisTagMuted">+{missingKeywords.length - 24} more</span>
            )}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className="resumeAnalysisBlock">
          <h4 className="resumeAnalysisBlockTitle">Suggestions</h4>
          <ul className="resumeAnalysisTips">
            {tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
