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
    title: 'Product Design Engineer — Yahaya Muhammad',
    description:
      'Product design engineer who designs, builds and ships products from canvas to code. Based in Nigeria — case studies across edtech, fintech and developer tools.',
  },
  '/about': {
    title: 'About Yahaya Muhammad — Product Design Engineer in Nigeria',
    description:
      'Yahaya Muhammad is a product design engineer in Kaduna, Nigeria — from civil engineering to designing, building and shipping products from canvas to code.',
  },
  '/playground': {
    title: 'Playground — Yahaya Muhammad, Product Design Engineer',
    description:
      'A loose archive of experiments by Yahaya Muhammad, product design engineer — type tests, colour studies, posters and interactions that never shipped.',
  },
  '/404': {
    title: 'Page not found — Yahaya Muhammad',
    description:
      'The page you’re looking for has wandered off. Head back to Yahaya Muhammad’s portfolio.',
  },
}
