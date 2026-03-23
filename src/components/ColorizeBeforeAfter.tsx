import { useId, useState } from 'react'

type Props = {
  /** Color reference image (same file used with a grayscale overlay for the “before” side). */
  imageSrc: string
  /** Short description for screen readers. */
  imageDescription: string
}

/**
 * Interactive before/after: left = monochrome, right = color. Drag the slider to compare.
 * Uses one asset + CSS grayscale for the “before” side (illustrative demo).
 */
export function ColorizeBeforeAfter({ imageSrc, imageDescription }: Props) {
  const [pos, setPos] = useState(48)
  const id = useId()
  const labelId = `${id}-label`

  return (
    <div className="colorizeBeforeAfter" role="region" aria-labelledby={labelId}>
      <p id={labelId} className="colorizeBeforeAfterCaption">
        <strong>1950s scene — sample</strong>
        <span className="colorizeBeforeAfterCaptionSub">
          Drag the slider: monochrome (left) → color (right). Illustrative demo.
        </span>
      </p>
      <div className="colorizeBeforeAfterFrame">
        <img
          src={imageSrc}
          alt=""
          className="colorizeBeforeAfterLayer colorizeBeforeAfterColor"
          draggable={false}
        />
        <div
          className="colorizeBeforeAfterClip"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          aria-hidden
        >
          <img
            src={imageSrc}
            alt=""
            className="colorizeBeforeAfterLayer colorizeBeforeAfterMono"
            draggable={false}
          />
        </div>
        <div className="colorizeBeforeAfterEdge" style={{ left: `${pos}%` }} aria-hidden>
          <span className="colorizeBeforeAfterKnob" />
        </div>
        <div className="colorizeBeforeAfterLabels" aria-hidden>
          <span className="colorizeBeforeAfterLabel colorizeBeforeAfterLabelBefore">Before</span>
          <span className="colorizeBeforeAfterLabel colorizeBeforeAfterLabelAfter">After</span>
        </div>
        <input
          type="range"
          className="colorizeBeforeAfterRange"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`Compare before and after colorization. ${imageDescription}`}
        />
      </div>
    </div>
  )
}
