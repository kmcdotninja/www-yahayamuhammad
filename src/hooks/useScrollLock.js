import { useEffect } from 'react'
import { getLenis } from '../lib/lenisStore.js'

// Freeze the page behind a modal.
//
// overflow:hidden on its own is not enough here: Lenis owns scrolling and moves
// the page programmatically, so it has to be told to stop as well. And the body
// is pinned at its current offset rather than merely clipped, because iOS
// Safari will happily rubber-band a clipped page — the offset is restored on
// release so closing doesn't dump you back at the top.
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return

    const lenis = getLenis()
    lenis?.stop()

    const scrollY = window.scrollY
    const html = document.documentElement
    const body = document.body
    // On platforms with classic (space-taking) scrollbars, hiding overflow
    // widens the viewport and the whole page slides right as the modal opens.
    // Give the width back as padding — the global border-box sizing keeps the
    // content box exactly where it was.
    const gutter = window.innerWidth - html.clientWidth
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    if (gutter > 0) body.style.paddingRight = `${gutter}px`

    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.position = prev.bodyPosition
      body.style.top = prev.bodyTop
      body.style.left = prev.bodyLeft
      body.style.right = prev.bodyRight
      body.style.width = prev.bodyWidth
      body.style.paddingRight = prev.bodyPaddingRight
      window.scrollTo(0, scrollY)
      lenis?.start()
    }
  }, [active])
}
