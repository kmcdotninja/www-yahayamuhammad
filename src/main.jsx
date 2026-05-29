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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Defer Vercel Analytics until after first paint — the analytics script
// is non-essential for rendering and would otherwise compete with React
// hydration on the main thread.
const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500))
ric(() => {
  import('@vercel/analytics')
    .then(({ inject }) => inject())
    .catch(() => {})
})
