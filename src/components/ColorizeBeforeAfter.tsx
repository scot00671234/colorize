import { useState } from 'react'

/** Single-image demo: one color file + CSS grayscale for “before”. */
type SingleImageProps = {
  imageSrc: string
  beforeSrc?: never
  afterSrc?: never
  imageDescription: string
  /** Optional frame aspect (default 16/10). */
  aspect?: '16/10' | '3/2'
}

/** True pair: separate black-and-white and color files (aligned composition). */
type PairProps = {
  beforeSrc: string
  afterSrc: string
  imageSrc?: never
  imageDescription: string
  aspect?: '16/10' | '3/2'
}

type Props = SingleImageProps | PairProps

function frameClass(aspect: '16/10' | '3/2' | undefined): string {
  const base = 'colorizeBeforeAfterFrame'
  if (aspect === '3/2') return `${base} colorizeBeforeAfterFrame--3x2`
  return base
}

/**
 * Interactive before/after: drag the slider. Left = before, right = after.
 * - Single `imageSrc`: “before” is grayscale CSS on the same file.
 * - `beforeSrc` + `afterSrc`: real B&W and color assets.
 */
export function ColorizeBeforeAfter(props: Props) {
  const [pos, setPos] = useState(48)
  const aspect = props.aspect
  const fc = frameClass(aspect)

  if ('beforeSrc' in props && props.beforeSrc && props.afterSrc) {
    const { beforeSrc, afterSrc, imageDescription } = props
    return (
      <div className="colorizeBeforeAfter" role="region" aria-label={imageDescription}>
        <div className={fc}>
          <img
            src={afterSrc}
            alt=""
            className="colorizeBeforeAfterLayer colorizeBeforeAfterColor colorizeBeforeAfterLayer--pair"
            draggable={false}
          />
          <div
            className="colorizeBeforeAfterClip"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            aria-hidden
          >
            <img
              src={beforeSrc}
              alt=""
              className="colorizeBeforeAfterLayer colorizeBeforeAfterLayer--pair"
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
            aria-label={`Compare before and after. ${imageDescription}`}
          />
        </div>
      </div>
    )
  }

  const { imageSrc, imageDescription } = props as SingleImageProps
  return (
    <div className="colorizeBeforeAfter" role="region" aria-label={imageDescription}>
      <div className={fc}>
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
