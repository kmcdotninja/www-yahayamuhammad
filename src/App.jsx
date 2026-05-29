import { lazy, Suspense, useEffect, useState } from 'react'
import './App.css'
import Hero from './components/Hero.jsx'
import HeroCentered from './components/HeroCentered.jsx'
import Works2 from './components/Works2.jsx'
import Footer from './components/Footer.jsx'
import { useScrollAnimations } from './hooks/useScrollAnimations.js'
import { usePathname } from './lib/router.js'
import { getLenis } from './lib/lenisStore.js'
import { applySEO, ROUTE_SEO } from './lib/seo.js'

// Route-level code splitting. The home page (Hero + Works2 + Footer) ships
// in the initial chunk because that's the LCP path; the other routes lazy
// in their own chunks so users on /playground or /about don't download the
// home-page graph and vice-versa.
const PlaygroundPage = lazy(() => import('./components/PlaygroundPage.jsx'))
const AboutPage = lazy(() => import('./components/AboutPage.jsx'))
const NotFoundPage = lazy(() => import('./components/NotFoundPage.jsx'))
// Loader (and its 3D dependency) is gated behind a runtime flag — only
// pull it into the bundle when we actually decide to mount it.
const Loader = lazy(() => import('./components/Loader.jsx'))

// Lightweight @vercel/speed-insights wrapper that defers the import until
// the page is idle, so the analytics script doesn't fight for the main
// thread during initial paint.
const SpeedInsightsLazy = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights })),
)

const LEAVE_MS = 520
const ENTER_MS = 760

const DESKTOP_MQ = '(min-width: 901px)'

export default function App() {
  const pathname = usePathname()

  const [renderPath, setRenderPath] = useState(pathname)
  const [transition, setTransition] = useState('idle')

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useScrollAnimations(renderPath)

  useEffect(() => {
    const seo = ROUTE_SEO[pathname] || ROUTE_SEO['/404']
    applySEO({ ...seo, path: pathname })
  }, [pathname])

  // Defer SpeedInsights mount until idle so it never shows up in the
  // initial JS execution budget.
  const [analyticsReady, setAnalyticsReady] = useState(false)
  useEffect(() => {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = ric(() => setAnalyticsReady(true), { timeout: 3000 })
    return () => cancel(id)
  }, [])

  // Loader unplugged — page renders straight to content with no intro.
  // Flip back to `useState(true)` to bring the loader back; the
  // surrounding plumbing (is-loading class, lenis stop) is intact so the
  // revival is a one-line change.
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (pathname === renderPath) return
    setTransition('leaving')
    const leaveTimer = setTimeout(() => {
      setRenderPath(pathname)
      setTransition('entering')
    }, LEAVE_MS)
    return () => clearTimeout(leaveTimer)
  }, [pathname, renderPath])

  useEffect(() => {
    if (transition !== 'entering') return
    const enterTimer = setTimeout(() => setTransition('idle'), ENTER_MS)
    return () => clearTimeout(enterTimer)
  }, [transition])

  useEffect(() => {
    if (loading) {
      document.documentElement.classList.add('is-loading')
      window.scrollTo(0, 0)
      const lenis = getLenis()
      lenis?.stop()
      lenis?.scrollTo(0, { immediate: true, force: true })
    } else {
      document.documentElement.classList.remove('is-loading')
      const lenis = getLenis()
      lenis?.scrollTo(0, { immediate: true, force: true })
      lenis?.start()
    }
  }, [loading])

  let body
  if (renderPath === '/playground') {
    body = (
      <Suspense fallback={null}>
        <PlaygroundPage />
      </Suspense>
    )
  } else if (renderPath === '/about') {
    body = (
      <Suspense fallback={null}>
        <AboutPage />
      </Suspense>
    )
  } else if (renderPath === '/') {
    body = (
      <>
        {isDesktop ? <HeroCentered /> : <Hero />}
        <Works2 />
        <Footer />
      </>
    )
  } else {
    body = (
      <Suspense fallback={null}>
        <NotFoundPage />
      </Suspense>
    )
  }

  const transitionClass =
    transition === 'leaving'
      ? 'page__content page__content--leaving'
      : transition === 'entering'
      ? 'page__content page__content--entering'
      : 'page__content'

  const veilClass =
    transition === 'leaving'
      ? 'page__veil page__veil--in'
      : transition === 'entering'
      ? 'page__veil page__veil--out'
      : 'page__veil'

  return (
    <div className="page">
      <div className={transitionClass} key={renderPath}>
        {body}
      </div>
      <div className={veilClass} aria-hidden="true" />
      {loading && (
        <Suspense fallback={null}>
          <Loader onDone={() => setLoading(false)} />
        </Suspense>
      )}
      {analyticsReady && (
        <Suspense fallback={null}>
          <SpeedInsightsLazy />
        </Suspense>
      )}
    </div>
  )
}
