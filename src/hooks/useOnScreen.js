import { useEffect, useState } from 'react'

// true while the element is on (or near) the screen. The Kiko snippet tiles use
// it to run their animation only while visible, and to pause it off screen.
export function useOnScreen(ref, rootMargin = '100px 0px') {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return on
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
