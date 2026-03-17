import { useState, useRef, useCallback } from 'react'

/** Demo image: same image shown as B&W (left) vs color (right); slider reveals the difference. */
const DEMO_IMAGE = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80'

export default function BeforeAfterSlider() {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback(
    (clientX: number) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      setPosition(x)
    },
    []
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      handleMove(e.clientX)
      const onMove = (e: PointerEvent) => handleMove(e.clientX)
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [handleMove]
  )

  return (
    <section className="section" id="demo">
      <div className="sectionHeader">
        <p className="sectionLabel">See the difference</p>
        <h2 className="sectionTitle">Before & after colorization</h2>
        <p className="demoSubtitle">Drag the slider to compare. This is how Wish Wello brings old photos back to life.</p>
      </div>
      <div
        ref={containerRef}
        className="beforeAfterSlider"
        onPointerDown={onPointerDown}
        role="img"
        aria-label="Before and after photo colorization comparison"
      >
        <div className="beforeAfterBefore">
          <img src={DEMO_IMAGE} alt="" />
        </div>
        <div className="beforeAfterAfter" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
          <img src={DEMO_IMAGE} alt="" />
        </div>
        <div
          className="beforeAfterHandle"
          style={{ left: `${position}%` }}
          onPointerDown={onPointerDown}
          aria-hidden
        >
          <span className="beforeAfterHandleLine" />
          <span className="beforeAfterHandleKnob">⟷</span>
        </div>
        <span className="beforeAfterLabel beforeAfterLabelLeft">Before</span>
        <span className="beforeAfterLabel beforeAfterLabelRight">After</span>
      </div>
    </section>
  )
}
