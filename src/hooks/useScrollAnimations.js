import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { setLenis } from '../lib/lenisStore.js'

gsap.registerPlugin(ScrollTrigger)

// Soft "expo.out"-style cubic — settles slowly, never bounces
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

export function useScrollAnimations(pathname) {
  // ---- Lenis: set up once ----
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
    })
    setLenis(lenis)

    let rafId
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
    window.addEventListener('load', refresh)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('click', onAnchorClick)
      window.removeEventListener('load', refresh)
      lenis.destroy()
      setLenis(null)
    }
  }, [])

  // ---- Reveal animations: re-attach when route changes ----
  useEffect(() => {
    // Defer so the new page's DOM is mounted before we query for [data-reveal].
    let ctx
    const id = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        gsap.utils.toArray('[data-reveal]').forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
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
              duration: 0.8,
              ease: EASE,
              stagger: 0.08,
              scrollTrigger: {
                trigger: row,
                start: 'top 92%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        })
      })
      ScrollTrigger.refresh()
    })

    return () => {
      cancelAnimationFrame(id)
      ctx?.revert()
    }
  }, [pathname])
}
