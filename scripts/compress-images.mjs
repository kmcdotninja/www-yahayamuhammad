#!/usr/bin/env node
// Resize + re-encode oversized images in /public. Anything wider than
// MAX_WIDTH is downsized, then re-encoded at our target quality. Existing
// AVIF / WebP / PNG variants are produced side-by-side so components can
// pick the smallest one the browser supports via <picture>.
//
// Run:
//   node scripts/compress-images.mjs
//   npm run compress:images
//
// Designed to be re-runnable: every output is content-hashed in size, so
// running twice produces the same files and won't pile up cruft.

import { readdir, stat, mkdir, copyFile, rm } from 'node:fs/promises'
import { join, relative, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC_DIR = join(ROOT, 'public')

// Hero/drawer images rarely render above ~1600px on desktop and 900px on
// mobile. 1800px is a comfortable headroom for 2x retina at 900px.
const MAX_WIDTH = 1800
const WEBP_QUALITY = 78
const WEBP_ALPHA_QUALITY = 88
const AVIF_QUALITY = 55
const AVIF_EFFORT = 6 // 0–9; 6 is the sweet spot between speed and size
const PNG_QUALITY = 78

// Anything below this on disk is left alone — not worth the cost of
// re-encoding tiny icons.
const SKIP_BELOW = 60 * 1024

const TARGET_DIRS = [
  join(PUBLIC_DIR, 'projects'),
  join(PUBLIC_DIR, 'images'),
  join(PUBLIC_DIR, 'about'),
]

async function walk(dir) {
  let out = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

const fmt = (b) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`

// Re-encode `src` as `out` using the provided pipeline factory. Only
// writes if the new file is meaningfully smaller; otherwise we keep the
// original (some files are already at the floor and re-encoding pads them).
async function tryEncode(src, out, build) {
  const before = (await stat(src)).size
  const tmp = `${out}.tmp`
  try {
    await build().toFile(tmp)
    const after = (await stat(tmp)).size
    // If the existing src was already smaller than what sharp produces,
    // keep src for that format (only relevant when src === out's format).
    if (src === out && after >= before * 0.97) {
      await rm(tmp)
      return { skipped: true, before, after }
    }
    await copyFile(tmp, out)
    await rm(tmp)
    return { skipped: false, before, after }
  } catch (err) {
    try { await rm(tmp) } catch {}
    throw err
  }
}

async function process(src) {
  const ext = extname(src).toLowerCase()
  const isRaster = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)
  if (!isRaster) return null

  const size = (await stat(src)).size
  if (size < SKIP_BELOW) return null

  const meta = await sharp(src).metadata()
  const width = meta.width || 0
  const needsResize = width > MAX_WIDTH
  const targetWidth = needsResize ? MAX_WIDTH : width

  const dir = dirname(src)
  const name = basename(src, ext)
  const webpOut = join(dir, `${name}.webp`)
  const avifOut = join(dir, `${name}.avif`)

  const baseTransform = () => {
    let pipe = sharp(src, { failOn: 'none' }).rotate()
    if (needsResize) pipe = pipe.resize({ width: targetWidth, withoutEnlargement: true })
    return pipe
  }

  // Always emit WebP (matches the path components reference).
  const webpResult = await tryEncode(src, webpOut, () =>
    baseTransform().webp({
      quality: WEBP_QUALITY,
      alphaQuality: WEBP_ALPHA_QUALITY,
      effort: 5,
    }),
  )

  // AVIF alongside — components opt into it via <picture>.
  const avifResult = await tryEncode(src, avifOut, () =>
    baseTransform().avif({
      quality: AVIF_QUALITY,
      effort: AVIF_EFFORT,
    }),
  )

  // For PNG sources, regenerate a smaller PNG too (palette quantisation +
  // resize). Keeps the original src path working for any reference that
  // doesn't go through <picture>.
  let pngResult = null
  if (ext === '.png') {
    pngResult = await tryEncode(src, src, () =>
      baseTransform().png({
        quality: PNG_QUALITY,
        compressionLevel: 9,
        effort: 10,
        palette: true,
      }),
    )
  }

  return { src, width, needsResize, targetWidth, webpResult, avifResult, pngResult }
}

const files = []
for (const d of TARGET_DIRS) files.push(...(await walk(d)))

let totalBefore = 0
let totalAfter = 0
let touched = 0

for (const src of files) {
  const r = await process(src)
  if (!r) continue
  const ext = extname(src).toLowerCase()
  const before = (await stat(src)).size
  const formats = []
  let afterAccum = 0

  if (ext === '.webp' || ext === '.jpg' || ext === '.jpeg') {
    formats.push({ kind: 'webp', after: r.webpResult.after })
    afterAccum = r.webpResult.after
  } else if (ext === '.png') {
    afterAccum = r.pngResult?.after || before
    formats.push({ kind: 'png', after: afterAccum })
  }
  formats.push({ kind: 'avif', after: r.avifResult.after })

  totalBefore += before
  totalAfter += afterAccum
  touched += 1
  const flag = r.needsResize ? `→ ${r.targetWidth}px` : 'same dim'
  const fmts = formats.map((f) => `${f.kind} ${fmt(f.after)}`).join(' · ')
  console.log(`  ${relative(ROOT, src).padEnd(50)} ${flag.padEnd(11)} ${fmts}`)
}

console.log(
  `\nProcessed ${touched} file(s).  primary src: ${fmt(totalBefore)} → ${fmt(totalAfter)} (-${Math.round((1 - totalAfter / totalBefore) * 100) || 0}%)\n`,
)
