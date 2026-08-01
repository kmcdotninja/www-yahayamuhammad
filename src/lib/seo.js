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

// About titles follow `Name / Section`, in the spirit of pudding.studio
// ("Pudding Studio / Our Kitchen"): short and human is what someone actually
// reads in a tab or a result. The descriptions stay descriptive, though — that
// line is the search snippet, and it has to say what the page is to someone who
// has never heard of the site. Home and playground keep the older keyword-led
// titles.
export const ROUTE_SEO = {
  '/': {
    title: 'Yahaya Muhammad — Product Designer & Engineer | Portfolio',
    description:
      'Yahaya Muhammad is a product designer and engineer based in Nigeria, currently designing and building at Kutuby. See selected case studies in healthcare, education and fintech.',
  },
  '/about': {
    title: 'Yahaya Muhammad / About',
    description:
      'Yahaya Muhammad: a product designer and engineer from Kaduna, Nigeria. A timeline of the work, the trips, and the years in between.',
  },
  // The previous About layout, parked for reference — kept out of the sitemap so
  // it isn't indexed as duplicate content alongside the live /about.
  '/about-classic': {
    title: 'Yahaya Muhammad / About',
    description:
      'Yahaya Muhammad: a product designer and engineer from Kaduna, Nigeria. From civil engineering to design — building products that connect with people.',
  },
  // Original About page, parked for later use — kept out of the sitemap so it
  // isn't indexed as duplicate content alongside the live /about.
  '/about-old': {
    title: 'Yahaya Muhammad / About',
    description:
      'Yahaya Muhammad: a product designer and engineer from Kaduna, Nigeria. From civil engineering to design — building products that connect with people.',
  },
  // Alias of /about, kept so existing links survive. Out of the sitemap so the
  // two URLs aren't indexed as duplicates.
  '/about-timeline': {
    title: 'Yahaya Muhammad / About',
    description:
      'Yahaya Muhammad: a product designer and engineer from Kaduna, Nigeria. A timeline of the work, the trips, and the years in between.',
  },
  '/playground': {
    title: 'Playground — Yahaya Muhammad (Product Designer & Engineer)',
    description:
      'A loose archive of small experiments by Yahaya Muhammad — type tests, colour studies, posters, and screens that never shipped.',
  },
  '/404': {
    title: 'Page not found — Yahaya Muhammad',
    description:
      'The page you’re looking for has wandered off. Head back to Yahaya Muhammad’s portfolio.',
  },
}
