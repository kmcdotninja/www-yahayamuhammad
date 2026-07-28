import { useRef } from 'react'
import { useInView } from 'framer-motion'
import './PlaygroundSection.css'

export default function PlaygroundSection({
  title,
  meta,
  span = 'half',
  aspect = 'wide',
  children,
}) {
  // The card fades and rises in on scroll like the rest of the site
  // (data-reveal, driven by useScrollAnimations). That's separate from
  // `useInView`, which the interactive children use for their own signal —
  // StickerStack, NeonTicker and ThinkingStream all pause when out of view.
  const stageRef = useRef(null)
  const inView = useInView(stageRef, { amount: 0.3, once: false })

  return (
    <figure
      className={`pg2-section ${span === 'full' ? 'pg2-section--full' : ''}`}
      data-reveal
    >
      <div
        ref={stageRef}
        className={`pg2-section__stage pg2-section__stage--${aspect}`}
      >
        {children({ inView })}
      </div>

      <figcaption className="pg2-section__caption">
        <h2 className="pg2-section__title">{title}</h2>
        {meta && <span className="pg2-section__meta">{meta}</span>}
      </figcaption>
    </figure>
  )
}
