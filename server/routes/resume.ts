import { Router, Request, Response } from 'express'
import PDFDocument from '@foliojs-fork/pdfkit'
import { Document, Paragraph, Packer, HeadingLevel } from 'docx'
import type { JwtPayload } from '../middleware/auth'
import { requireAuth } from '../middleware/auth'
import { aiRateLimiter } from '../middleware/rateLimit'
import { insertUsageLog } from '../middleware/usage'

const router = Router()

const CONTENT_MAX_LENGTH = 500_000

router.use(aiRateLimiter)
router.use(requireAuth)

const MARGIN = 48
const LINE_HEIGHT = 16

/** POST /api/resume/export-pdf — body: { content: string } (plain text from editor) */
router.post('/export-pdf', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  let content: string
  try {
    const body = req.body as { content?: string; text?: string }
    content = typeof body.content === 'string' ? body.content : (typeof body.text === 'string' ? body.text : '')
  } catch {
    content = ''
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    res.status(400).json({ error: 'Content is too long for export.' })
    return
  }

  try {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN })
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      try {
        const lines = (content || 'No content').split(/\n/)
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.length === 0) {
            doc.moveDown(0.5)
            continue
          }
          if (doc.y + LINE_HEIGHT > doc.page.height - MARGIN) {
            doc.addPage()
          }
          if (/^###\s/.test(trimmed)) {
            doc.fontSize(12).font('Helvetica-Bold').text(trimmed.replace(/^###\s*/, ''), { continued: false })
          } else if (/^##\s/.test(trimmed)) {
            doc.fontSize(14).font('Helvetica-Bold').text(trimmed.replace(/^##\s*/, ''), { continued: false })
          } else if (/^#\s/.test(trimmed)) {
            doc.fontSize(14).font('Helvetica-Bold').text(trimmed.replace(/^#\s*/, ''), { continued: false })
          } else {
            doc.fontSize(11).font('Helvetica').text(trimmed, { continued: false })
          }
          doc.moveDown(0.5)
        }
        doc.end()
      } catch (syncErr) {
        reject(syncErr)
      }
    })
    await insertUsageLog(user.userId, 'export', null)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"')
    res.send(buffer)
  } catch (err) {
    console.error('Export PDF error:', err)
    res.status(500).json({ error: 'Export failed. Please try again.' })
  }
})

/** Parse export text (same format as PDF: # ## ###, • bullets) into docx Paragraphs */
function contentToDocxParagraphs(content: string): Paragraph[] {
  const lines = (content || 'No content').split(/\n/)
  const paragraphs: Paragraph[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }))
      continue
    }
    if (/^###\s/.test(trimmed)) {
      paragraphs.push(new Paragraph({
        text: trimmed.replace(/^###\s*/, ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 120 },
      }))
    } else if (/^##\s/.test(trimmed)) {
      paragraphs.push(new Paragraph({
        text: trimmed.replace(/^##\s*/, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }))
    } else if (/^#\s/.test(trimmed)) {
      paragraphs.push(new Paragraph({
        text: trimmed.replace(/^#\s*/, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 120, after: 120 },
      }))
    } else if (/^[•\-*]\s/.test(trimmed)) {
      paragraphs.push(new Paragraph({
        text: `• ${trimmed.replace(/^[•\-*]\s*/, '')}`,
        spacing: { after: 80 },
      }))
    } else {
      paragraphs.push(new Paragraph({
        text: trimmed,
        spacing: { after: 120 },
      }))
    }
  }
  return paragraphs
}

/** POST /api/resume/export-docx — body: { content: string } (same format as PDF export) */
router.post('/export-docx', async (req: Request, res: Response): Promise<void> => {
  const { user } = req as Request & { user: JwtPayload }
  let content: string
  try {
    const body = req.body as { content?: string; text?: string }
    content = typeof body.content === 'string' ? body.content : (typeof body.text === 'string' ? body.text : '')
  } catch {
    content = ''
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    res.status(400).json({ error: 'Content is too long for export.' })
    return
  }

  try {
    const children = contentToDocxParagraphs(content)
    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    })
    const buffer = await Packer.toBuffer(doc)
    await insertUsageLog(user.userId, 'export', null)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', 'attachment; filename="resume.docx"')
    res.send(buffer)
  } catch (err) {
    console.error('Export DOCX error:', err)
    res.status(500).json({ error: 'Export failed. Please try again.' })
  }
})

export default router
