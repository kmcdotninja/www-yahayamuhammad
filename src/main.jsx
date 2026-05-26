import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
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
document.documentElement.classList.add('is-loading')

// Warm the network cache for assets that only load on the home page so that
// navigating to it from /playground or /about never waits on a cold fetch.
;['/yahya%20model.stl'].forEach((url) => {
  fetch(url, { cache: 'force-cache' }).catch(() => {})
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
