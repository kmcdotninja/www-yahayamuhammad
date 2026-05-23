import { useEffect, useState } from 'react'

const LIGHT = {
  '--bg': '#f5f3ee',
  '--text': '#0a0a0a',
  '--text-dim': '#5a5854',
  '--text-muted': '#9a9a96',
  '--border': 'rgba(0, 0, 0, 0.12)',
  '--pill-border': 'rgba(0, 0, 0, 0.4)',
}

const DARK = {
  '--bg': '#0a0a0a',
  '--text': '#e6e3dc',
  '--text-dim': '#8a8780',
  '--text-muted': '#5a5854',
  '--border': 'rgba(255, 255, 255, 0.12)',
  '--pill-border': 'rgba(255, 255, 255, 0.35)',
}

function applyTheme(theme) {
  const vars = theme === 'light' ? LIGHT : DARK
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  root.setAttribute('data-theme', theme)
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // ignored
    }
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, setTheme, toggleTheme }
}
