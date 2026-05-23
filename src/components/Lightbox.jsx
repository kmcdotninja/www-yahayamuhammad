import { useEffect, useState } from 'react'
import './Lightbox.css'

export default function Lightbox({
  images,
  index,
  projectName,
  onClose,
}) {
  const open = index !== null && index >= 0
  const [current, setCurrent] = useState(open ? index : 0)

  useEffect(() => {
    if (open) setCurrent(index)
  }, [index, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') {
        setCurrent((c) => (c - 1 + images.length) % images.length)
      } else if (e.key === 'ArrowRight') {
        setCurrent((c) => (c + 1) % images.length)
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, images.length, onClose])

  const prev = () =>
    setCurrent((c) => (c - 1 + images.length) % images.length)
  const next = () => setCurrent((c) => (c + 1) % images.length)

  return (
    <div
      className={`lb ${open ? 'lb--open' : ''}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label={`${projectName || 'Project'} images`}
    >
      <button
        type="button"
        className="lb__backdrop"
        onClick={onClose}
        aria-label="Close lightbox"
        tabIndex={open ? 0 : -1}
      />

      <button
        type="button"
        className="lb__nav lb__nav--prev"
        onClick={prev}
        aria-label="Previous image"
        tabIndex={open ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <figure className="lb__figure">
        {open && (
          <img
            key={current}
            src={images[current]}
            alt={`${projectName || ''} ${current + 1}`}
            className="lb__image"
            draggable={false}
          />
        )}
      </figure>

      <button
        type="button"
        className="lb__nav lb__nav--next"
        onClick={next}
        aria-label="Next image"
        tabIndex={open ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M9 6l6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="lb__bar">
        <span className="lb__title">{projectName}</span>
        <span className="lb__counter">
          {open ? current + 1 : 1} <span>/</span> {images.length}
        </span>
        <button
          type="button"
          className="lb__close"
          onClick={onClose}
          aria-label="Close"
          tabIndex={open ? 0 : -1}
        >
          Close
        </button>
      </div>
    </div>
  )
}
