import { useEffect, useState } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './App.css'
import Hero from './components/Hero.jsx'
import HeroCentered from './components/HeroCentered.jsx'
// Parked — Dann-Petty-style minimal strip hero. Files kept for revert.
// import HeroStrip from './components/HeroStrip.jsx'
import Works2 from './components/Works2.jsx'
// Parked — Playground teaser strip that sat between Works2 and the
// Footer on the home page. Files kept for one-line revert.
// import HomePlayground from './components/HomePlayground.jsx'
import PlaygroundPage from './components/PlaygroundPage.jsx'
import AboutPage from './components/AboutPage.jsx'
import NotFoundPage from './components/NotFoundPage.jsx'
import Footer from './components/Footer.jsx'
import Loader from './components/Loader.jsx'
// Loader3 (sticker-stack variant) is parked. Files kept around so we can
// flip back later by swapping the import + render below.
// eslint-disable-next-line no-unused-vars
import Loader3 from './components/Loader3.jsx'
import { useScrollAnimations } from './hooks/useScrollAnimations.js'
import { usePathname } from './lib/router.js'
import { getLenis } from './lib/lenisStore.js'
import { applySEO, ROUTE_SEO } from './lib/seo.js'

const LEAVE_MS = 520
const ENTER_MS = 760

const DESKTOP_MQ = '(min-width: 901px)'

export default function App() {
  const pathname = usePathname()

  // What's actually rendered. Lags behind `pathname` during a route transition
  // so the leaving page can finish its exit animation before the new one mounts.
  const [renderPath, setRenderPath] = useState(pathname)
  const [transition, setTransition] = useState('idle') // 'idle' | 'leaving' | 'entering'

  // Desktop swaps in the centered hero variant; mobile keeps the left-aligned one.
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

  // Loader unplugged — page renders straight to content with no intro.
  // Flip back to `useState(true)` to bring the loader back; all the
  // surrounding plumbing (portionReady, is-loading class, lenis stop)
  // is intact so the revival is a one-line change.
  const [loading, setLoading] = useState(false)
  // Only the home page mounts the 3D model — other pages can dismiss the
  // loader as soon as the timeline finishes.
  const [portionReady, setPortionReady] = useState(pathname !== '/')

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
    if (renderPath !== '/') {
      setPortionReady(true)
      return
    }
    const onReady = () => setPortionReady(true)
    window.addEventListener('app:portion-ready', onReady, { once: true })
    return () => window.removeEventListener('app:portion-ready', onReady)
  }, [renderPath])

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
    body = <PlaygroundPage />
  } else if (renderPath === '/about') {
    body = <AboutPage />
  } else if (renderPath === '/') {
    body = (
      <>
        {isDesktop ? <HeroCentered /> : <Hero />}
        <Works2 />
        {/* <HomePlayground /> — parked, see import above. */}
        <Footer />
      </>
    )
  } else {
    body = <NotFoundPage />
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
        /* Default loader — 3D bust. Swap for `<Loader3 gateReady … />` to
           switch to the sticker-stack variant; that file + its CSS are
           kept in the tree for one-line revert. */
        <Loader
          gateReady={portionReady}
          onDone={() => setLoading(false)}
        />
      )}
      <SpeedInsights />
    </div>
  )
}
