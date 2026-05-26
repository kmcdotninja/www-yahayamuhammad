const SITE = 'https://yahayamuhammad.com'

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    const [key, val] = selector.replace(/[[\]"]/g, '').split('=')
    el.setAttribute(key, val)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function applySEO({ title, description, path }) {
  const url = `${SITE}${path}`
  document.title = title
  setMeta('meta[name="description"]', 'content', description)
  setLink('canonical', url)
  setMeta('meta[property="og:title"]', 'content', title)
  setMeta('meta[property="og:description"]', 'content', description)
  setMeta('meta[property="og:url"]', 'content', url)
  setMeta('meta[name="twitter:title"]', 'content', title)
  setMeta('meta[name="twitter:description"]', 'content', description)
  setMeta('meta[name="twitter:url"]', 'content', url)
}

export const ROUTE_SEO = {
  '/': {
    title: 'Yahaya Muhammad — Product Designer & UX Designer | Portfolio',
    description:
      'Yahaya Muhammad is a product designer and UX designer based in Nigeria, currently designing at Kutuby. See selected case studies in healthcare, education and brand.',
  },
  '/about': {
    title: 'About Yahaya Muhammad — Product Designer & UX Designer in Nigeria',
    description:
      'About Yahaya Muhammad: a product designer and UX designer from Kaduna, Nigeria. From civil engineering to design — building products that connect with people.',
  },
  '/playground': {
    title: 'Playground — Yahaya Muhammad (Product Designer & UX Designer)',
    description:
      'A loose archive of small experiments by Yahaya Muhammad — type tests, colour studies, posters, and screens that never shipped.',
  },
  '/404': {
    title: 'Page not found — Yahaya Muhammad',
    description:
      'The page you’re looking for has wandered off. Head back to Yahaya Muhammad’s portfolio.',
  },
}
