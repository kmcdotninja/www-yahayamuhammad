import { useEffect } from 'react'
import { usePathname } from '../lib/router.js'
import { flareElement, flareImage } from '../lib/flare.js'

// The photos and plain clips that get the scroll flare (ported from Arnab
// Studio, see lib/flare.js): the project tiles, and the About page's portraits
// and timeline shots. Tiles that aren't a single picture (Kiko's phone / iPad
// mockups and its animated cards) get the same flare on the whole tile instead
// (flareElement). Stickers and icons are left alone, as is anything marked
// data-flare="off".
const MEDIA = 'img, video'
const TARGETS = [
  '.project__tile > picture > img',
  '.project__tile > video',
  '.ab2__portrait-img',
  '.tl__shot-img',
].join(', ')
// A project tile with no plain photo or clip of its own: a mockup or a built card.
const TILE = '.project__tile'
const builtTile = (el) =>
  el.matches(TILE) && !el.querySelector(':scope > picture > img, :scope > video') && !el.closest('[data-flare="off"]')
const wanted = (img) =>
  img.matches(TARGETS) && !img.closest('[data-flare="off"]') && !/\.svg(\?|$)/.test(img.getAttribute('src') || '')

// Hands every photo on the current page to the scroll flare, including ones
// that appear later, and gives them all back when the page changes.
export default function ScrollFlare() {
  const pathname = usePathname()

  useEffect(() => {
    const release = new Map()
    const add = (img) => {
      if (!release.has(img) && wanted(img)) release.set(img, flareImage(img))
    }
    const addTile = (el) => {
      if (!release.has(el) && builtTile(el)) release.set(el, flareElement(el))
    }
    const drop = (img) => {
      release.get(img)?.()
      release.delete(img)
    }

    const root = document.querySelector('.page')
    root?.querySelectorAll(MEDIA).forEach(add)
    root?.querySelectorAll(TILE).forEach(addTile)

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.matches(MEDIA)) add(node)
          else node.querySelectorAll?.(MEDIA).forEach(add)
          if (node.matches(TILE)) addTile(node)
          else node.querySelectorAll?.(TILE).forEach(addTile)
        }
        for (const node of m.removedNodes) {
          if (node.nodeType !== 1) continue
          if (node.matches(MEDIA) || node.matches(TILE)) drop(node)
          else node.querySelectorAll?.(`${MEDIA}, ${TILE}`).forEach(drop)
        }
      }
    })
    if (root) observer.observe(root, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      release.forEach((fn) => fn())
    }
  }, [pathname])

  return null
}
