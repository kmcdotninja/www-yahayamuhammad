import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

if (window.location.hash) {
  window.history.replaceState(
    {},
    '',
    window.location.pathname + window.location.search,
  )
}

window.scrollTo(0, 0)

// While the loader is up (below) the hero's stickers and the guide wait for it to lift: window.__pfLoader is a promise
// that settles as it starts to lift
let liftLoader = () => {}
window.__pfLoader = new Promise((res) => { liftLoader = res })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// The DeFleet buddy as a guide in the corner (src/buddy), its own root so the page's App is untouched. First the
// loader (src/buddy/Loader.jsx): the Robot kickboxing your Singapore snapshots, then the site. The guide is for
// desktop only (the site's desktop width, 901px and up): on a phone it covered the hero and the work; phones still
// get the loader.
{
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200))
  const GUIDE = matchMedia('(min-width: 901px)').matches
  const mountGuide = () => GUIDE && import('./buddy/Guide.jsx').then(({ default: Guide }) => {
    const host = document.body.appendChild(document.createElement('div'))
    createRoot(host).render(<Guide />)
  })
  const LOADER = true   // the loader (set false to skip it)
  const EVERY = import.meta.env.DEV   // the dev server plays it on every refresh; the live site on a visit's first page
  let first = false
  if (LOADER) try { first = (EVERY || !sessionStorage.getItem('pf.loader')) && !matchMedia('(prefers-reduced-motion: reduce)').matches; sessionStorage.setItem('pf.loader', '1') } catch { /* storage off */ }
  if (first) {
    // the loader's black goes up at once; the guide is built behind it (its moment of work hidden there, the
    // loader's own motion runs off the main thread), ready to tumble in with the stickers as it lifts
    const host = document.body.appendChild(document.createElement('div'))
    host.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#0a0a0a'
    import('./buddy/Loader.jsx').then(({ default: Loader }) => {
      const root = createRoot(host)
      root.render(<Loader onLift={liftLoader} onDone={() => { root.unmount(); host.remove() }} />)
      host.style.background = 'none'
      setTimeout(mountGuide, 150)
    })
  } else {
    // no loader: nothing to wait for; the guide is built once the stickers have settled (its moment of work would
    // otherwise freeze them mid-fall), and tumbles in then
    liftLoader()
    const go = () => setTimeout(() => idle(mountGuide, { timeout: 2000 }), 2500)
    if (document.readyState === 'complete') go()
    else addEventListener('load', go, { once: true })
  }
}

// Defer Vercel Analytics until after first paint — the analytics script
// is non-essential for rendering and would otherwise compete with React
// hydration on the main thread.
const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500))
ric(() => {
  import('@vercel/analytics')
    .then(({ inject }) => inject())
    .catch(() => {})
})
