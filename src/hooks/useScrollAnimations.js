import { useEffect, useLayoutEffect, useRef } from 'react'
import { setLenis } from '../lib/lenisStore.js'

// Soft "expo.out"-style cubic — settles slowly, never bounces
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

// Cache the dynamic GSAP / Lenis / ScrollTrigger imports so navigating
// between routes doesn't re-fetch the same chunks.
let gsapModulePromise = null
const loadGsap = () => {
  if (!gsapModulePromise) {
    gsapModulePromise = Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([gsapMod, stMod]) => {
      const gsap = gsapMod.default || gsapMod
      const ScrollTrigger = stMod.ScrollTrigger || stMod.default
      gsap.registerPlugin(ScrollTrigger)
      return { gsap, ScrollTrigger }
    })
  }
  return gsapModulePromise
}

let lenisModulePromise = null
const loadLenis = () => {
  if (!lenisModulePromise) {
    lenisModulePromise = import('lenis').then((m) => m.default || m.Lenis || m)
  }
  return lenisModulePromise
}

const isTouchOnly = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches

export function useScrollAnimations(pathname) {
  // Keep a ref to whether the route effect has armed reveals so we can wait
  // on the lenis/gsap dynamic import before refreshing scroll triggers.
  const ctxRef = useRef(null)

  // ---- Lenis: set up once ----
  useEffect(() => {
    let lenis
    let rafId = 0
    let cancelled = false
    let cleanupRef = () => {}

    Promise.all([loadLenis(), loadGsap()]).then(([Lenis, { ScrollTrigger }]) => {
      if (cancelled) return
      lenis = new Lenis({
        lerp: 0.08,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.4,
        // Switching to native scroll on touch eliminates the wheel-lerp
        // overhead on iOS/Android while keeping the desktop momentum feel.
        smoothTouch: false,
        autoRaf: false,
      })
      setLenis(lenis)

      function raf(time) {
        lenis.raf(time)
        rafId = requestAnimationFrame(raf)
      }
      rafId = requestAnimationFrame(raf)

      lenis.on('scroll', ScrollTrigger.update)

      // Smooth scroll-to-anchor for in-document hash links
      const onAnchorClick = (e) => {
        const link = e.target.closest('a[href^="#"]')
        if (!link) return
        const id = link.getAttribute('href')
        if (!id || id === '#') return
        const target = document.querySelector(id)
        if (!target) return
        e.preventDefault()
        lenis.scrollTo(target, { offset: 0, duration: 1.2 })
      }
      document.addEventListener('click', onAnchorClick)

      const refresh = () => ScrollTrigger.refresh()
      window.addEventListener('load', refresh, { once: true })

      // Lazy-loaded images and webfonts grow the page height AFTER our
      // initial ScrollTrigger.refresh runs. Coalesce a burst of loads into
      // one refresh on the next idle slot so the work doesn't pile onto an
      // already-animating frame.
      let imgRefreshTimer
      const scheduleRefresh = () => {
        clearTimeout(imgRefreshTimer)
        imgRefreshTimer = setTimeout(() => {
          const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 50))
          ric(() => ScrollTrigger.refresh())
        }, 180)
      }
      const onAssetLoad = (e) => {
        const tag = e.target?.tagName
        if (tag !== 'IMG' && tag !== 'VIDEO') return
        scheduleRefresh()
      }
      document.addEventListener('load', onAssetLoad, true)

      const html = document.documentElement
      const classObserver = new MutationObserver(() => {
        if (!html.classList.contains('is-loading')) {
          setTimeout(() => ScrollTrigger.refresh(), 50)
        }
      })
      classObserver.observe(html, {
        attributes: true,
        attributeFilter: ['class'],
      })

      cleanupRef = () => {
        document.removeEventListener('click', onAnchorClick)
        window.removeEventListener('load', refresh)
        document.removeEventListener('load', onAssetLoad, true)
        classObserver.disconnect()
        clearTimeout(imgRefreshTimer)
      }
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      cleanupRef()
      if (lenis) {
        lenis.destroy()
        setLenis(null)
      }
    }
  }, [])

  // ---- Reveal animations: re-attach when route changes ----
  // useLayoutEffect (not useEffect) so the fromTo initial hidden state is
  // committed BEFORE the browser's first paint of the new page. Without
  // this, the new route paints fully visible for one frame then snaps to
  // opacity 0 — a flicker. Because GSAP loads lazily we still kick off
  // the import here and configure inside `then` — the hidden state goes on
  // synchronously through `data-reveal` CSS so the flicker is preempted by
  // the stylesheet, not the JS.
  useLayoutEffect(() => {
    let cancelled = false
    let ctx = null

    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return

      ctx = gsap.context(() => {
        // On touch we still animate reveals but compress duration + stagger so
        // the cumulative timeline budget is smaller.
        const touch = isTouchOnly()
        const durBig = touch ? 0.65 : 0.9
        const durSmall = touch ? 0.55 : 0.8

        gsap.utils.toArray('[data-reveal]').forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: durBig,
              ease: EASE,
              scrollTrigger: {
                trigger: el,
                start: 'top 92%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        })

        gsap.utils.toArray('[data-reveal-stagger]').forEach((row) => {
          gsap.fromTo(
            row.children,
            { opacity: 0, y: 10 },
            {
              opacity: 1,
              y: 0,
              duration: durSmall,
              ease: EASE,
              stagger: touch ? 0.05 : 0.08,
              scrollTrigger: {
                trigger: row,
                start: 'top 92%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        })

        gsap.utils.toArray('[data-reveal-card]').forEach((el) => {
          const rotation = gsap.utils.random(-5, 5, 0.1)
          const xOffset = gsap.utils.random(-12, 12, 1)
          gsap.fromTo(
            el,
            {
              opacity: 0,
              scale: 0.86,
              rotation,
              y: 36,
              x: xOffset,
              transformOrigin: '50% 100%',
              force3D: true,
            },
            {
              opacity: 1,
              scale: 1,
              rotation: 0,
              y: 0,
              x: 0,
              duration: 0.85,
              ease: 'back.out(1.4)',
              scrollTrigger: {
                trigger: el,
                start: 'top 90%',
                end: 'bottom 10%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        })
      })
      ctxRef.current = ctx

      ScrollTrigger.refresh()
      window.dispatchEvent(new Event('app:reveal-ready'))

      // Belt-and-suspenders refreshes for any image that loads in the
      // narrow window between markup mounting and the capture-phase load
      // listener catching its event. One scheduled at 600ms is enough —
      // the double 300/1200 pair was redundant work.
      const t1 = setTimeout(() => ScrollTrigger.refresh(), 600)
      ctxRef.current.__t1 = t1
    })

    return () => {
      cancelled = true
      if (ctxRef.current) {
        clearTimeout(ctxRef.current.__t1)
        ctxRef.current.revert?.()
        ctxRef.current = null
      }
    }
  }, [pathname])
}
