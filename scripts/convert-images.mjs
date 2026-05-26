#!/usr/bin/env node
// One-shot PNG/JPEG → WebP conversion for /public. Generates a .webp
// next to each oversized source image and rewrites references in the
// source tree (src/, index.html). Originals are kept on disk so a git
// diff is easy to read; delete them by hand once you're happy.
//
// Run:
//   node scripts/convert-images.mjs
//   npm run convert:images

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, relative, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC_DIR = join(ROOT, 'public')

const THRESHOLD = 200 * 1024 // convert anything ≥ 200 KB
const QUALITY = 82
const ALPHA_QUALITY = 90
const SRC_DIRS = [join(ROOT, 'src')]
const SRC_FILES_EXTRA = [join(ROOT, 'index.html')]
const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json'])
const SRC_EXT = new Set(['.png', '.jpg', '.jpeg'])

async function walk(dir, filter) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full, filter)))
    else if (filter(full)) out.push(full)
  }
  return out
}

const fmt = (b) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`

// ---- Step 1: find candidate images ----
const all = await walk(PUBLIC_DIR, (p) => SRC_EXT.has(extname(p).toLowerCase()))
const candidates = []
for (const p of all) {
  const s = await stat(p)
  if (s.size >= THRESHOLD) candidates.push({ path: p, size: s.size })
}
candidates.sort((a, b) => b.size - a.size)

console.log(`\nConverting ${candidates.length} oversized images to WebP (≥ ${fmt(THRESHOLD)})...\n`)

// ---- Step 2: convert ----
let totalBefore = 0
let totalAfter = 0
const renamed = [] // { fromRel, toRel } — paths relative to /public, percent-encoded for URL match
for (const c of candidates) {
  const webpPath = c.path.replace(/\.(png|jpe?g)$/i, '.webp')
  try {
    await sharp(c.path)
      .webp({ quality: QUALITY, alphaQuality: ALPHA_QUALITY, effort: 5 })
      .toFile(webpPath)
    const afterStat = await stat(webpPath)
    totalBefore += c.size
    totalAfter += afterStat.size

    const fromPublic = '/' + relative(PUBLIC_DIR, c.path).split('\\').join('/')
    const toPublic = '/' + relative(PUBLIC_DIR, webpPath).split('\\').join('/')
    renamed.push({ from: fromPublic, to: toPublic })

    const pct = Math.round((1 - afterStat.size / c.size) * 100)
    console.log(
      `  ${fmt(c.size).padStart(8)} → ${fmt(afterStat.size).padEnd(8)} (-${pct
        .toString()
        .padStart(2)}%)  ${relative(ROOT, c.path)}`,
    )
  } catch (err) {
    console.error(`  ! failed: ${relative(ROOT, c.path)} — ${err.message}`)
  }
}

console.log(
  `\nTotal: ${fmt(totalBefore)} → ${fmt(totalAfter)} (-${Math.round(
    (1 - totalAfter / totalBefore) * 100,
  )}%)\n`,
)

// ---- Step 3: rewrite references in source code ----
// We match both raw paths (`/Playground/Card 1.png`) and percent-encoded
// paths (`/Playground/Card%201.png`) since both forms appear in data.js
// and JSX.
const codeFiles = []
for (const d of SRC_DIRS) {
  codeFiles.push(...(await walk(d, (p) => CODE_EXT.has(extname(p).toLowerCase()))))
}
codeFiles.push(...SRC_FILES_EXTRA)

const variants = (s) => [s, encodeURI(s), s.replaceAll(' ', '%20')]
const dedup = (arr) => [...new Set(arr)]

let edited = 0
for (const file of codeFiles) {
  let txt
  try {
    txt = await readFile(file, 'utf8')
  } catch {
    continue
  }
  let next = txt
  for (const r of renamed) {
    const fromForms = dedup(variants(r.from))
    const toForms = dedup(variants(r.to))
    // Replace each from-form with its same-encoding to-form.
    fromForms.forEach((f, i) => {
      const to = toForms[i] || r.to
      if (next.includes(f)) next = next.split(f).join(to)
    })
  }
  if (next !== txt) {
    await writeFile(file, next)
    edited += 1
    console.log(`  rewrote refs in ${relative(ROOT, file)}`)
  }
}

console.log(`\nUpdated ${edited} source file(s).`)
console.log(
  `\nOriginals are still on disk — review the diff, then \`git rm\` the .png/.jpg files once you're happy.\n`,
)
