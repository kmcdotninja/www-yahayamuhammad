import puppeteer from 'puppeteer-core'
const CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await puppeteer.launch({ executablePath: CH, headless: 'new', args: ['--no-sandbox'] })

// ---- DESKTOP ----
let page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
const errs = []
page.on('pageerror', e => errs.push(e.message))
await page.goto('http://localhost:4320/about', { waitUntil: 'networkidle0' })
const d = await page.evaluate(() => {
  const real = [...document.querySelectorAll('.sr__photo:not(.sr__photo--dupe)')]
  const dupeVisible = [...document.querySelectorAll('.sr__photo--dupe')].filter(e=>getComputedStyle(e).display!=='none').length
  const tops = new Set(real.map(c=>Math.round(c.getBoundingClientRect().top)))
  const gal = document.querySelector('.sr__gallery').getBoundingClientRect()
  const sign = document.querySelector('.sr__sign').getBoundingClientRect()
  return { realVisible: real.filter(e=>e.offsetParent!==null||getComputedStyle(e).display!=='none').length, dupeVisible, rowTops:[...tops], galleryAboveSignature: gal.top < sign.top }
})
console.log('DESKTOP:', JSON.stringify(d))

// ---- MOBILE ----
page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, isMobile: true })
await page.goto('http://localhost:4320/about', { waitUntil: 'networkidle0' })
const m1 = await page.evaluate(() => {
  const track = document.querySelector('.sr__track')
  const gal = document.querySelector('.sr__gallery').getBoundingClientRect()
  const sign = document.querySelector('.sr__sign').getBoundingClientRect()
  const para = document.querySelector('.sr__paragraphs').getBoundingClientRect()
  const dupeShown = getComputedStyle(document.querySelector('.sr__photo--dupe')).display !== 'none'
  return {
    animName: getComputedStyle(track).animationName,
    overflow: getComputedStyle(document.querySelector('.sr__gallery')).overflow,
    dupeShown,
    galleryBelowSignature: gal.top > sign.bottom - 5,
    orderOK: para.top < sign.top && sign.top < gal.top,
  }
})
const t0 = await page.evaluate(()=> new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.sr__track')).transform).m41)
await new Promise(r=>setTimeout(r,1200))
const t1 = await page.evaluate(()=> new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.sr__track')).transform).m41)
console.log('MOBILE:', JSON.stringify({...m1, translateMoved: Math.round(t0)!==Math.round(t1), t0:Math.round(t0), t1:Math.round(t1)}))
console.log('ERRORS:', errs.length?JSON.stringify(errs):'none')
await browser.close()
