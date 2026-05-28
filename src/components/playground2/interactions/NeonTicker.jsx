import { useEffect, useState } from 'react'
import './NeonTicker.css'

// NGX (Nigerian Stock Exchange) tickers that show on the green row. Yahoo
// Finance uses the `.LG` suffix for NGX symbols.
const NGX_SYMBOLS = [
  'DANGCEM',
  'MTNN',
  'GTCO',
  'NESTLE',
  'SEPLAT',
  'ZENITHBANK',
  'ACCESS',
]

// Realistic fallback used while the fetch is in-flight or if the upstream
// proxy is down — so the marquee always reads as Nigerian stock data even
// when the network can't be reached.
const NGX_FALLBACK =
  '+2.1% DANGCEM  ·  +0.8% MTNN  ·  +1.4% GTCO  ·  -0.6% NESTLE  ·  +3.2% SEPLAT  ·  -0.4% ZENITHBANK  ·  +1.0% ACCESS  ·  '

// Refresh the green row every 5 min — NGX moves slowly, more frequent
// fetches would just burn the public proxy's quota without adding info.
const NGX_REFRESH_MS = 5 * 60 * 1000

// One-shot fetch + parse of NGX quotes via Yahoo Finance, proxied through
// allorigins.win so it works browser-side without an API key. Returns a
// preformatted ticker string ("+1.4% GTCO  ·  +0.8% MTNN  ·  …") or null
// on any failure (network, CORS, parse, no usable rows).
async function fetchNgxText(signal) {
  const yahoo = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${NGX_SYMBOLS.map(
    (s) => `${s}.LG`,
  ).join(',')}&range=1d&interval=1d`
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahoo)}`
  const resp = await fetch(proxy, { signal })
  if (!resp.ok) return null

  const data = await resp.json().catch(() => null)
  const results = data?.spark?.result
  if (!Array.isArray(results)) return null

  const parts = []
  for (const sym of NGX_SYMBOLS) {
    const entry = results.find((r) => r.symbol === `${sym}.LG`)
    const meta = entry?.response?.[0]?.meta
    const close = meta?.regularMarketPrice
    const prev = meta?.previousClose ?? meta?.chartPreviousClose
    if (typeof close === 'number' && typeof prev === 'number' && prev > 0) {
      const pct = ((close - prev) / prev) * 100
      const sign = pct >= 0 ? '+' : ''
      parts.push(`${sign}${pct.toFixed(1)}% ${sym}`)
    }
  }

  if (!parts.length) return null
  return `${parts.join('  ·  ')}  ·  `
}

function useNgxText() {
  const [text, setText] = useState(NGX_FALLBACK)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    const tick = () => {
      // 6 s safety timeout — if the proxy stalls, abandon the request and
      // keep showing whatever's already there.
      const timeoutId = setTimeout(() => ctrl.abort(), 6000)
      fetchNgxText(ctrl.signal)
        .then((next) => {
          if (!cancelled && next) setText(next)
        })
        .catch(() => {
          /* keep current text on any error */
        })
        .finally(() => clearTimeout(timeoutId))
    }

    tick()
    const interval = setInterval(tick, NGX_REFRESH_MS)
    return () => {
      cancelled = true
      ctrl.abort()
      clearInterval(interval)
    }
  }, [])

  return text
}

export default function NeonTicker({ active = true }) {
  const ngxText = useNgxText()

  const tickers = [
    {
      color: 'white',
      text: 'MOTION DESIGN STUDIO  ·  EXPERIMENTS IN GESTURE  ·  STUDIO OPEN  ·  ',
      duration: 37,
    },
    {
      color: 'red',
      text: 'NOW PLAYING  ·  STICKER STACK  ·  IMAGE ZOOM STORY  ·  APPLE CAROUSEL  ·  NUMBER FLIP COUNTER  ·  THINKING STREAM  ·  ',
      duration: 28,
    },
    {
      color: 'green',
      text: ngxText,
      duration: 43,
    },
  ]

  return (
    <div className="pg2-neon">
      <div className="pg2-neon__stack">
        {tickers.map((row) => (
          <div
            key={row.color}
            className={`pg2-neon__row pg2-neon__row--${row.color}`}
          >
            {/* LED dot-matrix backdrop, scoped to this row's pill. */}
            <div className="pg2-neon__grid" aria-hidden="true" />

            {/* Marquee runs as a pure CSS animation — the browser compositor
                drives the transform, so it stays smooth even on mobile where
                a JS-driven (rAF + React) loop tends to micro-stall on the
                seam. Pause when out of view to save battery / GPU. */}
            <div
              className="pg2-neon__track"
              style={{
                animationDuration: `${row.duration}s`,
                animationPlayState: active ? 'running' : 'paused',
              }}
            >
              <div className="pg2-neon__half">
                <span className="pg2-neon__text">{row.text}</span>
                <span className="pg2-neon__text">{row.text}</span>
                <span className="pg2-neon__text">{row.text}</span>
              </div>
              <div className="pg2-neon__half" aria-hidden="true">
                <span className="pg2-neon__text">{row.text}</span>
                <span className="pg2-neon__text">{row.text}</span>
                <span className="pg2-neon__text">{row.text}</span>
              </div>
            </div>

            {/* Edge fade — characters dissolve into the bezel at both ends. */}
            <div className="pg2-neon__bezel" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  )
}
