import { useEffect, useState } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './App.css'
import Hero from './components/Hero.jsx'
import HeroCentered from './components/HeroCentered.jsx'
import Works from './components/Works.jsx'
import PlaygroundPage from './components/PlaygroundPage.jsx'
import NotePage from './components/NotePage.jsx'
import NotFoundPage from './components/NotFoundPage.jsx'
import Footer from './components/Footer.jsx'
import Loader from './components/Loader.jsx'
import { useScrollAnimations } from './hooks/useScrollAnimations.js'
import { usePathname } from './lib/router.js'
import { getLenis } from './lib/lenisStore.js'

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

  const [loading, setLoading] = useState(true)
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
  } else if (renderPath === '/note') {
    body = <NotePage />
  } else if (renderPath === '/') {
    body = (
      <>
        {isDesktop ? <HeroCentered /> : <Hero />}
        <Works />
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
        <Loader
          gateReady={portionReady}
          onDone={() => setLoading(false)}
        />
      )}
      <SpeedInsights />
    </div>
  )
}
