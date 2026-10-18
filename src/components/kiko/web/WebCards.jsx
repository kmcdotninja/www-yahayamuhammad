// Five of the Kiko website's living cards (Kiko: src/web/Landing.jsx + landing.css), as snippet tiles for the grid.
// The code is the website's, copied as it is; only what it takes to stand alone here changed: the cards carry no
// sentence (the art alone, each card cut so the art sits where the sentence was), the clocks (useTick) only tick while
// their card is on screen, and every rule lives under .kweb (web.css).
//   <WebTrace/>    the letters card: a phone, a finger tracing Baa (TracePhone)
//   <WebPop/>      the games card: a round of Pop over the Palestine strip (PopRound)
//   <WebCount/>    the numbers card: the dial turning ١ to ٩ (Count)
//   <WebStories/>  the stories card: the deck, one story swiped off at a time (SwipeDeck)
//   <WebRoll/>     the loop's first tile: ten letters rolling up (TraceRoll)
// Each takes the snippet props (caption, ratio: the card's CSS aspect-ratio). Still for anyone who's asked for less motion
import { useEffect, useRef, useState } from 'react';
import '../../../styles/kiko-fonts.css';
import { AR } from './arabic.js';
import { NUM } from './numbers.js';
import { fit } from './fit.js';   // the app's measure, cheap (fit.js)
import handUrl from './hand.svg';
import balloonSvg from './balloon.svg?raw';
import { CardSym, CARDS as SCARDS } from './st.jsx';
import { Strip, Palestine } from './hdn.jsx';   // the app's Home strip: Palestine with its two flags, Al-Aqsa Mosque at its middle
import './web.css';

// the letters and numbers as they're drawn in the app (arabic.js, numbers.js), never typed in a font
const Glyph = ({ e }) => <svg className="wgl" viewBox={fit(e[1], 124)} aria-hidden="true">{e[1].map((d, i) => <path key={i} d={d}/>)}</svg>;
const ar = n => AR.find(e => e[2] === n);

// the loop's living tiles: they move on their own (and hold still for anyone who's asked for less motion)
const calmNow = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// watch: the card; the clock ticks only while it's on screen (the portfolio's grid holds many tiles)
function useTick(ms, watch){
  const [n, setN] = useState(0);
  useEffect(() => {
    if (calmNow()) return undefined;
    let t = 0;
    const run = on => { clearInterval(t); if (on) t = setInterval(() => setN(v => v + 1), ms); };
    const el = watch?.current;
    if (!el) { run(true); return () => clearInterval(t); }
    const io = new IntersectionObserver(([e]) => run(e.isIntersecting));
    io.observe(el);
    return () => { io.disconnect(); clearInterval(t); };
  }, [ms]);
  return n;
}

// the letters card's phone, drawn rather than shot (as Phantom's): big and wide, cut by the card's foot, so what shows is
// the top of tracing: the app's top row, then Baa half traced in cyan, its dotted guide, the green dot and the hand
function TracePhone(){
  const svg = useRef(null), scr = useRef(null), hand = useRef(null), dot = useRef(null), dot2 = useRef(null), ink = useRef(null);
  const e = ar('Baa'), PART = 58;
  // the finger traces: the ink grows along the stroke with the green dot and the fingertip on its end, pressing in as it
  // touches down; a pause at the end, then it lifts and goes again. Still (half traced) for less motion, and only while
  // the card's on screen
  useEffect(() => {
    const p = ink.current; if (!p) return undefined;
    // measured once, not every frame (that was most of the page's work at rest): the stroke sampled at 241 points, and
    // where the letter's units fall on the screen (again whenever the card changes size)
    const L = p.getTotalLength(), N = 240, pts = Array.from({ length: N + 1 }, (_, i) => { const q = p.getPointAtLength(L * i / N); return [q.x, q.y]; });
    let map = null;
    const measure = () => { const m = svg.current.getScreenCTM(), b = scr.current.getBoundingClientRect(); if (m && b.width) map = { m, b }; };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(scr.current);
    const at = (k, press) => {
      const f = Math.max(0, Math.min(1, k)) * N, i = Math.min(N - 1, Math.floor(f)), u = f - i;
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
      for (const c of [dot.current, dot2.current]) { c.setAttribute('cx', x); c.setAttribute('cy', y); }
      p.style.strokeDasharray = `${k * 100} 200`;
      if (!map) return;
      const { m, b } = map, sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f;
      const h = hand.current; h.style.left = `${(sx - b.left) / b.width * 100}%`; h.style.top = `${(sy - b.top) / b.width * 100}cqw`;
      h.style.scale = String(press); h.style.opacity = String(Math.min(1, press * 6 - 5));
    };
    if (calmNow()) { at(PART / 100, 1); return () => ro.disconnect(); }
    const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    // one round, 4.6 s: the finger lands (0–0.4), traces (0.4–3.2), rests (3.2–4), lifts and slides back (4–4.6)
    const T = 4600, A = .1, B = .97;
    let raf = 0, t0 = 0, on = true;
    const frame = now => {
      if (!on) return; t0 ||= now; const t = (now - t0) % T;
      let k, press;
      if (t < 400) { k = A; press = 1.12 - .12 * ease(t / 400); }
      else if (t < 3200) { k = A + (B - A) * ease((t - 400) / 2800); press = 1; }
      else if (t < 4000) { k = B; press = 1; }
      else { const u = ease((t - 4000) / 600); k = B - (B - A) * u; press = 1 + .12 * u; }
      at(k, press); raf = requestAnimationFrame(frame);
    };
    // on screen again: measure afresh (the page may have scrolled since; the card's place on screen is what counts)
    const io = new IntersectionObserver(([en]) => { on = en.isIntersecting; cancelAnimationFrame(raf); if (on) { measure(); t0 = 0; raf = requestAnimationFrame(frame); } });
    io.observe(scr.current); at(A, 1);
    return () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return <div className="mk-phone tp"><div className="mk-dev"><div className="mk-scr tp-scr" ref={scr}>
    <div className="mk-sb"><b>9:41</b><i className="isl"/><span className="ic"><svg viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
      <svg viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25 4.5v4a2 2 0 0 0 0-4Z" opacity=".4"/></svg></span></div>
    <div className="tp-top"><span className="tp-x"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg></span>
      <span className="tp-bar"><i/><b/></span><span className="tp-coins"><i/>45</span></div>
    <svg ref={svg} className="tp-letter" viewBox={fit(e[1], 124)} aria-hidden="true">
      {e[1].map((d, i) => <path key={i} d={d} className="trhollow"/>)}{e[1].map((d, i) => <path key={'g' + i} d={d} className="trguide"/>)}
      <path ref={ink} d={e[1][0]} className="trink ink" pathLength="100" style={{ strokeDasharray: `${PART} 200` }}/>
      <g className="trdot"><circle ref={dot} r="9" className="ring"/><circle ref={dot2} r="6.5"/></g>
    </svg>
    <img ref={hand} className="tp-hand" src={handUrl} alt=""/>
  </div></div></div>;
}

// a story's card as Story Time deals it: the Prophet's name with the blessing, the title, the story's own drawing
const SCard = ({ s, className = '' }) => <div className={'sk ' + className} style={{ background: s.c }}>
  <span className="sk-txt"><small>{s.name} <bdi dir="rtl">{s.hon}</bdi></small><b>{s.title}</b></span><CardSym k={s.sym} className="sk-sym"/></div>;

// the stories as a deck: the front card swipes off to one side with a tilt, the next comes up, round all five
function SwipeDeck(){
  const deck = useRef(null), n = useTick(2400, deck), N = SCARDS.length;
  // each story keeps its own card; only its place changes: 0 in front, 1 and 2 behind, the last one just swiped away
  return <div className="deck" ref={deck}>{SCARDS.map((c, i) => {
    const at = ((i - n) % N + N) % N, gone = at === N - 1;
    return <div key={c.id} className={'deck-c p' + Math.min(at, 3) + (gone ? ' gone ' + (n % 2 ? 'l' : 'r') : '')}><SCard s={c}/></div>;
  })}</div>;
}

// trace: ten letters rolling up, one row at a time, the middle one lit, the ones above it ticked
const TEN = ['Alif', 'Baa', 'Taa', 'Thaa', 'Jeem', 'Haa', 'Khaa', 'Daal', 'Dhaal', 'Raa'];
function TraceRoll(){
  const tile = useRef(null), n = useTick(1500, tile);
  return <div className="lt lt-list" ref={tile} aria-hidden="true"><div className="lr-in">{[-3, -2, -1, 0, 1, 2, 3].map(k => {
    const at = n + k, name = TEN[((at % 10) + 10) % 10];
    return <div key={at} className={'lr' + (k === 0 ? ' on' : '') + (k < 0 ? ' done' : '')} style={{ '--k': k }}>
      <span className="lg"><Glyph e={ar(name)}/>{k < 0 && <i className="lk"><Tick/></i>}</span><b>{name}</b></div>;
  })}</div></div>;
}

// letter to pop sits in its tile up top, the right balloons burst one by one and the score counts to 3, then again
const [BODY, SHADE] = [...balloonSvg.matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
const BCOL = [['#fbbe12', '#eab00b'], ['#5dad5b', '#459b4d'], ['#ec9122', '#d47807'], ['#50d2ed', '#29b6d3']];
// [letter, colour, lane (% from the left), when it sets off (s), whether it's one to pop]
const BALLS = [['Baa', 0, 14, 0, 1], ['Jeem', 2, 62, .5, 0], ['Taa', 3, 38, 1.1, 0], ['Baa', 1, 76, 1.6, 1], ['Daal', 0, 26, 2.3, 0], ['Baa', 3, 52, 2.9, 1], ['Seen', 2, 84, 3.4, 0]];
const ROUND = 6;
// The Games card's round, drawn by the browser alone (CSS keyframes, built once from the timings below): each balloon
// rises, the app's hand glides to it and taps it, and it bursts into bits of its colour; then round again. No script
// runs a frame (it was a React render 60 times a second, heavy on a phone); off screen it holds still
const RISE = 3.4, POP = .5, BURST = .16 * RISE, GO = .42, REST = [82, 4];   // seconds to cross; how far up it bursts; the burst; the hand's glide; where the hand rests (% left, % up)
const pc = s => +(s / ROUND * 100).toFixed(3);   // seconds into the round → % of the loop
const POPS = BALLS.map((b, i) => [b[3] + RISE * POP, i]).sort((x, y) => x[0] - y[0]);
const UP = 130 * POP;   // how far a balloon has risen when it bursts, % of the card's height
const ROUND_CSS = (() => {
  let css = '';
  BALLS.forEach(([, , , at], i) => {
    const t0 = pc(at), t1 = pc(at + RISE * POP), t2 = pc(at + RISE * POP + BURST);
    // the climb (the lane is the card's full height, so % here is % of the card), visible only while it's up
    css += `@keyframes ppw${i}{0%,${t0}%{transform:translateY(0);visibility:hidden}${t0 + .01}%{visibility:visible}${t1}%{transform:translateY(-${UP}%)}${t2}%{transform:translateY(-${UP}%);visibility:visible}${Math.min(100, t2 + .01)}%,100%{transform:translateY(-${UP}%);visibility:hidden}}`;
    // the balloon swells and fades as it bursts; the bits fly out
    css += `@keyframes ppb${i}{0%,${t1}%{scale:1;opacity:1}${pc(at + RISE * POP + BURST * .4)}%,100%{scale:1.56;opacity:0}}`;
    css += `@keyframes ppx${i}{0%,${t1}%{--pk:0;opacity:0}${t1 + .01}%{opacity:1}${t2}%,100%{--pk:1;opacity:0}}`;
  });
  // the hand: rests, glides to each balloon just before it bursts (to where it will be), presses, waits for the next
  const spot = i => [BALLS[i][2], -30 + UP];
  let k = `0%{transform:translate(${REST[0]}%,-${REST[1]}%)}`, prev = REST, press = '0%{scale:1}';
  POPS.forEach(([t, i]) => {
    const [x, y] = spot(i);
    k += `${pc(t - GO)}%{transform:translate(${prev[0]}%,-${prev[1]}%);animation-timing-function:ease-in-out}${pc(t)}%{transform:translate(${x}%,-${y}%)}`;
    press += `${pc(t - .02)}%{scale:1}${pc(t + .06)}%{scale:.86}${pc(t + .18)}%{scale:1}`;
    prev = [x, y];
  });
  k += `${pc(ROUND - GO - .05)}%{transform:translate(${prev[0]}%,-${prev[1]}%);animation-timing-function:ease-in-out}100%{transform:translate(${REST[0]}%,-${REST[1]}%)}`;
  css += `@keyframes pph{${k}}@keyframes ppp{${press}100%{scale:1}}`;
  return css;
})();
function PopRound(){
  const el = useRef(null);
  // off screen (or asked for less motion) the round holds still
  useEffect(() => { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !calmNow()) delete el.current.dataset.off; else el.current.dataset.off = ''; }); io.observe(el.current); return () => io.disconnect(); }, []);
  return <div ref={el} className="lt lt-pop" data-off="" aria-hidden="true">
    <style>{ROUND_CSS}</style>
    {BALLS.map(([n, c, x], i) => <span key={i} className="pp-w" style={{ left: `${x}%`, animationName: `ppw${i}` }}>
      <span className="pp-b" style={{ '--i': i }}>
        <span className="pp-pop" style={{ animationName: `ppb${i}` }}>
          <svg viewBox="0 0 142 179"><path d={BODY} fill={BCOL[c][0]}/><path d={SHADE} fill={BCOL[c][1]}/></svg>
          <span className="pp-l"><Glyph e={ar(n)}/></span><i className="pp-str"/></span>
        <span className="pp-bits" style={{ animationName: `ppx${i}` }}>{BITS.map(([a, d, z], j) => <i key={j} style={{ '--a': `${a}deg`, '--d': d, '--z': z, background: BCOL[c][j % 2] }}/>)}</span>
      </span></span>)}
    <span className="pp-hw"><img className="pp-hand" src={handUrl} alt=""/></span>
  </div>;
}
// the burst's bits: [angle, how far, how big]
const BITS = [[0, 1, 1.1], [35, .7, .8], [75, 1.15, 1.2], [118, .8, .9], [160, 1.05, 1.3], [200, .65, .7], [238, 1.2, 1], [282, .85, 1.2], [322, 1, .8]];

// the numbers card: Kiko counts ١ to ٩, the big number in the middle and the nine on a big dial over it that turns so the one it's on is always at the top, the one it's on
// lit; the name and the English under it; round again
// each number its own colour, from the brand's
const DIAL = ['#50d2ed', '#b9a3f5', '#f7a8e0', '#ffd166', '#2fc98a', '#ff8a3d', '#7bdcb5', '#8f9bff', '#fbbe12'];
const EN = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
function Count({ watch }){
  const c = useTick(1600, watch), n = c % 9, e = NUM[n];
  return <>
    {/* a full circle, ١ to ٩ twice round it, so there's never a gap; it turns one step a count, always the same way */}
    <div className="ring" style={{ '--n': c }}>{[...NUM, ...NUM].map((x, i) =>
      <span key={i} className={'rn' + (i === c % 18 ? ' on' : '')} style={{ '--i': i, '--c': DIAL[i % 9] }}><span className="rn-in"><Glyph e={x}/></span></span>)}</div>
    <span className="big" key={n}><Glyph e={e}/></span><span className="cap" key={'c' + n}>{e[2]} · {EN[n]}</span></>;
}

// the loop, as Phantom's square tiles: the art drawn from Kiko's own pieces
const Tick = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5"/></svg>;

/* ---------------- the tiles ---------------- */

// a card as the website's (Cards), without its sentence: the sentence is the card's description now
const Card = ({ className, label, ratio, children }) => <div className="kweb" role="img" aria-label={label}>
  <article className={'wb-card ' + className} style={ratio ? { aspectRatio: ratio } : undefined}>{children}</article></div>;

export function WebTrace({ ratio }){
  return <Card className="wb-violet c-phone" label="Kiko's tracing: a finger traces the letter Baa on a phone" ratio={ratio}>
    <div className="c-phone-pic"><TracePhone/></div>
  </Card>;
}

export function WebPop({ ratio }){
  return <Card className="c-pop" label="Kiko's Pop game: balloons with letters rise over Palestine and the hand pops the right ones" ratio={ratio}>
    <PopRound ceil={.5} hand/>
    <div className="mdl-d13 c-pop-strip" aria-hidden="true"><div className="d13-jh-deco"><Strip className="d13-hd-palestine"><Palestine flag aqsa/></Strip></div></div>
  </Card>;
}

export function WebCount({ ratio }){
  const art = useRef(null);
  return <Card className="wb-cream c-type" label="Counting with Kiko: a dial of Arabic numbers turns from Wahid to Tis'a" ratio={ratio}>
    <div className="c-art" aria-hidden="true" ref={art}>
      <Count watch={art}/>
    </div>
  </Card>;
}

export function WebStories({ ratio }){
  return <Card className="wb-dark c-fan" label="The Prophets' stories in Kiko: a deck of story cards, one swiped away at a time" ratio={ratio}>
    <div className="c-art" aria-hidden="true">
      <SwipeDeck/>
    </div>
  </Card>;
}

// the loop's tile (Loop's first): no card round it, the tile alone
export function WebRoll({ ratio }){
  return <div className="kweb kweb-loop" role="img" aria-label="Kiko's tracing path: ten Arabic letters roll up, the one to trace lit, the ones before it ticked"
    style={ratio ? { '--lt-ratio': ratio } : undefined}>
    <TraceRoll/>
  </div>;
}
