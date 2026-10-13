import { useEffect } from 'react'

// Lazy, polite looping video: the clip isn't fetched until its <video> is near
// the viewport (pair with preload="none"), it plays only while on screen and
// pauses when scrolled away. With prefers-reduced-motion it never loads, so the
// poster stays. Used by the project tiles (PhoneTile, ProjectMedia).

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useLazyLoop(ref, src) {
  useEffect(() => {
    const v = ref.current
    if (!v || !src || reduced()) return undefined
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.getAttribute('src')) v.setAttribute('src', src)
          v.play().catch(() => {})
        } else if (!v.paused) {
          v.pause()
        }
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [ref, src])
}
