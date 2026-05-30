import puppeteer from 'puppeteer-core'
const CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await puppeteer.launch({ executablePath: CH, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
const errs=[]; page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4321/about', { waitUntil: 'networkidle0' })
await new Promise(r=>setTimeout(r,500))

// 1) all 7 real images loaded (incl. Kaduna 7th)
const imgs = await page.evaluate(() => {
  const real = [...document.querySelectorAll('.sr__photo:not(.sr__photo--dupe) .sr__photo-img')]
  return real.map(i => ({ ok: i.naturalWidth>0, src: i.currentSrc.split('/').pop() }))
})
console.log('IMAGES LOADED:', JSON.stringify(imgs))

// 2) auto-scroll: transform changes over time
const tx = () => page.evaluate(()=> new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.sr__track')).transform).m41)
const a = await tx(); await new Promise(r=>setTimeout(r,700)); const b = await tx()
console.log('AUTO-SCROLL:', {a:Math.round(a), b:Math.round(b), moving: Math.round(a)!==Math.round(b)})

// 3) drag: pointer down + move left, transform should follow
const box = await page.evaluate(()=>{const r=document.querySelector('.sr__track').getBoundingClientRect();return{x:r.x+120,y:r.y+r.height/2}})
await page.mouse.move(box.x, box.y)
await page.mouse.down()
const beforeDrag = await tx()
await page.mouse.move(box.x-80, box.y, {steps:6})
const afterDrag = await tx()
await page.mouse.up()
console.log('DRAG:', {beforeDrag:Math.round(beforeDrag), afterDrag:Math.round(afterDrag), delta: Math.round(afterDrag-beforeDrag)})
console.log('ERRORS:', errs.length?JSON.stringify(errs):'none')

// desktop sanity
const p2 = await browser.newPage(); await p2.setViewport({width:1440,height:900})
await p2.goto('http://localhost:4321/about',{waitUntil:'networkidle0'})
const dtx = await p2.evaluate(()=> document.querySelector('.sr__track').style.transform || '(none)')
const drow = await p2.evaluate(()=> new Set([...document.querySelectorAll('.sr__photo:not(.sr__photo--dupe)')].map(c=>Math.round(c.getBoundingClientRect().top))).size)
console.log('DESKTOP:', {trackInlineTransform: dtx, rowSpread: drow})
await browser.close()
