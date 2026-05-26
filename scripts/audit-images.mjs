#!/usr/bin/env node
// Read-only audit: lists every image in /public above a size threshold so
// you can see at a glance what's bloating the page weight. Run with:
//   node scripts/audit-images.mjs
// or:
//   npm run audit:images

import { readdir, stat } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC_DIR = join(ROOT, 'public')
const WARN_BYTES = 500 * 1024 // 500 KB — anything above this is worth converting
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else if (IMG_EXT.has(extname(e.name).toLowerCase())) {
      const s = await stat(full)
      out.push({ path: full, size: s.size })
    }
  }
  return out
}

const fmt = (b) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`

const files = await walk(PUBLIC_DIR)
files.sort((a, b) => b.size - a.size)

const heavy = files.filter((f) => f.size >= WARN_BYTES)
const total = files.reduce((sum, f) => sum + f.size, 0)
const heavyTotal = heavy.reduce((sum, f) => sum + f.size, 0)

console.log(`\nScanned ${files.length} images in /public — total ${fmt(total)}\n`)
console.log(`Files at or above ${fmt(WARN_BYTES)} (${heavy.length} of ${files.length}, ${fmt(heavyTotal)} total):\n`)
for (const f of heavy) {
  console.log(`  ${fmt(f.size).padStart(8)}  ${relative(ROOT, f.path)}`)
}
if (!heavy.length) console.log('  (none — nice)\n')
console.log()
