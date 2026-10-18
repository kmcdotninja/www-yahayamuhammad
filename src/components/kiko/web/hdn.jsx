/* The Games card's strip (Kiko: modeling/directions/13-posters/hdn.jsx, "Home: the strips at night"), only the part the
   website's Games card draws: Palestine with its two flags, Al-Aqsa Mosque at its middle (<Palestine flag aqsa/>). Copied
   as it is; the other places, and Palestine's moonlit take (the full moon, the Dome of the Rock), left behind.
   The crescent's Moon is s-art.jsx's. Classes d13-hdn- and d13-hd- (web.css), under .mdl-d13 */
import { useId } from 'react';

// the crescent moon (never stars) (s-art.jsx)
const Moon = ({ x, y, r = 22, c = '#f5f1e8' }) =>
  <path transform={`translate(${x - r} ${y - r}) scale(${r / 50})`} d="M62 4A48 48 0 1 0 96 70 38 38 0 1 1 62 4z" fill={c}/>;

const useUid = p => p + useId().replace(/[^a-zA-Z0-9]/g, '');
// a soft line summed from waves (as hd.jsx), filled down; rim: the same top line alone, for moonlight along a ridge
const line = (x0, x1, parts, n0, base) => {
  let d = ''; const n = Math.round(n0 * (x1 - x0) / 440);
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n; let y = base;
    for (const [a, w, p] of parts) y -= a * (.5 + .5 * Math.sin(x / w + p));
    d += (i ? 'L' : 'M') + x.toFixed(0) + ' ' + y.toFixed(1);
  }
  return d;
};
// the box is 400 × 100, but every scene runs on far to both sides (X0…X1): on a wide screen the strip stays low and
// the place simply continues (more hills, trees, water), the landmark centred and the same size
const X0 = -700, X1 = 1100, XW = X1 - X0;
const Strip = ({ children, className }) => <svg className={'d13-hdn' + (className ? ' ' + className : '')} viewBox="0 0 400 100" preserveAspectRatio="xMidYMax meet">{children}</svg>;
const ridge = (x0, x1, parts, n, base = 0) => line(x0, x1, parts, n, base) + `L${x1} 200L${x0} 200Z`;
// a hill against the night: dark, a thin rim of moonlight along its top
const Hill = ({ parts, base, n = 120, c, rim, w = .7 }) => <g>
  <path d={ridge(X0, X1, parts, n, base)} fill={c}/>
  {rim && <path d={line(X0, X1, parts, n, base)} stroke={rim} strokeWidth={w} fill="none" strokeLinejoin="round"/>}
</g>;
const arch = (x, y, w, h) => `M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}Z`;
const teeth = (x0, x1, y, t = 3) => { let d = ''; for (let x = x0; x + t <= x1 + .01; x += t) d += `M${x} ${y}L${x + t / 2} ${y - t}L${x + t} ${y}Z`; return d; };

// the night sky: clear at the top (the page shows through, no edge), deep navy, a little lighter at the horizon
const Sky = ({ top, low, h = 74 }) => { const id = useUid('hns');
  return <><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stopColor={top} stopOpacity="0"/><stop offset=".34" stopColor={top} stopOpacity=".6"/>
    <stop offset=".6" stopColor={top}/><stop offset="1" stopColor={low}/></linearGradient></defs>
    <rect x={X0} y={100 - h} width={XW} height={h + 4} fill={`url(#${id})`}/></>; };
// a soft pool of light (a floodlit place, a lamp, the moon's halo): a radial fade, never a shadow
const Glow = ({ x, y, rx, ry = rx, c, o = .5, className }) => { const id = useUid('hng');
  return <g className={className}><defs><radialGradient id={id}><stop offset="0" stopColor={c} stopOpacity={o}/><stop offset=".55" stopColor={c} stopOpacity={o * .4}/>
    <stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient></defs><ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id})`}/></g>; };
const Crescent = ({ x, y, r, c = '#f6efd6' }) => <g><Glow x={x} y={y} rx={r * 2.6} c={c} o={.16}/><Moon x={x} y={y} r={r} c={c}/></g>;
const Finial = ({ x, y, h = 4, c = '#f0c04a' }) => <g>
  <rect x={x - .45} y={y - h} width=".9" height={h} fill={c}/>
  <path transform={`translate(${x} ${y - h - 1.4})`} d="M-1.7-.6A1.8 1.8 0 0 0 1.7-.6 1.5 1.5 0 0 1-1.7-.6Z" fill={c}/>
</g>;
// a cypress at night: dark, one side touched by the moon
const Cypress = ({ x, y = 100, h = 30, c, rim }) => <g transform={`translate(${x} ${y})`}>
  <path d={`M0 0C-4.6 ${-h * .3}-4 ${-h * .75} 0 ${-h}C4 ${-h * .75} 4.6 ${-h * .3} 0 0Z`} fill={c[0]}/>
  <path d={`M0 0C2.6 ${-h * .3} 3.4 ${-h * .7} 0 ${-h}C4 ${-h * .75} 4.6 ${-h * .3} 0 0Z`} fill={c[1]}/>
  {rim && <path d={`M0 ${-h}C4 ${-h * .75} 4.6 ${-h * .3} 1.4 ${-h * .06}`} stroke={rim} strokeWidth=".7" fill="none" strokeLinecap="round"/>}
</g>;
const Olive = ({ x, y = 100, s = 1, leaf, bark, rim }) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <path d="M-2.4 0Q-1-6-4-10L-2-11Q0-7 1-9L2.4-12 4-11Q1.6-6 2.6 0Z" fill={bark}/>
  <ellipse cx="-6" cy="-13" rx="7" ry="4.6" fill={leaf[2] || leaf[1]}/><ellipse cx="6" cy="-14" rx="7.4" ry="4.8" fill={leaf[1]}/>
  <ellipse cx="0" cy="-18" rx="8" ry="5" fill={leaf[0]}/>
  {rim && <path d="M-6-20.6A8 5 0 0 1 6.4-21" stroke={rim} strokeWidth={.8 / s} fill="none" strokeLinecap="round"/>}
</g>;
const Wall = ({ x0, x1, top, c, lit }) => { let d = `M${x0} 104V${top}`;
  for (let x = x0; x < x1; x += 9) d += `H${x + 4}V${top - 3.4}H${x + 9}V${top}`;
  return <g><path d={d + `H${x1}V104Z`} fill={c}/>{lit && <rect x={x0} y={top} width={x1 - x0} height="1.2" fill={lit}/>}</g>; };
/* ── Palestine: the olive groves silver in moonlight on the terraced hills, the old city's windows lit, the Dome of
   the Rock's gold, Damascus Gate floodlit warm; or the last light of evening with Palestine's colours. Both always
   with two flags of Palestine, left and right, lit and in clear view ── */
const DUSKP = { sky: ['#1a1d40', '#5a3654'], hill: ['#262640', '#2c2a44', '#33304a'], rim: '#8a5f80',
  grove: ['#64887a', '#4d7062', '#3a594c'], leaf: ['#64887a', '#4d7062', '#3a594c'], bark: '#2a2228',
  stone: ['#d8b994', '#c6a47e', '#b08e6c'], dome: '#e6caa4', win: '#ffd27a', wall: ['#dcaa76', '#c49262'], gate: '#3a2028', gateIn: '#ffd27a',
  grass: '#22262a', red: '#e0424a', black: '#141414', white: '#f4f1ea', roof: '#a8403c', cypress: ['#141c24', '#1e2a32'] };
// Al-Aqsa Mosque itself (the Qibli Mosque), as it stands: the warm stone porch with its seven arches lit from inside
// (the middle one the widest), the long hall rising behind, and the dark lead-grey dome on its drum. The website's
// Games card shows it in the Palestine strip (Palestine aqsa) in place of the Dome of the Rock
const AQM = { stone: '#dcb48e', stoneLit: '#ecc9a2', hall: '#c69c78', deep: '#6a4a4c', lamp: '#ffc874', lampIn: '#ffe2a8',
  dome: ['#545b78', '#3c425c'], domeLit: '#8890b0', drum: '#b8906e', fin: '#e8d3a0' };
// a pointed arch, as the porch's: straight sides, then two curves meeting at the tip
const parch = (x, y, w, h) => `M${x} ${y + h}V${y + w * .55}Q${x} ${y + w * .05} ${x + w / 2} ${y - w * .25}Q${x + w} ${y + w * .05} ${x + w} ${y + w * .55}V${y + h}Z`;
const AqsaMosque = ({ x, y, s = 1, C = AQM }) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <Glow className="d13-hdn-halo" x={0} y={-8} rx={34} ry={14} c={C.lamp} o={.22}/>
  {/* the hall behind, higher, a row of little windows */}
  <rect x="-24" y="-23" width="58" height="10" fill={C.hall}/>
  {[-18, -10, 6, 14, 22, 29].map(a => <path key={a} d={arch(a, -21, 2, 4.4)} fill={C.deep}/>)}
  {/* the dome on its drum, lead grey, the moon along its side */}
  <rect x="-14" y="-28" width="18" height="6" fill={C.drum}/>
  {[-11.4, -6.6, -1.8].map(a => <path key={a} d={arch(a, -27, 1.6, 3.6)} fill={C.deep}/>)}
  <path d="M-15-28Q-15-41-5-42Q5-41 5-28Z" fill={C.dome[0]}/>
  <path d="M-5-42Q5-41 5-28H-1Q0-38-5-42Z" fill={C.dome[1]}/>
  <path d="M-11-31.6Q-11.4-37.4-6.6-39.8" stroke={C.domeLit} strokeWidth="1" strokeLinecap="round" fill="none"/>
  <Finial x={-5} y={-41.6} h={3.4} c={C.fin}/>
  {/* the porch: seven arches, lit, the middle one wider; a light parapet along the top */}
  <rect x="-32" y="-14" width="64" height="14" fill={C.stone}/>
  <rect x="-32.6" y="-15.2" width="65.2" height="2" rx=".8" fill={C.stoneLit}/>
  {[-29.4, -21.4, -13.4, 7.4, 15.4, 23.4].map(a => <path key={a} className="d13-hd-glow" d={parch(a, -9.6, 6, 9.6)} fill={C.lamp}/>)}
  <path className="d13-hd-glow" d={parch(-4.6, -10, 9.2, 10)} fill={C.lampIn}/>
</g>;
const House = ({ x, w, h, base, c = 0, dome, roof, win = [], C }) => <g>
  <rect x={x} y={base - h} width={w} height={h} fill={C.stone[c]}/>
  {dome && <path d={`M${x + w / 2 - dome} ${base - h}a${dome} ${dome * .8} 0 0 1 ${dome * 2} 0Z`} fill={C.dome}/>}
  {roof && <path d={`M${x - 1.4} ${base - h}L${x + w / 2} ${base - h - 6}L${x + w + 1.4} ${base - h}Z`} fill={C.roof}/>}
  {win.map((wx, i) => <path key={i} d={arch(x + wx, base - h + 3, 2.6, 4.4)} fill={C.win} className="d13-hd-glow"/>)}
</g>;
const wy = (i, y) => (y + 1.2 * Math.sin(i / 12 * 5.2) * (i / 12)).toFixed(2);
const stripe = (y0, y1, L = 24) => { let d = ''; for (let i = 0; i <= 12; i++) d += `${i ? 'L' : 'M'}${(L * i / 12).toFixed(1)} ${wy(i, y0)}`;
  for (let i = 12; i >= 0; i--) d += `L${(L * i / 12).toFixed(1)} ${wy(i, y1)}`; return d + 'Z'; };
const PS = { black: '#141414', white: '#f4f1ea', green: '#1f8a4c', red: '#d6333b' };
// the flag of Palestine at night: lit by a lamp at the pole's foot, a fine light edge so the black never melts into the dark
const Flag = ({ x, y, pole }) => <g transform={`translate(${x} ${y})`}>
  <Glow className="d13-hdn-halo" x={12} y={-pole + 6} rx={22} ry={14} c="#ffe2b0" o={.42}/>
  <rect x="-1" y={-pole} width="1.6" height={pole} rx=".8" fill="#efe9e4"/>
  <circle cx="-.2" cy={-pole - .6} r="1.3" fill="#efe9e4"/>
  <g className="d13-hd-flag" transform={`translate(.6 ${-pole + 1})`}>
    <path d={stripe(0, 4)} fill={PS.black}/><path d={stripe(4, 8)} fill={PS.white}/><path d={stripe(8, 12)} fill={PS.green}/>
    <path d="M0 0L8.4 6.3L0 12Z" fill={PS.red}/>
    <path d={stripe(-.3, 0)} fill="#e9e4dc"/>
  </g>
</g>;
const Bloom = ({ x, y, c, eye }) => <g transform={`translate(${x} ${y})`}>
  <rect x="-.35" y="-3.6" width=".7" height="3.6" fill="#3a5a3a"/>
  <circle cy="-4.8" r="1.9" fill={c}/>{eye && <circle cy="-4.8" r=".7" fill={eye}/>}
</g>;
// only the Games card's take (flag, aqsa: the last light of evening, Al-Aqsa Mosque); the moonlit take left behind
const Palestine = () => { const C = DUSKP;
  return <g>
    <Sky top={C.sky[0]} low={C.sky[1]}/>
    <Crescent x={300} y={50} r={5}/>
    {/* terraced hills: stepped bands, the olive groves on their steps, a rim of light along the far one */}
    <Hill parts={[[16, 120, 2.2], [5, 36, .8]]} base={68} c={C.hill[0]} rim={C.rim}/>
    <Hill parts={[[12, 120, 2.3], [3, 30, 1.6]]} base={76} c={C.hill[1]}/>
    <Hill parts={[[8, 120, 2.4], [2, 26, .2]]} base={82} c={C.hill[2]}/>
    {[[18, 60], [52, 63], [86, 58], [120, 63], [298, 60], [330, 64], [362, 57], [394, 62], [34, 70], [70, 73], [314, 70], [380, 71]].flatMap(([x, y]) => [[x - 420, y], [x, y], [x + 420, y]]).map(([x, y], i) =>
      <Olive key={i} x={x} y={y} s={.32} leaf={C.grove} bark={C.bark}/>)}
    {/* the old city: stone houses with little domes and lit windows, the Dome of the Rock among them */}
    {[[-330, 20, 15, 1, 4], [-300, 24, 20, 0, 0], [-250, 18, 13, 2, 4], [-140, 22, 17, 0, 5], [-112, 20, 12, 1, 0], [-40, 18, 15, 2, 4], [420, 22, 16, 1, 4], [446, 18, 20, 0, 0], [520, 24, 13, 2, 5], [612, 20, 17, 0, 4], [640, 22, 12, 1, 0]].map(([x, w, h, c, d]) =>
      <House key={x} C={C} x={x} w={w} h={h} base={90} c={c} dome={d} win={[w / 2 - 1.3]} roof={!d}/>)}
    <House C={C} x={24} w={20} h={16} base={90} c={2} dome={4} win={[8.6]}/>
    <House C={C} x={42} w={18} h={22} base={90} c={0} win={[7.6]} roof/>
    <House C={C} x={58} w={24} h={14} base={90} c={1} dome={5} win={[5, 15]}/>
    <House C={C} x={157} w={22} h={16} base={90} c={0} dome={4} win={[9.6]}/>
    <AqsaMosque x={212} y={85.4} s={.86}/>
    <House C={C} x={254} w={20} h={20} base={90} c={0} dome={4} win={[4, 12]}/>
    <House C={C} x={272} w={24} h={14} base={90} c={1} win={[6, 15]} roof/>
    <House C={C} x={338} w={22} h={18} base={90} c={2} dome={5} win={[9.6]}/>
    <House C={C} x={358} w={22} h={13} base={90} c={0} win={[5, 14]} roof/>
    <Cypress x={184} y={88} h={22} c={C.cypress} rim={C.rim}/><Cypress x={248} y={88} h={18} c={C.cypress} rim={C.rim}/><Cypress x={306} y={88} h={20} c={C.cypress} rim={C.rim}/>
    {/* the wall, floodlit, and Damascus Gate: two towers, the tall arch, its pointed crown, the light inside */}
    <Wall x0={X0} x1={X1} top={90} c={C.wall[1]}/>
    <g transform="translate(110 100)">
      <Glow className="d13-hdn-halo" x={0} y={-12} rx={34} ry={20} c="#ffc070" o={.3}/>
      <rect x={X0} y="-24" width="40" height="24" fill={C.wall[0]}/>
      <rect x="-24" y="-28" width="9" height="28" fill={C.wall[1]}/><rect x="15" y="-28" width="9" height="28" fill={C.wall[1]}/>
      <path d={teeth(-20, 20, -24, 4)} fill={C.wall[0]}/><path d={teeth(-24, -15, -28, 3)} fill={C.wall[1]}/><path d={teeth(15, 24, -28, 3)} fill={C.wall[1]}/>
      {[-1, 1].map(k => <g key={k} fill="none" strokeWidth="2"><path d={`M${-7.4 * k} -12Q${-7.4 * k} -19.6 0 -21.6`} stroke={C.white}/>
        <path d={`M${-7.4 * k} -12Q${-7.4 * k} -19.6 0 -21.6`} stroke={C.black} strokeDasharray="2.2 2.2"/></g>)}
      <path d="M-6 0V-12Q-6-18 0-20Q6-18 6-12V0Z" fill={C.gate}/>
      <path d="M-3.6 0V-10Q-3.6-14 0-15.6Q3.6-14 3.6-10V0Z" className="d13-hd-glow" fill={C.gateIn}/>
    </g>
    <rect x={X0} y="98" width={XW} height="6" fill={C.grass}/>
    {[[-380, 1.2], [-240, 1.3], [-90, 1.15], [36, 1.3], [364, 1.2], [480, 1.3], [620, 1.15], [760, 1.25]].map(([x, s]) => <Olive key={x} x={x} y={101} s={s} leaf={C.leaf} bark={C.bark} rim={C.rim}/>)}
    {[[58, 100], [66, 99], [300, 100], [338, 99], [346, 100], [20, 100], [186, 100], [244, 99]].map(([x, y], i) => <Bloom key={i} x={x} y={y} c={C.red} eye={C.black}/>)}
    {/* two flags of Palestine, one left, one right, in front of everything and clear of the olive trees */}
    <Flag x={62} y={99} pole={26}/><Flag x={316} y={99} pole={26}/>
  </g>; };


export { Strip, Palestine };
