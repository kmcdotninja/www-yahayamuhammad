/* The stories' cards for the Stories card's deck (Kiko: modeling/directions/13-posters/st.jsx's CARDS and CardSym), with
   just the drawings they use, copied as they are: the Kaaba and the crown (s-art.jsx), Yunus's big fish (yunus.jsx), the
   towers of Iram (hud.jsx), Salih's she-camel (salih.jsx). The rigs' refs land in throwaway objects: here they hold still */
const cx = (...a) => a.filter(Boolean).join(' ');   // (ui.jsx)

/* ---- s-art.jsx ---- */
// The Kaaba: a black cube a little taller than wide, seen at a slight angle; the kiswah's gold band round it near the
// top; its gold door raised above the ground; standing on the pale marble round it
const Kaaba = ({ x, y, s = 1 }) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <path d="M34-80L54-88V-7L34 0Z" fill="#1d1d23"/>
  <path d="M-34-80L-14-88H54L34-80Z" fill="#2c2c33"/>
  <rect x="-34" y="-80" width="68" height="80" fill="#0b0c0d"/>
  <rect x="-34" y="-65" width="68" height="10" fill="#e2b04a"/>
  <path d="M34-65L54-73V-63L34-55Z" fill="#b98a33"/>
  <path d="M-30-60h60M38-63.5l12-5" stroke="#a87a2a" strokeWidth="1.6" strokeDasharray="5 3"/>
  <rect x="6" y="-44" width="16" height="31" rx="2" fill="#e2b04a"/>
  <rect x="9.5" y="-40.5" width="9" height="24" rx="1" fill="#c48f30"/>
</g>;
/* ---------------- the symbols: one object for each story (Yahya: "not too graphic") ---------------- */
// Suleiman (عليه السلام), a king: a crown. Rounded points, round jewels (no stars, no glints)
const Crown = () => <g>
  <path d="M14 70L8 26Q8 20 14 24L32 40 46 14Q50 8 54 14L68 40 86 24Q92 20 92 26L86 70Z" fill="#ffc23a"/>
  <rect x="12" y="66" width="76" height="16" rx="5" fill="#d98e17"/>
  <circle cx="50" cy="12" r="6" fill="#ffc23a"/><circle cx="9" cy="24" r="5" fill="#ffc23a"/><circle cx="91" cy="24" r="5" fill="#ffc23a"/>
  {/* deep jewels, so they stand out on the gold (bright cyan and pink melted into it) */}
  <circle cx="50" cy="52" r="7.5" fill="#9b1d4a"/><circle cx="29" cy="56" r="5.2" fill="#1d4f9b"/><circle cx="71" cy="56" r="5.2" fill="#1d4f9b"/>
  <circle cx="30" cy="74" r="3.4" fill="#7a4a0c"/><circle cx="50" cy="74" r="3.4" fill="#7a4a0c"/><circle cx="70" cy="74" r="3.4" fill="#7a4a0c"/>
</g>;
// Prophet Muhammad ﷺ: the Kaaba before Makkah's mountains
const KaabaSym = () => <g>
  <path d="M-4 84Q10 44 24 70Q40 30 56 66Q72 40 86 70Q96 54 104 84Z" fill="#c98a62"/>
  <Kaaba x={42} y={92} s={.6}/>
</g>;
const SYMS = { crown: Crown, kaaba: KaabaSym };
const Sym = ({ k, className }) => { const S = SYMS[k];
  return <svg className={className} viewBox="0 0 100 100" aria-hidden="true">{S && <S/>}</svg>; };

/* ---- yunus.jsx: the big fish ---- */
const FISH_C = '#4f74b3', FISH_B = '#a9c6ea', FISH_D = '#3b5d96';
function FishRig({ r }){
  return <g ref={el => r.root = el}><g ref={el => r.body = el}>
    <g ref={el => r.tail = el} transform="translate(-74 -4)"><path d="M0 0Q-18-26-34-36Q-26-8-30 0Q-26 8-34 36Q-18 26 0 0Z" fill={FISH_D}/></g>
    <path d="M-80-4Q-60-40 0-42Q60-44 84-12L84 6Q60 30 0 30Q-60 30-80 6Z" fill={FISH_C}/>
    <path d="M-62 8Q-20 26 40 22Q66 18 82 6Q60 30 0 30Q-50 30-62 8Z" fill={FISH_B}/>
    <path d="M-8-40Q6-62 30-60Q20-48 18-38Z" fill={FISH_D}/>
    <path d="M-6 8Q8 22 2 32Q-10 22-6 8Z" fill={FISH_D}/>
    <g ref={el => r.jaw = el} transform="translate(56 6)"><path d="M0 0Q18 1 30 0Q24 16 0 14Z" fill={FISH_B}/></g>
    <circle cx="56" cy="-16" r="6" fill="#fff"/><circle cx="58" cy="-16" r="3.4" fill="#16233d"/>
    <path d="M44 -2Q58 0 84 -2" stroke={FISH_D} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
  </g></g>;
}

/* ---- hud.jsx: a tower of Iram (its colours: the day, the greyer day and the cloud's shadow, all three drawn here, as on the website) ---- */
// day, greyer, the cloud's shadow: the later ones fade in over the first (film2.css's d13-mv-l1 / l2)
const Tri = ({ c, children }) => <>{children(c[0])}<g className="d13-mv-l1">{children(c[1])}</g><g className="d13-mv-l2">{children(c[2])}</g></>;
const R = (c, p) => <Tri c={c}>{k => <rect {...p} fill={k}/>}</Tri>;
const C = {
  face: ['#f5c983', '#d8c3a0', '#ada291'], side: ['#c98848', '#ad9578', '#857b6c'], band: ['#fbdca2', '#e3d0b0', '#b8ad9a'],
  open: ['#7a4528', '#6b5a4c', '#544c45'], faceB: ['#e9c391', '#cfc3ab', '#a39f96'], sideB: ['#cf9c66', '#b6a88f', '#8e897f'],
};
function Tower({ x, w, h, top, back }){
  const fc = back ? C.faceB : C.face, sc = back ? C.sideB : C.side, sw = w * .3, cols = Math.max(2, Math.round(w / 24)), step = w / cols;
  const merlons = (x0, y, ww) => Array.from({ length: Math.floor(ww / 14) }, (_, j) => <rect key={j} x={x0 + 2 + j * 14} y={y - 10} width="8" height="10"/>);
  const crown = top ? h * .16 : 0;
  return <g transform={`translate(${x} 0)`}>
    {R(sc, { x: w, y: -h + 8, width: sw, height: h - 8 })}
    {R(fc, { x: 0, y: -h, width: w, height: h })}
    <Tri c={C.band}>{c => <g fill={c}>
      {Array.from({ length: Math.floor(h / 70) }, (_, j) => <rect key={'b' + j} x="0" y={-h + 26 + j * 70} width={w} height="6"/>)}
      {Array.from({ length: cols - 1 }, (_, j) => <rect key={'p' + j} x={step * (j + 1) - 3} y={-h + 14} width="6" height={h - 14}/>)}
      {merlons(-1, -h, w + 2)}
    </g>}</Tri>
    {top ? <>{R(sc, { x: w * .82, y: -h - crown + 6, width: w * .14, height: crown - 6 })}{R(fc, { x: w * .2, y: -h - crown, width: w * .62, height: crown })}
      <Tri c={C.band}>{c => <g fill={c}>{merlons(w * .2 - 1, -h - crown, w * .62 + 2)}</g>}</Tri></> : null}
    <Tri c={C.open}>{c => <g fill={c}>{Array.from({ length: Math.floor((h - 60) / 140) }, (_, j) => Array.from({ length: cols }, (_, q) =>
      <rect key={j + '.' + q} x={step * q + step / 2 - 4} y={-h + 46 + j * 140} width="8" height="20" rx="4"/>))}
      {!back && <rect x={w / 2 - 11} y="-34" width="22" height="34" rx="11"/>}</g>}</Tri>
    {top ? <Tri c={C.open}>{c => <g fill={c}><rect x={w * .51 - 4} y={-h - crown + 20} width="8" height="18" rx="4"/></g>}</Tri> : null}
  </g>;
}

/* ---- salih.jsx: the she-camel ---- */
const CM = { body: '#f3e3c4', shade: '#dcc39c', deep: '#b99a72', line: '#8b6a48', eye: '#3a281c' };
const LEG = 'M-4 0H4L3.4 17Q5.2 20.5 3.4 24L3 37Q5.6 39 5.6 41.5H-4L-3 37L-3.4 24Q-5.2 20.5-3.4 17Z';
function CamelRig({ r }){
  const leg = (k, x, c) => <g transform={`translate(${x} -41)`}><g ref={el => r[k] = el}><path d={LEG} fill={c}/></g></g>;
  return <g ref={el => r.root = el}><g ref={el => r.flip = el}>
    {leg('fb', -21, CM.shade)}{leg('ff', 17, CM.shade)}
    <g transform="translate(-31 -52)"><g ref={el => r.tail = el}><path d="M0 0Q-5 8-4 20" stroke={CM.deep} strokeWidth="2.6" fill="none" strokeLinecap="round"/><path d="M-6 17Q-4 26-1 17Z" fill={CM.deep}/></g></g>
    <g ref={el => r.body = el}>
      <path d="M-33-45Q-36-60-24-64Q-15-84 0-80Q13-77 18-64Q29-62 30-50Q29-37 16-36H-22Q-32-36-33-45Z" fill={CM.body}/>
      <path d="M-24-38Q-2-34 22-38Q20-36 16-36H-22Z" fill={CM.shade}/>
    </g>
    {leg('nb', -17, CM.body)}{leg('nf', 21, CM.body)}
    {/* the neck, from the chest: it lowers to graze and to drink */}
    <g transform="translate(22 -54)"><g ref={el => r.neck = el}>
      <path d="M-6 6Q4 2 12-12Q17-24 24-30L34-27Q29-20 24-8Q17 9 2 14Z" fill={CM.body}/>
      <g transform="translate(29 -29)"><g ref={el => r.head = el}>
        <g transform="translate(-2 -8)"><g ref={el => r.ear = el}><path d="M0 0Q-5-5-2-10Q2-6 2 0Z" fill={CM.shade}/></g></g>
        <path d="M-7-3Q-5-11 4-10Q13-9 19-4Q22 0 19 3.5Q12 6.5 1 5Q-7 4-7-3Z" fill={CM.body}/>
        <ellipse ref={el => r.eye = el} cx="5" cy="-4.4" rx="1.7" ry="1.5" fill={CM.eye}/>
        <path d="M2.6-6.4Q5-7.6 7.4-6.6" stroke={CM.line} strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M17.5-1.4L19-.4" stroke={CM.line} strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M13 3Q16 4.2 19.4 3" stroke={CM.line} strokeWidth="1" fill="none" strokeLinecap="round"/>
      </g></g>
    </g></g>
  </g></g>;
}

// the stories in v1.5's order (directions/15-stories/stories.js): their card colour, name, title, symbol (never a person)
const AS = '(عليه السلام)';
const CARDS = [
  { id: 'muhammad', c: '#2b64d6', name: 'Prophet Muhammad', hon: 'ﷺ', title: 'The one you can trust', sym: 'kaaba' },
  { id: 'sul', c: '#3e3380', name: 'Prophet Suleiman', hon: AS, title: 'The ant in the valley', sym: 'crown' },
  { id: 'yunus', c: '#0e2347', name: 'Prophet Yunus', hon: AS, title: 'The big fish', sym: 'fish' },
  { id: 'hud', c: '#8a5a1e', name: 'Prophet Hud', hon: AS, title: 'The tall towers and the wind', sym: 'towers' },
  { id: 'salih', c: '#9a3f2e', name: 'Prophet Salih', hon: AS, title: 'The she-camel', sym: 'camel' },
];
// symbols for the new stories: each film's own drawing, at rest (Yahya: "no need to create new ones"), framed for the card:
// Yunus's big fish (yunus.jsx), the towers of Iram (hud.jsx), Salih's she-camel (salih.jsx)
const EXTRA = {
  fish: <g transform="translate(72 55) scale(.66)"><FishRig r={{}}/></g>,
  towers: <g transform="translate(22 98) scale(.32)"><Tower x={0} w={64} h={200}/><Tower x={196} w={70} h={230}/><Tower x={88} w={84} h={300} top={1}/></g>,
  camel: <g transform="translate(42 92) scale(.94)"><CamelRig r={{}}/></g>,
};
// the films' drawings are wider than tall (a camel, a fish, a row of towers): a wider box, so they fill the card's corner
const CardSym = ({ k, className }) => EXTRA[k] ? <svg className={cx(className, 'wide')} viewBox="0 0 130 100" aria-hidden="true">{EXTRA[k]}</svg> : <Sym k={k} className={className}/>;

export { CardSym, CARDS };
