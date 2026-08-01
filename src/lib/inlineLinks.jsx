// Turns `[label](https://…)` in a plain string into real anchors, so body copy
// can carry a link while still living in the data files as editable text rather
// than as JSX.
//
// Deliberately only this one pattern — it is not a markdown renderer, and the
// moment it needs to be, reach for one instead of growing this.

import { Fragment } from 'react'

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

// `wrap` (optional) gets each anchor and its href and may return something else
// to render in its place — how a link picks up decoration without this module
// having to know what decoration is.
export function withLinks(text, wrap) {
  if (typeof text !== 'string' || !text.includes('](')) return text

  const out = []
  let last = 0
  let m
  LINK.lastIndex = 0
  while ((m = LINK.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const [, label, href] = m
    // Anything off-site opens in a new tab; noreferrer as well as noopener so we
    // aren't leaking the referrer on someone else's behalf.
    const external = /^https?:\/\//.test(href)
    const anchor = (
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : null)}>
        {label}
      </a>
    )
    // Keyed here rather than on the anchor, so a wrapper doesn't have to know to
    // carry the key through.
    out.push(
      <Fragment key={`${href}-${m.index}`}>{wrap ? wrap(anchor, href) : anchor}</Fragment>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
