// Vite dev/preview plugin: a tiny endpoint the Design Panel POSTs to so its
// "Save" button writes token changes straight into the source files, which then
// show up in `git status`. Dev-only (no server = no endpoint in production).
//
//   POST /__design-panel/save
//   { tokens: [ { name, value, themed, theme } ] }
//
// Non-themed tokens patch src/index.css (the first, base declaration).
// Themed colours patch the DARK / LIGHT maps in src/hooks/useTheme.js.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const INDEX_CSS = 'src/index.css'
const THEME_JS = 'src/hooks/useTheme.js'

const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function patchIndexCss(root, name, value) {
  const file = resolve(root, INDEX_CSS)
  let css = readFileSync(file, 'utf8')
  // Replace only the FIRST (base :root) declaration, keeping any trailing
  // comment; the responsive --fs-hero overrides in @media blocks are left alone.
  const re = new RegExp('(' + escapeReg(name) + '\\s*:\\s*)[^;]*(;)')
  if (!re.test(css)) return false
  css = css.replace(re, (_m, a, b) => a + value + b)
  writeFileSync(file, css)
  return true
}

function patchThemeJs(root, name, value, theme) {
  const file = resolve(root, THEME_JS)
  let js = readFileSync(file, 'utf8')
  const block = theme === 'light' ? 'LIGHT' : 'DARK'
  const blockRe = new RegExp('(const ' + block + ' = \\{)([\\s\\S]*?)(\\n\\})')
  const m = js.match(blockRe)
  if (!m) return false
  const entryRe = new RegExp("('" + escapeReg(name) + "'\\s*:\\s*')[^']*(')")
  if (!entryRe.test(m[2])) return false
  const body = m[2].replace(entryRe, (_x, a, b) => a + value + b)
  js = js.slice(0, m.index) + m[1] + body + m[3] + js.slice(m.index + m[0].length)
  writeFileSync(file, js)
  return true
}

function handleSave(root, body) {
  const tokens = Array.isArray(body?.tokens) ? body.tokens : []
  return tokens.map((t) => {
    let ok = false
    try {
      ok = t.themed
        ? patchThemeJs(root, t.name, t.value, t.theme)
        : patchIndexCss(root, t.name, t.value)
    } catch {
      ok = false
    }
    return { name: t.name, theme: t.theme || null, ok }
  })
}

export default function designPanelSave() {
  const middleware = (server) => {
    const root = server.config.root
    server.middlewares.use('/__design-panel/save', (req, res, next) => {
      if (req.method !== 'POST') return next()
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const results = handleSave(root, JSON.parse(raw || '{}'))
          res.end(JSON.stringify({ ok: results.every((r) => r.ok), results }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
    })
  }
  return {
    name: 'design-panel-save',
    configureServer: middleware,
    configurePreviewServer: middleware,
  }
}
