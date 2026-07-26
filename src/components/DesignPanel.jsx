import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './DesignPanel.css'
import { TOKEN_GROUPS, defaultFor, keyFor } from '../lib/designTokens.js'
import { useTheme } from '../hooks/useTheme.js'

// A live design control panel. Tweak the design tokens on the running site and
// export a checklist "prompt" of exactly what changed, to hand to Claude.
//
// Gated: only appears when the URL has ?panel  OR  localStorage['design-panel']
// is '1' (visiting ?panel once sets the flag). Real visitors never see it.
// Its own chrome uses hardcoded colours + a system font so editing the tokens
// can never break the panel.

const LS_ENABLED = 'design-panel'
const LS_OVERRIDES = 'design-panel-overrides'

const isEnabled = () => {
  // Always on in dev. Otherwise localhost-only (preview) behind ?panel / a saved
  // flag. Never on a real deployed domain, so visitors can never see it.
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  const local = /^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)$/.test(host)
  if (!local) return false
  const params = new URLSearchParams(window.location.search)
  if (params.has('panel')) {
    localStorage.setItem(LS_ENABLED, '1')
    return true
  }
  return localStorage.getItem(LS_ENABLED) === '1'
}

export default function DesignPanel() {
  const [enabled] = useState(isEnabled)
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [overrides, setOverrides] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem(LS_OVERRIDES) || '{}')
    } catch {
      return {}
    }
  })
  // Collapsed groups
  const [collapsed, setCollapsed] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // Real current default of each non-themed token, read from computed styles
  // once before any override is applied. This keeps the panel honest after a
  // Save + reload (the file's new value becomes the baseline). Themed colours
  // use the registry defaults, which are already theme-accurate.
  const defaultsRef = useRef(null)
  if (defaultsRef.current === null && typeof window !== 'undefined') {
    const cs = getComputedStyle(document.documentElement)
    const caps = {}
    for (const group of TOKEN_GROUPS) {
      for (const t of group.tokens) {
        if (t.themed) continue
        const v = cs.getPropertyValue(t.name).trim()
        if (v) caps[t.name] = v
      }
    }
    defaultsRef.current = caps
  }
  const getDefault = useCallback(
    (t, th) =>
      t.themed ? defaultFor(t, th) : defaultsRef.current?.[t.name] ?? t.default,
    [],
  )

  // Persist overrides.
  useEffect(() => {
    if (enabled) localStorage.setItem(LS_OVERRIDES, JSON.stringify(overrides))
  }, [overrides, enabled])

  // Apply overrides to :root — re-run whenever they change or the theme flips
  // (useTheme rewrites the colour vars on toggle, so re-apply on the next frame
  // to land on top).
  useEffect(() => {
    if (!enabled) return
    const raf = requestAnimationFrame(() => {
      const root = document.documentElement
      for (const group of TOKEN_GROUPS) {
        for (const t of group.tokens) {
          const v = overrides[keyFor(t, theme)]
          if (v != null && v !== '') root.style.setProperty(t.name, v)
        }
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [overrides, theme, enabled])

  const valueOf = useCallback(
    (t) => overrides[keyFor(t, theme)] ?? getDefault(t, theme),
    [overrides, theme, getDefault],
  )

  const setValue = useCallback(
    (t, v) => setOverrides((prev) => ({ ...prev, [keyFor(t, theme)]: v })),
    [theme],
  )

  const resetToken = useCallback(
    (t) => {
      setOverrides((prev) => {
        const next = { ...prev }
        delete next[keyFor(t, theme)]
        return next
      })
      const root = document.documentElement
      if (t.themed) root.style.setProperty(t.name, getDefault(t, theme))
      else root.style.removeProperty(t.name)
    },
    [theme],
  )

  const resetAll = useCallback(() => {
    const root = document.documentElement
    for (const group of TOKEN_GROUPS) {
      for (const t of group.tokens) {
        if (t.themed) root.style.setProperty(t.name, getDefault(t, theme))
        else root.style.removeProperty(t.name)
      }
    }
    setOverrides({})
  }, [theme])

  // All changed entries (across both themes for colours).
  const changes = useMemo(() => {
    const out = []
    for (const group of TOKEN_GROUPS) {
      for (const t of group.tokens) {
        const themes = t.themed ? ['dark', 'light'] : [null]
        for (const th of themes) {
          const k = keyFor(t, th || theme)
          if (k in overrides && overrides[k] !== getDefault(t, th || theme)) {
            out.push({ group, t, th, from: getDefault(t, th || theme), to: overrides[k] })
          }
        }
      }
    }
    return out
  }, [overrides, theme, getDefault])

  const buildPrompt = useCallback(() => {
    if (!changes.length) return 'No changes yet — tweak some tokens first.'
    const byGroup = new Map()
    for (const c of changes) {
      if (!byGroup.has(c.group)) byGroup.set(c.group, [])
      byGroup.get(c.group).push(c)
    }
    const lines = [
      'Implement these design-token changes on the portfolio.',
      'Each token is a CSS custom property — update it at the source file noted,',
      'keep every other token untouched, then rebuild and verify desktop + mobile',
      'in both themes.',
      '',
    ]
    for (const [group, cs] of byGroup) {
      const where = group.file + (group.fileNote ? ` — ${group.fileNote}` : '')
      lines.push(`## ${group.label}  (${where})`)
      for (const c of cs) {
        const tag = c.th ? ` _(${c.th} theme)_` : ''
        lines.push(`- [ ] \`${c.t.name}\`${tag}: \`${c.from}\` → \`${c.to}\``)
      }
      lines.push('')
    }
    return lines.join('\n')
  }, [changes])

  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt())
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — ignore */
    }
  }, [buildPrompt])

  // Write the changes into the source files via the dev/preview plugin, so they
  // show up in `git status`. Then bake the saved values in as the new baseline.
  const saveChanges = useCallback(async () => {
    if (!changes.length || saving) return
    setSaving(true)
    setSaveErr('')
    const tokens = changes.map((c) => ({
      name: c.t.name,
      value: c.to,
      themed: !!c.t.themed,
      theme: c.th,
    }))
    try {
      const res = await fetch('/__design-panel/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'some tokens could not be written')
      }
      for (const c of changes) {
        if (c.t.themed) c.t.defaults[c.th] = c.to
        else if (defaultsRef.current) defaultsRef.current[c.t.name] = c.to
      }
      setOverrides({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (e) {
      setSaveErr(
        'Save needs the dev server (npm run dev). ' + (e.message || ''),
      )
    } finally {
      setSaving(false)
    }
  }, [changes, saving])

  const disablePanel = useCallback(() => {
    resetAll()
    localStorage.removeItem(LS_ENABLED)
    localStorage.removeItem(LS_OVERRIDES)
    window.location.search = window.location.search
      .replace(/[?&]panel=?[^&]*/, '')
      .replace(/^&/, '?')
  }, [resetAll])

  if (!enabled) return null

  if (!open) {
    return (
      <button
        type="button"
        className="dpanel-fab"
        onClick={() => setOpen(true)}
        title="Open design panel"
        aria-label="Open design panel"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="4" y1="8" x2="20" y2="8" />
          <line x1="4" y1="16" x2="20" y2="16" />
          <circle cx="9" cy="8" r="2.4" fill="#14120d" />
          <circle cx="15" cy="16" r="2.4" fill="#14120d" />
        </svg>
        <span>Design</span>
        {changes.length > 0 && (
          <span className="dpanel-fab__dot">{changes.length}</span>
        )}
      </button>
    )
  }

  return (
    <aside className="dpanel" aria-label="Design panel">
      <header className="dpanel__top">
        <div className="dpanel__title">
          Design Panel
          <span className="dpanel__theme">{theme}</span>
        </div>
        <button
          type="button"
          className="dpanel__x"
          onClick={() => setOpen(false)}
          aria-label="Collapse"
          title="Collapse"
        >
          –
        </button>
      </header>

      <div className="dpanel__body">
        {TOKEN_GROUPS.map((group) => {
          const isOpen = !collapsed[group.id]
          return (
            <section key={group.id} className="dpanel__group">
              <button
                type="button"
                className="dpanel__group-head"
                onClick={() =>
                  setCollapsed((p) => ({ ...p, [group.id]: !p[group.id] }))
                }
              >
                <span>{group.label}</span>
                {group.themed && <span className="dpanel__badge">themed</span>}
                <span className="dpanel__chev">{isOpen ? '▾' : '▸'}</span>
              </button>

              {isOpen && (
                <div className="dpanel__rows">
                  {group.tokens.map((t) => (
                    <Row
                      key={t.name}
                      token={t}
                      value={valueOf(t)}
                      changed={
                        keyFor(t, theme) in overrides &&
                        overrides[keyFor(t, theme)] !== getDefault(t, theme)
                      }
                      onChange={(v) => setValue(t, v)}
                      onReset={() => resetToken(t)}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <footer className="dpanel__foot">
        <div className="dpanel__count">
          {changes.length} change{changes.length === 1 ? '' : 's'}
        </div>
        <div className="dpanel__actions">
          <button
            type="button"
            className="dpanel__btn"
            onClick={resetAll}
            disabled={!changes.length}
          >
            Reset
          </button>
          <button
            type="button"
            className="dpanel__btn"
            onClick={copyPrompt}
            disabled={!changes.length}
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button
            type="button"
            className="dpanel__btn dpanel__btn--primary"
            onClick={saveChanges}
            disabled={!changes.length || saving}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
        {saveErr && <p className="dpanel__err">{saveErr}</p>}
        <button type="button" className="dpanel__disable" onClick={disablePanel}>
          Turn off panel
        </button>
      </footer>
    </aside>
  )
}

function Row({ token, value, changed, onChange, onReset }) {
  const num =
    token.kind === 'range' ? parseFloat(value) : 0

  return (
    <div className={`dpanel__row${changed ? ' is-changed' : ''}`}>
      <label className="dpanel__label" title={token.name}>
        <span className="dpanel__name">{token.label}</span>
        {changed && (
          <button
            type="button"
            className="dpanel__revert"
            onClick={onReset}
            title="Reset to default"
          >
            ↺
          </button>
        )}
      </label>

      {token.kind === 'color' ? (
        <div className="dpanel__color">
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            aria-label={token.label}
          />
          <input
            type="text"
            className="dpanel__text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      ) : token.kind === 'range' ? (
        <div className="dpanel__range">
          <input
            type="range"
            min={token.min}
            max={token.max}
            step={token.step}
            value={Number.isFinite(num) ? num : 0}
            onChange={(e) => onChange(e.target.value + (token.unit || ''))}
          />
          <span className="dpanel__val">{value}</span>
        </div>
      ) : (
        <input
          type="text"
          className="dpanel__text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      )}

      {token.note && <p className="dpanel__note">{token.note}</p>}
    </div>
  )
}
