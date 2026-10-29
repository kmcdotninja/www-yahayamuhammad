// The Robot's motion: its moves (data-trick, e.g. a backflip) done in 3D, and its idle life (a happy sway, a little
// head tilt when it notices you). robot3d.js calls motion() once per robot per frame, after easing toward the
// feeling's pose and before posing the rig, and applies what it returns:
//
//   motion(r, t, dt) -> null, or {
//     pose:  partial pose overrides, blended over the current pose by `weight` (0..1):
//            { L: { t:[x,y,z], pole:[x,y,z] }, R: {…}, head:[nod,turn,tilt], body:[lean,tilt], sit, lie, kickL, kickR }
//            (body space, as in poses.js; any field may be left out)
//     weight: 0..1, how much the overrides win (ease in/out of a move with it)
//     rig:   whole-figure transform about its middle (y = 1.0): { x, y, z, rx, ry, rz, sx, sy, sz } (missing = 0, scale 1)
//     view:  how much more to show around the figure (1 = normal; 1.4 shows 40% more so a flip never leaves the canvas)
//   }
//
// r is the robot record from robot3d.js: r.el (its .buddy element), r.em (current feeling), r.cur (current pose),
// r.ex / r.ey (where it looks), r.lv (voice level), r.seed. Keep any per-robot state on r.motion.
// When it takes over a trick it sets el.classList 'b3d-trick' so buddy.css stops the flat CSS version.
//
// How a move is built: each one is a function of its progress p (0..1) that lays poses over the feeling's pose (hands,
// head, sit, kicks) and turns the whole figure (rig). Every move follows the same beats: anticipation (a crouch, arms
// back), take-off (a stretch, arms swinging up), the air (tucked or stretched out, turning about its centre of mass),
// a soft landing squash, a follow-through (arms up, ta-da), and every override fades to nothing by p = 1, so it lands
// exactly back in its pose. The figure is kept on the ground by measuring its lowest point (a rough cloud of points over
// the feet, body, head and paws, posed and turned the same way), so a squash bends from the feet, a roll rolls on its
// back and it never sinks through the floor.

const TAU = Math.PI * 2;
const c01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (p, a, b) => c01((p - a) / (b - a));
const sm = x => x * x * (3 - 2 * x);                                         // smoothstep
const eio = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);   // cubic in-out
const eo = x => 1 - Math.pow(1 - x, 3), ei = x => x * x * x;
const bell = x => Math.sin(Math.PI * c01(x));
const pl = (p, a, b, c, d) => sm(seg(p, a, b)) * (1 - sm(seg(p, c, d)));   // in over a..b, out over c..d
const arc = (p, a, b, H) => { const x = seg(p, a, b); return 4 * H * x * (1 - x); };
const land = (p, at, len) => { const s = seg(p, at, at + len); return s < .25 ? eo(s / .25) : 1 - sm((s - .25) / .75); };   // a fast give, a slow recovery
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- hands, for the hand on the viewer's left (L); the right mirrors. Body space, as poses.js ---- */
const H = (t, pole) => ({ t, pole });
const mir = h => ({ t: [-h.t[0], h.t[1], h.t[2]], pole: [-h.pole[0], h.pole[1], h.pole[2]] });
const BACK = H([-.5, .16, -.26], [-1, -.3, -.6]);      // swung back behind the hips (anticipation)
const UPV = H([-.88, .98, .16], [-.3, -1, -.4]);       // up and wide, a V past the big head
const TA = H([-.92, .84, .32], [-.4, -1, -.3]);        // ta-da: up, out and a little forward
const OUT = H([-.94, .48, .12], [-.3, -1, -.5]);       // out to the side, balancing
const FWD = H([-.42, .42, .56], [-1, -.6, -.2]);       // forward, catching its balance
const TUCK = H([-.28, .1, .5], [-1, -.5, 0]);          // holding its shins
const HUG = H([-.18, .32, .56], [-1, -.5, 0]);         // pulled in to the chest
const COVER = H([-.22, .84, .72], [-1, -1, -.2]);      // over the visor
const HEAD = H([-.6, 1.02, .34], [-1, -.6, -.2]);      // over its head
const LOWH = H([-.12, .24, .54], [-1, -.4, -.1]);      // clasped low
const FIST = H([-.8, .7, .3], [-.3, -1, -.2]);         // a fist up by the head
const SIDE = H([-.54, .08, .1], [-1, -.6, -.5]);       // pressed to the side

/* ---- a pose builder: each call eases the pose so far toward a target by w ---- */
class B {
  constructor(c){ this.c = c; this.o = {}; }
  v(k){ return this.o[k] ?? this.c[k] ?? (k === 'legs' ? [0, 0, 0, 0] : 0); }
  n(k, to, w){ if (w > 1e-4) { const a = this.v(k); this.o[k] = a + (to - a) * w; } return this; }
  a(k, to, w){ if (w > 1e-4) { const a = this.v(k); this.o[k] = a.map((x, i) => (to[i] == null ? x : x + (to[i] - x) * w)); } return this; }
  add(k, d){ const a = this.v(k); this.o[k] = a.map((x, i) => x + (d[i] || 0)); return this; }
  h(s, h, w){
    if (w > 1e-4) { const a = this.o[s] || this.c[s]; this.o[s] = { t: a.t.map((x, i) => x + (h.t[i] - x) * w), pole: a.pole.map((x, i) => x + (h.pole[i] - x) * w) }; }
    return this;
  }
  hs(h, w, hr){ return this.h('L', h, w).h('R', hr || mir(h), w); }
}
// the whole figure: translate, turn (about the pivot), scale; gw keeps it on the ground, air lifts it off
// turn (about the vertical: which way it faces), roll (about its own left-right axis, + tips forward), bank (about its own
// front-back axis, + tips its head to its own right, the viewer's left when it faces you) and twist (about its own long
// axis) are composed in that order, over any rx/ry/rz; fwd travels along the way it faces
const rig0 = () => ({ ring: 0, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1, piv: [0, 1, 0], gw: 1, air: 0, view: 1, ctr: 0, turn: 0, roll: 0, bank: 0, twist: 0, fwd: 0 });
// (kept gentle: a strong squash reads as the body breaking, not as weight)
const squash = (g, q) => { q *= .45; const k = 1 / Math.sqrt(1 - q); g.sy *= 1 - q; g.sx *= k; g.sz *= k; };   // q < 0 stretches

// the shared beats
function crouch(b, g, a, lean = .18){
  if (a <= 1e-4) return;
  squash(g, .13 * a);
  b.n('sit', .22, a).n('kickL', 0, a).n('kickR', 0, a).a('body', [lean, 0], a).a('head', [.14, null, null], a).hs(BACK, a);
}
function takeoff(b, g, s){
  if (s <= 1e-4) return;
  squash(g, -.07 * s);
  b.hs(UPV, s).n('sit', 0, s).a('body', [-.04, 0], s).a('head', [-.08, null, null], s);
}
function landing(b, g, l){
  if (l <= 1e-4) return;
  squash(g, .15 * l);
  b.n('sit', .16, l).hs(FWD, .7 * l).a('body', [.12, 0], l).a('head', [.1, null, null], .6 * l);
}
function tada(b, k){
  if (k <= 1e-4) return;
  b.hs(TA, k).a('head', [-.08, null, .06], k);
}
function tuck(b, k){
  if (k <= 1e-4) return;
  // knees to the chest: the legs swing up at the hips (a deep sit would fold this short body into itself), the back
  // rounds, the chin tucks, the hands hold the shins
  b.n('sit', .25, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [1.5, .1, 1.5, .1], k).hs(H([-.25, .2, .52], [-1, -.5, 0]), k).a('body', [.3, 0], k).a('head', [.3, 0, 0], k);
}

/* ---- the acrobatics: one shape, many moves ---- */
// o: up/down (take-off and touch-down, as progress), H (apex, in body heights of about 2), rot ([axis, angle] turned
// between take-off and touch-down), mid (the pose in the air), cy (the pivot: about the centre of mass), view, lean
// (anticipation lean), x (travel [start of the air, end of the air]; a little step out before and back after)
function air(o){
  const { up = .26, down = .74, Hh = .55, rot, mid = tuck, cy = 1.1, view = 1.32, lean = .18, x, face = 0, faceBy = up - .1 } = o;
  const r0 = o.rotFrom ?? up - .03, r1 = o.rotTo ?? down - .005;
  const AX = { rx: 'roll', rz: 'bank', ry: 'twist' };
  return (p, b, g) => {
    // side-on for the flips (so the shape in the air reads): it turns as it sets, and back to you as it lands
    if (face) g.turn += face * sm(seg(p, 0, faceBy)) * (1 - sm(seg(p, down + .06, .95)));
    crouch(b, g, sm(seg(p, 0, up * .72)) * (1 - sm(seg(p, up - .05, up))), lean);
    takeoff(b, g, bell(seg(p, up - .06, up + .1)));
    mid(b, pl(p, up + .02, up + .12, down - .14, down - .03), g, p);
    if (rot) g[AX[rot[0]]] += rot[1] * eio(seg(p, r0, r1));
    g.air += arc(p, up, down, Hh);
    g.gw = 1 - pl(p, up - .02, up + .06, down - .07, down);
    landing(b, g, land(p, down - .01, .2));
    tada(b, pl(p, down + .07, down + .14, .9, 1));
    g.piv = [0, cy, 0];
    g.view = 1 + (view - 1) * pl(p, up - .12, up + .08, down - .06, down + .14);
    if (x) {   // a step out to where it starts, across in the air (and a little skip back to the middle after, if it lands off it)
      g.x += x[0] * sm(seg(p, 0, up)) + (x[1] - x[0]) * eio(seg(p, up, down)) - x[1] * eio(seg(p, down + .08, .98));
      if (x[1]) g.air += .05 * bell(seg(p, down + .1, .97));
    }
  };
}
const star = (b, k) => { if (k > 1e-4) b.n('sit', 0, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [0, .95, 0, .95], k).hs(H([-1.04, .68, .12], [-.1, -1, -.5]), k).a('head', [-.06, 0, 0], k); };   // arms and legs out wide, sideways
const hugIn = (b, k) => { if (k > 1e-4) b.n('sit', .1, k).n('kickL', 0, k).n('kickR', 0, k).hs(HUG, k).a('head', [.08, 0, 0], k); };
const wheel = (b, k) => { if (k > 1e-4) b.n('sit', 0, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [0, .9, 0, .9], k).hs(UPV, k); };   // a star turning: legs straddled sideways
const noHands = (b, k) => { if (k > 1e-4) b.n('sit', 0, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [0, 1.05, 0, 1.05], k).hs(HUG, k).a('head', [.06, 0, 0], k); };
const lay = (b, k) => { if (k > 1e-4) b.n('sit', 0, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [0, 0, 0, 0], k).hs(UPV, k).a('head', [-.12, 0, 0], k).a('body', [-.08, 0], k); };   // stretched out, a little arched
const tuckThenOpen = (b, k, g, p) => {   // a backflip: tucked tight over the top, opening out to land
  tuck(b, k);
  const op = sm(seg(p, .6, .7)) * (1 - sm(seg(p, .72, .8)));
  b.hs(OUT, op * .8).n('sit', 0, op).a('legs', [0, 0, 0, 0], op).a('body', [0, 0], op).a('head', [0, 0, 0], op);
};

// a cartwheel: turning about its middle on its hands and feet, always on the ground
function cartwheel(p, b, g){
  const a0 = .16, a1 = .82;
  b.hs(UPV, pl(p, .02, .14, .84, .92)).a('body', [0, -.06], pl(p, .02, .14, .2, .3));   // arms up, leaning into it
  wheel(b, pl(p, a0, a0 + .1, a1 - .1, a1));
  g.rz -= TAU * eio(seg(p, a0, a1));
  g.x += -.4 * sm(seg(p, 0, a0)) + .6 * eio(seg(p, a0, a1)) - .2 * eio(seg(p, a1 + .04, .98));
  g.air += .06 * bell(seg(p, a0 + .1, a1 - .1)) + .04 * bell(seg(p, a1 + .06, .97));
  squash(g, .1 * pl(p, 0, .1, .12, .18));
  landing(b, g, land(p, a1 - .01, .16));
  tada(b, pl(p, a1 + .06, a1 + .12, .92, 1));
  g.view = 1 + .26 * pl(p, .04, .2, .82, .95);
}
// a handstand (with this big head, its head comes down too): a step, a kick up over the side, a wobbling hold with the
// legs scissoring, and down again the way it came
function handstand(p, b, g, k){
  const up0 = .1, up1 = .3, dn0 = .72, dn1 = .9;
  const inv = eio(seg(p, up0, up1)) * (1 - eio(seg(p, dn0, dn1)));   // 0 standing, 1 upside down
  const hold = pl(p, up1 - .02, up1 + .06, dn0 - .04, dn0 + .02), ht = k.t - k.t0;
  b.hs(UPV, pl(p, .0, .1, dn1 - .02, dn1 + .06));
  b.hs(H([-.82, 1.08, .2], [-.3, -1, -.4]), hold);   // arms reaching down past its head, as if planted
  crouch(b, g, pl(p, 0, .06, .08, .12), .1);
  b.n('kickL', 1.5 + .45 * Math.sin(ht * 4.2), hold).n('kickR', 1.5 - .45 * Math.sin(ht * 4.2), hold);   // legs scissoring up there
  b.n('kickL', 1.4, bell(seg(p, up0, up1)) * (1 - hold)).n('kickL', 1.2, bell(seg(p, dn0, dn1)) * (1 - hold));
  const wob = hold * (.07 * Math.sin(ht * 3.1) + .03 * Math.sin(ht * 7.3 + 1));
  g.rz -= Math.PI * inv + wob;
  g.x -= wob * .3;   // turns about its middle, in place; the wobble shifts it a touch
  landing(b, g, land(p, dn1 - .01, .12));
  tada(b, pl(p, dn1 + .02, dn1 + .06, .96, 1));
  g.view = 1 + .12 * pl(p, up0, up1, dn0, dn1);
}
// a turn about the vertical, then a roll about the body's own left-right axis (Ry · Rx), as the mover's XYZ angles
function turnRoll(g, turn, roll){
  const c = Math.cos(turn), s = Math.sin(turn), cb = Math.cos(roll), sb = Math.sin(roll);
  g.ry = Math.asin(Math.max(-1, Math.min(1, s * cb))); g.rx = Math.atan2(sb, c * cb); g.rz = Math.atan2(-s * sb, c);
}
// a forward roll along the ground, toward the viewer, then up with a ta-da
function somersault(p, b, g){
  const a0 = .18, a1 = .78;
  const cr = pl(p, 0, a0 - .02, a1 - .02, a1 + .1);
  crouch(b, g, pl(p, 0, .12, a0, a0 + .04), .3);
  b.n('sit', .7, pl(p, .06, a0, a0 + .02, a0 + .06)).hs(H([-.36, .06, .62], [-1, -.5, 0]), pl(p, .06, a0, a0 + .02, a0 + .08));   // hands to the ground
  tuck(b, pl(p, a0 - .04, a0 + .06, a1 - .08, a1 + .04));
  b.a('head', [.45, 0, 0], cr * .6);
  // turned three-quarters to the viewer (so the roll reads), rolling forward along the way it faces
  const turn = -.85 * eio(seg(p, .02, a0)) * (1 - eio(seg(p, a1, .96))), roll = TAU * eio(seg(p, a0, a1));
  turnRoll(g, turn, roll);
  const d = -.22 * sm(seg(p, 0, a0)) + .44 * eio(seg(p, a0, a1)) - .22 * eio(seg(p, a1 + .04, .98));
  g.x += d * Math.sin(-.85); g.z += d * Math.cos(-.85);
  g.piv = [0, .75, 0];
  const st = bell(seg(p, a1 - .02, a1 + .14));
  squash(g, -.06 * st); b.hs(UPV, st);
  tada(b, pl(p, a1 + .08, a1 + .14, .92, 1));
  g.view = 1 + .1 * pl(p, .1, .25, .75, .9);
}
// two quick back handsprings, low and fast, in place
function flipflop(p, b, g){
  const s1 = [.14, .47], s2 = [.5, .82];
  crouch(b, g, pl(p, 0, .1, .11, .15), .15);
  let roll = 0;
  [s1, s2].forEach(([a, z], i) => {
    takeoff(b, g, bell(seg(p, a - .04, a + .08)));
    lay(b, pl(p, a + .03, a + .1, z - .1, z - .02));
    g.air += arc(p, a, z, i ? .42 : .34);
    roll -= TAU * eio(seg(p, a - .02, z - .005));
  });
  turnRoll(g, .55 * eio(seg(p, .02, .14)) * (1 - eio(seg(p, .84, .97))), roll);   // turned a little, so the springs read
  squash(g, .1 * land(p, s1[1] - .01, .06));    // a quick rebound between them
  g.gw = 1 - Math.max(pl(p, s1[0] - .02, s1[0] + .05, s1[1] - .06, s1[1]), pl(p, s2[0] - .02, s2[0] + .05, s2[1] - .06, s2[1]));
  landing(b, g, land(p, s2[1] - .01, .14));
  tada(b, pl(p, s2[1] + .06, s2[1] + .12, .92, 1));
  g.piv = [0, 1.05, 0];
  g.view = 1 + .22 * pl(p, .08, .2, .78, .92);
}

/* ---- backflip variations: the same air() beats, a different shape in the air or way in ---- */
const tightTuck = (b, k) => tuck(b, k);                                               // knees to the chest all the way round
const layout = (b, k) => { if (k > 1e-4) b.n('sit', 0, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [0, 0, 0, 0], k).hs(HEAD, k).a('body', [-.1, 0], k).a('head', [-.2, 0, 0], k); };   // straight as a board, arms overhead
// folded at the hips with the legs straight and together (no knee bend: no sit), reaching for the toes
const pike = (b, k) => { if (k > 1e-4) b.n('sit', 0, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [1.6, 0, 1.6, 0], k).hs(H([-.19, .18, .62], [-1, -.2, .2]), k).a('body', [.5, 0], k).a('head', [.32, 0, 0], k); };
// a flash kick: one leg swings up hard at take-off and leads the turn, the other follows, then it opens to land
// (the arms swing back and up, in the plane of the flip: held out to the side, the near one hid the legs side-on)
const BACKUP = H([-.56, .82, -.3], [-.5, -1, .3]);
const flash = (b, k, g, p) => {
  if (k > 1e-4) b.n('sit', 0, k).n('kickR', 0, k).n('kickL', 0, k).a('legs', [.3 + 1.6 * sm(seg(p, .4, .56)), 0, 2.3, 0], k).hs(BACKUP, k).a('body', [-.08, 0], k);
};
// an airwalk: running in mid-air, legs cycling and arms windmilling, laid out
const airwalk = (b, k, g, p) => {
  if (k <= 1e-4) return;
  const c = Math.sin(p * TAU * 3);
  b.n('sit', 0, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [.45 + .95 * c, 0, .45 - .95 * c, 0], k).a('body', [-.06, 0], k);   // striding: one forward as the other goes back
  b.h('L', H([-.56, .62 + .3 * c, .38 * c], [-.4, -1, -.3]), k).h('R', H([.56, .62 - .3 * c, -.38 * c], [.4, -1, -.3]), k);   // windmilling front to back
};
// one leg stays up from the take-off to the landing: the flip goes round on one leg
const oneLeg = (b, k) => { if (k > 1e-4) b.n('sit', .1, k).n('kickL', 0, k).n('kickR', 0, k).a('legs', [.15, 0, 1.75, 0], k).hs(BACKUP, k * .8).a('body', [.12, 0], k); };
// a twisting layout: a full turn about the long axis while it goes over
const twistAir = (b, k) => layout(b, k);
// extra beats laid over air(): before the take-off, and travel or twist along the way
function variant(base, extra){ return (p, b, g, k) => { base(p, b, g, k); extra(p, b, g, k); }; }
const SIDE_ON = -1.4;   // flips are seen side-on (facing the viewer's left, a touch of the face showing), so their shape reads
// a gainer: going over backwards while travelling forwards, off a swinging leg (the free leg kicks up and forward,
// carrying it forward as it goes over)
const gainer = variant(air({ rot: ['rx', -TAU], mid: layout, Hh: .5, face: SIDE_ON }), (p, b, g) => {
  g.fwd += -.25 * sm(seg(p, .0, .14)) + .85 * eio(seg(p, .2, .76)) - .6 * eio(seg(p, .84, .99));   // a step back to start, then forward through it
  b.a('legs', [0, 0, 1.6, 0], bell(seg(p, .12, .34))).n('kickR', 0, bell(seg(p, .12, .34)));      // the swing leg
});
// a full twist: a layout backflip with one full turn about its own long axis, the twist in the middle of the flip
const fullTwist = variant(air({ rot: ['rx', -TAU], mid: twistAir, Hh: .62, view: 1.4, face: SIDE_ON }), (p, b, g) => {
  g.twist += TAU * eio(seg(p, .32, .68));
  b.hs(HUG, pl(p, .3, .36, .64, .7));   // arms pulled in to the chest while it twists (it spins faster), out again to land
});
const pistol = variant(air({ rot: ['rx', -TAU], mid: tightTuck, up: .42, down: .82, face: SIDE_ON, faceBy: .1 }), (p, b, g) => {   // a slow one-leg squat first, the other leg straight out in front
  // (kept shallow: a deep sit sinks the hips into the legs on this short-legged body, which reads as a broken figure)
  const sq = pl(p, .02, .22, .34, .41);
  b.n('sit', .38, sq).n('kickR', 0, sq).n('kickL', 0, sq).a('legs', [-.1, 0, 1.35, -.1], sq).hs(H([-.3, .72, .66], [-1, -.6, -.2]), sq).a('body', [.22, 0], sq).a('head', [.06, 0, 0], sq);
});
// a single-leg backflip: the free leg swings up as it takes off from the other one, and stays up over the top
const oneLegFlip = variant(air({ rot: ['rx', -TAU], mid: oneLeg, Hh: .55, face: SIDE_ON }), (p, b, g) => {
  const sw = pl(p, .14, .25, .3, .36);
  b.a('legs', [0, 0, -.35 + 2.1 * sm(seg(p, .16, .27)), 0], sw);   // back, then up hard
});

/* ---- parkour: over an imaginary obstacle in front of it. It travels across, left to right, so it turns to face the way
   it's going (side-on, a touch of the visor showing) and back to you after; every lean and tip is about its own body
   (roll forward/back, bank side to side), so it reads the same seen from the side ---- */
const TRAVEL = 1.3;
const facing = (p, a, z) => TRAVEL * sm(seg(p, 0, a)) * (1 - sm(seg(p, z, .97)));
const run = (b, k, p, f = 4) => {   // legs striding forward and back, arms pumping opposite
  if (k <= 1e-4) return; const c = Math.sin(p * TAU * f);
  b.n('kickL', 0, k).n('kickR', 0, k).a('legs', [.35 + .75 * c, 0, .35 - .75 * c, 0], k).a('body', [.14, 0], k)
   .h('L', H([-.56, .45 - .15 * c, .3 * -c], [-.4, -1, -.3]), k).h('R', H([.56, .45 + .15 * c, .3 * c], [.4, -1, -.3]), k);
};
const REACH = H([-.38, .66, .6], [-1, -.6, -.2]);   // arms out in front: sticking a landing
// a precision jump: a two-footed spring from a deep arm swing, knees lifted in the air, landing on the toes on a point,
// arms out in front for balance
const precision = air({ x: [-.55, .55], Hh: .38, rot: null, lean: .22, face: TRAVEL,
  mid: (b, k, g, p) => { if (k > 1e-4) { b.n('sit', .15, k).a('legs', [.9, 0, .9, 0], k * pl(p, .3, .42, .56, .68)).hs(REACH, k); g.roll -= .08 * k; } } });
// a running jump: a run up, a take-off from one foot into a stride in the air (lead leg forward, trail leg back, the
// opposite arm forward), landing with the arms out in front
const runJump = variant(air({ x: [-.85, .75], up: .42, down: .76, Hh: .42, view: 1.3, face: TRAVEL, faceBy: .08, lean: .1,
  mid: (b, k) => { if (k > 1e-4) b.n('kickR', 0, k).n('kickL', 0, k).a('legs', [-.55, 0, 1.35, 0], k).h('L', H([-.4, .72, .55], [-1, -.6, -.2]), k).h('R', H([.52, .42, -.32], [.4, -1, .3]), k).a('body', [.05, 0], k); } }),
  (p, b, g) => { run(b, pl(p, .02, .08, .34, .42), p, 5); g.air += .03 * Math.abs(Math.sin(p * TAU * 5)) * pl(p, .02, .08, .34, .42); });
// bounding leaps, one leg forward and the other back, then the other way, travelling across
function striding(p, b, g){
  const steps = [[.08, .3], [.32, .54], [.56, .78]];
  g.turn += facing(p, .07, .82);
  steps.forEach(([a, z], i) => {
    const k = pl(p, a - .02, a + .05, z - .05, z), side = i % 2;
    b.n('kickL', 0, k).n('kickR', 0, k).a('legs', side ? [1.25, 0, -.55, 0] : [-.55, 0, 1.25, 0], k);
    const fw = H([-.42, .7, .52], [-1, -.6, -.2]), bk = H([-.52, .4, -.3], [-.4, -1, .3]);   // the arm opposite the lead leg forward
    b.h('L', side ? bk : fw, k).h('R', mir(side ? fw : bk), k);
    g.air += arc(p, a, z, .3); squash(g, .08 * land(p, z - .01, .05));
  });
  g.x += -.7 * sm(seg(p, 0, .08)) + 1.4 * seg(p, .08, .78) - .7 * eio(seg(p, .82, .98));
  g.gw = 1 - Math.max(...steps.map(([a, z]) => pl(p, a - .02, a + .05, z - .05, z)));
  tada(b, pl(p, .82, .88, .95, 1)); g.view = 1 + .28 * pl(p, .02, .1, .82, .95);
}
// a kong vault: a dive forward onto the obstacle, both hands planted on it ahead of the shoulders, the body tipped
// forward over them, knees tucked up and through between the arms, a push off, legs out in front to land
const kong = variant(air({ x: [-.6, .6], Hh: .4, up: .3, down: .74, lean: .3, face: TRAVEL,
  mid: (b, k, g, p) => {
    if (k <= 1e-4) return;
    const plant = pl(p, .3, .38, .5, .56), tk = pl(p, .4, .48, .58, .66);
    b.hs(H([-.24, .32, .64], [-1, -.3, .1]), k * plant).a('body', [.2, 0], k * plant);   // both hands on it, together, in front
    b.n('kickL', 0, k).n('kickR', 0, k).a('legs', [1.5, .05, 1.5, .05], k * tk);       // knees through
    b.hs(REACH, k * sm(seg(p, .56, .68)));
  } }),
  (p, b, g) => { g.roll += 1.0 * bell(seg(p, .28, .6)) - .25 * bell(seg(p, .58, .74)); });
// a safety vault: the near hand planted on the obstacle, the near knee lifted over it beside the hand, the far leg
// trailing, the body leaning over the hand and the free arm out for balance
const safety = air({ x: [-.55, .55], Hh: .3, lean: .15, face: TRAVEL,
  mid: (b, k, g) => { if (k <= 1e-4) return; b.h('L', H([-.42, .1, .5], [-1, -.3, 0]), k).h('R', H([.7, .75, .2], [.4, -1, -.3]), k).n('kickR', 0, k).n('kickL', 0, k).a('legs', [1.4, .1, .55, 0], k).a('body', [.15, 0], k); g.twist -= .55 * k; g.bank -= .25 * k; } });
// a speed vault: at a run, the body lays back and over to the hand side, the legs together swing over it to the far
// side, one hand brushing it
const speedV = variant(air({ x: [-.8, .7], up: .36, down: .7, Hh: .36, face: TRAVEL, faceBy: .06,
  mid: (b, k, g) => { if (k <= 1e-4) return; b.n('kickL', 0, k).n('kickR', 0, k).a('legs', [.7, .3, .7, .3], k).h('L', H([-.42, .08, .4], [-1, -.3, 0]), k).h('R', H([.75, .85, .1], [.4, -1, -.3]), k); g.twist -= 1.1 * k; g.bank -= .6 * k; g.roll -= .1 * k; } }),   // (hips turned across it, so the sideways lay-back shows)
  (p, b) => run(b, pl(p, .02, .08, .3, .36), p, 4));
// a lazy vault: a hand on it, the legs swinging over one after the other, the hips turning as they go
const lazy = air({ x: [-.6, .6], Hh: .32, lean: .1, face: TRAVEL,
  mid: (b, k, g, p) => { if (k <= 1e-4) return; const sw = seg(p, .3, .7); b.n('kickR', 0, k).n('kickL', 0, k).a('legs', [1.3 * bell(sw * 1.4 - .4), .2, 1.3 * bell(sw * 1.4), .2], k).h('L', H([-.42, .1, .45], [-1, -.3, 0]), k).h('R', mir(OUT), k * .5); g.twist -= .9 * bell(sw) * k; g.bank -= .3 * k; } });
// a wall run: a run at a wall, two or three steps straight up it, the hands reaching for the top, then a push off back
// and down to a landing
function wallRun(p, b, g){
  g.turn += facing(p, .08, .84);
  run(b, pl(p, .04, .12, .58, .66), p, 5);
  const up = pl(p, .18, .48, .56, .8);
  g.air += .8 * up; g.gw = 1 - pl(p, .16, .22, .74, .8);
  g.x += .45 * sm(seg(p, .04, .2)) - .45 * eio(seg(p, .56, .9));
  g.roll -= .18 * pl(p, .2, .3, .5, .6);                                                // upright on the wall, leaning back off it a touch
  b.hs(H([-.56, .95, .3], [-1, -.3, -.4]), bell(seg(p, .42, .62)));                    // reaching for the top
  landing(b, g, land(p, .79, .14)); tada(b, pl(p, .86, .9, .96, 1));
  g.view = 1 + .35 * pl(p, .12, .3, .7, .88);
}
// a cat leap: a jump to a wall in front, hanging from its top edge by the hands with the feet against the wall below,
// then dropping down
function catLeap(p, b, g){
  g.turn += facing(p, .1, .86);
  crouch(b, g, pl(p, 0, .1, .12, .16), .1);
  const hang = pl(p, .22, .3, .66, .74);
  g.air += .85 * pl(p, .14, .28, .68, .8) + .03 * Math.sin(p * 30) * hang; g.gw = 1 - pl(p, .14, .2, .76, .82);
  b.hs(H([-.52, .95, .32], [-1, -.2, -.4]), pl(p, .12, .22, .7, .78));                  // hands up on the edge, in front, either side of the head
  b.n('sit', 0, hang).n('kickL', 0, hang).n('kickR', 0, hang).a('legs', [.75, 0, .6, 0], hang).a('head', [-.18, 0, 0], hang);   // hanging long, feet forward on the wall
  g.roll += .12 * hang;                                                                // top toward the wall, hips back
  landing(b, g, land(p, .8, .14)); tada(b, pl(p, .88, .92, .96, 1));
  g.view = 1 + .45 * pl(p, .1, .25, .75, .9);
}

/* ---- push-ups: side-on, a plank tipped forward about its toes, the hands planted under the shoulders, a few reps ----
   This body's arms are as long as its legs and body together (hanging, its paws reach the floor) and its head is half its
   height. So a flat plank would put the visor on the floor, and straight arms straight down would stand it back up. The
   honest version: a plank about 25° off the floor (the head clear of it), each hand set a little out to the side so the
   arm is long and straight at the top (side-on, a straight upright support under the shoulder), and the elbows bending
   back as the chest lowers. The hands stay where they were planted while the body moves over them, and the toes stay
   where they are: it turns about them. */
const SH = [.3, .42, .06];   // the shoulder, torso space (robot3d.js)
// side-on and tipped by th: u along the floor toward the head, v up. The lowest point (not counting the hands, the last
// eight points), where it is along the floor, the shoulder, and the whole figure's extent along the floor
function side(c, th){
  const pts = points(c), n = pts.length - 8, cs = Math.cos(th), sn = Math.sin(th);
  let lo = Infinity, lu = 0, lz = 0, ly = 0, u0 = Infinity, u1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const [, y, z] = pts[i], v = y * cs - z * sn, u = y * sn + z * cs;
    if (v < lo - 1e-6) { lo = v; lu = u; ly = y; lz = z; }
    if (u < u0) u0 = u; if (u > u1) u1 = u;
  }
  const sy = .32 - c.sit * .18 + SH[1], sz = SH[2];
  return { lo, lu, ly, lz, u0, u1, su: sy * sn + sz * cs, sv: sy * cs - sz * sn };
}
const pushups = (o = {}) => (p, b, g) => {
  const reps = o.reps ?? 3, a0 = .2, a1 = .84;
  const P = pl(p, .03, a0 - .02, a1 + .01, .97);                                     // down into the plank, and back up after
  const ph = seg(p, a0, a1) * reps, rep = Math.min(reps - 1, Math.floor(ph)), f = ph - rep, on = p > a0 && p < a1 ? 1 : 0;
  const down = on * (f < .5 ? sm(f / .5) : 1 - sm(seg(f, .55, .88)));                 // lowered under control, pressed up
  const sd = rep % 2 ? -1 : 1;                                                         // which side this rep favours (spider, archer): the near side first
  const legs = o.legs || [0, 0, 0, 0];
  // the plank: body and legs in one straight line (or the knees down), the head in line, looking a little ahead
  const tgt = { ...b.c, sit: 0, kickL: 0, kickR: 0, body: [o.bend ?? 0, 0], legs };
  b.n('sit', 0, P).n('kickL', 0, P).n('kickR', 0, P).a('body', [o.bend ?? 0, 0], P).a('legs', legs, P).a('head', [o.head ?? -.45, 0, 0], P);
  const th0 = o.th ?? .82, th = th0 + (o.dth ?? .3) * down;                            // the top, and how far the chest lowers
  const T = side(tgt, th0), C = side(tgt, th);
  // the hands, planted on the floor under the shoulders as they were at the top; seen from the body as it moves
  const paw = .17, hu = C.lu + (T.su - T.lu) + (o.hu ?? .06), hv = C.lo + paw;
  const du = hu - C.su, dv = hv - C.sv, cs = Math.cos(th), sn = Math.sin(th);
  const dy = du * sn + dv * cs, dz = du * cs - dv * sn;
  const at = (x, pole, ex = 0) => H([x, SH[1] + dy + ex * sn, SH[2] + dz + ex * cs], pole);   // (ex: further along the floor, toward the head)
  const w = o.w ?? .32, pole = o.pole || [.05, -1, -.25];                              // the elbows bend back, toward the feet
  let L = at(-w, [-pole[0], pole[1], pole[2]]), R = at(w, pole);
  if (o.one) {   // one hand under the middle of the chest, the near one tucked behind its back
    L = at(-.12, [-.6, -1, -.4]);
    R = H([.2, .2, -.44], [1, .1, -.5]);
  }
  if (o.archer) {   // the body goes down over one hand while the other arm reaches straight out to the side along the floor
    const k = on * bell(f);                                                           // (the reach opens with each rep)
    const bent = at(sd * -.36, [sd * -.4, -1, -.3]), far = at(sd * (.36 + .5 * k), [sd * .3, -.2, -1]);
    if (sd > 0) { L = bent; R = far; } else { R = bent; L = far; }
  }
  b.h('L', L, P).h('R', R, P);
  let lift = 0;
  if (o.clap) {   // explosive: pressed up hard, the hands leave the floor, clap under the chest, and catch it
    const fl = on * bell(seg(f, .6, .98));
    lift = -.17 * fl;                                                                   // the upper body pops up, turning about the toes
    const cl = fl * sm(seg(f, .64, .74)) * (1 - sm(seg(f, .84, .94)));
    b.hs(H([-.07, SH[1] + dy * .45, SH[2] + dz * .45], [-1, -1, -.3]), cl);           // together under the chest
  }
  if (o.spider) {   // as the chest goes down, a knee swings out and up along the side to the elbow on that side
    const kn = down, lg = sd > 0 ? [0, 0, -.25 * kn, 1.65 * kn] : [-.25 * kn, 1.65 * kn, 0, 0];   // (out to the side and up along it, just off the floor)
    b.a('legs', lg.map((v, i) => v + legs[i]), P * kn);
  }
  turnRoll(g, P * (o.turn ?? -1.45), P * (th + lift));
  g.piv = [0, T.ly, T.lz];                                                             // about the toes (or knees): they stay put
  g.x += P * ((T.u1 + T.u0) / 2 - T.lu) * Math.sin(-(o.turn ?? -1.45));                // and the whole plank in the middle of the stage
  tada(b, pl(p, .93, .97, .98, 1));
  g.view = 1 + .1 * P;
};


/* ---- heroes: the signature moves everyone knows, done honestly by this short-armed, big-headed body ---- */
// web shoot: three-quarters on, feet apart, one arm snaps straight out, the wrist flicks back with the two outer fingers
// up and the middle one pressed to the palm, a little recoil; twice
function webShoot(p, b, g){
  const k = pl(p, .02, .14, .84, .97);
  g.turn += -1.2 * k;
  b.a('legs', [.12, .22, -.12, .22], k).n('sit', .12, k).a('body', [.06, .05], k).a('head', [-.04, -.25, 0], k);
  b.h('L', H([-.16, .32, .5], [-1, -.6, -.1]), k);                                    // the other hand guards low, at the chest
  const shot = Math.max(pl(p, .2, .26, .42, .5), pl(p, .52, .58, .74, .82));
  const flick = Math.max(bell(seg(p, .25, .33)), bell(seg(p, .57, .65)));              // the snap of the wrist as it fires
  b.h('R', H([.5, .7, .3], [.5, -1, -.3]), k * (1 - shot));                            // cocked by the shoulder
  b.h('R', H([.34, .58 + .1 * flick, .64], [1, -.6, -.2]), shot);                      // straight out at the target
  if (shot > .3) b.o.Rs = 'web';
  g.fwd -= .04 * flick; g.roll -= .05 * flick;
  // the web: out of the wrist as it snaps, shooting out along the arm to the target, where it splats; then it lets go
  const s1 = seg(p, .25, .36), s2 = seg(p, .57, .68);
  g.web = p < .5 ? (p > .25 ? s1 : 0) * (1 - sm(seg(p, .44, .5))) : (p > .57 ? s2 : 0) * (1 - sm(seg(p, .76, .82)));
}
// web swing: hanging from a web line up and to one side, it swings down through the bottom of the arc and up the other
// side, legs tucking through the bottom and stretching out at the ends, then lets go and drops to a landing
function webSwing(p, b, g){
  const s0 = .12, s1 = .78, L = 1.1;
  const sw = seg(p, s0, s1), a = -.85 * Math.cos(Math.PI * sw);                        // from one side, through the bottom, to the other
  const k = pl(p, .02, s0, s1, s1 + .06);
  crouch(b, g, pl(p, 0, .06, .08, .12), .1);
  b.h('R', H([.42, 1.0, .18], [1, -.3, -.4]), k);                                      // the line hand up past the head
  b.h('L', OUT, k * .6).h('L', H([-.62, .8, .28], [-.4, -1, -.3]), k * .4);
  const bot = bell(sw);
  b.a('legs', [.9 * bot, .05, .9 * bot, .05], k).a('legs', [-.25, 0, .35, 0], k * (1 - bot)).a('body', [-.05, 0], k);
  g.x += L * Math.sin(a) * k;
  g.air += (L * (1 - Math.cos(a)) + .35) * k;
  g.gw = 1 - k;
  g.bank += -a * .9 * k;                                                               // hanging from the hand: tipped along the line
  g.turn += -.3 * k;
  g.line = k * (1 - sm(seg(p, s1 - .03, s1)));   // the web line, up to where it's stuck
  landing(b, g, land(p, s1 + .04, .14));
  g.view = 1 + .3 * k;
}
// superhero landing: dropping in from above, it lands on one knee with one fist on the ground, head down, then looks up
// and rises
const heroLanding = side => (p, b, g) => {
  // from the sky: it drops in from above the stage, feet first and fast, arms up; hits the ground into the classic
  // three-point landing (one knee down, one fist on the ground, the other arm out back) with a shockwave; a beat with
  // the head down, then it looks up, and rises
  const F = .3, fall = 1 - seg(p, 0, F), fallE = fall * fall;                            // accelerating down
  const down = pl(p, F - .01, F + .03, .74, .9), look = pl(p, .5, .58, .74, .82);
  g.air += 6.5 * fallE; g.gw = p < F ? 0 : 1;
  b.hs(UPV, pl(p, 0, .04, F - .06, F)).a('legs', [.15, .12, -.1, .12], fall).a('head', [-.25, 0, 0], fall);
  g.turn += (side ? -1.2 : -.22) * pl(p, F - .12, F - .02, .82, .95);                 // front: facing you (a touch turned for depth); side: in profile
  b.n('sit', .5, down).a('legs', [-1.2, -.05, .6, .12], down).a('body', [.38, -.06], down).a('head', [.35 - .6 * look, 0, 0], down);
  b.h('R', H([.3, -.06, .55], [1, -.4, -.1]), down).h('L', H([-.95, .42, .05], [-.4, -1, -.4]), down);   // fist planted in front, the other arm flung out wide
  squash(g, .1 * land(p, F, .06));
  g.shock = seg(p, F, F + .22) > 0 && p < F + .22 ? seg(p, F, F + .22) : 0;           // the ring on the ground
  tada(b, pl(p, .9, .94, .97, 1));
};
// flying: a crouch, a leap up, it tips forward to lie along the air with one fist out ahead (by its head: these arms
// can't reach past it) and the other at its side, flies across, banks round and back, and drops in to land
function flying(p, b, g){
  crouch(b, g, pl(p, 0, .07, .09, .13), .2);
  const k = pl(p, .12, .24, .78, .88), up = pl(p, .1, .24, .8, .92);
  const back = sm(seg(p, .42, .56));                                                   // the turn round at the far end
  g.turn += k * (Math.PI / 2 + Math.PI * back);
  g.roll += 1.35 * k + .04 * Math.sin(p * 30) * k;
  g.bank += .5 * bell(seg(p, .42, .56)) * k;                                           // banking into the turn
  g.air += .9 * up + .04 * Math.sin(p * 18) * k; g.gw = 1 - up;
  g.x += .95 * Math.sin(Math.PI * seg(p, .2, .8)) * k;
  b.h('R', H([.66, 1.0, .34], [.4, -1, -.3]), k).h('L', H([-.5, .1, -.06], [-1, .2, -.4]), k);   // one fist leading, the other back
  b.a('legs', [-.12, 0, -.12, 0], k).a('head', [-.4, 0, 0], k).a('body', [-.06, 0], k);
  landing(b, g, land(p, .88, .1));
  g.view = 1 + .55 * up;
}
// super speed: a deep forward lean, legs and arms a blur, it shoots across the stage, skids round and comes back
// super speed, like the Flash: a sprinter's crouch, then gone off one side in a streak; it shoots back across the
// whole screen from the other side, across again the other way, then skids to a stop right where it started. The
// streak (g.streak: which way and how fast) is drawn by robot3d.js as afterimages and lightning behind it
function speedRun(p, b, g, kk){
  const t = kk.t - kk.t0, c = Math.sin(t * 40), W = 5.5;                  // W: far enough to be off any stage
  // [from, to, start x, end x]: each a dash; between them it's off screen
  const dash = [[.1, .3, 0, W], [.4, .66, -W, 0]];                         // out one side, back in from the other
  const set = pl(p, .02, .08, .08, .11), stop = pl(p, .62, .66, .8, .92);
  let x = 0, dir = 0, run = 0;
  for (const [a, z, x0, x1] of dash) {
    if (p >= a && p <= z) { const q = (p - a) / (z - a), last = x1 === 0; x = x0 + (x1 - x0) * (last ? eo(q) : q); dir = Math.sign(x1 - x0); run = 1; }
  }
  if (p > .3 && p < .4) x = W;                                             // off screen for a blink
  g.x += x; g.ctr = 0;
  g.turn += (dir || 1) * Math.PI / 2 * Math.max(run, set) * (1 - stop * (p > .66 ? 1 : 0)) + 0;   // side-on while it runs, facing you again at the end
  g.roll += .5 * run;                                                       // leaning hard into it
  b.n('sit', .25, set).a('head', [.2, 0, 0], set).hs(H([-.45, .15, .3], [-1, -.6, -.2]), set);   // ready
  b.a('legs', [.35 + 1.1 * c, 0, .35 - 1.1 * c, 0], run).a('head', [-.3, 0, 0], run);
  b.h('L', H([-.5, .3 + .25 * c, -.2 + .45 * c], [-1, -.6, -.2]), run).h('R', H([.5, .3 - .25 * c, -.2 - .45 * c], [1, -.6, -.2]), run);
  b.a('legs', [.6, .15, -.3, .15], stop).a('body', [-.15, 0], stop);       // feet planted, skidding to a halt
  tada(b, pl(p, .82, .88, .95, 1));
  g.gw = 1; g.streak = dir * run;
}
// portal circles: facing you, feet set, the lead hand draws circle after circle in front of it while the other hand
// holds steady; a ring of sparks grows where it draws
function portal(p, b, g){
  const k = pl(p, .02, .12, .82, .95), d = pl(p, .14, .2, .8, .86), t = TAU * 3 * seg(p, .14, .86);
  b.a('legs', [.1, .25, -.1, .25], k).n('sit', .1, k).a('head', [.06, 0, 0], k);
  b.h('R', H([.28 + .16 * Math.cos(t), .55 + .16 * Math.sin(t), .62], [1, -.8, -.2]), k);
  b.h('L', H([-.36 - .1 * Math.cos(-t + 1), .5 + .1 * Math.sin(-t + 1), .58], [-1, -.8, -.2]), k);   // the other turning the other way, smaller
  g.ring = sm(seg(p, .2, .55)) * (1 - sm(seg(p, .82, .92)));
  g.view = 1 + .1 * k;
}

/* ---- the everyday moves, in 3D ---- */
// hops: [take-off, touch-down, height]...; arms up a little in the air
const hops = (list, o = {}) => (p, b, g) => {
  const first = list[0][0];
  crouch(b, g, pl(p, 0, first * .7, first - .04, first), o.lean ?? .12);
  let air = 0;
  list.forEach(([a, z, h], i) => {
    g.air += arc(p, a, z, h);
    air = Math.max(air, pl(p, a - .02, a + .06, z - .06, z));
    squash(g, -.06 * bell(seg(p, a - .04, a + .08)));
    squash(g, (i === list.length - 1 ? .14 : .1) * land(p, z - .01, i === list.length - 1 ? .2 : .1));
  });
  if (o.stiff) b.hs(SIDE, pl(p, 0, .08, .9, 1)).n('kickL', 0, pl(p, 0, .08, .9, 1)).n('kickR', 0, pl(p, 0, .08, .9, 1));
  else b.hs(UPV, air * (o.arms ?? .6));
  g.gw = 1 - air;
  if (o.spin) g.ry += TAU * eio(seg(p, ...o.spin));
  if (o.ta) tada(b, pl(p, ...o.ta));
  g.view = 1 + (o.view ?? .08) * air;
};
const env = (p, a = .12, b = .15) => pl(p, 0, a, 1 - b, 1);
// lean about the feet
const leanM = (rx, rz) => (p, b, g) => {
  const k = pl(p, 0, .3, .68, 1);
  g.rx += rx * k; g.rz += rz * k; g.piv = [0, .05, 0];
  b.hs(OUT, k * .1).a('head', [-rx * .5, 0, rz * .4], k);
};
const jitter = (t, f, a) => a * (Math.sin(t * f) * .6 + Math.sin(t * f * 1.73 + 1.3) * .4);
const shiverM = (f, amp, hands) => (p, b, g, k) => {
  const e = env(p, .1, .2), t = k.t - k.t0;
  g.x += jitter(t, f, amp) * e; g.rz += jitter(t, f * .8 + 3, amp * 1.4) * e; squash(g, .03 * e);
  if (hands) b.hs(hands, e);
  b.a('head', [.06, null, null], e);
};
const fall = side => (p, b, g) => {   // over sideways about the foot edge, a beat on the ground, back up
  const f0 = side > 0 ? .28 : .22, f1 = f0 + .18, u0 = .68, u1 = .9;
  const down = ei(seg(p, f0, f1)) * (1 - eio(seg(p, u0, u1)));
  const bump = .08 * bell(seg(p, f1, f1 + .08));
  const wob = side > 0 ? .07 * Math.sin(seg(p, 0, f0) * TAU * 1.5) * (1 - seg(p, f0 - .05, f0)) : 0;   // a faint sways first
  g.rz += side * (1.5 * down - bump * down) + wob; g.piv = [-side * .26, .05, 0];
  g.x += side * .75 * sm(down);   // and slides back under the camera, so the head stays in view
  b.hs(OUT, pl(p, f0 - .06, f0 + .04, u1 - .06, u1)).n('kickL', .6, pl(p, f0, f1, u0, u1)).a('head', [0, 0, side * .3], pl(p, f0, f1, u0, u1));
  b.hs(SIDE, pl(p, f1, f1 + .06, u0 - .02, u0 + .04) * .6);
  squash(g, .08 * land(p, u1 - .01, .1));
  g.rz += -side * .05 * bell(seg(p, u1, 1));
  g.view = 1 + .28 * pl(p, f0 - .04, f1, u0, u1 + .04);
};
const floatM = (Hh, o = {}) => (p, b, g, k) => {
  const e = pl(p, 0, .3, .7, 1), t = k.t - k.t0;
  g.air += Hh * e + .03 * Math.sin(t * (o.f ?? 3.2)) * e;
  g.gw = 1 - e;
  g.rz += (o.tilt ?? .05) * Math.sin(t * 1.7) * e;
  if (o.ry) g.ry += o.ry * Math.sin(p * TAU) * e;
  if (o.x) { g.x += o.x * Math.sin(p * TAU); g.rz -= o.x * .4 * Math.cos(p * TAU) * e; }
  b.n('kickL', .35 + .15 * Math.sin(t * 2.3), e).n('kickR', .35 - .15 * Math.sin(t * 2.3), e).hs(OUT, .55 * e).a('head', [-.06, 0, 0], e);
  squash(g, .1 * land(p, .9, .1));
  g.view = 1 + .12 * e;
};

const MOVES = {
  backflip: [1.15, air({ rot: ['rx', -TAU], mid: tuckThenOpen, face: SIDE_ON })],
  backtuck: [1.15, air({ rot: ['rx', -TAU], mid: tightTuck, Hh: .55, face: SIDE_ON })],
  backlayout: [1.25, air({ rot: ['rx', -TAU], mid: layout, Hh: .62, view: 1.38, face: SIDE_ON })],
  backpike: [1.2, air({ rot: ['rx', -TAU], mid: pike, Hh: .58, face: SIDE_ON })],
  gainer: [1.35, gainer],
  fulltwist: [1.4, fullTwist],
  flashkick: [1.2, air({ rot: ['rx', -TAU], mid: flash, Hh: .6, rotFrom: .2, face: SIDE_ON })],
  airwalk: [1.45, air({ rot: ['rx', -TAU], mid: airwalk, Hh: .68, up: .22, down: .78, view: 1.4, face: SIDE_ON })],
  onelegflip: [1.2, oneLegFlip],
  pistolflip: [1.8, pistol],
  // (wide, diamond, one-arm and archer are about where the hands go, so they're seen three-quarters from the front)
  pushup: [3.0, pushups()],
  widepushup: [3.0, pushups({ w: .8, pole: [.7, -1, -.3], turn: -1.0 })],
  diamondpushup: [3.0, pushups({ w: .09, pole: [1, -.4, -.4], hu: .02, turn: -1.0 })],
  kneepushup: [3.0, pushups({ legs: [-1.25, -.08, -1.25, -.08], th: .62, dth: .3 })],
  clappushup: [3.2, pushups({ clap: true, turn: -1.3 })],
  onearmpushup: [3.2, pushups({ one: true, legs: [0, .38, 0, .38], turn: -1.15, th: .86, dth: .2 })],
  pikepushup: [3.0, pushups({ legs: [1.05, 0, 1.05, 0], th: .92, dth: .17, head: .12, hu: .02, pole: [.05, -1, -.5] })],
  spiderpushup: [3.4, pushups({ spider: true, reps: 4, turn: -1.25 })],
  archerpushup: [3.4, pushups({ archer: true, reps: 4, turn: -.8 })],
  precision: [1.2, precision], runjump: [1.6, runJump], striding: [1.8, striding], kongvault: [1.4, kong], safetyvault: [1.3, safety],
  speedvault: [1.4, speedV], lazyvault: [1.4, lazy], wallrun: [1.8, wallRun], catleap: [2.0, catLeap],
  frontflip: [1.15, air({ rot: ['rx', TAU], lean: .32, cy: 1.05, face: SIDE_ON })],
  cartwheel: [1.4, cartwheel],
  handstand: [2.2, handstand],
  somersault: [1.5, somersault],
  spinjump: [1.1, air({ rot: ['ry', TAU], mid: hugIn, Hh: .5, view: 1.12, rotTo: .8 })],
  aerial: [1.3, air({ rot: ['rz', -TAU], mid: noHands, Hh: .42, cy: 1.0, view: 1.3, up: .24, down: .72, x: [-.3, 0] })],
  split: [1.0, air({ mid: star, Hh: .5, view: 1.15, up: .28, down: .7 })],
  flipflop: [1.8, flipflop],
  dismount: [.78, air({ rot: ['rx', -TAU], up: .14, down: .64, Hh: .45, view: 1.3 })],

  webshoot: [2.0, webShoot], webswing: [2.4, webSwing], herolanding: [3.0, heroLanding(false)], herolandingside: [3.0, heroLanding(true)], flying: [3.4, flying], speedrun: [1.5, speedRun], portal: [3.2, portal],

  hop: [.9, hops([[.24, .6, .3]])],
  bounce2: [1.1, hops([[.14, .44, .24], [.5, .74, .13]])],
  pogo: [1.2, hops([[.1, .34, .16], [.38, .62, .16], [.66, .88, .16]], { stiff: 1, lean: 0 })],
  popup: [.9, hops([[.3, .58, .16]], { arms: 1, ta: [.3, .42, .8, 1] })],
  tada: [1.3, hops([[.18, .38, .1]], { arms: 0, ta: [.14, .3, .82, 1] })],
  celebrate: [1.6, hops([[.12, .42, .32], [.5, .86, .42]], { arms: 1, spin: [.5, .88], ta: [.86, .92, .95, 1], view: .14 })],
  // tumbling in (the portfolio's arrival, as its stickers fall): it drops out of the sky, lands badly and tips over onto
  // its side, lies there dazed a beat, then gets up, and shakes its head clear
  tumblein: [2.8, (p, b, g) => {
    const F = .16, fall = 1 - seg(p, 0, F);
    g.air += 6.5 * fall * fall; g.gw = p < F ? 0 : 1;
    b.hs(UPV, pl(p, 0, .03, F - .04, F)).a('legs', [.15, .12, -.1, .12], fall);              // arms up as it falls
    squash(g, .14 * land(p, F, .05));
    const down = sm(seg(p, F + .02, F + .12)) * (1 - sm(seg(p, .56, .74)));                 // over onto its side...
    g.rz += 1.45 * down - .08 * bell(seg(p, F + .12, F + .2)) * down; g.piv = [-.26, .05, 0];
    b.hs(OUT, pl(p, F + .02, F + .1, .52, .6)).n('kickL', .6, down).a('head', [0, 0, .3], down);   // ...sprawled, dazed
    squash(g, .08 * land(p, .73, .08));                                                     // back on its feet
    const shake = pl(p, .78, .8, .92, .96);
    b.a('head', [0, .35 * Math.sin(seg(p, .78, .96) * TAU * 3), 0], shake);                 // shaking it off
  }],
  // kickboxing (the portfolio's loader: a snapshot is thrown at it for each kick and sent spinning away): fists up, a
  // front kick, another with the other leg, a spin into a side kick, then a flying kick: a crouch, a leap, a leg shot
  // out at speed (a streak behind it) and a landing. Kicks land at .25, .45, .68 and .88 of it (the loader times its
  // snapshots to those)
  kicks: [3.0, (p, b, g) => {
    const guard = pl(p, 0, .07, .76, .82);                                                  // fists up by the visor
    b.h('L', H([-.36, .66, .56], [-1, -.8, -.2]), guard).h('R', H([.3, .6, .62], [1, -.8, -.2]), guard).a('body', [-.04, 0], guard);
    g.air += .025 * Math.abs(Math.sin(p * TAU * 5)) * guard * (1 - pl(p, .55, .6, .72, .76));   // bouncing on its toes
    g.turn += -.95 * pl(p, .1, .16, .52, .56);                                              // turned three-quarters: kicks read in profile
    const k1 = pl(p, .18, .25, .28, .34), k2 = pl(p, .38, .45, .48, .54), sp = sm(seg(p, .55, .68)), k3 = pl(p, .6, .68, .71, .77);
    b.n('kickR', 0, k1).a('legs', [-.2, 0, 2.1, 0], k1).a('body', [-.32, 0], k1);
    b.n('kickL', 0, k2).a('legs', [2.1, 0, -.2, 0], k2).a('body', [-.32, 0], k2);
    g.turn += TAU * sp; g.air += .1 * bell(seg(p, .55, .68));                              // round once...
    b.n('kickR', 0, k3).a('legs', [.2, 0, .3, 1.45], k3).a('body', [0, -.42], k3);         // ...into a side kick
    // the flying kick: crouched (.78), up (.82..), the right leg shot out at the top (.88), down (.96)
    crouch(b, g, pl(p, .76, .79, .8, .83), .16);
    const up = bell(seg(p, .81, .97)), fk = pl(p, .83, .87, .9, .94);
    g.air += .55 * up; g.gw = p > .81 && p < .97 ? 0 : 1;
    g.turn += .95 * pl(p, .78, .82, .93, .97);                                              // turned the other way: it kicks to the right
    b.n('kickR', 0, fk).n('kickL', .9, fk).a('legs', [-.1, 0, 2.2, 0], fk).a('body', [-.45, 0], fk);   // one leg tucked, the other shot out
    b.hs(OUT, fk * .8);                                                                     // arms flung back for balance
    g.x += .25 * sm(seg(p, .82, .9)) - .25 * sm(seg(p, .9, .98));                           // lunging through the air at it
    g.streak = -.9 * pl(p, .83, .86, .9, .93);                                              // with a speed trail behind
    squash(g, .1 * land(p, .965, .03));
  }],
  dance: [1.6, (p, b, g) => {
    const e = env(p), s = Math.sin(p * TAU * 2), c = Math.cos(p * TAU * 2);
    g.ry += .35 * s * e; g.rz += .07 * c * e; g.piv = [0, .05, 0];
    g.air += .035 * Math.abs(Math.sin(p * TAU * 4)) * e;
    b.h('L', s > 0 ? UPV : SIDE, e * Math.abs(s)).h('R', mir(s < 0 ? UPV : SIDE), e * Math.abs(s));
    b.n('kickL', Math.max(0, c), e).n('kickR', Math.max(0, -c), e).a('head', [0, -.15 * s, .15 * c], e);
  }],
  moonwalk: [2.0, (p, b, g) => {
    const e = env(p, .08, .08), turn = sm(seg(p, .05, .15)) - 2 * sm(seg(p, .46, .58)) + sm(seg(p, .88, .98));
    g.ry += .8 * turn;
    g.x += -.3 * eio(seg(p, .1, .48)) + .3 * eio(seg(p, .56, .94));
    const st = Math.sin(p * TAU * 5);
    b.n('kickL', .5 * Math.max(0, st), e).n('kickR', .5 * Math.max(0, -st), e).hs(SIDE, e * .5).a('body', [-.06, 0], e);
    g.air += .02 * Math.abs(st) * e;
  }],
  wiggle: [.9, (p, b, g) => {
    const e = env(p), s = Math.sin(p * TAU * 3);
    g.rz += .1 * s * e; g.ry += .12 * Math.sin(p * TAU * 3 + 1) * e; g.piv = [0, .05, 0];
    b.a('body', [0, -.08 * s], e).a('head', [0, 0, .15 * s], e);
  }],
  tantrum: [1.6, (p, b, g, k) => {
    const e = env(p, .08, .12), s = Math.sin(p * TAU * 5);
    b.n('kickL', 1.1 * Math.max(0, s), e).n('kickR', 1.1 * Math.max(0, -s), e).hs(FIST, e);
    b.h('L', H([-.8, .7 + .12 * s, .3], FIST.pole), e).h('R', mir(H([-.8, .7 - .12 * s, .3], FIST.pole)), e);
    g.rz += .05 * s * e; g.air += .05 * Math.abs(s) * e; squash(g, .05 * Math.abs(Math.cos(p * TAU * 5)) * e);
    b.a('head', [.08, .22 * Math.sin(p * TAU * 7), 0], e);
  }],

  nod: [.9, (p, b) => b.a('head', [.26 * Math.pow(Math.sin(p * TAU), 2), null, null], 1).a('body', [.04 * bell(p), 0], 1)],
  shake: [.8, (p, b, g) => { const e = bell(p); b.add('head', [0, .42 * Math.sin(p * TAU * 2.5) * e, 0]); g.ry -= .05 * Math.sin(p * TAU * 2.5) * e; }],
  headshake: [.9, (p, b, g) => { const e = bell(p); b.add('head', [.05 * e, .4 * Math.sin(p * TAU * 3) * e, 0]); g.ry -= .05 * Math.sin(p * TAU * 3) * e; }],
  headtilt: [1.2, (p, b) => b.add('head', [-.04 * pl(p, 0, .25, .7, 1), .1 * pl(p, 0, .25, .7, 1), .34 * pl(p, 0, .25, .7, 1)])],
  headbob: [1.2, (p, b, g) => { const e = env(p), s = (1 - Math.cos(p * TAU * 4)) / 2; b.add('head', [.14 * s * e, 0, .05 * Math.sin(p * TAU * 2) * e]); g.air += .025 * s * e; }],
  bow: [1.4, (p, b, g) => {
    const k = eio(seg(p, .05, .35)) * (1 - eio(seg(p, .62, .95)));
    b.a('body', [.36, 0], k).a('head', [.28, 0, 0], k).hs(LOWH, k);
    g.rx += .1 * k; g.piv = [0, .05, 0];
  }],
  stretch: [1.5, (p, b, g) => {
    const k = pl(p, .05, .4, .65, .95);
    b.hs(UPV, k).a('head', [-.28, 0, .08], k).a('body', [-.12, .04], k).n('sit', 0, k);
    squash(g, -.07 * k); g.air += .03 * k;
  }],
  stretchup: [1.4, (p, b, g) => {
    const k = pl(p, .05, .35, .65, .95);
    b.hs(UPV, k).a('head', [-.18, 0, 0], k); squash(g, -.1 * k); g.air += .06 * k;
  }],
  duck: [1.2, (p, b, g) => {
    const k = eo(seg(p, 0, .15)) * (1 - eio(seg(p, .6, .92)));
    // a real duck: knees bend a little, the body leans in, the head drops, the paws come up to clutch the sides of the
    // head (its arms can't reach over the top of that big head; aimed there they sank into it), no squashing
    b.n('sit', .3, k).hs(H([-.66, .8, .3], [-1, -.5, -.3]), k).a('head', [.28, 0, 0], k).a('body', [.32, 0], k); g.rx += .12 * k; g.piv = [0, .05, 0];
  }],
  hide: [1.6, (p, b, g) => {
    const k = pl(p, 0, .2, .75, 1);
    b.n('sit', .3, k).hs(COVER, k).a('head', [.22, 0, 0], k).a('body', [.12, 0], k);
  }],
  peekout: [1.6, (p, b, g) => {
    const k = pl(p, 0, .15, .85, 1), open = pl(p, .4, .55, .85, 1);
    b.n('sit', .3, k * (1 - open)).hs(COVER, k * (1 - open)).hs(H([-.62, .6, .5], [-1, -1, -.2]), open);
    g.rz -= .14 * open; g.piv = [0, .05, 0]; b.a('head', [0, .12, .24], open);
  }],
  peek: [1.6, (p, b, g) => {
    const k = pl(p, 0, .28, .7, 1);
    g.rz -= .22 * k; g.ry += .2 * k; g.piv = [0, .05, 0]; b.a('head', [0, .1, .22], k).hs(OUT, .3 * k);
  }],
  peekaround: [2.0, (p, b, g) => {
    const l = pl(p, .02, .22, .36, .5), r = pl(p, .5, .66, .8, .98);
    g.rz += .2 * l - .2 * r; g.ry += -.25 * l + .25 * r; g.piv = [0, .05, 0];
    b.add('head', [0, -.15 * l + .15 * r, -.2 * l + .2 * r]);
  }],
  leanl: [1.4, leanM(0, .22)], leanr: [1.4, leanM(0, -.22)], leanf: [1.4, leanM(.2, 0)], leanb: [1.4, leanM(-.2, 0)],
  startled: [1.6, (p, b, g, k) => {
    g.air += arc(p, 0, .2, .2); g.gw = 1 - pl(p, 0, .02, .17, .2); g.z -= .12 * eo(seg(p, 0, .2)) * (1 - eio(seg(p, .6, .95)));
    const k1 = pl(p, 0, .06, .5, .8);
    b.hs(H([-.92, .9, .28], [-.4, -1, -.3]), k1).a('head', [-.15, 0, 0], k1);
    squash(g, .12 * land(p, .19, .12));
    const tr = pl(p, .25, .3, .6, .8); g.x += jitter(k.t - k.t0, 50, .006) * tr;
    b.hs(H([-.13, .52, .7], [-1, -1, 0]), pl(p, .45, .6, .85, 1) * .9);
  }],
  shiver: [1.0, shiverM(55, .012, HUG)],
  tremble: [1.6, shiverM(40, .008, H([-.13, .52, .7], [-1, -1, 0]))],
  vibrate: [.8, shiverM(75, .016, null)],
  fallover: [1.6, fall(-1)],
  faint: [1.9, fall(1)],
  float: [2.0, floatM(.3)],
  hover: [2.0, floatM(.22, { f: 5.5, ry: .4, tilt: .03 })],
  drift: [2.4, floatM(.2, { x: .25, f: 2.4 })],
};
const ALIAS = { flip: 'backflip', roll: 'somersault', spin: 'spinjump', twirl: 'spinjump' };
const DUR = { flip: 1.15, roll: 1.5, spin: 1.0, twirl: 1.0 };

/* ---- where the figure is: a rough cloud of points over it, in its own space (before the move turns it) ---- */
const rot = (v, rx, ry, rz) => {   // three.js Euler 'XYZ': z first, then y, then x
  let [x, y, z] = v, c, s, t;
  if (rz) { c = Math.cos(rz); s = Math.sin(rz); t = x * c - y * s; y = x * s + y * c; x = t; }
  if (ry) { c = Math.cos(ry); s = Math.sin(ry); t = x * c + z * s; z = -x * s + z * c; x = t; }
  if (rx) { c = Math.cos(rx); s = Math.sin(rx); t = y * c - z * s; z = y * s + z * c; y = t; }
  return [x, y, z];
};
const FOOT = [[0, -.33, .24], [0, -.33, -.12], [.13, -.33, .05], [-.13, -.33, .05], [0, -.1, -.12]];
const TORSO = [[.45, .6, 0], [-.45, .6, 0], [.52, .25, 0], [-.52, .25, 0], [0, .25, .36], [0, .3, -.36], [0, -.12, 0]];
const HEADP = [[0, 1.14, 0], [.6, 1.02, 0], [-.6, 1.02, 0], [.86, .5, 0], [-.86, .5, 0], [0, .5, .66], [0, .5, -.66], [.62, .5, .46], [-.62, .5, .46],
  [.62, .5, -.46], [-.62, .5, -.46], [.55, .05, .35], [-.55, .05, .35], [0, .98, .45], [0, .98, -.45]];
export function points(c){
  const hy = .36 - c.sit * .2, out = [];
  [-1, 1].forEach(sd => {
    const kick = sd > 0 ? c.kickR : c.kickL, lg = c.legs, lp = lg ? lg[sd > 0 ? 2 : 0] : 0, lr = lg ? lg[sd > 0 ? 3 : 1] : 0;
    for (const f of FOOT) { const q = rot(f, -c.sit * 1.45 - kick * .35 - lp, 0, sd * (c.sit * .55 + kick * .5 + lr)); out.push([q[0] + sd * .2, q[1] + hy + .02, q[2]]); }
  });
  const trx = c.body[0] + c.sit * .04, trz = c.body[1] - (c.kickR - c.kickL) * .06;
  const tor = v => { const q = rot(v, trx, 0, trz); return [q[0], q[1] + hy, q[2]]; };
  for (const v of TORSO) out.push(tor(v));
  for (const v of HEADP) out.push(tor([v[0], v[1] + .58, v[2]]));
  for (const h of [c.L, c.R]) { const [x, y, z] = h.t; out.push(tor([x, y - .14, z]), tor([x, y + .14, z]), tor([x - .13, y, z]), tor([x + .13, y, z])); }
  return out;
}
// a point of the figure, moved: scaled and turned about the mover's middle (y = 1), then shifted
const place = (v, g, M) => { const q = rot([v[0] * g.sx, (v[1] - 1) * g.sy, v[2] * g.sz], g.rx, g.ry, g.rz); return [q[0] + M[0], q[1] + 1 + M[1], q[2] + M[2]]; };
const lowest = (pts, g, M) => { let lo = Infinity; for (const v of pts) { const y = place(v, g, M)[1]; if (y < lo) lo = y; } return lo; };
const fullPose = (c, o) => ({ ...c, ...o });

/* ---- rotations as 3x3 matrices (rows), to compose a move's turns and hand three.js its Euler 'XYZ' angles ---- */
const mul = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const RX = a => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const RY = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const RZ = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const xyz = m => {   // three.js Euler 'XYZ' (R = Rx · Ry · Rz) from a matrix
  const ry = Math.asin(Math.max(-1, Math.min(1, m[0][2])));
  return Math.abs(m[0][2]) < .9999 ? [Math.atan2(-m[1][2], m[2][2]), ry, Math.atan2(-m[0][1], m[0][0])] : [Math.atan2(m[2][1], m[1][1]), ry, 0];
};
// the move's figure transform, as the mover takes it: turned about the pivot, kept on (or lifted off) the ground
function finish(r, b, g, f){
  if (g.turn || g.roll || g.bank || g.twist) {   // compose the turns over the plain angles, all eased by the fade
    const R = mul(mul(mul(mul(RY(g.turn * f), RX(g.roll * f)), RZ(g.bank * f)), RY(g.twist * f)), mul(mul(RX(g.rx * f), RY(g.ry * f)), RZ(g.rz * f)));
    [g.rx, g.ry, g.rz] = xyz(R).map(v => v / Math.max(f, 1e-4));   // (finish scales them by the fade again below)
  }
  if (g.fwd) { g.x += g.fwd * Math.sin(g.turn); g.z += g.fwd * Math.cos(g.turn); }
  // a deep sit folds this short-legged body into itself (it read as a broken, squashed figure): never past this
  if (b.o.sit != null) b.o.sit = Math.min(b.o.sit, .5);
  const c = r.cur, k = f;
  // fading out: everything eases back toward nothing
  const G = { sx: 1 + (g.sx - 1) * k, sy: 1 + (g.sy - 1) * k, sz: 1 + (g.sz - 1) * k, rx: g.rx * k, ry: g.ry * k, rz: g.rz * k };
  const pv = g.piv, d = [pv[0], pv[1] - 1, pv[2]], q = rot([d[0] * G.sx, d[1] * G.sy, d[2] * G.sz], G.rx, G.ry, G.rz);
  const M = [g.x * k + d[0] - q[0], d[1] - q[1], g.z * k + d[2] - q[2]];
  let y = g.y * k;
  if (c.lie < .05) {
    const eff = k < 1 ? fullPose(c, blendO(c, b.o, k)) : fullPose(c, b.o);
    const stand = lowest(points(c), { sx: 1, sy: 1, sz: 1, rx: 0, ry: 0, rz: 0 }, [0, 0, 0]);
    const lo = lowest(points(eff), G, M);
    y += (g.gw * k + (1 - k)) * (stand - lo) + g.air * k;
    if (lo + y < stand) y += stand - (lo + y);   // never through the floor
    if (g.ctr) {   // kept in the middle of the stage: the figure's own left-right extent, centred (for moves that lie it along the ground)
      let a = Infinity, z = -Infinity; for (const v of points(eff)) { const px = place(v, G, M)[0]; if (px < a) a = px; if (px > z) z = px; }
      M[0] -= g.ctr * k * (a + z) / 2;
    }
    if (r.motion.dbg) r.motion.dbg.push({ lo: lo + y - stand, pts: points(eff).map(v => place(v, G, [M[0], M[1] + y, M[2]])), view: 1 + (g.view - 1) * k });
  } else y += g.air * k;
  return { pose: b.o, weight: k, rig: { x: M[0], y: M[1] + y, z: M[2], ...G }, view: 1 + (g.view - 1) * k, ring: (g.ring || 0) * k, line: (g.line || 0) * k, streak: (g.streak || 0) * k, web: g.web || 0, shock: g.shock || 0 };
}
function blendO(c, o, w){   // the overrides eased in by w (for measuring the figure while a move fades out)
  const out = {};
  for (const key in o) {
    const a = c[key] ?? (key === 'legs' ? [0, 0, 0, 0] : 0), v = o[key];
    if (typeof v === 'string') out[key] = v;
    else if (typeof v === 'number') out[key] = a + (v - a) * w;
    else if (Array.isArray(v)) out[key] = a.map((x, i) => x + (v[i] - x) * w);
    else out[key] = { t: a.t.map((x, i) => x + (v.t[i] - x) * w), pole: a.pole.map((x, i) => x + (v.pole[i] - x) * w) };
  }
  return out;
}

/* ---- idle life: soft, slow and continuous, like something breathing and listening, never twitchy ---- */
const BOUNCY = new Set(['happy', 'excited', 'laughing', 'playful', 'celebrating', 'loving']);
const HUSHED = new Set(['sad', 'crying', 'worried', 'scared', 'shy', 'embarrassed', 'angry', 'frustrated', 'bored']);
const SLEEPY = new Set(['sleepy', 'exhausted']);
function idle(r, t, dt, M){
  if (r.css < 300) return null;   // small ones keep still between changes (robot3d.js draws them only when something changes)
  M.amp = Math.min(1, (M.amp ?? 0) + dt / 1.2);   // after a move (or on arrival) the idle life fades in slowly
  const em = r.em, a = M.amp * (SLEEPY.has(em) ? .35 : HUSHED.has(em) ? .55 : 1), s = r.seed;
  const b = new B(r.cur), g = rig0();
  const w = (per, ph = 0) => Math.sin(t * TAU / per + s + ph);
  // a slow weight shift from foot to foot, the head following a beat behind; a soft breath
  g.rz += .016 * a * w(4.6); g.x += .008 * a * w(4.6, -.4); g.piv = [0, .05, 0];
  g.ry += .03 * a * w(7.3, 1.1);
  b.add('head', [.022 * a * w(3.4, 2), .03 * a * w(6.1, .5), .035 * a * w(4.6, -.9)]);
  b.add('body', [.012 * a * w(3.9, .3), -.012 * a * w(4.6, -.2)]);
  if (BOUNCY.has(em)) { const bb = (1 - Math.cos(t * TAU / 1.9 + s)) / 2; g.air += .014 * a * bb; squash(g, -.012 * a * bb); }
  else if (!SLEEPY.has(em)) squash(g, -.006 * a * (1 - Math.cos(t * TAU / 3.6 + s)) / 2);
  // noticing you: when the pointer moves (its eyes follow it), a little head tilt toward you, held a moment, eased back
  const sp = Math.hypot(r.ex - (M.pex ?? r.ex), r.ey - (M.pey ?? r.ey)) / Math.max(dt, .001);
  M.pex = r.ex; M.pey = r.ey;
  if (sp > .6 && t > (M.noticeCool || 0)) { M.noticeT = t; M.side = r.ex < 0 ? 1 : -1; M.noticeCool = t + 6; }
  if (M.noticeT) {
    const n = sm(seg(t, M.noticeT, M.noticeT + .8)) * (1 - sm(seg(t, M.noticeT + 2.2, M.noticeT + 3.4))) * M.amp;
    b.add('head', [-.05 * n, 0, .13 * M.side * n]).add('body', [.025 * n, .02 * M.side * n]);
  }
  // starting to talk: a tiny happy bounce
  if (r.lv < .02) M.quietFor = (M.quietFor || 0) + dt;
  else { if (r.lv > .06 && M.quietFor > .8) M.talkT = t; M.quietFor = 0; }
  if (M.talkT) { const k = seg(t, M.talkT, M.talkT + .5); if (k < 1) { g.air += .04 * bell(k) * M.amp; squash(g, -.02 * bell(k)); } }
  return finish(r, b, g, 1);
}

/* ---- the frame ---- */
// the viewer's own turn (the /moves page lets you drag the figure round): --spin on the .buddy, radians, laid over
// whatever it's doing. A turn about its own vertical axis, so it stays on its feet
export function motion(r, t, dt){
  const m = act(r, t, dt), sp = parseFloat(r.el.style.getPropertyValue('--spin')) || 0;
  if (!sp) return m;
  if (!m) return { rig: { x: 0, y: 0, z: 0, rx: 0, ry: sp, rz: 0, sx: 1, sy: 1, sz: 1 } };
  return { ...m, rig: yawed(m.rig || { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 }, sp) };
}
// the figure, as the move placed it, turned about the world's vertical (not added to the move's own XYZ angles, which
// tipped a figure lying in a plank or a roll off the floor): R = Ry(a) · R(move), and its place turned with it
function yawed(g, a){
  const cx = Math.cos(g.rx), sx = Math.sin(g.rx), cy = Math.cos(g.ry), sy = Math.sin(g.ry), cz = Math.cos(g.rz), sz = Math.sin(g.rz);
  const m11 = cy * cz, m12 = -cy * sz, m13 = sy;                       // three.js Euler 'XYZ' as a matrix (its rows)
  const m21 = cx * sz + sx * cz * sy, m22 = cx * cz - sx * sz * sy, m23 = -sx * cy;
  const m31 = sx * sz - cx * cz * sy, m32 = sx * cz + cx * sz * sy, m33 = cx * cy;
  const ca = Math.cos(a), sa = Math.sin(a);
  const n11 = ca * m11 + sa * m31, n12 = ca * m12 + sa * m32, n13 = ca * m13 + sa * m33;
  const n22 = m22, n23 = m23, n32 = -sa * m12 + ca * m32, n33 = -sa * m13 + ca * m33;
  const ry = Math.asin(Math.max(-1, Math.min(1, n13)));
  const [rx, rz] = Math.abs(n13) < .9999 ? [Math.atan2(-n23, n33), Math.atan2(-n12, n11)] : [Math.atan2(n32, n22), 0];
  return { ...g, rx, ry, rz, x: ca * g.x + sa * g.z, z: -sa * g.x + ca * g.z };
}
function act(r, t, dt){
  const M = r.motion || (r.motion = {}), el = r.el, tr = el.dataset.trick || '';
  if (tr !== M.tr) {   // a new trick (or none): start it, or let the one playing finish / fade
    M.tr = tr;
    const name = ALIAS[tr] || tr, mv = MOVES[name];
    if (mv) {
      const calm = still();
      M.mv = { name, dur: calm ? Math.min(.9, DUR[tr] || mv[0]) : DUR[tr] || mv[0], fn: calm ? gentle : mv[1], t0: t, fade: 0 };
      el.classList.add('b3d-trick');
    } else if (M.mv) {
      if (tr || (M.mv.t0 + M.mv.dur - t) > .35) M.mv.fade = t;   // cleared early, or another (CSS) trick: fade out now
    }
  }
  const mv = M.mv;
  if (mv) {
    let p = (t - mv.t0) / mv.dur, f = 1;
    if (globalThis.__b3dAt != null) p = globalThis.__b3dAt;   // the /robot?move=…&at=0.4 preview: held at one moment
    if (mv.fade) f = 1 - sm(seg(t, mv.fade, mv.fade + .25));
    if (p >= 1 && tr && (ALIAS[tr] || tr) === mv.name) {   // still asked for after it ended (a page that loops it): go again
      if (t - mv.t0 > mv.dur + .3) { mv.t0 = t; p = 0; } else return null;
    }
    if (p >= 1 || f <= 0) { M.mv = null; M.amp = 0; el.classList.remove('b3d-trick'); return null; }
    const b = new B(r.cur), g = rig0();
    mv.fn(p, b, g, { t, t0: mv.t0, r });
    return finish(r, b, g, f);
  }
  if (still() || tr) return null;   // reduced motion: no idle life; a CSS trick playing: leave it be
  return idle(r, t, dt, M);
}
// reduced motion: no flips or jumps, just a small happy lift of the arms
function gentle(p, b){ tada(b, .6 * bell(p)); }
// how long a trick takes, in seconds (the /robot?move= preview uses it), or 0 if it isn't one of these
export const trickLength = n => DUR[n] || MOVES[ALIAS[n] || n]?.[0] || 0;
