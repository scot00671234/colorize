import { useEditor, EditorContent, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useImperativeHandle, forwardRef } from 'react'

const extensions = [StarterKit]

export type ResumeEditorHandle = {
  getSelectedText: () => string
  replaceSelection: (text: string) => void
  getText: () => string
  /** Insert HTML or plain text at the start of the document (e.g. for generated summary). */
  insertContentAtStart: (htmlOrText: string) => void
  /** Plain text with ## for H2 and ### for H3, for PDF export. */
  getExportText: () => string
}

type ResumeEditorProps = {
  content: Content
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
}

const ResumeEditor = forwardRef<ResumeEditorHandle, ResumeEditorProps>(function ResumeEditor(
  { content, onChange, className },
  ref
) {
  const editor = useEditor({
    extensions,
    content: content || '',
    editorProps: {
      attributes: {
        class: 'resumeEditorInner',
      },
      handleDOMEvents: {
        paste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain')
          if (text) {
            event.preventDefault()
            const { state } = view
            const tr = state.tr.insertText(text)
            view.dispatch(tr)
            return true
          }
          return false
        },
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const h = () => {
      const html = editor.getHTML()
      const text = editor.getText()
      onChange(html, text)
    }
    editor.on('update', h)
    return () => {
      editor.off('update', h)
    }
  }, [editor, onChange])

  useImperativeHandle(
    ref,
    () => ({
      getSelectedText: () => {
        const { from, to } = editor?.state.selection ?? {}
        if (from == null || to == null || from === to) return ''
        return editor?.state.doc.textBetween(from, to) ?? ''
      },
      replaceSelection: (text: string) => {
        editor?.chain().focus().insertContent(text).run()
      },
      getText: () => editor?.getText() ?? '',
      insertContentAtStart: (htmlOrText: string) => {
        if (!editor) return
        const content = htmlOrText.trim().startsWith('<') ? htmlOrText : `<p>${htmlOrText.replace(/\n/g, '</p><p>')}</p>`
        editor.chain().focus().insertContentAt(0, content).run()
      },
      getExportText: () => {
        if (!editor?.state.doc) return editor?.getText() ?? ''
        const parts: string[] = []
        editor.state.doc.forEach((node) => {
          if (node.type.name === 'heading') {
            const level = node.attrs.level as number
            const prefix = level === 1 ? '#' : level === 2 ? '##' : '###'
            const text = node.textContent.trim()
            if (text) parts.push(`${prefix} ${text}`)
          } else if (node.type.name === 'paragraph' || node.type.name === 'blockquote') {
            const text = node.textContent.trim()
            if (text) parts.push(text)
          } else if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
            node.forEach((item) => {
              const text = item.textContent.trim()
              if (text) parts.push(`• ${text}`)
            })
          } else {
            const text = node.textContent.trim()
            if (text) parts.push(text)
          }
        })
        return parts.join('\n\n')
      },
    }),
    [editor]
  )

  useEffect(() => {
    if (!editor || content === undefined || content === null || typeof content !== 'string') return
    const isHtml = content.trim().startsWith('<')
    const current = isHtml ? editor.getHTML() : editor.getText()
    if (content.trim() !== current.trim()) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) return null

  return (
    <div className={`resumeEditor ${className ?? ''}`}>
      <div className="resumeEditorToolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'resumeEditorBtnActive' : ''}
          title="Title (e.g. your name)"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'resumeEditorBtnActive' : ''}
          title="Section (e.g. Experience, Education)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'resumeEditorBtnActive' : ''}
          title="Subsection"
        >
          H3
        </button>
        <span className="resumeEditorToolbarDivider" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'resumeEditorBtnActive' : ''}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'resumeEditorBtnActive' : ''}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'resumeEditorBtnActive' : ''}
          title="Bullet list"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'resumeEditorBtnActive' : ''}
          title="Numbered list"
        >
          1.
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
})

export default ResumeEditor

export function getEditorPlainText(editor: ReturnType<typeof useEditor>): string {
  return editor?.getText() ?? ''
}

export function getEditorHtml(editor: ReturnType<typeof useEditor>): string {
  return editor?.getHTML() ?? ''
}
