// Turns `[label](https://…)` in a plain string into real anchors, so body copy
// can carry a link while still living in the data files as editable text rather
// than as JSX.
//
// Deliberately only this one pattern — it is not a markdown renderer, and the
// moment it needs to be, reach for one instead of growing this.

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

export function withLinks(text) {
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
    out.push(
      <a
        key={`${href}-${m.index}`}
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : null)}
      >
        {label}
      </a>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
