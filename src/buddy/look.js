// Which character the buddy is drawn as: 'classic' (the original block, Figure.jsx) or 'robot' (the 3D robot,
// Robot.jsx). One choice for every screen, remembered on this computer; other tabs follow. Nothing else changes:
// faces, poses, skins and tricks reach whichever one is showing.
import { useSyncExternalStore } from 'react';

// (the Bear is still drawn if it was chosen before, but isn't offered while it's being reworked: /bear shows it)
export const LOOKS = [['classic', 'Classic'], ['robot', 'Robot'], ['plush', 'Plush']];
const KEY = 'defleet.character', subs = new Set();
const read = () => { try { const v = localStorage.getItem(KEY); return v === 'robot' || v === 'plush' || v === 'bear' || v === 'classic' ? v : 'classic'; } catch { return 'classic'; } };
export function setLook(v){
  try { localStorage.setItem(KEY, v); } catch { /* storage off */ }
  subs.forEach(f => f());
}
export const useLook = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, read);
if (typeof window !== 'undefined') addEventListener('storage', e => { if (e.key === KEY) subs.forEach(f => f()); });

// what the Robot wears on its head: 'cups' (Headset 1, the original ear cups in a deeper tone of its fur, no band),
// 'headset' (Headset 2, the full over-ear headset in its own colour) or 'none' (the fur closes over the sides). One choice
// for every screen, remembered on this computer; other tabs follow. Read every frame by robot3d.js (headsetStyle), and by
// the switches on the character and moves pages (useHeadsetStyle)
export const HEADSET_STYLES = [['cups', 'Headset 1'], ['headset', 'Headset 2'], ['none', 'None']];
const SKEY = 'defleet.headsetStyle', hsubs = new Set();
const sread = () => {
  try {
    const v = localStorage.getItem(SKEY);
    if (HEADSET_STYLES.some(([k]) => k === v)) return v;
    return localStorage.getItem('defleet.headset') === 'off' ? 'none' : 'headset';   // (the old on/off switch: off is none)
  } catch { return 'headset'; }
};
let hst = typeof window !== 'undefined' ? sread() : 'headset';   // kept in memory: it's read for every robot, every frame
export const headsetStyle = () => hst;
export function setHeadsetStyle(v){
  hst = v;
  try { localStorage.setItem(SKEY, v); } catch { /* storage off */ }
  hsubs.forEach(f => f());
}
export const useHeadsetStyle = () => useSyncExternalStore(f => { hsubs.add(f); return () => hsubs.delete(f); }, headsetStyle);
if (typeof window !== 'undefined') addEventListener('storage', e => { if (e.key === SKEY) { hst = sread(); hsubs.forEach(f => f()); } });

// the Plush's face: 'face' (bead eyes, a muzzle with a bear's nose, a mouth: fur where the goggle was) or 'visor' (the
// goggle with the Robot's glowing eyes). One choice for every screen, remembered on this computer; other tabs follow.
// Read every frame by robot3d.js (plushFace), and by the switches on the character and moves pages (usePlushFace)
export const PLUSH_FACES = [['face', 'Face'], ['visor', 'Visor']];
const FKEY = 'defleet.plushFace', fsubs = new Set();
const fread = () => { try { return localStorage.getItem(FKEY) === 'visor' ? 'visor' : 'face'; } catch { return 'face'; } };
let pf = typeof window !== 'undefined' ? fread() : 'face';
export const plushFace = () => pf;
export function setPlushFace(v){
  pf = v;
  try { localStorage.setItem(FKEY, v); } catch { /* storage off */ }
  fsubs.forEach(f => f());
}
export const usePlushFace = () => useSyncExternalStore(f => { fsubs.add(f); return () => fsubs.delete(f); }, plushFace);
if (typeof window !== 'undefined') addEventListener('storage', e => { if (e.key === FKEY) { pf = fread(); fsubs.forEach(f => f()); } });

// the Plush's outfit: none, or one of its clothes (robot3d.js builds each the first time it's worn). One choice for every
// screen, remembered on this computer; other tabs follow. A buddy can wear another just for itself (data-outfit: the tiles)
export const PLUSH_OUTFITS = [['none', 'None'], ['overalls', 'Overalls'], ['hoodie', 'Hoodie'], ['raincoat', 'Raincoat'], ['sailor', 'Sailor'], ['doctor', 'Doctor'], ['football', 'Football']];
const OKEY = 'defleet.plushOutfit', osubs = new Set();
const oread = () => { try { const v = localStorage.getItem(OKEY); return PLUSH_OUTFITS.some(([k]) => k === v) ? v : 'none'; } catch { return 'none'; } };
let po = typeof window !== 'undefined' ? oread() : 'none';
export const plushOutfit = () => po;
export function setPlushOutfit(v){
  po = v;
  try { localStorage.setItem(OKEY, v); } catch { /* storage off */ }
  osubs.forEach(f => f());
}
export const usePlushOutfit = () => useSyncExternalStore(f => { osubs.add(f); return () => osubs.delete(f); }, plushOutfit);
if (typeof window !== 'undefined') addEventListener('storage', e => { if (e.key === OKEY) { po = oread(); osubs.forEach(f => f()); } });

// Headset 2's colour: vivid, from DeFleet's own palette, so it pops against the orange fur: the lime accent, electric
// blue (the orange's complement), the route ribbon's violet and mint, and gloss white and black
export const HEADSET_COLORS = [['#2f6bff', 'Electric blue'], ['#c8f135', 'Lime'], ['#9473ff', 'Violet'], ['#2fd9a4', 'Mint'], ['#f7f7f5', 'White'], ['#141518', 'Black']];
const CKEY = 'defleet.headsetColor', creadv = () => { try { const v = localStorage.getItem(CKEY); return HEADSET_COLORS.some(([c]) => c === v) ? v : HEADSET_COLORS[0][0]; } catch { return HEADSET_COLORS[0][0]; } };   // (an old, retired colour falls back to the default)
// the Plush wears its own: orange by default (its concept's satin orange headphones), remembered apart from the Robot's
export const PLUSH_HEADSET_COLORS = [['#ff6a00', 'Orange'], ...HEADSET_COLORS];
const PKEY = 'defleet.plushHeadsetColor', preadv = () => { try { const v = localStorage.getItem(PKEY); return PLUSH_HEADSET_COLORS.some(([c]) => c === v) ? v : PLUSH_HEADSET_COLORS[0][0]; } catch { return PLUSH_HEADSET_COLORS[0][0]; } };
let hc = typeof window !== 'undefined' ? creadv() : HEADSET_COLORS[0][0], pc = typeof window !== 'undefined' ? preadv() : PLUSH_HEADSET_COLORS[0][0];
export const headsetColors = v => (v === 'plush' ? PLUSH_HEADSET_COLORS : HEADSET_COLORS);
export const headsetColor = v => (v === 'plush' ? pc : hc);
export function setHeadsetColor(c, v){
  if (v === 'plush') { pc = c; try { localStorage.setItem(PKEY, c); } catch { /* storage off */ } }
  else { hc = c; try { localStorage.setItem(CKEY, c); } catch { /* storage off */ } }
  hsubs.forEach(f => f());
}
export const useHeadsetColor = v => useSyncExternalStore(f => { hsubs.add(f); return () => hsubs.delete(f); }, () => headsetColor(v));
if (typeof window !== 'undefined') addEventListener('storage', e => { if (e.key === CKEY || e.key === PKEY) { hc = creadv(); pc = preadv(); hsubs.forEach(f => f()); } });
