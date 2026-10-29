// The guide: DeFleet's Robot as Yahaya's personal assistant, alive in the bottom-right corner, travelling the site with
// you. Its eyes follow the pointer; each click plays the next move. When you go to another page it dashes after you
// (its speed run, with its trail) and welcomes you there; as each section of a page comes into view it turns to it and
// says something about it. The 3D engine is DeFleet's own (robot3d.js and its moves, from ~/Desktop/Defleet v1).
import { useEffect, useRef, useState } from 'react'
import { attachRobot } from './robot3d.js'
import { trickLength } from './moves.js'
import './guide.css'

// the moves a click plays, in turn, with the face each pulls
const SEQ = [['backflip', 'exicited'], ['herolanding', 'determined'], ['webswing', 'determined'], ['dance', 'cool'],
  ['flying', 'determined'], ['spinjump', 'exicited'], ['portal', 'determined'], ['celebrate', 'happy']]
// what it says on each page: a welcome as you arrive, then a line for each section as it comes into view (found by its
// selector, or a project by its title, so the pages need nothing added), typed out, with somewhere to go next
const MAIL = ['Book a chat', 'mailto:yahayabinmuhammad@gmail.com']
const PAGES = {
  '/': {
    hello: { say: 'Hi! I’m Yahaya’s assistant. He’s busy designing, so I’ll show you around.', face: 'welcoming' },
    spots: [
      { project: 'KIKO', say: 'Ooh, Kiko! The boss made this so little ones can learn Arabic letters and actually have fun doing it.', link: ['Try Kiko', 'https://trykiko.app'], face: 'happy' },
      { project: 'KUTUBY', say: 'Kutuby is where he spends his days, turning Islamic studies into play. I’m very proud of him.', link: ['Visit Kutuby', 'https://kutuby.com'], face: 'excited' },
      { project: 'REDNOXX', say: 'This one’s a whole hospital platform on 36 components. I keep his calendar, he does this.', link: ['Peek inside', 'https://rednoxx-design-system.vercel.app/design'], face: 'amazed' },
      { project: 'COMING SOON', say: 'Psst, I’m not supposed to talk about this one yet. Crypto payments, that’s all you get!', face: 'winking' },
      { sel: '.footer-art', say: 'Liked the tour? I can pencil you in. Yahaya would love to hear from you.', link: MAIL, face: 'loving' },
    ],
  },
  '/about': {
    hello: { say: 'Welcome to his story! He’s a bit shy, so I’ll narrate.', face: 'welcoming' },
    spots: [
      { sel: '.ab2__portraits', say: 'That’s the boss! Better looking in person, I’m told.', face: 'happy' },
      { sel: '#yoda-box', say: 'Fun fact, he trained as a civil engineer. YodaBox is where design got him.', face: 'curious' },
      { sel: '#healthcare', say: 'His parents wanted a doctor. He designs for doctors instead, close enough!', face: 'laughing' },
      { sel: '#kutuby', say: 'Kutuby, round two of designing for kids. He gets a bit soft about this one.', face: 'loving' },
      { sel: '#umrah', say: 'Madina, then Makkah. Two weeks offline, and he still talks about it.', face: 'grateful' },
      { sel: '#singapore', say: 'Singapore! I kicked these photos at you earlier, sorry about that.', face: 'embarrassed' },
      { sel: '.ab2__approach', say: 'This is how he works. I just keep the snacks stocked.', face: 'proud' },
      { sel: '.footer-art', say: 'Want to work with him? I’ll pass it straight on.', link: MAIL, face: 'loving' },
    ],
  },
}
PAGES['/about-timeline'] = PAGES['/about']
const pageOf = p => PAGES[p] || PAGES['/']
const here = () => location.pathname
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function Figure({ variant }) {
  const cv = useRef(null), [failed, setFailed] = useState(false)
  useEffect(() => { try { return attachRobot(cv.current, { variant }) } catch (e) { console.warn('guide: no 3D here', e); queueMicrotask(() => setFailed(true)); return undefined } }, [variant])   // (no WebGL: nothing, rather than an empty box)
  if (failed) return null
  return <span className="bfig"><span className="bshape b3dbox"><canvas ref={cv} className="b3d" aria-hidden="true" /></span></span>
}

export default function Guide() {
  const [face, setFace] = useState('neutral'), fig = useRef(null), n = useRef(0), t = useRef(0)
  const [bubble, setBubble] = useState(null), [shown, setShown] = useState(0), [busy, setBusy] = useState(false), gaze = useRef(null)
  const say = b => { setShown(0); setBubble(b) }   // a new line starts untyped
  const [stage, setStage] = useState('wait'), [hello, setHello] = useState(false)   // its arrival: wait (loading), drop or fade, then in
  // its eyes (and a little of its head) on the pointer, eased
  useEffect(() => {
    const el = fig.current; if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0
    const move = e => { if (gaze.current) return; const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * .35), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 700) * .45; tx = dx / d * k; ty = dy / d * k }
    const loop = () => { if (gaze.current) { tx = gaze.current[0]; ty = gaze.current[1] } x += (tx - x) * .1; y += (ty - y) * .1; el.style.setProperty('--ex', x.toFixed(3)); el.style.setProperty('--ey', y.toFixed(3)); raf = requestAnimationFrame(loop) }
    addEventListener('pointermove', move, { passive: true }); raf = requestAnimationFrame(loop)
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf) }
  }, [])
  useEffect(() => () => clearTimeout(t.current), [])
  // the page you're on (the site's own navigation: history, and its 'spa-navigate' event)
  const [path, setPath] = useState(here)
  useEffect(() => {
    const on = () => setPath(here())
    addEventListener('popstate', on); addEventListener('spa-navigate', on)
    return () => { removeEventListener('popstate', on); removeEventListener('spa-navigate', on) }
  }, [])
  // context: as a section comes into the middle of the screen it turns to it and says its line. A new page renders a
  // moment after you go to it (it loads on demand), so its sections are looked for until they're all there
  useEffect(() => {
    const spots = pageOf(path).spots, said = new Map(), seen = new Set()
    const find = sp => sp.sel ? document.querySelector(sp.sel)
      : [...document.querySelectorAll('article.project')].find(a => (a.innerText || '').trim().startsWith(sp.project))
    const io = new IntersectionObserver(es => es.forEach(e => {
      const i = +e.target.dataset.pfSpot
      if (e.isIntersecting) {
        if (performance.now() - (said.get(i) || -1e9) < 20000) return   // (not again straight away when scrolling back and forth)
        said.set(i, performance.now()); say({ ...spots[i], i })
      } else setBubble(b => (b && b.i === i ? null : b))
    }), { rootMargin: '-40% 0px -40% 0px' })
    let tries = 0
    const look = () => {
      spots.forEach((sp, i) => { const el = !seen.has(i) && find(sp); if (el) { seen.add(i); el.dataset.pfSpot = i; io.observe(el) } })
      if (seen.size < spots.length && ++tries < 40) lookT = setTimeout(look, 150)
    }
    let lookT = setTimeout(look, 0)
    return () => { io.disconnect(); clearTimeout(lookT) }
  }, [path])
  // a new page: it dashes after you (a speed run, its trail behind it), then welcomes you there
  const prev = useRef(path)
  useEffect(() => {
    if (prev.current === path) return undefined
    prev.current = path
    const el = fig.current, ts = []
    if (!el || stage !== 'in') return undefined
    setBubble(null)
    const welcome = () => ts.push(setTimeout(() => say({ ...pageOf(path).hello, i: -1 }), 300))
    if (still() || el.dataset.trick) welcome()
    else {
      clearTimeout(t.current); el.dataset.trick = 'speedrun'; setBusy(true); setFace('determined')
      ts.push(setTimeout(() => { delete el.dataset.trick; setBusy(false); setFace('neutral'); welcome() }, (trickLength('speedrun') || 1.5) * 1000 + 50))
    }
    return () => ts.forEach(clearTimeout)
  }, [path])   // eslint-disable-line react-hooks/exhaustive-deps
  // its arrival, once its body has drawn and the loader (if any) has lifted: it fades into its corner as the stickers
  // fall, then says hello (unless a project's line got there first)
  useEffect(() => {
    const ts = []
    const poll = setInterval(() => {
      const c = fig.current?.querySelector('canvas'); if (!c || !c.width) return
      const px = c.getContext('2d').getImageData(c.width >> 1, Math.round(c.height * .55), 1, 1).data
      if (!px[3]) return   // (nothing drawn yet: its model is still loading)
      clearInterval(poll)
      ;(window.__pfLoader || Promise.resolve()).then(() => {
        setStage('fade'); ts.push(setTimeout(() => { setStage('in'); setHello(true) }, 500))
      })
    }, 120)
    return () => { clearInterval(poll); ts.forEach(clearTimeout) }
  }, [])
  useEffect(() => {
    if (!hello) return undefined
    const t0 = setTimeout(() => setBubble(b => { if (b) return b; setShown(0); return { ...pageOf(here()).hello, i: -1 } }), 400)
    return () => clearTimeout(t0)
  }, [hello])
  // the line types itself out while it looks toward the page; then it lingers a few seconds and goes
  useEffect(() => {
    gaze.current = bubble ? [-.4, -.05] : null
    if (!bubble) return undefined
    const n0 = still() ? bubble.say.length : 0
    const id = setInterval(() => setShown(k => Math.max(k, n0) + 1), 28)
    const out = setTimeout(() => setBubble(b => (b === bubble ? null : b)), bubble.say.length * 28 + 6000)
    return () => { clearInterval(id); clearTimeout(out) }
  }, [bubble])
  const typed = bubble ? bubble.say.slice(0, still() ? bubble.say.length : shown) : ''
  const play = () => {
    const el = fig.current; if (!el || el.dataset.trick || stage !== 'in') return
    const [id, f] = SEQ[n.current++ % SEQ.length]
    setBubble(null); setBusy(true); setFace(f); el.dataset.trick = id
    t.current = setTimeout(() => { delete el.dataset.trick; setBusy(false); setFace('neutral') }, (trickLength(id) || 1) * 1000 + 50)
  }
  return (
    <div className={`pf-guide ${stage}`}>
      <span className="bwrap pf-guide-stage" data-st="idle">
        <span className="buddy" ref={fig} data-face={bubble && !busy ? bubble.face : face}><Figure variant="robot" /></span>
      </span>
      <button type="button" className="pf-guide-hit" aria-label="Play a move" onClick={play} />
      {bubble && <div className="pf-guide-say" role="status" aria-live="polite">
        <p>{typed}<span className="pf-guide-caret" aria-hidden="true" /></p>
        {bubble.link && typed.length >= bubble.say.length && <a href={bubble.link[1]} target={bubble.link[1].startsWith('http') ? '_blank' : undefined} rel="noreferrer">{bubble.link[0]} ↗</a>}
      </div>}
    </div>
  )
}
