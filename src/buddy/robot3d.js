/* ================= the Robot: DeFleet's buddy as a living, furry 3D creature =================
   Built to the character sheet's silhouette, but alive: a big rounded helmet of a head (about half its height) covered
   in dense orange fur, a glossy black glass visor sitting proud of the fur with glowing eyes drawn on it, smooth glossy
   ear cups, a small furry body with three little dark dots, short thick furry arms ending in soft paw-hands (stubby
   fingers and a thumb), and short thick legs on rounded feet.
   How the fur works: every furry part is one smooth skin (a signed-distance shape meshed once, so there are no seams),
   drawn as a stack of shells pushed out along the skin's normals in a single instanced draw. Each shell keeps only the
   cross-sections of strands that reach it (read from a small 3D strand texture), so strands taper from root to tip,
   darken toward the root, lighten at the tip, lean under gravity, tousle on the head and sway a little. Small robots get
   fewer shells and coarser strands; big ones get many.
   One shared three.js renderer draws every robot on the page: each robot is a 2D canvas (Robot.jsx) that registers here;
   once a frame, for each one on screen, the one scene is posed for it (its feeling, where it's looking, its colour, its
   voice), rendered and copied into its canvas, and its extras are drawn around it (hearts, z's, sparks, a cross mark…).
   Twenty robots cost one WebGL context.
   It reads what the classic figure reads, off its .buddy: data-pose or data-face (the feeling), data-st on the .bwrap
   (idle, listening, thinking, speaking), --lv (voice level), --ex/--ey (where it's looking), the "blink" class, and
   --g3 (the skin's body colour; the default Black and Lime looks wear orange).
   Poses are written as where the hands go (on the cheeks, at the chin, fists by the head…), in the body's own space;
   each arm bends to reach them (two-bone IK), so the poses read like the sheet's. The fur tips sit where the old
   plastic surfaces were, so those targets still land on the fur. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import HS from './headset.json';   // the headset's cup frame and band reach (written by Buddy/work/headset/blender/headset.py)

export const ORANGE = '#ff6a00';
const DEFAULT_BODIES = new Set(['', '#131517', '#c8f135']);
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

import { headsetStyle, headsetColor, plushFace, plushOutfit } from './look.js';
import { EMOTIONS, emotionOf, POSES, STATE } from './poses.js';
import { EW, EH, drawEyes, drawFx } from './eyes.js';
import { motion } from './moves.js';
export { EMOTIONS, emotionOf };
/* ---- the shared scene ---- */
const SZ = 1024;   // the renderer's size: the biggest robot drawn sharp (a large one on a retina screen, zoomed); larger ones are scaled up from it
const MAXN = 32;  // the most fur shells any part gets
const FUR = .05; // fur length on the body: short-to-medium, groomed; each part scales it (softer on the crown, very short on paws and feet)
let R = null, scene, cam, mover, rig, mats, parts, eyesMat, faceMat, furU, furs = [], paw;
const VOBJ = [];   // the parts only one variant has (its skins, visor, eyes): shown for the robot being drawn
const tag = (o, v) => { o.userData.v = v; VOBJ.push(o); return o; };
const robots = new Set();
let raf = 0;
const Y = new THREE.Vector3(0, 1, 0);

/* ---- shapes as distance functions: smooth unions of boxes, capsules and blobs, meshed once into seamless skins ---- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
const smax = (a, b, k) => -smin(-a, -b, k);
function rbox(x, y, z, bx, by, bz, r){
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function cap(x, y, z, a, b, r){   // a capsule from a to b
  const px = x - a[0], py = y - a[1], pz = z - a[2], bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const h = clamp((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0, 1);
  return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - r;
}
function tcap(x, y, z, a, b, r0, r1){   // a capsule that tapers from r0 at a to r1 at b (near enough a distance)
  const px = x - a[0], py = y - a[1], pz = z - a[2], bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const h = clamp((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0, 1);
  return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - mix(r0, r1, h);
}
function blob(x, y, z, rx, ry, rz){   // an ellipsoid (near enough a distance)
  const k0 = Math.hypot(x / rx, y / ry, z / rz), k1 = Math.hypot(x / rx / rx, y / ry / ry, z / rz / rz);
  return k1 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
}
// naive surface nets: a smooth, welded mesh of where f crosses zero, its normals straight from the shape
function mesh(f, lo, hi, s){
  const nx = Math.ceil((hi[0] - lo[0]) / s) + 1, ny = Math.ceil((hi[1] - lo[1]) / s) + 1, nz = Math.ceil((hi[2] - lo[2]) / s) + 1;
  const at = (i, j, k) => i + nx * (j + ny * k), v = new Float32Array(nx * ny * nz), B = 4, far = B * s * 1.5;
  // sample in blocks: a block well away from the surface just takes its centre's value (only the sign matters there)
  for (let bk = 0; bk < nz; bk += B) for (let bj = 0; bj < ny; bj += B) for (let bi = 0; bi < nx; bi += B) {
    const d = f(lo[0] + (bi + B / 2) * s, lo[1] + (bj + B / 2) * s, lo[2] + (bk + B / 2) * s), skip = Math.abs(d) > far;
    for (let k = bk; k < Math.min(nz, bk + B); k++) for (let j = bj; j < Math.min(ny, bj + B); j++) for (let i = bi; i < Math.min(nx, bi + B); i++)
      v[at(i, j, k)] = skip ? d : f(lo[0] + i * s, lo[1] + j * s, lo[2] + k * s);
  }
  const cell = new Int32Array(nx * ny * nz).fill(-1), P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { cv[c] = v[at(i + C[c][0], j + C[c][1], k + C[c][2])]; if (cv[c] < 0) neg++; }
    if (!neg || neg === 8) continue;
    let px = 0, py = 0, pz = 0, n = 0;
    for (const [a, b] of E) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      px += C[a][0] + (C[b][0] - C[a][0]) * t; py += C[a][1] + (C[b][1] - C[a][1]) * t; pz += C[a][2] + (C[b][2] - C[a][2]) * t; n++;
    }
    cell[at(i, j, k)] = P.length / 3;
    P.push(lo[0] + (i + px / n) * s, lo[1] + (j + py / n) * s, lo[2] + (k + pz / n) * s);
  }
  const I = [];
  const quad = (a, b, c, d, flip) => { if ([a, b, c, d].some(q => q < 0)) return; flip ? I.push(a, d, c, a, c, b) : I.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const in0 = v[at(i, j, k)] < 0;
    if (in0 !== (v[at(i + 1, j, k)] < 0)) quad(cell[at(i, j - 1, k - 1)], cell[at(i, j, k - 1)], cell[at(i, j, k)], cell[at(i, j - 1, k)], !in0);
    if (in0 !== (v[at(i, j + 1, k)] < 0)) quad(cell[at(i - 1, j, k - 1)], cell[at(i - 1, j, k)], cell[at(i, j, k)], cell[at(i, j, k - 1)], !in0);
    if (in0 !== (v[at(i, j, k + 1)] < 0)) quad(cell[at(i - 1, j - 1, k)], cell[at(i, j - 1, k)], cell[at(i, j, k)], cell[at(i - 1, j, k)], !in0);
  }
  // settle each vertex onto the true surface and take its normal from the shape's gradient
  const N = new Float32Array(P.length), e = s * .25, g = [0, 0, 0];
  const grad = (x, y, z) => {   // the tetrahedral gradient: four samples
    const a = f(x + e, y - e, z - e), b = f(x - e, y - e, z + e), c = f(x - e, y + e, z - e), d = f(x + e, y + e, z + e);
    g[0] = a - b - c + d; g[1] = -a - b + c + d; g[2] = -a + b - c + d; const l = Math.hypot(g[0], g[1], g[2]) || 1; g[0] /= l; g[1] /= l; g[2] /= l;
  };
  for (let q = 0; q < P.length; q += 3) {
    for (let it = 0; it < 2; it++) { const d = f(P[q], P[q + 1], P[q + 2]); grad(P[q], P[q + 1], P[q + 2]); P[q] -= g[0] * d; P[q + 1] -= g[1] * d; P[q + 2] -= g[2] * d; }
    grad(P[q], P[q + 1], P[q + 2]); N[q] = g[0]; N[q + 1] = g[1]; N[q + 2] = g[2];
  }
  return { P: new Float32Array(P), N, I };
}
// a furry part: the skin plus per-vertex fur length (fl) and occlusion (ao), drawn as MAXN instanced shells
// a furry part in levels of detail: k = 1 full, k > 1 a coarser skin for small robots (made when first needed)
const memo = fn => { const c = {}; return k => c[k] || (c[k] = fn(k)); };
const furGeo = (f, lo, hi, s, look = () => [1, 1], most = 9) => { const g = memo(k => skinGeo(mesh(f, lo, hi, s * k), look)); return k => g(Math.min(k, most)); };
const mirrored = g => { const m = new Map(); return k => { const s = g(k); if (!m.has(s)) m.set(s, mirrorGeo(s)); return m.get(s); }; };
function skinGeo({ P, N, I }, look = () => [1, 1]){
  const n = P.length / 3, fl = new Float32Array(n), ao = new Float32Array(n), cb = new Float32Array(n * 3), bl = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [a, b, c, d] = look(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2], i); fl[i] = a; ao[i] = b;
    if (c) cb.set(c, i * 3);
    if (d) bl[i] = d;
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setIndex(I); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('fl', new THREE.BufferAttribute(fl, 1)); g.setAttribute('ao', new THREE.BufferAttribute(ao, 1)); g.setAttribute('cb', new THREE.BufferAttribute(cb, 3)); g.setAttribute('bl', new THREE.BufferAttribute(bl, 1));
  g.setAttribute('layer', new THREE.InstancedBufferAttribute(new Float32Array(MAXN).map((_, i) => i), 1));
  g.instanceCount = MAXN;
  return g;
}
function mirrorGeo(g){   // the same skin flipped left to right (x negated, triangles turned back the right way out)
  const P = g.attributes.position.array.slice(), N = g.attributes.normal.array.slice(), I = Array.from(g.index.array);
  for (let i = 0; i < P.length; i += 3) { P[i] = -P[i]; N[i] = -N[i]; }
  for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
  const fl = g.attributes.fl.array, ao = g.attributes.ao.array, cb = g.attributes.cb.array, bl = g.attributes.bl.array;
  return skinGeo({ P, N, I }, (x, y, z, a, b, c, i) => [fl[i], ao[i], [-cb[i * 3], cb[i * 3 + 1], cb[i * 3 + 2]], bl[i]]);
}
// the first point on a shape seen straight from the front at (x, y), or null
function frontZ(f, x, y){
  let z = 1.2;
  for (; z > -.3; z -= .01) if (f(x, y, z) < 0) break;
  if (z <= -.3) return null;
  let a = z, b = z + .01;
  for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (f(x, y, m) < 0) a = m; else b = m; }
  return (a + b) / 2;
}

/* ---- the strands: a tiling 3D field of random points (Worley noise). For each texel the strand texture holds the
   distance to the nearest point (a strand's centre) and that strand's own random length and shade; the coarser clump
   texture holds the way to the nearest clump centre, so strands can lean together into soft locks ---- */
const TS = 64, TF = 16, CS = 32, CF = 8;   // texels and points along each side of a tile: strands, clumps
function worley(size, F, cell){
  let seed = 9 + F; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const pts = new Float32Array(F * F * F * 5);
  for (let i = 0; i < pts.length; i++) pts[i] = rnd();
  const data = new Uint8Array(size ** 3 * 4), c = size / F, w = q => (q % F + F) % F;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x + .5) / c, py = (y + .5) / c, pz = (z + .5) / c, cx = Math.floor(px), cy = Math.floor(py), cz = Math.floor(pz);
    let best = 9, bi = 0, bx = 0, by = 0, bz = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx, gy = cy + dy, gz = cz + dz, i = (w(gx) + F * (w(gy) + F * w(gz))) * 5;
      const ox = gx + pts[i] - px, oy = gy + pts[i + 1] - py, oz = gz + pts[i + 2] - pz, d = ox * ox + oy * oy + oz * oz;
      if (d < best) { best = d; bi = i; bx = ox; by = oy; bz = oz; }
    }
    cell(data, (x + size * (y + size * z)) * 4, Math.sqrt(best), pts[bi + 3], pts[bi + 4], bx, by, bz);
  }
  const t = new THREE.DataTexture3D(data, size, size, size);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping; t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}
const strandTex = () => worley(TS, TF, (o, i, d, r1, r2) => { o[i] = Math.min(255, d / 1.2 * 255); o[i + 1] = r1 * 255; o[i + 2] = r2 * 255; o[i + 3] = 255; });
const clumpTex = () => worley(CS, CF, (o, i, d, r1, r2, x, y, z) => { const e = v => clamp((v / 3 + .5) * 255, 0, 255); o[i] = e(x); o[i + 1] = e(y); o[i + 2] = e(z); o[i + 3] = r1 * 255; });

/* ---- the fur shader: shells out along the normal, bent by gravity and a tousle; strands cut from the 3D field ---- */
const FUR_VS = `
attribute float layer; attribute float fl; attribute float ao; attribute vec3 cb; attribute float bl;
uniform float uN, uLen, uTime, uWind, uTousle, uGrav, uSkin; uniform vec3 uSh[2], uShD[2];
uniform vec3 uKeyD, uKeyC, uFillD, uFillC, uRimD, uRimC, uSky, uGround;
varying vec3 vP, vLit, vW; varying float vH, vAo, vFl, vSpec, vRim, vEdge, vBl;
#ifdef SKIN
attribute vec4 bi, bw; uniform mat4 uB[7];   // (the Plush's one body, skinned: its head, arms and legs)
#endif
void main(){
  float h = layer / max(uN - 1., 1.), L = uLen * fl;
  vec3 n = normalize(normal), p = position;
#ifdef SKIN
  mat4 K = uB[int(bi.x)] * bw.x + uB[int(bi.y)] * bw.y + uB[int(bi.z)] * bw.z + uB[int(bi.w)] * bw.w + mat4(1.) * (1. - bw.x - bw.y - bw.z - bw.w);
  p = (K * vec4(p, 1.)).xyz; n = normalize(mat3(K) * n);
#endif
  // the body round each shoulder is pulled along with its arm, so the arm grows out of the body rather than sitting on it
  for (int i = 0; i < 2; i++) { vec3 r = p - uSh[i]; p += uShD[i] * (uSkin * .1 * exp(-dot(r, r) / .03)); }
  vec3 down = normalize((vec4(0., -1., 0., 0.) * modelMatrix).xyz);    // world down, in this part's own space
  // a soft, uneven flow: two scales of waves, so neighbouring patches of fur lie a little differently
  vec3 sw = vec3(sin(p.y * 13. + p.z * 7.), .4 * sin(p.x * 11. - p.z * 9.), cos(p.x * 12. + p.y * 7.))
          + .6 * vec3(sin(p.y * 31. - p.x * 17.), sin(p.z * 29. + p.x * 23.), cos(p.x * 27. - p.y * 19.));
  vec3 lean = down * uGrav + sw * uTousle * (.3 + 1.1 * max(fl - 1., 0.)) + cb;   // gravity, a tousle, and a combed direction (round the visor)
  lean -= n * dot(lean, n) * .7;
  float sway = sin(uTime * 1.7 + p.x * 5. + p.y * 4.) * uWind;
  lean += vec3(.18, .05, .12) * sway;
  vec3 d = n * L * h + lean * L * h * h;
  vec4 w = modelMatrix * vec4(p + d, 1.);
  vP = p; vH = h; vAo = ao; vFl = fl; vW = w.xyz; vBl = bl;
#ifdef SKIN
  vP = position;   // (the strands stay put on the skin as it bends)
#endif
  // the light, per vertex (the skin is smooth): wrapped diffuse on a normal bent toward the strand, a sheen along the
  // strands (Kajiya-Kay), and a soft rim where the fur turns away and catches the back light
  vec3 N = normalize(mat3(modelMatrix) * n), T = normalize(mat3(modelMatrix) * (n + 2. * h * lean)), V = normalize(cameraPosition - w.xyz);
  vec3 Nf = normalize(mix(N, T, .3));
  vLit = mix(uGround, uSky, Nf.y * .5 + .5) + uKeyC * max((dot(Nf, uKeyD) + .75) / 1.75, 0.) + uFillC * max((dot(Nf, uFillD) + .75) / 1.75, 0.);   // soft, wrapped studio light
  float th = dot(T, normalize(uKeyD + V));
  vSpec = pow(max(1. - th * th, 0.), 12.) * .035;   // matte: only a very soft sheen
  vEdge = 1. - max(dot(N, V), 0.);
  vRim = pow(vEdge, 2.2) * (max(dot(N, uRimD), 0.) * .6 + .4);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FUR_FS = `
precision highp sampler3D;
uniform sampler3D uStr, uClu; uniform vec3 uCol, uKeyC, uRimC, uArm[6], uTip, uBlushC; uniform float uDens, uFine, uRad, uSoft, uLift, uHandAO, uArmR, uCurl, uSat, uDeep, uRimK;
varying vec3 vP, vLit, vW; varying float vH, vAo, vFl, vSpec, vRim, vEdge, vBl;
float seg(vec3 p, vec3 a, vec3 b){ vec3 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
void main(){
  float h = vH;
  // the plush is a sherpa / boucle: dense little rounded curls, each a soft dome of fibres
  vec4 k = texture(uClu, vP * uCurl * uFine / ${CF}.);
  float dc = length(k.rgb - .5) * 3.;                             // to the nearest curl's centre, in curls
  float u = min(h / mix(.6, 1., k.a), 1.);                         // each curl its own height
  float dome = .6 * sqrt(1. - u * u) + .14 - dc;                  // > 0 inside the curl at this height
  float aw = fwidth(dc);
  float aD = clamp(.5 + dome / max(aw * 1.2, .02), 0., 1.);
  aD = mix(aD, 1. - smoothstep(.45, .95, h), max(clamp(aw * 2.5 - .25, 0., 1.), uSoft));   // too small to see, the curls blur into a soft surface
  // over the curls a fine fuzz of fibres, the soft halo on the silhouette
  vec4 s = texture(uStr, vP * uDens * uFine / ${TF}.);
  float t = h / mix(.7, 1., s.g), ef = s.r * 1.2 - uRad * (1. - t * t);
  float aF = clamp(.5 - ef / max(fwidth(ef) * 1.3, .02), 0., 1.) * smoothstep(.35, .8, h) * .85
    * mix(1., smoothstep(.45, .85, vEdge) * .6, uSoft);                 // small: the fuzz only on the outline, where it reads as a soft edge
  float a = h < .001 ? 1. : max(aD, aF);
  if (h < .55 * uSoft) a = 1.;                                     // small: a solid undercoat (soft, not speckled)
  if (a < .02 || vFl < .02 && h > .001) discard;
  // colour: curl tops catch the light, their sides and the gaps between sit softly deeper; the fuzz has pale peachy tips
  float loop = .5 + .5 * sin(dc * 17. + k.a * 6.2832);            // the fibres wind round each curl: faint loops
  float lit = smoothstep(.15, .9, h) * (1. - .62 * (1. - .75 * uSoft) * smoothstep(.25, .8, dc)) * mix(1., .74 + .26 * loop, 1. - uSoft);   // small: curls only suggested
  vec3 tip = mix(uCol, uTip, .34);
  vec3 c = mix(uCol * mix(uDeep, .9, uSoft), uCol, lit) * (.95 + .08 * k.a * (1. - .8 * uSoft));
  c = mix(c, tip, clamp(aF * (1. - aD) * .8 + .3 * smoothstep(.55, 1., h) * (1. - smoothstep(.2, .6, dc)), 0., 1.));   // pale tops on the curls
  c = mix(c, uBlushC, vBl);                                       // (the Plush's rosy cheeks; none on the Robot)
  float occ = mix(mix(.8, .9, uSoft) + .12 * vEdge * vEdge, 1., smoothstep(0., .8, h)) * vAo;
  // soft shadows in the folds, where the arms rest on the body and the paws come close
  float dA = min(min(seg(vW, uArm[0], uArm[1]), seg(vW, uArm[1], uArm[2])), min(seg(vW, uArm[3], uArm[4]), seg(vW, uArm[4], uArm[5])));
  float root = min(length(vW - uArm[0]), length(vW - uArm[3]));   // (none at the shoulders themselves: there the arm is the body)
  occ *= 1. - uHandAO * .4 * (1. - smoothstep(uArmR, uArmR + .17, dA)) * smoothstep(.2, .42, root);
  vec3 col = (c * vLit * occ * .8 + tip * (uKeyC * vSpec * smoothstep(.3, 1., h) + uRimC * vRim * (.3 + .8 * h) * vAo * uLift * uRimK)) * uLift;
  col = max(mix(vec3(dot(col, vec3(.3, .59, .11))), col, uSat), 0.);   // keep the orange rich through the tone mapping
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
function furMat(len, o = {}){
  const { tousle = .05, fine = 1, lift = 1, grav = .35, handAO = 1, skin = 0, skinned = false } = o;
  const m = new THREE.ShaderMaterial({
    uniforms: { ...furU, uLen: { value: len }, uTousle: { value: tousle }, uFine: { value: fine }, uLift: { value: lift }, uGrav: { value: grav }, uHandAO: { value: handAO }, uSkin: { value: skin } },
    vertexShader: FUR_VS, fragmentShader: FUR_FS, extensions: { derivatives: true },
  });
  if (skinned) m.defines = { SKIN: '' };
  m.alphaToCoverage = true;
  // keep covered samples opaque (alpha max), so outer shells never punch see-through holes in the inner ones
  m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.ZeroFactor;
  m.blendEquationAlpha = THREE.MaxEquation; m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneFactor;
  return m;
}
function furMesh(geo, mat){ const m = new THREE.Mesh(geo(1), mat); m.frustumCulled = false; m.userData.lod = geo; furs.push(m); return m; }

/* ---- the head: its skin, and the visor's outline on the front ---- */
const HC = .53, VA = .6, VB = .35, VC = .53, VN = 3.6;   // head centre; visor half width, half height, centre, squareness
const headSkin = (x, y, z) => {
  const t = clamp((y - HC) / .5, -1, 1), w = 1 + .05 * t;             // a touch wider at the crown, like a helmet
  return rbox(x / w, y - HC, z / (1 + .03 * t), .7, .5, .52, .47);
};
const visorR = (x, y) => (Math.abs(x / VA) ** VN + Math.abs((y - VC) / VB) ** VN) ** (1 / VN);
// the visor: a squircle of glass set into the fur, bulging gently like a lens; at its edge it rolls back under the fur,
// so the fur, not a rim, frames it
function visorZ(x, y){
  const r = visorR(x, y), zs = frontZ(headSkin, x, y) ?? .45, r0 = .95;
  const rise = .014 + .05 * (1 - Math.min(1, r) ** 2.4);
  if (r <= r0) return zs + rise;
  const t = Math.min(1, (r - r0) / (1 - r0));
  return zs + rise - (rise + .012) * (1 - Math.sqrt(1 - t * t));
}
function visorGeo(){
  const NR = 30, NA = 120, P = [], I = [];
  P.push(0, VC, visorZ(0, VC));
  for (let i = 1; i <= NR; i++) {
    const r = Math.min(1, 1 - (1 - i / NR) ** 1.6);          // rings bunched toward the rim, where it curves
    for (let j = 0; j < NA; j++) {
      const a = j / NA * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const x = VA * r * Math.sign(c) * Math.abs(c) ** (2 / VN), y = VC + VB * r * Math.sign(s) * Math.abs(s) ** (2 / VN);
      P.push(x, y, visorZ(x, y));
    }
  }
  const at = (i, j) => 1 + (i - 1) * NA + (j % NA);
  for (let j = 0; j < NA; j++) I.push(0, at(1, j), at(1, j + 1));
  for (let i = 1; i < NR; i++) for (let j = 0; j < NA; j++) I.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
  const g = new THREE.BufferGeometry(); g.setIndex(I); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  return g;
}
function eyesGeo(){
  const g = new THREE.PlaneGeometry(1.12, .66, 40, 24), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) + VC; p.setY(i, y); p.setZ(i, visorZ(x, y) + .004); }
  return g;
}
// Headset 1's ear cup (the original, unchanged): a smooth glossy oval disc with an inset ring, facing out along +y
// (turned to the side when placed)
function cupGeoClassic(){
  const pr = [[0, .1], [.3, .098], [.56, .092], [.6, .078], [.66, .076], [.7, .086], [.76, .09], [.86, .082], [.94, .062], [.99, .035], [1, .01], [.97, -.01], [.6, -.02], [0, -.02]];
  // (the profile runs from the top down, which turned every face inside out: seen from the side or behind, the cup
  // showed its far wall from inside, a hollow dish. Laid bottom-up it's the same shape as a closed, solid body)
  const g = new THREE.LatheGeometry(pr.map(([r, h]) => new THREE.Vector2(Math.max(1e-4, r), h)).reverse(), 64);
  g.scale(.25, 1, .19);
  g.computeVertexNormals();
  return g;
}

/* ---- the hands: soft paws, three stubby fingers and a thumb, in three shapes. s: which side (-1 the viewer's left).
   A fist's +y runs back up the arm and its fingers face the viewer; thumbs-up and peace stand upright ---- */
function handSDF(shape, s){
  const fingers = (x, y, z, list, r, k) => list.reduce((d, [a, b]) => smin(d, cap(x, y, z, a, b, r), k), 9);
  if (shape === 'fist') return (x, y, z) => {   // a soft round paw, like a mitten: no knuckles, just a little thumb bump
    const d = blob(x, y - .01, z + .015, .1, .1, .085);
    return smin(d, blob(x - s * .075, y - .02, z - .035, .04, .05, .04), .05);
  };
  if (shape === 'thumb') return (x, y, z) => {
    let d = blob(x, y, z + .01, .095, .1, .08);
    d = smin(d, fingers(x, y, z, [.045, -.01, -.065].map(fy => [[s * .055, fy, .05], [-s * .035, fy, .075]]), .037, .004), .025);
    return smin(d, cap(x, y, z, [-s * .03, .05, .02], [-s * .045, .175, .025], .04), .03);
  };
  if (shape === 'web') return (x, y, z) => {   // a web shooter's flick: the two outer fingers straight up, the middle one pressed to the palm, the thumb out
    let d = blob(x, y, z, .095, .1, .072);
    d = smin(d, fingers(x, y, z, [[[-.052, .05, .01], [-.062, .2, .015]], [[.052, .05, .01], [.062, .2, .015]]], .033, .004), .03);
    d = smin(d, cap(x, y, z, [0, .07, .035], [0, .03, .085], .033), .025);
    return smin(d, cap(x, y, z, [-s * .08, -.02, .02], [-s * .17, .05, .025], .034), .025);
  };
  return (x, y, z) => {   // peace: two fingers up in a V, the third curled under the thumb
    let d = blob(x, y, z, .095, .1, .072);
    d = smin(d, fingers(x, y, z, [[[-.036, .05, .01], [-.07, .2, .015]], [[.036, .05, .01], [.07, .2, .015]]], .035, .004), .03);
    d = smin(d, cap(x, y, z, [s * .065, .04, .045], [s * .035, -.02, .08], .034), .025);
    return smin(d, cap(x, y, z, [-s * .09, -.04, .02], [s * .01, .0, .085], .035), .025);
  };
}

function build(){
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.setSize(SZ, SZ, false);
  R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = .95;
  R.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), .04).texture;
  // warm, soft light: a gentle key from the front, a warm fill, only a whisper of light from behind
  const KEY = new THREE.Vector3(-1.4, 2.4, 5).normalize(), FILL = new THREE.Vector3(3, 1, 3).normalize(), RIM = new THREE.Vector3(1.5, 3, -4).normalize();
  const key = new THREE.DirectionalLight(0xfff0de, 1.25); key.position.copy(KEY);
  const fill = new THREE.DirectionalLight(0xffdcb8, .55); fill.position.copy(FILL);
  const rim = new THREE.DirectionalLight(0xffe8d0, .3); rim.position.copy(RIM);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xfff4ea, 0x6a3a1a, .55));
  cam = new THREE.PerspectiveCamera(20, 1, .1, 60);

  // the fur's own lights match the scene's (linear colours, world directions)
  const lc = (hex, k) => new THREE.Color(hex).convertSRGBToLinear().multiplyScalar(k);
  furU = { uStr: { value: strandTex() }, uClu: { value: clumpTex() }, uCol: { value: new THREE.Color(ORANGE).convertSRGBToLinear() }, uN: { value: 24 }, uDens: { value: 60 },
    uRad: { value: .9 }, uSoft: { value: 0 }, uTime: { value: 0 }, uWind: { value: 1 }, uArm: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, -9, 0)) }, uArmR: { value: .19 }, uSh: { value: [new THREE.Vector3(0, -9, 0), new THREE.Vector3(0, -9, 0)] }, uShD: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uCurl: { value: 52 },
    uB: { value: Array.from({ length: 7 }, () => new THREE.Matrix4()) }, uSat: { value: 1.2 }, uDeep: { value: .74 }, uRimK: { value: 1 }, uTip: { value: new THREE.Vector3(1, .74, .5) }, uBlushC: { value: new THREE.Color() },
    uKeyD: { value: KEY }, uKeyC: { value: lc(0xfff0de, 1.25) }, uFillD: { value: FILL }, uFillC: { value: lc(0xffdcb8, .55) },
    uRimD: { value: RIM }, uRimC: { value: lc(0xffe2c4, .5) }, uSky: { value: lc(0xfff4ea, .48) }, uGround: { value: lc(0x6a3a1a, .42) } };
  // a short, dense, curly plush; the curls stand up rather than lean
  const fBody = furMat(FUR, { grav: .35, skin: 1 }), fHead = furMat(FUR, { grav: .35 }), fFoot = furMat(FUR * .7, { grav: .3 });
  const fArm = furMat(FUR, { grav: .35, handAO: 0 }), fHand = furMat(FUR * .85, { grav: .3, lift: 1.04, handAO: 0 });
  const fSkin = furMat(FUR, { grav: .35, handAO: 1.8, skinned: true }), fSkinArm = furMat(FUR, { grav: .35, handAO: 0, skinned: true });   // (the Plush's skinned body, its arms' fold shadows deeper: cream shows them less than orange)

  // the headset (public/robot/headset.glb, modelled in Blender): a soft-touch painted shell and band with a faint
  // clearcoat, memory-foam cushions and a fabric band pad in a deep tone of the shell, satin aluminium forks and
  // sliders, and a tiny status light. All lit and tone mapped like the rest of the scene
  const shell = new THREE.MeshPhysicalMaterial({ roughness: .42, metalness: 0, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: .2 });
  const cushion = new THREE.MeshPhysicalMaterial({ roughness: .9, metalness: 0, sheen: new THREE.Color(), envMapIntensity: .35 });
  const pad = new THREE.MeshPhysicalMaterial({ roughness: .95, metalness: 0, sheen: new THREE.Color(), envMapIntensity: .3 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9ca1aa, roughness: .34, metalness: .85, envMapIntensity: .5 });
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(ORANGE).multiplyScalar(1.4) });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .7, metalness: 0, reflectivity: .1, envMapIntensity: .04 });   // satin black glass (its reflection is drawn on below)
  // the glass's reflection, drawn rather than taken from the room (which smeared): a softbox above and to the left,
  // bent along the glass's curve, fading downward; a faint sheen along the lower rim; brighter where the glass turns away
  const shine = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    vertexShader: `varying vec2 vU; varying float vF;
      void main(){ vU = vec2(position.x / ${VA}, (position.y - ${VC}) / ${VB});
        vec4 w = modelMatrix * vec4(position, 1.); vec3 n = normalize(mat3(modelMatrix) * normal);
        vF = pow(1. - max(dot(n, normalize(cameraPosition - w.xyz)), 0.), 2.);
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec2 vU; varying float vF;
      float box(vec2 p, vec2 c, vec2 b, float r, float soft){ vec2 q = abs(p - c) - b + r; return 1. - smoothstep(-soft, soft, length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r); }
      void main(){
        vec2 p = vU; p.y += .1 * p.x * p.x;                        // the box follows the glass's curve
        float k = box(p, vec2(-.06, .6), vec2(.62, .1), .09, .035) * mix(.25, 1., smoothstep(.48, .72, p.y));   // the softbox, brighter at its top
        float r = length(pow(abs(vU), vec2(${(VN).toFixed(1)}))) ;
        float rim = smoothstep(.72, .95, pow(r, 1. / ${(VN).toFixed(1)})) * (1. - smoothstep(.95, 1., pow(r, 1. / ${(VN).toFixed(1)}))) * smoothstep(-.2, -.75, vU.y);
        vec3 c = vec3(1., .97, .93) * (k * .26 + rim * .12 + vF * .05) * (.8 + vF);   // (and a faint lift as the glass curves away)
        gl_FragColor = vec4(c, 1.); }`,
  });
  const dot = new THREE.MeshStandardMaterial({ color: 0x1a0802, roughness: .5, envMapIntensity: .3 });
  eyesMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // Headset 1 (the original ear cups, unchanged): in a deeper tone of the fur's own colour (set with the fur's)
  const cup = new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: .55, metalness: 0, sheen: new THREE.Color(0x5a3018), envMapIntensity: .15, toneMapped: false });   // satin, like real headphones
  mats = { shell, cushion, pad, cup, dot, tint: '' };

  // mover: a move's whole-figure turn and squash, about the figure's middle (y = 1); rig: the figure itself
  mover = new THREE.Group(); scene.add(mover);
  const mid = new THREE.Group(); mid.position.y = -1; mover.add(mid);
  rig = new THREE.Group(); mid.add(rig);
  const hips = new THREE.Group(); hips.position.y = .32; rig.add(hips);
  // legs: short thick furry legs on rounded feet that point a little forward and out
  const legF = (x, y, z) => {   // the right leg; the left is its mirror image
    const leg = cap(x, y, z, [0, .0, 0], [0, -.16, .0], .135);   // short, thick and plump
    const c = Math.cos(.18), sn = Math.sin(.18), fx = x - .02, fz = z - .07, rx = fx * c - fz * sn, rz = fx * sn + fz * c;
    const foot = smax(rbox(rx, y + .25, rz, .155, .09, .21, .09), -(y + .33), .05);
    return smin(leg, foot, .09);
  };
  const legLook = (x, y, z, nx, ny) => [y < -.16 ? (ny < -.5 ? .15 : .8) : 1, 1 - .45 * sstep(-.03, .05, y) - .2 * sstep(-.3, -.8, ny)];
  const legG = furGeo(legF, [-.28, -.42, -.25], [.28, .18, .38], .016, legLook);
  const legM = mirrored(legG);
  const legs = [-1, 1].map(s => {
    const g = new THREE.Group(); g.position.set(s * .2, .03, 0); hips.add(g);
    g.add(tag(furMesh(s > 0 ? legG : legM, fFoot), 'robot'));
    return g;
  });
  // the body: a rounded block, a little narrower at the top, shoulders blended in, three little dark dots low on the front
  const torso = new THREE.Group(); hips.add(torso);
  const torsoF = (x, y, z) => {
    const k = clamp(y / .62, 0, 1), w = 1.18 - .3 * k, dz = 1.1 - .14 * k;   // a big soft pear: round heavy tummy, narrow shoulders
    let d = rbox(x / w, y - .23, z / dz, .36, .31, .26, .26);
    [-1, 1].forEach(s => { d = smin(d, blob(x - s * .3, y - .42, z - .05, .16, .15, .16), .16); });   // the arms' roots: soft swellings high on the body's sides
    [-1, 1].forEach(s => { d = smin(d, blob(x - s * .2, y + .04, z - .02, .15, .12, .15), .12); });   // and the legs' roots: the belly flows down into them
    return smin(d, blob(x, y - .6, z + .01, .34, .2, .26), .14);   // and up into the head: no neck, one soft bean of a body
  };
  torso.add(tag(furMesh(furGeo(torsoF, [-.62, -.2, -.45], [.62, .84, .45], .018, (x, y) => [1 + .25 * sstep(.16, -.04, y), 1 - .25 * sstep(.45, .7, y)]), fBody), 'robot'));   // a touch longer at the hem, over the legs
  [-.06, 0, .06].forEach(x => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(.017, 14, 10), dot);
    d.position.set(x, .14, (frontZ(torsoF, x, .14) ?? .25) + FUR * .78); torso.add(tag(d, 'robot'));   // like buttons sitting in the fur
  });
  // the arms: each one soft plush tube of even girth, shoulder to paw, bending as one smooth curve (a chain of short
  // overlapping pieces laid along it each frame), and the paw its plump rounded end
  const segG = furGeo((x, y, z) => cap(x, y, z, [0, -SEG / 2, 0], [0, SEG / 2, 0], ARM), [-.22, -.3, -.22], [.22, .3, .22], .016, () => [1, 1], 3);
  // the paws' shapes are made the first time a pose asks for them; the left paw is the right one's mirror image
  const handG = k => { const f = handSDF(k, 1), z = k === 'fist' ? 1.8 : 1.55; return furGeo((x, y, w) => f(x / z, y / z, w / z) * z, [-.36, -.34, -.32], [.36, .5, .36], .015, undefined, 2.4); };   // the paw: the roll's big rounded end
  const arms = [-1, 1].map(s => {
    const segs = Array.from({ length: NSEG }, () => tag(furMesh(segG, fArm), 'robot')), hand = new THREE.Group();
    torso.add(...segs, hand);
    return { s, segs, segsBy: { robot: segs }, hand, shapes: {}, S: new THREE.Vector3(s * .3, .42, .06), E: new THREE.Vector3(), M: new THREE.Vector3(), P: Array.from({ length: NSEG + 1 }, () => new THREE.Vector3()) };
  });
  paw = k => {
    if (arms[1].shapes[k]) return;
    const g = handG(k), m = mirrored(g);
    arms.forEach(a => { a.shapes[k] = furMesh(a.s > 0 ? g : m, fHand); a.hand.add(a.shapes[k]); });
  };
  paw('fist');
  // the head: a big furry helmet, smooth ear cups, the glass visor set into the fur, and the eyes on the glass
  const head = new THREE.Group(); head.position.set(0, .55, 0); head.scale.setScalar(1.07); torso.add(head);   // a big, round baby head
  // where the headset sits (headset.json, from the Blender model): the cup's frame and oval, the band's plane and reach
  const hv = a => new THREE.Vector3(...a), HO = hv(HS.O), HAX = hv(HS.axis), HY = hv(HS.Yp), HZ = hv(HS.Zp), HP = new THREE.Vector3();
  const cupAt = (x, y, z) => {   // a point in the nearer cup's frame: [oval radius (1 on the cushion's edge), along the axis, u, v]
    HP.set(Math.abs(x), y, z).sub(HO);
    const u = HP.dot(HY) / HS.CA, v = HP.dot(HZ) / HS.CB;
    return [(Math.abs(u) ** HS.SE + Math.abs(v) ** HS.SE) ** (1 / HS.SE), HP.dot(HAX), u, v];
  };
  const CUP = (y, z) => Math.hypot((y - .5) / .25, (z + .02) / .19);   // 1 on Headset 1's cup rim
  const headLook = cans => (x, y, z, nx, ny) => {
    let fl = 1 + .45 * sstep(.2, .9, ny), cb = null, ao = 1 - .45 * sstep(-.2, -.85, ny);                            // a fuller, tousled crown
    const r = z > 0 ? visorR(x, y) : 9;
    if (r < 1.3) {   // round the glass: none under it, short at its edge, and lying in over it, so the fur frames the glass
      fl *= r < .985 ? 0 : mix(.75, 1, sstep(.985, 1.1, r));
      const k = 2.4 * (1 - sstep(1.02, 1.25, r)), dx = -x / VA, dy = -(y - VC) / VB, l = Math.hypot(dx, dy) || 1;
      cb = [dx / l * k * 1.5, dy / l * k * (dy < 0 ? .45 : 1.5), 0];   // more below, against gravity; less above, where gravity droops it already
      ao = Math.max(ao, 1.15 - .25 * sstep(1, 1.3, r));                        // and lit, so the frame reads as fur, not a dark rim
    }
    if (!cans) return [fl, ao, cb];
    if (cans === 'cups') {   // Headset 1: none well under the ear cups, but full right up to their rims and lying in over
      if (Math.abs(x) > .45) {   // them, lit, so no strip of bare roots shows between cup and fur
        const c = CUP(y, z);
        fl *= c < .74 ? 0 : mix(.7, 1.12, sstep(.74, .95, c)) * mix(1, 1 / 1.12, sstep(1.05, 1.3, c));
        if (c < 1.35) ao = Math.max(ao, 1.12 - .12 * sstep(1, 1.35, c));
        if (c < 1.3) { const k = 1.3 * (1 - sstep(.95, 1.3, c)), dy = -(y - .5), dz = -(z + .02), l = Math.hypot(dy, dz) || 1; cb = [0, dy / l * k, dz / l * k]; }
      }
      return [fl, ao, cb];
    }
    // the band: pressed flat under its pad over the crown, the fur either side leaning in against it, a soft shadow at its edges
    const ph = Math.atan2(x, y - HC), dz = Math.abs(z - HS.ZC), sx = Math.sign(x) || 1;
    if (Math.abs(ph) < HS.PHI_E + .04 && dz < .2) {
      fl *= mix(.12, 1, sstep(.055, .2, dz) ** .7);   // (pressed broadly, as a real band presses hair)
      ao *= 1 - .4 * (1 - sstep(.06, .16, dz));
      if (dz > .05) { const k = 1.2 * (1 - sstep(.08, .2, dz)); cb = [0, 0, Math.sign(HS.ZC - z) * k]; }
    }
    // the slider strip down from the band's end to the fork: a narrow parting
    if (Math.abs(x) > .45 && y > HS.APEX[1] - .02 && Math.abs(ph) >= HS.PHI_E - .04 && dz < .06) fl *= mix(.35, 1, sstep(.015, .05, dz));
    // the ear cups: none under the cushions, the fur round them pressed down and lying in against their sides, shaded
    if (Math.abs(x) > .35) {
      const [c, , u, v] = cupAt(x, y, z);
      fl *= c < .99 ? 0 : mix(.3, 1, sstep(.99, 1.28, c));
      ao *= 1 - .45 * (1 - sstep(.98, 1.35, c));
      if (c < 1.35) {
        const k = 1.1 * (1 - sstep(1, 1.35, c)), d = HP.copy(HY).multiplyScalar(-u * HS.CA).addScaledVector(HZ, -v * HS.CB).normalize();
        cb = [d.x * k * sx, d.y * k, d.z * k];
      }
    }
    return [fl, ao, cb];
  };
  // what it wears on its head (look.js): Headset 1 (the ear cups), Headset 2 (the full headset) or nothing; a head fur
  // for each, parted to fit. Headset 2 arrives a moment later (it's a model file): until then the whole fur shows
  const hfur = look => furMesh(furGeo(headSkin, [-.78, -.02, -.56], [.78, 1.06, .56], .022, headLook(look)), fHead);
  const furCups = hfur('cups'), furHeadset = hfur(true), furOff = hfur(false);
  head.add(furCups, furHeadset, furOff);
  const cups = [furCups], cg = cupGeoClassic();
  [-1, 1].forEach(s => {
    const c = new THREE.Mesh(cg, cup); c.rotation.set(0, s * .3, -s * Math.PI / 2, 'YXZ'); c.scale.set(1, 1.35, 1); c.position.set(s * .72, .5, -.02); c.renderOrder = -1; head.add(c); cups.push(c);
  });
  const hsG = new THREE.Group(); head.add(hsG);   // Headset 2 (sized to each variant's head when drawn)
  head.userData.wear = { robot: { cups, headset: [furHeadset, hsG], none: [furOff] } }; head.userData.ready = false;
  new GLTFLoader().load(`${import.meta.env.BASE_URL}robot/headset.glb`, g => {
    const M = { shell, band: shell, cushion, padding: pad, yoke: metal, accent: led };
    g.scene.traverse(o => { if (o.isMesh) { o.material = M[o.name] || shell; o.frustumCulled = false; o.renderOrder = -1; } });   // solid, and drawn before the fur, which then depth-tests against it
    hsG.add(g.scene); head.userData.ready = true;
    robots.forEach(r => { r.next = 0; });   // draw them all again, wearing it
  }, undefined, e => { if (import.meta.env?.DEV) console.error('headset', e); });
  const vg = visorGeo(); head.add(tag(new THREE.Mesh(vg, glass), 'robot'));
  const sh = new THREE.Mesh(vg, shine); sh.renderOrder = 3; head.add(tag(sh, 'robot'));
  const eyes = new THREE.Mesh(eyesGeo(), eyesMat); eyes.renderOrder = 2; head.add(tag(eyes, 'robot'));
  parts = { hips, legs, legF, legLook, torso, arms, head, hsG, fur: { fBody, fHead, fFoot, fArm, fHand, fSkin, fSkinArm }, glass, built: { robot: true } };
}

/* ---- the Plush (attachRobot(canvas, { variant: 'plush' })): the same rig, poses, eyes and moves, in Concept B's
   body. Its body is the concept's own Blender model (public/robot/plush.glb, exported by Buddy/concepts/B/build.py
   --export --lift --legs --split): ONE soft bean, head and body a single mass with no neck, small round ears on the
   dome, two short stubs of legs that show below the belly, and big teardrop arms, each its own mesh with its root
   tucked into the body, so at rest they look fused along its sides and posed they lift clean off it. The shell fur is
   laid on each mesh and they're posed by skinning: the dome follows the head (so it still looks round and nods), each
   arm follows the same two-bone reach as the Robot's arms (its upper part turning at the shoulder, its lower part at
   the elbow), each stub follows its leg. At rest the meshes are exactly the model. The goggle and the headphones are
   the model's too, on the head ---- */
export const PLUSH = { fur: '#f2e2c0' };
let PM = null;   // the model's numbers (public/robot/plush.json): the goggle's frame, the cups' place
const PHY = 1;    // the head's pivot above the hips (where the dome turns from); its rest place in torso space
// the fur's partings and shading over the one mesh, in torso space (world y = y + .32 at rest)
const plushLook = (cans, face) => (x, y, z, nx, ny) => {
  const Y = y + .32, M = PM;
  let fl = 1, cb = null, ao = 1 - .18 * sstep(-.2, -.9, ny);
  if (Y < .12 && ny < -.5) fl = .25;                                                // short under the feet
  ao *= 1 - .4 * sstep(.46, .28, Y) * sstep(.2, -.4, ny);                             // the belly's underside in shade, so the legs stand out from under it
  // the goggle: none under it, short at its edge, lying in against it (or, its face showing instead, the fur grown
  // over where the goggle was, short round the eyes and under the muzzle)
  const phi = Math.atan2(x, z), u = phi / M.V_HALF_ANG, v = (Y - M.V_ZC) / M.V_HALF_H;
  const r = z > 0 && !face ? (Math.abs(u) ** M.V_N + Math.abs(v) ** M.V_N) ** (1 / M.V_N) : 9;
  if (face && z > .2) fl *= faceFur(x, Y);
  if (r < 1.3) {
    fl *= r < 1.04 ? 0 : mix(.45, 1, sstep(1.04, 1.25, r));
    const k = 1.1 * (1 - sstep(1.05, 1.3, r)), l = Math.hypot(u, v) || 1, tu = -u / l * k * .6, tv = -v / l * k * (v > 0 ? .5 : 1.2);   // lying in toward the glass
    cb = [tu * Math.cos(phi), tv, -tu * Math.sin(phi)];
    ao = Math.min(ao, .86 + .14 * sstep(1.05, 1.3, r));
  }
  // rosy cheeks, just under the goggle either side (or either side of the muzzle)
  const bl = z > .1 ? .3 * Math.exp(-(((Math.abs(x) - (face ? .3 : .23)) / .1) ** 2 + ((Y - (face ? 1.53 : 1.31 + (M.lift || 0))) / .075) ** 2)) : 0;
  const cz = -M.CUP_Y, cyw = M.CUP_Z;
  if (cans === 'cups') {
    if (Math.abs(x) > .3) {   // none under the cushions, full up to their rims and lying in over them
      const c = Math.hypot((Y - cyw) / .19, (z - cz) / .19);
      // only the fur right under the cushion goes (where the head curves away from it, it stays: else bare skin shows past the cup)
      const under = sstep(M.cupSurfX - .1, M.cupSurfX - .03, Math.abs(x));
      fl *= mix(1, c < .8 ? 0 : mix(.7, 1.1, sstep(.8, 1, c)) * mix(1, 1 / 1.1, sstep(1.05, 1.3, c)), under);
      if (c < 1.3) { const k = 1.2 * (1 - sstep(.95, 1.3, c)), dy = -(Y - cyw), dz = -(z - cz), l = Math.hypot(dy, dz) || 1; cb = [0, dy / l * k, dz / l * k]; }
    }
    const dz = Math.abs(z - cz);   // the band over the crown presses a soft parting
    if (Y > cyw + .12 && dz < .085) { fl *= mix(.25, 1, sstep(.04, .085, dz)); ao *= 1 - .3 * (1 - sstep(.03, .08, dz)); if (dz > .03) cb = [0, 0, Math.sign(z - cz) * .9]; }
  } else if (cans) {   // Headset 2: the Robot's partings, in the scaled model's own space
    const hy = Y - (.32 + PHY), qx = x / PHS.s, qy = (hy - PHS.dy) / PHS.s, qz = (z - PHS.dz) / PHS.s;
    const ph = Math.atan2(qx, qy - HC), dz = Math.abs(qz - HS.ZC), sx = Math.sign(qx) || 1;
    if (qy > 0 && Math.abs(ph) < HS.PHI_E + .04 && dz < .2) {
      fl *= mix(.12, 1, sstep(.055, .2, dz) ** .7);
      ao *= 1 - .4 * (1 - sstep(.06, .16, dz));
      if (dz > .05) { const k = 1.2 * (1 - sstep(.08, .2, dz)); cb = [0, 0, Math.sign(HS.ZC - qz) * k]; }
    }
    if (Math.abs(qx) > .35 && Math.abs(qy - HS.O[1]) < .5) {
      HP.set(Math.abs(qx), qy, qz).sub(HSO);
      const uu = HP.dot(HSY) / HS.CA, vv = HP.dot(HSZ) / HS.CB, c = (Math.abs(uu) ** HS.SE + Math.abs(vv) ** HS.SE) ** (1 / HS.SE);
      const al = HP.dot(HSX);
      if (Math.abs(al) < .25) {
        // only right under the cushion's face; deeper in, where the head curves away from it, the fur stays (else
        // bare skin shows beside the cup from a turned view)
        const under = sstep(-.17, -.07, al);
        fl *= mix(1, c < .99 ? 0 : mix(.3, 1, sstep(.99, 1.28, c)), under);
        ao *= 1 - .45 * (1 - sstep(.98, 1.35, c)) * under;
        if (c < 1.35) {
          const k = 1.1 * (1 - sstep(1, 1.35, c)), d = HP.copy(HSY).multiplyScalar(-uu * HS.CA).addScaledVector(HSZ, -vv * HS.CB).normalize();
          cb = [d.x * k * sx, d.y * k, d.z * k];
        }
      }
    }
  }
  return [fl, ao, cb, bl];
};
// the Plush's face, without its goggle (world space, at rest): goofy, friendly googly eyes close together on top of a
// long tan snout, a big soft nose, the mouth under it
const PFACE = { ex: .112, ey: 1.77, er: .095, mx: .2, my: .155, mz: .19, muy: 1.575, ny: 1.62 };
const PDEC = { x0: -.3, x1: .3, y0: 1.38, y1: 1.86, W: 480, H: 384 };   // where its mouth and happy closed eyes are drawn
// the fur over the face: short round the eyes so they sit clear of it, very short where the snout sits
const faceFur = (x, Y) => {
  const de = Math.hypot(Math.abs(x) - PFACE.ex, Y - PFACE.ey), dm = Math.hypot(x / PFACE.mx, (Y - PFACE.muy) / PFACE.my);
  return mix(.15, 1, sstep(.1, .17, de)) * mix(.08, 1, sstep(.85, 1.08, dm));
};
// each of the Robot's eye drawings as the face's: each eye (viewer's left, right) and the mouth. An eye is open
// ('o'), wide, under a lid ('half', tipped for 'angry' or 'sad'), shut by its lid ('down': sleepy), or a happy arc
const PF = { line: ['o', 'o', 'smile'], dots: ['o', 'o', 'smile0'], blush: ['o', 'o', 'smile'], happy: ['arc', 'arc', 'open'], chevron: ['arc', 'arc', 'laugh'],
  chevronline: ['arc', 'arc', 'open'], ring: ['wide', 'wide', 'o'], ringsm: ['wide', 'wide', 'o'], star: ['wide', 'wide', 'open'], heart: ['arc', 'arc', 'smile'],
  smug: ['half', 'half', 'smirk'], skeptical: ['half', 'o', 'flat'], angry: ['angry', 'angry', 'frown'], sad: ['sad', 'sad', 'frown'], worried: ['sad', 'o', 'frown'],
  bored: ['half', 'half', 'flat'], sleepy: ['down', 'down', 'line'], playwink: ['o', 'arc', 'open'], wink: ['o', 'arc', 'smile'], cry: ['down', 'down', 'frown'] };
function drawPlushFace(c, st, blink, mouth, lv){
  const x = c.getContext('2d'), D = PDEC, F = PFACE, W = c.width, H = c.height;
  x.clearRect(0, 0, W, H);
  const X = v => (v - D.x0) / (D.x1 - D.x0) * W, Y = v => (D.y1 - v) / (D.y1 - D.y0) * H, S = v => v / (D.x1 - D.x0) * W;
  x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#2a1612'; x.lineWidth = S(.022);
  [-1, 1].forEach((s, i) => {   // a happy closed eye: a bold upturned arc where the eye was
    if (blink || st[i] !== 'arc') return;
    x.beginPath(); x.arc(X(s * F.ex), Y(F.ey) + S(.04), S(.062), Math.PI * 1.15, Math.PI * 1.85); x.stroke();
  });
  // the mouth: a short line down from the nose, parting into a smile (or a frown), or open, with a pink tongue
  const top = F.ny - .07, base = 1.49;
  x.lineWidth = S(.017);
  x.beginPath(); x.moveTo(X(0), Y(top)); x.lineTo(X(0), Y(base)); x.stroke();
  if (mouth === 'open' || mouth === 'laugh' || mouth === 'talk') {
    const w = mouth === 'laugh' ? .085 : .062, k = mouth === 'talk' ? .4 + .6 * Math.min(1, lv) : mouth === 'laugh' ? 1 : .8, hb = base - .065 * k;
    x.save(); x.beginPath(); x.moveTo(X(-w), Y(base)); x.quadraticCurveTo(X(0), Y(base + .006), X(w), Y(base));
    x.bezierCurveTo(X(w), Y(hb + .01), X(w * .5), Y(hb), X(0), Y(hb)); x.bezierCurveTo(X(-w * .5), Y(hb), X(-w), Y(hb + .01), X(-w), Y(base));
    x.closePath(); x.fillStyle = '#5a1c1c'; x.fill(); x.clip();
    x.fillStyle = '#e8737c'; x.beginPath(); x.ellipse(X(0), Y(hb + .008), S(w * .75), S(.065 * k * .42), 0, 0, Math.PI * 2); x.fill(); x.restore();
  } else if (mouth === 'o') { x.beginPath(); x.ellipse(X(0), Y(base - .03), S(.026), S(.034), 0, 0, Math.PI * 2); x.fillStyle = '#5a1c1c'; x.fill(); }
  else {
    const w = mouth === 'smile' ? .08 : .06, sm = { smile: .028, smile0: .016, frown: -.014, flat: 0, smirk: 0 }[mouth] ?? .006, sr = mouth === 'smirk' ? .024 : sm;
    x.beginPath(); x.moveTo(X(-w), Y(base + sm)); x.quadraticCurveTo(X(-w * .45), Y(base - sm * .5), X(0), Y(base));
    x.quadraticCurveTo(X(w * .45), Y(base - sr * .5), X(w), Y(base + sr)); x.stroke();
  }
}
// the face's parts on the head (head space: world less the head's rest place); shown in place of the goggle
function buildPlushFace(body){
  const { head } = parts, HY = .32 + PHY, F = PFACE;
  // the head's front, sampled from the model: how far forward the skin is at a point across the face
  const vp = body.geometry.attributes.position, pts = [], tv = new THREE.Vector3();
  for (let i = 0; i < vp.count; i++) { tv.fromBufferAttribute(vp, i).applyMatrix4(body.matrixWorld); if (tv.z > .15 && tv.y > 1.3) pts.push(tv.x, tv.y, tv.z); }
  const front = (x, y) => { let best = -9; for (let i = 0; i < pts.length; i += 3) if ((pts[i] - x) ** 2 + (pts[i + 1] - y) ** 2 < .0012 && pts[i + 2] > best) best = pts[i + 2]; return best > -8 ? best : .3; };
  const face = o => { o.userData.face = 'face'; o.frustumCulled = false; return tag(o, 'plush'); };
  // the snout: long and round, standing well out from the face, of short velvety fur in a warm tan (its own colour,
  // so the face reads at a glance)
  const mz0 = front(0, F.muy) - .07, my = F.muy - HY, muz = (x, y, z) => blob(x, y - my, z - mz0, F.mx, F.my, F.mz);
  const fMuz = furMat(FUR * .45, { grav: .2, handAO: 0 }); fMuz.uniforms.uCol = { value: new THREE.Color('#e2bb8f').convertSRGBToLinear() };
  head.add(face(furMesh(furGeo(muz, [-.27, my - .22, mz0 - .26], [.27, my + .22, mz0 + .26], .012, () => [1, 1.05]), fMuz)));
  // the nose: big, soft and matte, on the snout's tip, with two nostrils under its front
  const nz = mz0 + F.mz * Math.sqrt(1 - ((F.ny - F.muy) / F.my) ** 2) + .01, NY = F.ny - HY;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: .55, clearcoat: .2, clearcoatRoughness: .5, envMapIntensity: .12 }));
  nose.scale.set(.13, .078, .085); nose.position.set(0, NY, nz); nose.rotation.x = -.2; head.add(face(nose));
  const nost = new THREE.MeshBasicMaterial({ color: 0x0a0a0c });
  [-1, 1].forEach(s => { const n = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), nost); n.scale.set(.026, .017, .012); n.position.set(s * .048, NY - .028, nz + .07); n.rotation.set(-.6, 0, s * .4); head.add(face(n)); });
  // the eyes: big round white googly eyes, brown irises and pupils that look about, and a lid of fur's colour that
  // comes down over each (a blink, sleepy, cross, sad)
  const white = new THREE.MeshPhysicalMaterial({ color: 0xe9e6df, roughness: .3, clearcoat: .8, clearcoatRoughness: .15, envMapIntensity: .25 });
  const iris = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8a4214).convertSRGBToLinear() });   // (flat: the scene's bright light would wash a lit one out)
  const pupil = new THREE.MeshBasicMaterial({ color: 0x020101 });
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const lidM = parts.lidM = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9b48f').convertSRGBToLinear(), roughness: 1, envMapIntensity: .2 });   // (the fur's colour as it reads in shade: the plain colour would glare; set with the fur's, in pose)
  const lashM = new THREE.MeshBasicMaterial({ color: 0x3a2618 }), er = F.er;
  parts.beads = [-1, 1].map(s => {
    const g = new THREE.Group(); g.position.set(s * F.ex, F.ey - HY, front(s * F.ex, F.ey) - .012);   // (well out of the fur: googly)
    g.add(new THREE.Mesh(new THREE.SphereGeometry(er, 32, 22), white));
    const look = new THREE.Group(); g.add(look);   // the iris, pupil and catchlight turn together, to where it's looking
    const ir = new THREE.Mesh(new THREE.SphereGeometry(er * .52, 24, 16), iris); ir.scale.z = .3; ir.position.z = er * .88; look.add(ir);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(er * .29, 20, 12), pupil); pu.scale.z = .3; pu.position.z = er * .95; look.add(pu);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(er * .1, 12, 8), glint); gl.position.set(-er * .17, er * .2, er * .99); look.add(gl);
    const tilt = new THREE.Group(); g.add(tilt);   // the lid: a cap over the eye's top, swung down over its front
    const lid = new THREE.Mesh(new THREE.SphereGeometry(er * 1.12, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), lidM); tilt.add(lid);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(er * 1.12, er * .07, 8, 40), lashM); rim.rotation.x = Math.PI / 2; lid.add(rim);   // its edge, a soft dark line
    g.userData = { look, tilt, lid };
    head.add(face(g)); return g;
  });
  // the decal: a thin skin over the face's fur (and the snout's) where the mouth and happy closed eyes are drawn
  const D = PDEC, dg = new THREE.PlaneGeometry(D.x1 - D.x0, D.y1 - D.y0, 48, 36), dp = dg.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const x = dp.getX(i), Y = dp.getY(i) + (D.y0 + D.y1) / 2, xm = x / F.mx, ym = (Y - F.muy) / F.my, q = 1 - xm * xm - ym * ym;
    const mf = q > 0 ? mz0 + F.mz * Math.sqrt(q) + FUR * .45 * .8 : -9;
    dp.setXYZ(i, x, Y - HY, Math.max(front(x, Y) + FUR * faceFur(x, Y) * .85, mf) + .004);
  }
  dg.computeVertexNormals();
  faceMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const decal = new THREE.Mesh(dg, faceMat); decal.renderOrder = 2; head.add(face(decal));
}
// how the face shows a feeling this frame: each eye open, wide, lidded, shut or (happy) hidden behind its drawn arc;
// the irises follow where it's looking
function showFace(r, st){
  parts.beads.forEach((g, i) => {
    const s = i ? 1 : -1, k = r.blink ? 'shut' : st[i], { look, tilt, lid } = g.userData;
    g.children.forEach(o => { o.visible = k !== 'arc'; });
    g.scale.setScalar(k === 'wide' ? 1.15 : 1);
    const a = { half: .12, angry: -.12, sad: -.05, down: .55, shut: 1.62 }[k];   // how far the lid comes down (0: to the eye's middle)
    lid.visible = a != null; lid.rotation.x = a || 0;
    tilt.rotation.z = k === 'angry' ? s * .42 : k === 'sad' ? -s * .38 : 0;
    look.rotation.set(-r.ey * .35, r.ex * .5, 0);
  });
}
/* ---- the Plush's clothes (look.js plushOutfit): each outfit built the first time it's worn, from a few parts ----
   A body garment is the body's own skin where the garment covers it, pushed out just past the fur (so the fur under it
   never shows) and skinned with the body, so it nods and sits with it. Sleeves are tube pieces laid along the arm each
   frame, over the arm's own (so they bend at the elbow with it); trouser legs and boots ride the legs. Patches (pockets,
   badges, a number) are smaller garments a touch further out; trims (collars, a hood, drawstrings, a stethoscope) are
   tubes laid on the body's surface; buttons sit on it. Fabrics are small tiling canvases on round-the-body UVs */
const CLOTH = .062;   // a garment's distance out from the skin: just past the fur
function fabric(kind, a, b){
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = a; x.fillRect(0, 0, 256, 256);
  const speck = (n, al, sz) => { for (let i = 0; i < n; i++) { x.fillStyle = Math.random() < .5 ? `rgba(255,255,255,${al})` : `rgba(0,0,0,${al})`; x.fillRect(Math.random() * 256, Math.random() * 256, sz, sz); } };
  if (kind === 'denim') {   // a diagonal twill
    x.lineWidth = 2; for (let i = -256; i < 512; i += 5) { x.strokeStyle = (i / 5) % 2 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.16)'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke(); }
    speck(3000, .06, 1);
  } else if (kind === 'knit') {   // rows of knitted Vs
    for (let row = 0; row < 256; row += 12) for (let col = 0; col < 256; col += 16) {
      x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 3; x.beginPath(); x.moveTo(col + 2, row + 1); x.lineTo(col + 8, row + 11); x.lineTo(col + 14, row + 1); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.13)'; x.lineWidth = 2; x.beginPath(); x.moveTo(col + 3, row); x.lineTo(col + 8, row + 8); x.lineTo(col + 13, row); x.stroke();
    }
  } else if (kind === 'stripes') { x.fillStyle = b; x.fillRect(0, 0, 256, 128); speck(2500, .04, 1); }   // (two to a tile)
  else if (kind === 'sides') { x.fillStyle = b; x.fillRect(58, 0, 12, 256); x.fillRect(186, 0, 12, 256); speck(2500, .04, 1); }   // a stripe down each side
  else if (kind === 'jersey') { for (let y = 0; y < 256; y += 4) for (let i = y % 8 ? 2 : 0; i < 256; i += 4) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(i, y, 2, 2); } }
  else speck(kind === 'rubber' ? 900 : 5000, kind === 'rubber' ? .03 : .055, kind === 'fleece' ? 2 : 1);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}
const pic = (draw, w = 256, h = 256) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
// cloth: a soft matte fabric with a faint sheen; skinned, it follows the body's bones as the body's fur does
function clothMat(map, { rough = .88, skinned = false, alpha = false, rep = [6, 8] } = {}){
  if (map && !alpha) map.repeat.set(...rep);
  const m = new THREE.MeshPhysicalMaterial({ map, color: new THREE.Color(.8, .8, .8), roughness: rough, sheen: new THREE.Color(.16, .16, .16), envMapIntensity: .35, side: THREE.DoubleSide, transparent: alpha, alphaTest: alpha ? .5 : 0, depthWrite: !alpha, toneMapped: false });   // (untoned, as the cups are: the fur's tone curve would wash the colours out)
  if (skinned) m.onBeforeCompile = sh => {
    sh.uniforms.uB = furU.uB;
    sh.vertexShader = 'attribute vec4 bi, bw; uniform mat4 uB[7];\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', 'mat4 K = uB[int(bi.x)] * bw.x + uB[int(bi.y)] * bw.y + uB[int(bi.z)] * bw.z + uB[int(bi.w)] * bw.w + mat4(1.) * (1. - bw.x - bw.y - bw.z - bw.w);\nvec3 objectNormal = mat3(K) * normal;')
      .replace('#include <begin_vertex>', 'vec3 transformed = (K * vec4(position, 1.)).xyz;');
  };
  return m;
}
// triangles (P, N, I) as a flat geometry with UVs from uv(x, y, z), pushed out along the normals: where a garment's edge
// runs through a triangle (inside(i) > 0 on one side, a value per vertex), the triangle is cut along it, so hems are
// clean lines, not the steps of the body's triangles. Round-the-axis UVs are split at their seam
function clothGeo(P, N, I, uv, inside, push = 0, W = null){
  const pos = [], nor = [], uvs = [], bi = [], bw = [];
  const vert = (i, j, k) => {   // a point between vertices i and j (k of the way), or vertex i
    const v = [], n = [];
    for (let c = 0; c < 3; c++) { v.push(j == null ? P[i * 3 + c] : P[i * 3 + c] + (P[j * 3 + c] - P[i * 3 + c]) * k); n.push(j == null ? N[i * 3 + c] : N[i * 3 + c] + (N[j * 3 + c] - N[i * 3 + c]) * k); }
    const l = Math.hypot(...n) || 1;
    return { v, n: n.map(q => q / l), w: W ? (j == null || k < .5 ? i : j) : -1 };
  };
  const emit = tri => {
    const u = tri.map(p => uv(p.v[0], p.v[1], p.v[2])), lo = Math.min(u[0][0], u[1][0], u[2][0]), hi = Math.max(u[0][0], u[1][0], u[2][0]);
    tri.forEach((p, k) => {
      pos.push(p.v[0] + p.n[0] * push, p.v[1] + p.n[1] * push, p.v[2] + p.n[2] * push); nor.push(...p.n);
      uvs.push(hi - lo > .5 && u[k][0] < .5 ? u[k][0] + 1 : u[k][0], u[k][1]);
      if (W) for (let j = 0; j < 4; j++) { bi.push(W.bi[p.w * 4 + j]); bw.push(W.bw[p.w * 4 + j]); }
    });
  };
  for (let f = 0; f < I.length; f += 3) {
    const t = [I[f], I[f + 1], I[f + 2]], d = inside ? t.map(inside) : [1, 1, 1], nin = d.filter(q => q > 0).length;
    if (!nin) continue;
    if (nin === 3) { emit(t.map(i => vert(i))); continue; }
    // cut: walk the triangle's edges, keeping the inside corners and where each edge crosses the line
    const poly = [];
    for (let e = 0; e < 3; e++) {
      const a = t[e], b = t[(e + 1) % 3], da = d[e], db = d[(e + 1) % 3];
      if (da > 0) poly.push(vert(a));
      if ((da > 0) !== (db > 0)) poly.push(vert(a, b, da / (da - db)));
    }
    for (let k = 1; k + 1 < poly.length; k++) emit([poly[0], poly[k], poly[k + 1]]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (W) { g.setAttribute('bi', new THREE.Float32BufferAttribute(bi, 4)); g.setAttribute('bw', new THREE.Float32BufferAttribute(bw, 4)); }
  return g;
}
const roundUV = (x, y, z) => [Math.atan2(x, z) / (Math.PI * 2) + .5, y];
// the Plush's outfits: each a list of what it's made of. A garment's shape is a smooth "inside" value over the body
// (> 0 inside, in world units: world Y, as at rest; front means z > 0), cut clean along 0
const band = (Y, a, b) => Math.min(Y - a, b - Y), wide = (x, w) => w - Math.abs(x), either = Math.max, both = Math.min;
const neckY = z => mix(1.43, 1.37, sstep(-.1, .25, z));   // a garment's top: under the chin in front, a little higher behind
const top = (y0, up = 0) => (x, Y, z) => band(Y, y0, neckY(z) + up);
const front = (k = .12) => (x, Y, z) => z - k;
const OUTFITS = {
  overalls: F => {
    const knit = F.fab('knit', '#5e8b4f'), den = F.fab('denim', '#3d6394'), gold = F.metal('#d8a531');
    F.body(top(.56), knit, 0);                                                                                     // a green knit jumper
    F.body((x, Y, z) => either(band(Y, .4, .64), both(front()(x, Y, z), both(wide(x, .27), band(Y, .4, 1.03))), both(front(.1)(x, Y, z), both(.045 - Math.abs(Math.abs(x) - .23), band(Y, .6, 1.36)))), den, .01);   // denim overalls: bib and straps
    F.body((x, Y, z) => both(front(.2)(x, Y, z), both(wide(x, .12), band(Y, .8, .95))), den, .022);              // the bib's pocket
    F.sleeves(knit, 3); F.legs(den, -.17);
    F.buttons([[-.23, 1.0], [.23, 1.0]], gold, .028, .03);
  },
  hoodie: F => {
    const fl = F.fab('fleece', '#f2782a'), sh = F.fab('fleece', '#3b3d42'), cord = F.plain('#f6e7cf');
    F.body(top(.46), fl, .005);                                                                                    // an orange hoodie
    F.body((x, Y, z) => both(front(.2)(x, Y, z), both(wide(x, .24), band(Y, .6, .84))), fl, .02);               // its pouch pocket
    F.body((x, Y) => band(Y, .4, .5), sh, 0);                                                                  // dark shorts
    F.sleeves(fl, 3); F.legs(sh, -.06);
    F.hood(1.38, fl);                                                                                              // the hood, bunched behind the neck
    F.cord([[-.075, 1.34], [-.08, 1.22], [-.085, 1.1]], cord, .011); F.cord([[.075, 1.34], [.08, 1.22], [.085, 1.12]], cord, .011);   // drawstrings
  },
  raincoat: F => {
    const rub = F.fab('rubber', '#f6c52b'), btn = F.plain('#fff3d6', .4), o = { rough: .38 };
    F.body(top(.3), rub, .005, o);                                                                                 // a yellow rubber raincoat
    F.body((x, Y, z) => band(Y, neckY(z) - .06, neckY(z) + .035), rub, .025, o);                                  // its collar, standing up round the neck
    F.body((x, Y, z) => both(front(.2)(x, Y, z), both(.09 - Math.abs(Math.abs(x) - .22), band(Y, .58, .66))), rub, .022, o);   // pocket flaps
    F.sleeves(rub, 3, o); F.boots('#f2bd1f');
    F.buttons([[0, 1.2], [0, 1.0], [0, .8]], btn, .03, .03);
  },
  sailor: F => {
    const st = F.fab('stripes', '#f7f4ee', '#203a74'), nv = F.fab('cotton', '#1f2f5c');
    F.body(top(.5), st, .005, { rep: [1, 7] });                                                                    // a striped sailor top
    F.body((x, Y) => band(Y, .4, .56), nv, 0);                                                                     // navy shorts
    F.sleeves(st, 2, { rep: [1, 7] }); F.legs(nv, -.05);
    F.badge((x, Y, z) => both(front(.2)(x, Y, z), both(.075 - Math.abs(x - .17), .075 - Math.abs(Y - 1.08))), pic((g, w, h) => {   // an anchor badge
      g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#203a74'; g.lineWidth = 16; g.lineCap = 'round';
      g.beginPath(); g.arc(128, 66, 18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(128, 84); g.lineTo(128, 200); g.moveTo(88, 110); g.lineTo(168, 110); g.stroke();
      g.beginPath(); g.arc(128, 150, 56, Math.PI * .15, Math.PI * .85); g.stroke();
    }), [.095, 1.005], [.245, 1.155]);
  },
  doctor: F => {
    const coat = F.fab('cotton', '#f5f5f2'), scrub = F.fab('cotton', '#3fb8a6'), tube = F.plain('#2f3135', .5), steel = F.metal('#c9ced6');
    F.body(top(.52), scrub, 0);                                                                                    // teal scrubs
    F.body((x, Y, z) => both(top(.3, .01)(x, Y, z), either(Math.abs(x) - .095, either(-front(.2)(x, Y, z), Y - 1.36))), coat, .014);   // a white coat, open down the front
    F.body((x, Y, z) => both(front(.2)(x, Y, z), both(.07 - Math.abs(x + .2), band(Y, 1.0, 1.1))), coat, .026);  // a breast pocket
    F.body((x, Y, z) => both(front(.2)(x, Y, z), both(.085 - Math.abs(Math.abs(x) - .23), band(Y, .5, .64))), coat, .026);   // and two below
    F.sleeves(coat, 3); F.legs(scrub, -.17);
    F.cord([[-.24, 1.37], [-.23, 1.2], [-.17, 1.03], [-.05, .95], [.06, .93]], tube, .013, .03);                  // the stethoscope round its neck
    F.cord([[.24, 1.37], [.22, 1.2], [.17, 1.06]], tube, .013, .03);
    F.buttons([[.075, .93]], steel, .045, .045);                                                                   // its chest piece
  },
  football: F => {
    const jer = F.fab('jersey', '#18b3a8'), sh = F.fab('sides', '#18b3a8', '#f7f7f4'), white = F.fab('cotton', '#f7f7f4');
    F.body(top(.5), jer, .005, { rep: [10, 14] });                                                                 // a teal football shirt
    F.body((x, Y, z) => band(Y, neckY(z) - .035, neckY(z)), white, .012);                                         // its white collar
    F.body((x, Y) => band(Y, .4, .56), sh, 0, { rep: [1, 1] });                                                    // shorts with a white side stripe
    F.sleeves(jer, 2, { rep: [10, 14] }); F.legs(sh, -.06, { rep: [1, 1] });
    F.badge((x, Y, z) => both(front(.2)(x, Y, z), both(wide(x, .17), band(Y, .78, 1.1))), pic((g, w, h) => {     // the number
      g.fillStyle = '#f7f7f4'; g.font = `400 ${h * .78}px Inter, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('10', w / 2, h * .54);
    }), [-.17, .78], [.17, 1.1], .012);
  },
};
// an outfit's meshes, built from its list: on the torso, on each arm (sleeve pieces) and on each leg
function buildOutfit(name){
  const { torso, legs } = parts, B = parts.plushBody, Wd = B.world, n = B.P.length / 3, tag2 = o => { o.userData.outfit = name; o.frustumCulled = false; return tag(o, 'plush'); };
  const out = { sleeves: [[], []] }, F = {};
  // the body's front, and its cross-section at a height (world space, at rest)
  const front = (x, Y) => { let best = -9; for (let i = 0; i < n; i++) { const dx = Wd[i * 3] - x, dy = Wd[i * 3 + 1] - Y; if (dx * dx + dy * dy < .0012 && Wd[i * 3 + 2] > best) best = Wd[i * 3 + 2]; } return best > -8 ? best : .4; };
  const section = Y => { let rx = 0, zf = -9, zb = 9; for (let i = 0; i < n; i++) if (Math.abs(Wd[i * 3 + 1] - Y) < .025) { rx = Math.max(rx, Math.abs(Wd[i * 3])); zf = Math.max(zf, Wd[i * 3 + 2]); zb = Math.min(zb, Wd[i * 3 + 2]); } return { rx, cz: (zf + zb) / 2, rz: (zf - zb) / 2 }; };
  F.fab = (k, a, b) => fabric(k, a, b);
  F.plain = (c, rough = .8) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c).convertSRGBToLinear().multiplyScalar(.8), roughness: rough, envMapIntensity: .4, toneMapped: false });
  F.metal = c => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: .3, metalness: .85, envMapIntensity: .9 });
  const add = o => { torso.add(tag2(o)); return o; };
  // a garment over the body where keep(x, Y, z) (world Y), out from the skin by CLOTH + dt
  F.body = (keep, tex, dt = 0, o = {}) => {
    const K = new Float32Array(n); for (let i = 0; i < n; i++) K[i] = keep(B.P[i * 3], B.P[i * 3 + 1] + .32, B.P[i * 3 + 2]);
    const g = clothGeo(B.P, B.N, B.I, (x, y, z) => roundUV(x, y + .32, z), i => K[i], CLOTH + dt, B.W);
    add(new THREE.Mesh(g, clothMat(tex, { ...o, skinned: true })));
  };
  // a picture on the body (a badge, a number): flat UVs over [x0, Y0]..[x1, Y1]
  F.badge = (keep, tex, a, b, dt = .02) => {
    const K = new Float32Array(n); for (let i = 0; i < n; i++) K[i] = keep(B.P[i * 3], B.P[i * 3 + 1] + .32, B.P[i * 3 + 2]);
    const g = clothGeo(B.P, B.N, B.I, (x, y) => [(x - a[0]) / (b[0] - a[0]), (y + .32 - a[1]) / (b[1] - a[1])], i => K[i], CLOTH + dt, B.W);
    add(new THREE.Mesh(g, clothMat(tex, { skinned: true, alpha: true })));
  };
  // sleeves: k pieces from the shoulder (3 to the wrist, 2 short), over the arm's own
  F.sleeves = (tex, k, o = {}) => {
    const SG = VARS.plush.SEG, R = PARM + CLOTH - .006, m = mesh((x, y, z) => cap(x, y, z, [0, -SG / 2, 0], [0, SG / 2, 0], R), [-.36, -.42, -.36], [.36, .42, .36], .014);
    const mat = clothMat(tex, o);
    for (let i = 0; i < k; i++) {
      const g = clothGeo(m.P, m.N, m.I, (x, y, z) => [Math.atan2(x, z) / (Math.PI * 2) + .5, y + i * SG]);
      out.sleeves.forEach(list => { const s = add(new THREE.Mesh(g, mat)); list.push(s); });
    }
  };
  // trouser legs, from the hip down to y (in the leg's own space: 0 at the hip, the foot's top at about -.16)
  F.legs = (tex, bot, o = {}) => {
    const R = .21 * PLEG / 1.55 + .055, c = (.1 + bot) / 2, h = (.1 - bot) / 2;
    const m = mesh((x, y, z) => smax(Math.hypot(x, z) - R, Math.abs(y - c) - h, .03), [-.36, bot - .08, -.36], [.36, .2, .36], .014);
    const g = clothGeo(m.P, m.N, m.I, roundUV), mat = clothMat(tex, o);
    legs.forEach(L => L.add(tag2(new THREE.Mesh(g, mat))));
  };
  // boots: over the foot and up the ankle
  F.boots = c => {
    const m = mesh((x, y, z) => smax(parts.legF(x / (PLEG * 1.06), y * .97, z / (PLEG * 1.06)) - .012, y + .1, .03), [-.5, -.44, -.46], [.5, -.02, .7], .014);
    const g = clothGeo(m.P, m.N, m.I, roundUV), mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c).convertSRGBToLinear().multiplyScalar(.8), roughness: .35, clearcoat: .4, envMapIntensity: .5, toneMapped: false });
    legs.forEach(L => L.add(tag2(new THREE.Mesh(g, mat))));
  };
  // a hood, bunched in soft rolls round the back of the neck, from one side round to the other
  F.hood = (Y, tex) => {
    const mat = clothMat(tex, { rep: [8, 1] });
    [[0, .1, .05], [.07, .075, .02]].forEach(([dy, tube, out0]) => {
      const S = section(Y + dy), pts = [];
      for (let i = 0; i <= 48; i++) { const a = Math.PI * (-.62 + 1.24 * i / 48); pts.push(new THREE.Vector3(Math.sin(a) * (S.rx + CLOTH + out0), Y + dy - .32, S.cz - Math.cos(a) * (S.rz + CLOTH + out0))); }
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, tube, 14, false), mat));
    });
  };
  // a cord laid on the front of the body through [x, Y] points (drawstrings, a stethoscope's tubes)
  F.cord = (pts, mat, r, lift = .02) => {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, Y]) => new THREE.Vector3(x, Y - .32, front(x, Y) + CLOTH + lift)));
    add(new THREE.Mesh(new THREE.TubeGeometry(c, 48, r, 10, false), mat));
  };
  // buttons: little flat domes on the front
  F.buttons = (list, mat, r, lift) => list.forEach(([x, Y]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mat); b.scale.set(r, r, r * .45); b.position.set(x, Y - .32, front(x, Y) + CLOTH + lift); add(b);
  });
  OUTFITS[name](F);
  return out;
}
const HP = new THREE.Vector3(), HSO = new THREE.Vector3(...HS.O), HSY = new THREE.Vector3(...HS.Yp), HSZ = new THREE.Vector3(...HS.Zp), HSX = new THREE.Vector3(...HS.axis);
let PHS = { s: .71, dy: 0, dz: -.09 };   // Headset 2 on the Plush: the model's cups and band scaled and moved to its head (set from plush.json)
// what changes in the shared scene when a variant is drawn: the fur's colour handling, Headset 2's fit, the head's size
function dress(v){
  if (parts.dressed === v) return;
  parts.dressed = v;
  const p = v === 'plush';
  furU.uSat.value = p ? 1 : 1.2;
  furU.uTip.value.set(...(p ? [1, .94, .84] : [1, .74, .5]));
  furU.uDeep.value = p ? .38 : .74;
  furU.uCurl.value = p ? 70 : 52;
  furU.uRimK.value = p ? .5 : 1;
  parts.head.scale.setScalar(p ? 1 : 1.07);
  if (p) parts.hsG.scale.setScalar(PHS.s), parts.hsG.position.set(0, PHS.dy, PHS.dz);
  else parts.hsG.scale.setScalar(1), parts.hsG.position.set(0, 0, 0);
}
// the skinning weights, per vertex (torso space, at rest): bones 0 head, 1-2 left arm (upper, lower), 3-4 right arm,
// 5-6 legs; what's left follows the body itself: its dome follows the head, its stubs the legs (the arms are the
// Robot's tubes and paws, placed each frame, not skinned)
function plushWeights(P){
  const n = P.length / 3, bi = new Float32Array(n * 4), bw = new Float32Array(n * 4), L = PM.lift || 0;
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    const Y = p.y + .32, o = i * 4;
    bi[o] = 0; bw[o] = sstep(1.0 + L, 1.32 + L, Y);
    bi[o + 1] = 5 + (p.x < 0 ? 0 : 1); bw[o + 1] = sstep(.5, .3, Y) * sstep(.02, .1, Math.abs(p.x));
  }
  return { bi, bw };
}
function buildPlush(){
  const { torso, arms, head, fur } = parts;
  parts.built.plush = true; parts.plushReady = false;
  furU.uBlushC.value.set('#ff8f86').convertSRGBToLinear();
  arms.forEach(a => { a.segsBy.plush = []; });
  head.userData.wear.plush = { cups: [], headset: [], none: [] };   // (filled once the model arrives)
  const base = import.meta.env.BASE_URL;
  Promise.all([fetch(`${base}robot/plush.json`).then(r => r.json()), new Promise((ok, no) => new GLTFLoader().load(`${base}robot/plush.glb`, ok, undefined, no))]).then(([meta, g]) => {
    PM = meta;
    const nodes = {}; g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (o.isMesh) nodes[o.name] = o; });
    // Headset 2: the model's cushion frame placed on the Plush's cushions
    const cx = nodes.Cushion1.position.x, s = cx / HS.O[0];
    PHS = { s, dy: (PM.CUP_Z - .32 - PHY) - s * HS.O[1], dz: -PM.CUP_Y - s * HS.O[2] };
    // the arms' rest: the same reach the Robot's arms use, for the neutral pose
    const rest = arms.map(a => {
      const S = new THREE.Vector3(a.s * VARS.plush.S[0], VARS.plush.S[1], VARS.plush.S[2]);
      const T = lift(new THREE.Vector3(...(a.s < 0 ? POSES.neutral.L.t : POSES.neutral.R.t)), VARS.plush), pole = new THREE.Vector3(...(a.s < 0 ? POSES.neutral.L.pole : POSES.neutral.R.pole));
      const { E, T: T1 } = ik(S, T, pole, VARS.plush);
      return { S, E: E.clone(), T: T1.clone(), T2: T1.clone().addScaledVector(T1.clone().sub(E).normalize(), .25) };
    });
    parts.plushRest = rest;
    const skin = mesh => {   // the body in torso space, with its weights, as a fur skin for each headset
      const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); geo.translate(0, -.32, 0);
      const P = geo.attributes.position.array, N = geo.attributes.normal.array, I = Array.from(geo.index.array), W = plushWeights(P);
      return (cans, face) => { const s2 = skinGeo({ P, N, I }, plushLook(cans, face)); s2.setAttribute('bi', new THREE.BufferAttribute(W.bi, 4)); s2.setAttribute('bw', new THREE.BufferAttribute(W.bw, 4)); return s2; };
    };
    const hi = skin(nodes.Body), lo = skin(nodes.BodyLo);
    {   // the body, kept for its clothes (outfits): its skin in torso space with its weights, and its shape in world space
      const geo = nodes.Body.geometry.clone(); geo.applyMatrix4(nodes.Body.matrixWorld);
      const W = geo.attributes.position.array.slice(), Pt = W.slice(); for (let i = 1; i < Pt.length; i += 3) Pt[i] -= .32;
      parts.plushBody = { P: Pt, N: geo.attributes.normal.array, I: geo.index.array, W: plushWeights(Pt), world: W };
    }
    const furOf = (cans, face) => { const a = hi(cans, face), b = lo(cans, face); return furMesh(k => (k > 2 ? b : a), fur.fSkin); };
    const furCups = furOf('cups'), furHs = furOf(true), furOff = furOf(false);
    torso.add(furCups, furHs, furOff);
    // the arms: the Robot's, a soft tube bending at the elbow and ending in a real paw, only thicker (the model's own
    // teardrop arms had no wrist or paw, so folded they sank into the tummy and raised they read as balloons)
    const SG = VARS.plush.SEG, pseg = furGeo((x, y, z) => cap(x, y, z, [0, -SG / 2, 0], [0, SG / 2, 0], PARM), [-.3, -.36, -.3], [.3, .36, .3], .016, () => [1, 1], 3);
    arms.forEach(a => { a.segsBy.plush = Array.from({ length: NSEG }, () => tag(furMesh(pseg, fur.fArm), 'plush')); torso.add(...a.segsBy.plush); });
    // the legs: the Robot's, a plump leg on a rounded foot that points forward, made wider for its body (the model's own
    // stubs had no foot, so they read as two bumps under the belly; they stay, hidden inside these)
    const pleg = furGeo((x, y, z) => parts.legF(x / PLEG, y, z / PLEG), [-.46, -.42, -.42], [.46, .18, .62], .018, parts.legLook), plegM = mirrored(pleg);
    parts.legs.forEach((g, i) => g.add(tag(furMesh(i ? pleg : plegM, fur.fFoot), 'plush')));
    // the goggle, the cups, cushions and band: the model's, on the head (head space: world less the head's rest place)
    const onHead = m => { const o = m.clone(); o.matrix.copy(m.matrixWorld); o.matrix.premultiply(new THREE.Matrix4().makeTranslation(0, -.32 - PHY, 0)); o.matrix.decompose(o.position, o.quaternion, o.scale); o.frustumCulled = false; head.add(o); return o; };
    const cupM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#f26a32').convertSRGBToLinear().multiplyScalar(.72), roughness: .45, metalness: 0, clearcoat: .35, clearcoatRoughness: .35, sheen: new THREE.Color(0x5a3018), envMapIntensity: .25, toneMapped: false });
    const cushM = cupM.clone(); cushM.roughness = .75; cushM.clearcoat = 0; cushM.color.multiplyScalar(.85);
    const cups = [furCups];
    for (const k in nodes) if (/^(Cup|Cushion|Band)/.test(k)) { const o = onHead(nodes[k]); o.material = k.startsWith('Cushion') ? cushM : cupM; o.renderOrder = -1; cups.push(o); }
    head.userData.wear.plush = { cups, headset: [furHs, parts.hsG], none: [furOff] };
    [...cups, furHs, furOff].forEach(o => { o.userData.v = 'plush'; });
    // the furs for its face (the goggle's place grown over), made the first time the face is shown
    parts.faceFurs = () => {
      parts.faceFurs = null;
      const c = furOf('cups', true), h = furOf(true, true), o = furOf(false, true);
      torso.add(c, h, o); [c, h, o].forEach(m => { m.userData.v = 'plush'; });
      head.userData.wear.plushFace = { cups: [c, ...cups.slice(1)], headset: [h, parts.hsG], none: [o] };
    };
    // glossy smoked glass, its soft broad reflection drawn on by the shine (in the goggle's own frame)
    const pglass = new THREE.MeshPhysicalMaterial({ color: 0x060606, roughness: .75, metalness: 0, clearcoat: .2, clearcoatRoughness: .55, reflectivity: .15, envMapIntensity: .03 });
    const visor = onHead(nodes.Visor); visor.material = pglass; tag(visor, 'plush').userData.face = 'visor';
    const vp = visor.geometry.attributes.position, uv = new Float32Array(vp.count * 2), tv = new THREE.Vector3();
    for (let i = 0; i < vp.count; i++) { tv.fromBufferAttribute(vp, i).applyMatrix4(nodes.Visor.matrixWorld); uv[i * 2] = Math.atan2(tv.x, tv.z) / PM.V_HALF_ANG; uv[i * 2 + 1] = (tv.y - PM.V_ZC) / PM.V_HALF_H; }
    visor.geometry = visor.geometry.clone(); visor.geometry.setAttribute('uvv', new THREE.BufferAttribute(uv, 2));
    const sh = new THREE.Mesh(visor.geometry, pvShine()); sh.position.copy(visor.position); sh.quaternion.copy(visor.quaternion); sh.scale.copy(visor.scale); sh.renderOrder = 3; sh.frustumCulled = false; sh.userData.face = 'visor'; head.add(tag(sh, 'plush'));
    const eyes = new THREE.Mesh(pvEyesGeo(nodes.Visor), eyesMat); eyes.renderOrder = 2; eyes.frustumCulled = false; eyes.userData.face = 'visor'; head.add(tag(eyes, 'plush'));
    buildPlushFace(nodes.Body);   // and its face, for when it shows that instead (look.js)
    parts.plushReady = true;
    robots.forEach(r => { r.next = 0; });
  }).catch(e => { if (import.meta.env?.DEV) console.error('plush', e); });
}
// the eyes: the same drawing as the Robot's, on a patch laid just over the goggle's glass, in the middle of it
const PEW = .5, PEH = PEW * EH / EW;
function pvEyesGeo(visor){
  // the glass's front, sampled: for each point across, the nearest of the goggle's vertices seen from the front
  const vp = visor.geometry.attributes.position, pts = [], tv = new THREE.Vector3();
  for (let i = 0; i < vp.count; i++) { tv.fromBufferAttribute(vp, i).applyMatrix4(visor.matrixWorld); if (tv.z > .2) pts.push(tv.x, tv.y, tv.z); }
  const front = (x, y) => { let best = -9; for (let i = 0; i < pts.length; i += 3) if ((pts[i] - x) ** 2 + (pts[i + 1] - y) ** 2 < .0012 && pts[i + 2] > best) best = pts[i + 2]; return best > -8 ? best : .5; };
  const g = new THREE.PlaneGeometry(PEW, PEH, 24, 14), p = g.attributes.position, oy = PM.V_ZC - (110 - EH / 2) / EH * PEH + .004;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) + oy; p.setXYZ(i, x, y - .32 - PHY, front(x, y) + .003); }
  return g;
}
function pvShine(){   // the goggle's reflection: a broad soft window above and to the left, a faint lit lower rim
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    vertexShader: `attribute vec2 uvv; varying vec2 vU; varying float vF;
      void main(){ vU = uvv;
        vec4 w = modelMatrix * vec4(position, 1.); vec3 n = normalize(mat3(modelMatrix) * normal);
        vF = pow(1. - max(dot(n, normalize(cameraPosition - w.xyz)), 0.), 2.);
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec2 vU; varying float vF;
      void main(){
        vec2 p = vU; p.y += .12 * p.x * p.x;
        float k = (1. - smoothstep(.0, .55, length((p - vec2(-.3, .32)) * vec2(.85, 1.6)))) * .9;
        float b = (1. - smoothstep(.0, .22, abs(p.y - .62) - .12)) * (1. - smoothstep(.55, .85, abs(p.x + .05))) * .5;
        float r = length(vec2(pow(abs(vU.x), 3.), pow(abs(vU.y), 3.)));
        float rim = smoothstep(.55, .9, pow(r, 1. / 3.)) * smoothstep(-.2, -.8, vU.y);
        vec3 c = vec3(1., .97, .93) * (k * .4 + b * .14 + vF * .05) * (.8 + vF) * step(0., vU.y + 1.2);
        gl_FragColor = vec4(c, 1.); }`,
  });
}
// the bones, each frame a Plush is drawn (torso space): how far each part has moved from its rest
const PB = { m: new THREE.Matrix4(), n: new THREE.Matrix4(), q: new THREE.Quaternion(), a: new THREE.Vector3(), b: new THREE.Vector3() };
function plushBones(){
  const { head, legs, torso } = parts, B = furU.uB.value; if (!parts.plushRest) return;
  head.updateMatrix(); B[0].copy(head.matrix).multiply(PB.m.makeTranslation(0, -PHY, 0));
  torso.updateMatrix(); const inv = PB.n.copy(torso.matrix).invert();
  legs.forEach((g, i) => { g.updateMatrix(); B[5 + i].copy(inv).multiply(g.matrix).multiply(PB.m.makeTranslation(-(i ? 1 : -1) * VARS.plush.legX, -.03, 0)); });
}

/* ---- posing: every number eases toward the feeling's pose; the arms reach for their hands ---- */
const tmp = { q: new THREE.Quaternion(), u: new THREE.Vector3(), v: new THREE.Vector3(), w: new THREE.Vector3(), x: new THREE.Vector3(), z: new THREE.Vector3(), E: new THREE.Vector3(), T: new THREE.Vector3(), a: new THREE.Vector3(), p: new THREE.Vector3(), m: new THREE.Matrix4() };
const UP = .26, FORE = .32;   // shoulder to elbow, elbow to the middle of the paw: the reach, and where the arm's curve bends
const ARM = .175, NSEG = 4, SEG = .14;   // the tube's radius; the pieces laid along it, and each one's length
// what differs between the variants' rigs: the reach, the arm's girth and pieces, where the shoulders sit, and (the
// Plush) how its hands find its face, which sits higher on its taller, softer bean of a body (see pose)
const VARS = {
  robot: { UP, FORE, SEG, S: [.3, .42, .06], legX: .2, hand: 1, armR: .19, headY: .55 },
  plush: { UP: .42, FORE: .32, SEG: .19, S: [.5, .96, .08], legX: .3, hand: 1.12, armR: .22, lift: .48, out: .2, fwd: .5, headY: PHY, lieHead: 0, headMax: .5 },
};
const PARM = .22, PLEG = 1.55;   // the Plush's arm tube and how much wider its legs are than the Robot's, for its bigger, softer body
let V = VARS.robot;
function place(mesh, a, b){   // a piece of limb from a to b (stretched or squashed a little to fit)
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  tmp.w.copy(b).sub(a); mesh.scale.set(1, Math.max(.3, tmp.w.length() / V.SEG), 1);
  tmp.w.normalize(); mesh.quaternion.setFromUnitVectors(Y, tmp.w);
}
// two-bone reach: where the hand gets to (T) and where the elbow bends (E), for a shoulder S, a target and a pole
function ik(S, target, pole, Vr, E = new THREE.Vector3(), T = new THREE.Vector3()){
  T.copy(target);
  const u = tmp.u.copy(T).sub(S); let d = u.length(); u.normalize();
  const UP = Vr.UP, FORE = Vr.FORE;   // (each variant's own reach)
  d = Math.min(d, UP + FORE - .002); d = Math.max(d, Math.abs(UP - FORE) + .02);
  T.copy(S).addScaledVector(u, d);
  // the elbow bends toward the pole, in the plane through the shoulder and the hand
  const v = tmp.v.copy(pole).addScaledVector(u, -pole.dot(u)); if (v.lengthSq() < 1e-6) v.set(0, -1, 0); v.normalize();
  const ca = (UP * UP + d * d - FORE * FORE) / (2 * UP * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  E.copy(S).addScaledVector(u, UP * ca).addScaledVector(v, UP * sa);
  return { E, T };
}
function reach(arm, target, pole, shape){
  const S = arm.S, { E, T } = ik(S, target, pole, V, arm.E, tmp.T);
  // one smooth curve from the shoulder to the paw, pulled toward the elbow (a soft bend, never a point)
  arm.P.forEach((p, i) => { const k = i / NSEG; p.copy(S).multiplyScalar((1 - k) ** 2).addScaledVector(E, 2 * (1 - k) * k).addScaledVector(T, k * k); });
  arm.segs.forEach((m, i) => place(m, arm.P[i], arm.P[i + 1]));
  arm.cloth?.forEach((m, i) => place(m, arm.P[i], arm.P[i + 1]));   // (the Plush's sleeves, over the arm)
  arm.M.copy(arm.P[NSEG >> 1]);
  furU.uSh.value[arm.s > 0 ? 1 : 0].copy(S); furU.uShD.value[arm.s > 0 ? 1 : 0].copy(arm.P[1]).sub(S).normalize();   // the body's shoulder follows
  arm.hand.position.copy(T);
  if (shape === 'fist') {   // the paw runs on from the forearm; hanging, its fingers curl toward the body, raised, toward the viewer
    const y = tmp.w.copy(E).sub(T).normalize(), hang = clamp(y.y, 0, 1);
    const z = tmp.z.set(-arm.s * hang, 0, 1 - hang * .6); z.addScaledVector(y, -z.dot(y));
    if (z.lengthSq() < 1e-4) z.set(0, -1, 0);
    z.normalize(); const x = tmp.x.crossVectors(y, z);
    arm.hand.quaternion.setFromRotationMatrix(tmp.m.makeBasis(x, y, z));
  } else arm.hand.quaternion.setFromEuler(new THREE.Euler(-.15, arm.s * .25, arm.s * -.15));   // upright: thumbs up, peace
  paw(shape);
  for (const k in arm.shapes) arm.shapes[k].visible = k === shape;
}
// flat on its front: the body's up runs along the ground to the viewer's left (head there), its belly down, its own
// left side toward the viewer; tilted a little so the big head rests on the ground and the body slopes down to the feet
const LIE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0)))
  .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.12));
const LIE_AT = [.85, .27], LIE_HEAD = [.3, .42];   // where the lying body sits; the head, lifted off the neck (body space) to rest on the ground
function pose(r, t, c = r.cur, mv = null){
  const { hips, legs, torso, arms, head } = parts;
  const breathe = r.calm ? 0 : Math.sin(t * 2.1 + r.seed) * .012, talk = r.lv;
  // lying down (exhausted): it eases from standing to flat on its front, then turns a touch toward where it's looking
  rig.quaternion.identity().slerp(LIE, c.lie).premultiply(tmp.q.setFromAxisAngle(Y, r.ex * .1));
  rig.position.set(c.lie * LIE_AT[0], c.lie * LIE_AT[1], 0);
  rig.scale.setScalar(1 - c.lie * .06);
  mover.position.set(mv?.x || 0, 1 + (mv?.y || 0), mv?.z || 0);
  mover.rotation.set(mv?.rx || 0, mv?.ry || 0, mv?.rz || 0);
  mover.scale.set(mv?.sx ?? 1, mv?.sy ?? 1, mv?.sz ?? 1);
  hips.position.y = .32 - c.sit * .18 + breathe * .5 + talk * .015;
  legs.forEach((g, k) => {
    const kick = k ? c.kickR : c.kickL, sd = k ? 1 : -1, lg = c.legs, lp = lg ? lg[k * 2] : 0, lr = lg ? lg[k * 2 + 1] : 0;
    // sitting, the legs splay so the feet face the viewer; a move may also swing a leg straight (legs: [pitch, roll] for
    // left then right, pitch + forward, roll + outward, radians; moves.js)
    g.rotation.set(-c.sit * 1.45 - kick * .35 - lp, 0, sd * (c.sit * .55 + kick * .5 + lr));
    g.position.x = sd * V.legX;
  });
  torso.rotation.set(c.body[0] + c.sit * .04, 0, c.body[1] - (c.kickR - c.kickL) * .06);
  torso.position.y = breathe;
  const sway = r.calm ? 0 : Math.sin(t * 2.1 + r.seed) * .015;
  arms.forEach(a => { a.S.set(a.s * V.S[0], V.S[1], V.S[2]); a.segs = a.segsBy[r.variant]; a.hand.scale.setScalar(V.hand); a.cloth = r.variant === 'plush' ? parts.outfits?.[r.outfit]?.sleeves[a.s > 0 ? 1 : 0] : null; });
  furU.uArmR.value = V.armR;
  reach(arms[0], lift(tmp.a.set(c.L.t[0], c.L.t[1] + sway, c.L.t[2])), tmp.p.set(...c.L.pole), c.Ls);
  reach(arms[1], lift(tmp.a.set(c.R.t[0], c.R.t[1] - sway, c.R.t[2])), tmp.p.set(...c.R.pole), c.Rs);
  mover.updateMatrixWorld(true);
  arms.forEach((a, i) => { const A = furU.uArm.value; A[i * 3].copy(a.S).applyMatrix4(torso.matrixWorld); A[i * 3 + 1].copy(a.M).applyMatrix4(torso.matrixWorld); a.hand.getWorldPosition(A[i * 3 + 2]); });   // for the fold shadows
  const lh = V.lieHead ?? 1, hm = V.headMax ?? 9, hc = a => clamp(a, -hm, hm);   // (the Plush's dome is its body's top: it nods and tilts only gently)
  head.position.set(0, V.headY + c.lie * LIE_HEAD[0] * lh, c.lie * LIE_HEAD[1] * lh);   // lying, the head sits up off the neck onto the ground
  head.rotation.set(hc(c.head[0] + r.ey * .2 - talk * .05), c.head[1] + r.ex * .32, hc(c.head[2] + (r.calm ? 0 : Math.sin(t * 1.3 + r.seed) * .015)), 'YXZ');
  arms.forEach(a => { a.hand.visible = !V.noHands; });
  if (r.variant === 'plush') plushBones();
  if (r.color !== mats.tint) {
    mats.tint = r.color;
    furU.uCol.value.set(r.color).convertSRGBToLinear();
    if (r.variant === 'plush') { parts.lidM?.color.set(r.color).convertSRGBToLinear().multiplyScalar(.6); return; }   // (its lids are its fur's colour in shade; its dots and cups keep their own)
    mats.dot.color.set(r.color).convertSRGBToLinear().multiplyScalar(.035);
    mats.cup.color.set(r.color).convertSRGBToLinear().multiplyScalar(.62);   // Headset 1: a deeper tone of the fur
  }
}
// the Plush's face sits higher on its body than the Robot's, and its sides are rounder: a hand meant for the face
// (cheeks, chin, eyes, a wave by the head) is lifted to it, and one meant for the sides is moved out onto them
function lift(t, Vr = V){
  if (!Vr.lift) return t;
  const up = sstep(.35, .62, t.y), low = 1 - up;
  t.x += Math.sign(t.x) * Vr.out * low * (1 - sstep(.3, .55, t.z));
  t.y += Vr.lift * up; t.z += .06 * up;
  if (Vr.fwd) t.z += Vr.fwd * sstep(.3, .5, t.z) * (1 - sstep(.45, .75, Math.abs(t.x)));   // a hand in front (folded arms, on the tummy) clears its fuller belly
  return t;
}
// the current pose eases toward the target; arrays and numbers alike
function easeTo(c, p, k){
  const e = (a, b) => a + (b - a) * k, ea = (a, b) => a.map((v, i) => e(v, b[i]));
  c.L = { t: ea(c.L.t, p.L.t), pole: ea(c.L.pole, p.L.pole) }; c.R = { t: ea(c.R.t, p.R.t), pole: ea(c.R.pole, p.R.pole) };
  c.Ls = p.L.shape; c.Rs = p.R.shape;
  c.head = ea(c.head, p.head); c.body = ea(c.body, p.body);
  c.sit = e(c.sit, p.sit); c.lie = e(c.lie, p.lie); c.kickL = e(c.kickL, p.kickL); c.kickR = e(c.kickR, p.kickR);
  return Math.abs(c.L.t[0] - p.L.t[0]) + Math.abs(c.L.t[1] - p.L.t[1]) + Math.abs(c.R.t[0] - p.R.t[0]) + Math.abs(c.R.t[1] - p.R.t[1])
    + Math.abs(c.head[1] - p.head[1]) + Math.abs(c.head[2] - p.head[2]) + Math.abs(c.sit - p.sit) + Math.abs(c.lie - p.lie) + Math.abs(c.kickL - p.kickL) + Math.abs(c.kickR - p.kickR);   // how far it still has to go
}
// a move's pose (moves.js) laid over the current one by w, into a copy (the current pose itself is left as it was)
function blend(c, o, w){
  const l = (a, b) => b == null ? a : a + (b - a) * w, la = (a, b) => b ? a.map((v, i) => l(v, b[i])) : [...a];
  const hand = (h, m) => ({ t: la(h.t, m?.t), pole: la(h.pole, m?.pole) });
  return { L: hand(c.L, o.L), R: hand(c.R, o.R), Ls: o.Ls && w > .5 ? o.Ls : c.Ls, Rs: o.Rs && w > .5 ? o.Rs : c.Rs, head: la(c.head, o.head), body: la(c.body, o.body),
    sit: l(c.sit, o.sit), lie: l(c.lie, o.lie), kickL: l(c.kickL, o.kickL), kickR: l(c.kickR, o.kickR), legs: o.legs ? la([0, 0, 0, 0], o.legs) : null };
}
const start = p => ({ L: { t: [...p.L.t], pole: [...p.L.pole] }, R: { t: [...p.R.t], pole: [...p.R.pole] }, Ls: p.L.shape, Rs: p.R.shape,
  head: [...p.head], body: [...p.body], sit: p.sit, lie: p.lie, kickL: p.kickL, kickR: p.kickR });

// a strand of web: a few fine threads twisted together, bright, with a faint glow
const eoS = q => 1 - (1 - q) ** 3;
function webStrand(x, ax, ay, bx, by, cw){
  x.save(); x.lineCap = 'round'; x.shadowColor = 'rgba(255,255,255,.6)'; x.shadowBlur = cw * .006;
  const nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1;
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * cw * .002;
    x.strokeStyle = i === 1 ? 'rgba(250,252,255,.95)' : 'rgba(225,232,242,.7)'; x.lineWidth = Math.max(1, cw * (i === 1 ? .0028 : .0016));
    x.beginPath(); x.moveTo(ax + nx / nl * o, ay + ny / nl * o);
    x.quadraticCurveTo((ax + bx) / 2 + nx / nl * o * 3, (ay + by) / 2 + ny / nl * o * 3, bx, by); x.stroke();
  }
  x.restore();
}
// a web net: radial spokes and a spiral of sagging threads between them, opening out from where it lands, slightly
// stretched along the direction it was shot
function webNet(x, cx, cy, rad0, ang, seed){
  const rnd = n => { const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return v - Math.floor(v); };
  const kind = rnd(1), rad = rad0 * (.55 + .9 * rnd(2));                  // how big this one is
  if (rad < 2) return;
  const C = Math.cos(ang), S2 = Math.sin(ang), sx = 1 + .35 * rnd(3), sy = .75 + .3 * rnd(4);
  const pt = (a, rr) => { const ex = Math.cos(a) * rr * sx, ey = Math.sin(a) * rr * sy; return [cx + ex * C - ey * S2, cy + ex * S2 + ey * C]; };
  x.save(); x.lineCap = 'round'; x.shadowColor = 'rgba(255,255,255,.55)'; x.shadowBlur = rad * .05;
  if (kind < .3) {   // dispersed: a splat of uneven strands flung out from the hit, with droplets of web
    x.strokeStyle = 'rgba(240,244,250,.85)';
    for (let i = 0; i < 18; i++) {
      const a = rnd(10 + i) * Math.PI * 2, l = rad * (.3 + .8 * rnd(30 + i)), [ex, ey] = pt(a, l), [mx, my] = pt(a + (rnd(50 + i) - .5) * .5, l * .5);
      x.lineWidth = Math.max(1, rad * (.01 + .02 * rnd(70 + i)));
      x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
      if (rnd(90 + i) > .5) { x.fillStyle = 'rgba(245,248,252,.9)'; x.beginPath(); x.arc(ex, ey, Math.max(1, rad * .03 * rnd(110 + i)), 0, Math.PI * 2); x.fill(); }
    }
    x.fillStyle = 'rgba(240,244,250,.5)'; x.beginPath(); x.arc(cx, cy, rad * .12, 0, Math.PI * 2); x.fill();
    x.restore(); return;
  }
  // a net: an uneven number of spokes at uneven angles and lengths, a spiral that sags between them, some threads missing
  const N = 8 + Math.floor(rnd(5) * 7), rings = 3 + Math.floor(rnd(6) * 4);
  const ra = i => (i + (rnd(200 + i) - .5) * .6) / N * Math.PI * 2 + rnd(7) * 6, rl = i => rad * (.65 + .35 * rnd(300 + i));
  x.strokeStyle = 'rgba(245,248,252,.92)'; x.lineWidth = Math.max(1, rad * .022);
  for (let i = 0; i < N; i++) { const [ex, ey] = pt(ra(i), rl(i)); x.beginPath(); x.moveTo(cx, cy); x.lineTo(ex, ey); x.stroke(); }
  x.lineWidth = Math.max(1, rad * .014); x.strokeStyle = 'rgba(235,240,248,.8)';
  for (let ring = 1; ring <= rings; ring++) {
    const f = ring / (rings + .4);
    for (let i = 1; i <= N; i++) {
      if (rnd(400 + ring * 31 + i) < .14) continue;                           // a broken thread here and there
      const j = i % N, [ex, ey] = pt(ra(j), rl(j) * f), [px0, py0] = pt(ra(i - 1), rl(i - 1) * f), mx = (px0 + ex) / 2, my = (py0 + ey) / 2, sag = .08 + .12 * rnd(500 + i);
      x.beginPath(); x.moveTo(px0, py0); x.quadraticCurveTo(mx + (cx - mx) * sag, my + (cy - my) * sag, ex, ey); x.stroke();
    }
  }
  x.restore();
}
// where a web lands: radial threads joined by a couple of rings, like a little web
function webSplat(x, cx, cy, rad){
  x.save(); x.strokeStyle = 'rgba(240,244,250,.9)'; x.lineWidth = Math.max(1, rad * .07);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.stroke(); }
  [.45, .8].forEach(k => { x.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * 2, rr = rad * k * (i % 2 ? .9 : 1); i ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + rr, cy); } x.stroke(); });
  x.restore();
}

// a sorcerer's portal (moves.js 'portal'): a ring of fire in front of its hands, like a sling-ring portal. It opens from
// a point as sparks spiral out; once open, an inner rim of runes and turning sigils, a dark doorway inside, and sparks
// streaming off the rim and falling away under gravity. Sparks live on the robot (r.sparks), so they carry over frames
function portalFx(x, r, k, t){
  parts.torso.updateMatrixWorld(true);
  const c0 = tmp.p.set(0, .62, 1.0).applyMatrix4(parts.torso.matrixWorld).project(cam), px = (c0.x * .5 + .5) * r.cw, py = (-c0.y * .5 + .5) * r.ch;
  const e0 = tmp.p.set(.68, .62, 1.0).applyMatrix4(parts.torso.matrixWorld).project(cam);
  const full = Math.hypot((e0.x * .5 + .5) * r.cw - px, (-e0.y * .5 + .5) * r.ch - py) * 1.0, rad = full * eoS(Math.min(1, k * 1.15));
  const dt = Math.min(.05, t - (r.sparkT || t)); r.sparkT = t;
  const S = r.sparks || (r.sparks = []);
  // new sparks fly off the rim, along it (it spins) and a little outward
  const n = k > .3 ? Math.round(30 * k * dt * 60 / 4) + 1 : 0;
  for (let i = 0; i < n && S.length < 140; i++) {
    const a = Math.random() * Math.PI * 2, sp = full * (.8 + Math.random() * 1.1);
    S.push({ x: px + Math.cos(a) * rad, y: py + Math.sin(a) * rad * .96, vx: -Math.sin(a) * sp + Math.cos(a) * sp * .25, vy: Math.cos(a) * sp * .96 + Math.sin(a) * sp * .25, life: 1, d: .35 + Math.random() * .45 });
  }
  if (rad < full * .08 && !S.length) return;
  x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
  // the doorway: a darker, deeper space inside the ring (normal blending, under the fire)
  x.globalCompositeOperation = 'source-over';
  const dg = x.createRadialGradient(px, py, rad * .1, px, py, rad);
  dg.addColorStop(0, `rgba(40,16,4,${.55 * k})`); dg.addColorStop(.85, `rgba(90,30,6,${.35 * k})`); dg.addColorStop(1, 'rgba(90,30,6,0)');
  x.fillStyle = dg; x.beginPath(); x.ellipse(px, py, rad, rad * .96, 0, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'lighter';
  // the burning rim: many short arcs at slightly different radii, two directions, flickering
  for (let i = 0; i < 90; i++) {
    const a = i / 90 * Math.PI * 2 + t * (i % 2 ? 3.1 : -2.3), rr = rad * (1 + .045 * Math.sin(i * 7.7 + t * 13)), l = .09 + .07 * Math.abs(Math.sin(i * 3.3 + t * 5));
    x.strokeStyle = i % 4 ? 'rgba(255,140,30,.75)' : 'rgba(255,225,140,.95)'; x.lineWidth = Math.max(1, full * (i % 4 ? .022 : .016));
    x.beginPath(); x.ellipse(px, py, rr, rr * .96, 0, a, a + l); x.stroke();
  }
  // inner rings of runes and two counter-turning sigils (a square and a triangle drawn as glowing lines)
  x.lineWidth = Math.max(1, full * .008); x.strokeStyle = `rgba(255,190,90,${.7 * k})`;
  [.78, .62].forEach((f, j) => { x.beginPath(); x.ellipse(px, py, rad * f, rad * f * .96, 0, 0, Math.PI * 2); x.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + t * (j ? -.7 : .5), r1 = rad * f, r2 = rad * (f + (j ? -.07 : .07));
      x.beginPath(); x.moveTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1 * .96); x.lineTo(px + Math.cos(a + .05) * r2, py + Math.sin(a + .05) * r2 * .96); x.stroke(); } });
  const poly = (sides, rr, rot) => { x.beginPath(); for (let i = 0; i <= sides; i++) { const a = rot + i / sides * Math.PI * 2; i ? x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * .96) : x.moveTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * .96); } x.stroke(); };
  x.strokeStyle = `rgba(255,170,60,${.55 * k})`; poly(4, rad * .56, t * .6); poly(4, rad * .56, t * .6 + Math.PI / 4); poly(3, rad * .42, -t * .9);
  // the sparks: streaks along their path, falling and fading
  for (let i = S.length - 1; i >= 0; i--) {
    const sp = S[i]; sp.life -= dt / sp.d; if (sp.life <= 0) { S.splice(i, 1); continue; }
    const ox = sp.x, oy = sp.y; sp.vy += full * 4 * dt; sp.vx *= .985; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
    x.strokeStyle = `rgba(255,${160 + 90 * sp.life | 0},${60 + 120 * sp.life | 0},${sp.life})`; x.lineWidth = Math.max(1, full * .012 * sp.life);
    x.beginPath(); x.moveTo(ox, oy); x.lineTo(sp.x, sp.y); x.stroke();
  }
  x.restore();
  if (k < .02) r.sparks = [];
}

/* ---- each robot's frame ---- */
function readState(r){
  const el = r.el, bw = el.closest('.bwrap');
  const f = el.dataset.pose || el.dataset.face || 'idle', st = bw?.dataset.st || el.dataset.st || 'idle';
  let em = emotionOf(f);
  if ((f === 'idle' || f === 'speaking') && STATE[st]) em = emotionOf(STATE[st]);
  r.em = em;
  r.exT = parseFloat(el.style.getPropertyValue('--ex')) || 0; r.eyT = parseFloat(el.style.getPropertyValue('--ey')) || 0;
  r.lvT = st === 'speaking' || st === 'listening' ? (parseFloat(el.parentElement?.style.getPropertyValue('--lv')) || 0) : 0;
  r.blinkCls = el.classList.contains('blink');
  if (!r.colorAt || performance.now() - r.colorAt > 600) {
    r.colorAt = performance.now();
    r.zoom = Math.max(1, parseFloat(getComputedStyle(el).getPropertyValue('--b3d-zoom')) || 1);   // a big free stage (/moves): show more world, same size figure
    const g3 = getComputedStyle(el).getPropertyValue('--g3').trim().toLowerCase();
    const c = DEFAULT_BODIES.has(g3) ? (r.variant === 'plush' ? PLUSH.fur : ORANGE) : g3;   // (the default skins: the Robot's orange, the Plush's cream)
    if (c !== r.color) { r.color = c; r.next = 0; }
  }
}
// fur detail follows the size on screen: few shells and coarse strands when small, many fine ones when big
function furLevel(h, t, calm){
  const ppu = h / 2.75, n = Math.round(clamp((h - 40) / 12, 10, MAXN));
  const soft = sstep(320, 140, h);
  furU.uN.value = n; furU.uSoft.value = soft; furU.uDens.value = clamp(ppu / mix(2.1, 2.8, soft), 22, 120);   // fine, dense strands
  furU.uTime.value = t; furU.uWind.value = calm ? 0 : 1;
  const k = h < 260 ? 4.5 : h < 400 ? 2 : 1;   // and coarser skins: tiny triangles cost more than they show
  for (const m of furs) { if (!m.visible) continue; m.geometry = m.userData.lod(k); m.geometry.instanceCount = n; }
}
const NO_BLINK = new Set(['happy', 'chevron', 'chevronline', 'sleepy', 'heart', 'star', 'ring', 'ringsm', 'cry']);
// what it's feeling, where it's looking and when it blinks: read every frame (cheap), whether or not it's drawn this frame
function sense(r, t){
  readState(r);
  if (r.em !== r.shown) { r.shown = r.em; r.next = 0; }   // a new feeling: draw it now
  const tr = r.el.dataset.trick || ''; if (tr !== r.trick) { r.trick = tr; r.next = 0; }   // a move starts or stops: now too
  const hs = headsetStyle(), hc = headsetColor(r.variant); if (hs !== r.hs || hc !== r.hc) { r.hs = hs; r.hc = hc; r.next = 0; }
  const fc = r.variant === 'plush' ? plushFace() : 'visor'; if (fc !== r.fc) { r.fc = fc; r.next = 0; }
  const oc = r.variant === 'plush' ? r.el.dataset.outfit || plushOutfit() : 'none'; if (oc !== r.oc) { r.oc = oc; r.next = 0; }   // what it's wearing (its own, or everyone's)                        // the Plush's face or its goggle                            // it put on or took off a headset
  if (t > r.nextBlink) { r.blinkUntil = t + .12; r.nextBlink = t + 2.4 + Math.random() * 3.8; r.next = 0; }
  const P0 = POSES[r.em] || POSES.neutral, blink = (r.blinkCls || t < r.blinkUntil) && !NO_BLINK.has(P0.eyes) ? 1 : 0;
  if (blink !== r.blink) { r.blink = blink; r.next = 0; }
}
function frame(r, t){
  const dt = Math.min(.12, r.at ? t - r.at : .016); r.at = t;
  V = VARS[r.variant]; dress(r.variant);
  const P0 = POSES[r.em] || POSES.neutral;
  r.moving = easeTo(r.cur, P0, 1 - Math.exp(-dt * 9)) > .002;
  r.ex += (r.exT - r.ex) * Math.min(1, dt * 12); r.ey += (r.eyT - r.ey) * Math.min(1, dt * 12); r.lv += (r.lvT - r.lv) * Math.min(1, dt * 18);
  r.moving ||= Math.abs(r.exT - r.ex) + Math.abs(r.eyT - r.ey) > .01 || r.lvT > 0 || r.lv > .01;
  // a move or a bit of idle life (moves.js), laid over the pose. Small robots skip the idle life (it's under a pixel
  // there, and would keep them all drawing); a move they do in full
  let m = motion(r, t, dt);
  if (m && r.css < BIG && !r.motion?.mv) m = null;
  if (m) r.moving = true;
  r.calm = still() || r.css < BIG && !m;   // small ones keep still between changes (a breath there is under a pixel)
  // the eyes are drawn (and sent to the GPU) only when they change
  const key = `${P0.eyes}|${r.ex.toFixed(3)}|${r.ey.toFixed(3)}|${r.lv.toFixed(3)}|${r.blink}${P0.eyes === 'cry' ? '|' + t : ''}`;
  if (key !== r.eyeKey) { r.eyeKey = key; drawEyes(r.eyeCanvas, P0.eyes, { ex: r.ex, ey: r.ey, lv: r.lv, blink: r.blink, t }); r.eyeTex.needsUpdate = true; }
  eyesMat.map = r.eyeTex;
  r.face = r.variant === 'plush' && parts.beads ? r.fc : 'visor';
  if (r.face === 'face') {   // the Plush's face: its drawing (redrawn only when it changes) and its beads
    const st = PF[P0.eyes] || PF.line, mouth = r.lv > .08 ? 'talk' : st[2], fk = `${P0.eyes}|${r.blink}|${mouth === 'talk' ? r.lv.toFixed(2) : mouth}`;
    if (fk !== r.faceKey) { r.faceKey = fk; drawPlushFace(r.faceCanvas, st, r.blink, mouth, r.lv); r.faceTex.needsUpdate = true; }
    faceMat.map = r.faceTex; showFace(r, st);
  }
  r.outfit = r.variant === 'plush' && parts.plushBody && OUTFITS[r.oc] ? r.oc : 'none';
  if (r.outfit !== 'none') { parts.outfits ||= {}; parts.outfits[r.outfit] ||= buildOutfit(r.outfit); }   // (made the first time it's worn)
  pose(r, t, m?.pose ? blend(r.cur, m.pose, m.weight ?? 1) : r.cur, m?.rig);
  const hc = headsetColor(r.variant); if (hc !== mats.cupC) { mats.cupC = hc; tintHeadset(hc); }   // its own colour, not the fur's
  for (const o of VOBJ) o.visible = o.userData.v === r.variant && (!o.userData.face || o.userData.face === r.face) && (!o.userData.outfit || o.userData.outfit === r.outfit);   // this variant's skins, visor and eyes (or the Plush's face)
  const WV = parts.head.userData.wear;
  if (r.face === 'face' && !WV.plushFace) parts.faceFurs?.();
  const wk = r.face === 'face' && WV.plushFace ? 'plushFace' : r.variant, W0 = WV[wk], wear = r.hs === 'headset' && !parts.head.userData.ready ? 'none' : W0[r.hs] ? r.hs : 'none';
  for (const v in WV) if (v !== wk) for (const k in WV[v]) WV[v][k].forEach(o => { o.visible = false; });
  for (const k in W0) W0[k].forEach(o => { o.visible = k === wear; });
  if (r.variant === 'plush' && !parts.plushReady) { r.ctx.clearRect(0, 0, r.cw, r.ch); return 0; }   // (its body is still loading)

  // render at the robot's size (at most SZ) into the corner of the shared canvas, then copy it across
  const W = r.w, Hh = r.h;
  const s = Math.min(1, SZ / Math.max(W, Hh)), w = Math.round(W * s), h = Math.round(Hh * s);
  furLevel(h, t, r.calm);
  cam.aspect = W / Hh;
  // on a big free stage (--b3d-zoom) the figure has room to travel and flip, so a move never needs to pull back
  const z = r.zoom || 1, vis = 2.75 * z * (z > 1 ? Math.max(1, (m?.view || 1) / z) : (m?.view || 1)), d = vis / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const cy = z > 1 ? 1.0 + (1.2 - 1.0) / z : 1.2;   // centred on the figure's middle when there's room round it
  cam.position.set(0, cy + .25, d); cam.lookAt(0, cy, 0); cam.updateProjectionMatrix();
  R.setViewport(0, 0, w, h); R.setScissor(0, 0, w, h); R.setScissorTest(true);
  R.clear(); R.render(scene, cam);
  const x = r.ctx;
  x.clearRect(0, 0, r.cw, r.ch);
  // a soft shadow on the ground
  const g0 = tmp.p.set(r.cur.lie * -.1 + (m?.rig?.x || 0) + (m?.shadow?.x || 0), 0, 0).project(cam), fx = (g0.x * .5 + .5) * r.cw, fy = (-g0.y * .5 + .5) * r.ch;   // (it follows a move's travel)
  const rad = r.cw * (.25 + r.cur.lie * .15) * (m?.shadow?.scale ?? 1) / (m?.view || 1);
  const sg = x.createRadialGradient(fx, fy, 0, fx, fy, rad);
  sg.addColorStop(0, 'rgba(0,0,0,.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  x.save(); x.translate(fx, fy); x.scale(1, .16); x.translate(-fx, -fy); x.fillStyle = sg; x.beginPath(); x.arc(fx, fy, rad, 0, Math.PI * 2); x.fill(); x.restore();
  if (m?.line > .01) parts.arms[1].hand.updateMatrixWorld(true);
  if (m?.line > .01) {   // a move's web line (moves.js): from the raised hand up out of the frame (drawn first, so the figure covers it)
    const h = parts.arms[1].hand.getWorldPosition(tmp.p).project(cam), hx = (h.x * .5 + .5) * r.cw, hy = (-h.y * .5 + .5) * r.ch;
    const a0 = tmp.p.set(0, 2.75, 0).project(cam), ax = (a0.x * .5 + .5) * r.cw, ay = Math.max(r.ch * .04, (-a0.y * .5 + .5) * r.ch);
    x.save(); x.globalAlpha = m.line; webStrand(x, hx, hy, ax, ay, r.cw); webSplat(x, ax, ay, r.cw * .035); x.restore();
  }
  if (Math.abs(m?.streak || 0) > .01) {   // super speed (moves.js): afterimages trailing behind it, and lightning
    const dir = Math.sign(m.streak), k = Math.abs(m.streak), step = r.cw * .045;
    for (let i = 5; i >= 1; i--) { x.globalAlpha = .16 * k * (1 - i / 6); x.drawImage(R.domElement, 0, SZ - h, w, h, -dir * step * i, 0, r.cw, r.ch); }
    x.globalAlpha = 1;
    const c0 = tmp.p.set(m.rig?.x || 0, .9, 0).project(cam), cx = (c0.x * .5 + .5) * r.cw, cy = (-c0.y * .5 + .5) * r.ch, L = r.cw * .4;
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round'; x.lineJoin = 'round';
    for (let j = 0; j < 3; j++) {   // zig-zag bolts streaming off behind, re-drawn every frame so they flicker
      x.strokeStyle = j ? 'rgba(255,200,60,.8)' : 'rgba(255,250,215,.95)'; x.lineWidth = Math.max(1.5, r.cw * (j ? .004 : .006)) * k;
      x.beginPath(); let px = cx, py = cy + (j - 1) * r.ch * .09 + (Math.random() - .5) * r.ch * .03; x.moveTo(px, py);
      for (let q = 0; q < 6; q++) { px -= dir * L / 6; py += (Math.random() - .5) * r.ch * .07; x.lineTo(px, py); }
      x.stroke();
    }
    x.restore();
  }
  if (m?.shock > .001) {   // a landing's impact (moves.js): soft dust kicked out low along the ground either side, drifting and fading
    const q = m.shock, o0 = tmp.p.set(m.rig?.x || 0, 0, 0).project(cam), ox = (o0.x * .5 + .5) * r.cw, oy = (-o0.y * .5 + .5) * r.ch, u = r.cw;
    x.save();
    for (let i = 0; i < 26; i++) {   // fixed per puff (seeded by i), so the dust doesn't flicker
      const side = i % 2 ? 1 : -1, rnd = n => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1, a = Math.abs(rnd(1)), b2 = Math.abs(rnd(2)), c2 = Math.abs(rnd(3));
      const d = eoS(q) * u * (.08 + .28 * a), px = ox + side * (u * .05 + d), py = oy - u * (.005 + .05 * b2) * eoS(q) * (1 + q);
      const rad = u * (.018 + .03 * c2) * (.6 + .9 * q), al = .22 * (1 - q) ** 1.5;
      const dg = x.createRadialGradient(px, py, 0, px, py, rad);
      dg.addColorStop(0, `rgba(196,186,172,${al})`); dg.addColorStop(1, 'rgba(196,186,172,0)');
      x.fillStyle = dg; x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }
  x.drawImage(R.domElement, 0, SZ - h, w, h, 0, 0, r.cw, r.ch);
  if (m?.web > .001) {   // a shot web (moves.js): out of the wrist along the arm to the edge of the frame, splatting where it lands
    const hd = parts.arms[1].hand; hd.updateMatrixWorld(true);
    const h0 = hd.getWorldPosition(tmp.p).project(cam), hx = (h0.x * .5 + .5) * r.cw, hy = (-h0.y * .5 + .5) * r.ch;
    const s0 = tmp.p.set(.4, .5, .04).applyMatrix4(parts.torso.matrixWorld).project(cam), sx = (s0.x * .5 + .5) * r.cw, sy = (-s0.y * .5 + .5) * r.ch;
    let dx = hx - sx, dy = hy - sy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    // the strand shoots out and, as it arrives, opens into a real web: a net that spreads wide where it lands
    const reach = Math.min(r.cw, r.ch) * .36 * Math.min(1, m.web / .55), tx = hx + dx * reach, ty = hy + dy * reach;
    webStrand(x, hx, hy, tx, ty, r.cw);
    // every shot lands differently: a new random look each time it fires (a big net, a small one, or a dispersed splat)
    if (m.web < (r.webLast ?? 1)) r.webSeed = Math.random() * 1000;
    r.webLast = m.web;
    if (m.web > .45) webNet(x, tx, ty, Math.min(r.cw, r.ch) * .16 * eoS(Math.min(1, (m.web - .45) / .4)), Math.atan2(dy, dx), r.webSeed || 1);
  }
  if (m?.ring > .01) portalFx(x, r, m.ring, t);

  if (P0.fx) {
    parts.head.updateMatrixWorld(true);
    const a = tmp.p.set(0, 1.0, 0).applyMatrix4(parts.head.matrixWorld).project(cam), ax = a.x, ay = a.y, b = tmp.p.set(.75, 1.0, 0).applyMatrix4(parts.head.matrixWorld).project(cam);
    const hx = (ax * .5 + .5) * r.cw, hy = (-ay * .5 + .5) * r.ch, u = Math.hypot((b.x - ax) * .5 * r.cw, (b.y - ay) * .5 * r.ch);
    drawFx(x, P0.fx, hx, hy, u, t);
  }
  return w * h * furU.uN.value;   // what it cost: pixels times shells
}
// the headset's colours from its shell colour: the shell a touch richer than given (the filmic tone mapping greys strong
// colours a little), the cushions and band pad a deep shade of it, or soft graphite under light shells (white, lime)
const GRAPHITE = new THREE.Color('#2a2c30').convertSRGBToLinear();
function tintHeadset(hex){
  const c = new THREE.Color(hex).convertSRGBToLinear(), hsl = {}, l = c.r * .2126 + c.g * .7152 + c.b * .0722;
  mats.shell.color.copy(c).lerp(new THREE.Color(l, l, l), -.35).multiplyScalar(.78);   // (and a little lower, so the strong key light doesn't bleach it to pastel)
  c.getHSL(hsl);
  const deep = hsl.l > .6 ? GRAPHITE.clone() : hsl.l < .03 ? new THREE.Color('#1c1d21').convertSRGBToLinear() : new THREE.Color().setHSL(hsl.h, hsl.s * .75, hsl.l * .32);
  mats.cushion.color.copy(deep); mats.cushion.sheen.copy(deep).lerp(new THREE.Color(1, 1, 1), .18);
  mats.pad.color.copy(deep).multiplyScalar(.9); mats.pad.sheen.copy(deep).lerp(new THREE.Color(1, 1, 1), .15);
}
/* ---- the loop. A big robot draws every frame. Small ones (a page can show dozens) draw only when something changes:
   about 15 a second while it moves (a new feeling easing in, its eyes following, a blink, its voice), 12 while its extras
   play, and otherwise once every couple of seconds; a frame draws only as many as fit its budget, the most overdue
   first. Robots off screen or in a hidden tab cost nothing. ---- */
const BIG = 300;        // CSS pixels tall: at or above this a robot draws every frame
const BUDGET = 6e6;     // a frame's share for the small ones, in pixel-shells (about 4ms of GPU on a laptop)
function loop(now){
  raf = 0;
  const t = now / 1000;
  if (!document.hidden) {
    const due = [];
    for (const r of robots) {
      if (!r.visible || !r.w || !r.h) continue;
      try {
        sense(r, t);
        if (r.css >= BIG) frame(r, t);
        else if (t >= r.next) due.push(r);
      } catch (e) { if (import.meta.env?.DEV) console.error(e); }
    }
    due.sort((a, b) => a.next - b.next);
    let spent = 0;
    for (const r of due) {
      if (spent > BUDGET) break;
      try {
        spent += frame(r, t);
        const P0 = POSES[r.em];
        r.next = t + (r.moving || t < r.blinkUntil ? 1 / 15 : P0?.fx || P0?.eyes === 'cry' ? 1 / 12 : 2) * (.9 + Math.random() * .2);   // jittered, so they don't bunch up
      } catch (e) { r.next = t + 1; if (import.meta.env?.DEV) console.error(e); }
    }
  }
  schedule();
}
const schedule = () => { if (!raf && robots.size) raf = requestAnimationFrame(loop); };

/* ---- a robot's canvas joins and leaves ---- */
export function attachRobot(canvas, { variant = 'robot' } = {}){
  const el = canvas.closest('.buddy'); if (!el) return () => {};
  if (!R) build();   // throws if the browser can't make a WebGL context (Robot.jsx falls back to the classic figure)
  if (variant !== 'robot') variant = 'plush';
  if (!parts.built[variant]) buildPlush();   // the Plush's own parts, the first time one is shown
  const eyeCanvas = document.createElement('canvas'); eyeCanvas.width = EW; eyeCanvas.height = EH;
  const eyeTex = new THREE.CanvasTexture(eyeCanvas); eyeTex.encoding = THREE.sRGBEncoding;
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = PDEC.W; faceCanvas.height = PDEC.H;   // (the Plush's face drawing)
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.encoding = THREE.sRGBEncoding;
  const r = { el, canvas, ctx: canvas.getContext('2d'), eyeCanvas, eyeTex, faceCanvas, faceTex, visible: false, w: 0, h: 0, cw: 0, ch: 0,
    variant, ex: 0, ey: 0, lv: 0, exT: 0, eyT: 0, lvT: 0, seed: Math.random() * 6, nextBlink: 1 + Math.random() * 3, blinkUntil: 0, blink: 0, color: variant === 'plush' ? PLUSH.fur : ORANGE, colorAt: 0, next: 0, at: 0, eyeKey: '', shown: '', moving: true };
  readState(r); r.cur = start(POSES[r.em] || POSES.neutral);   // start in its pose, not easing in from neutral
  const fit = () => {
    const b = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    r.w = Math.round(b.width * d); r.h = Math.round(b.height * d); r.css = b.height;
    if (canvas.width !== r.w || canvas.height !== r.h) { canvas.width = r.w; canvas.height = r.h; r.next = 0; }   // (resizing clears it: draw again now)
    r.cw = r.w; r.ch = r.h;
  };
  const ro = new ResizeObserver(fit); ro.observe(canvas); fit();
  const io = new IntersectionObserver(([e]) => { r.visible = e.isIntersecting; r.next = 0; schedule(); }); io.observe(canvas);
  robots.add(r); schedule();
  return () => { robots.delete(r); ro.disconnect(); io.disconnect(); eyeTex.dispose(); faceTex.dispose(); el.classList.remove('b3d-trick'); };   // (never leave a classic figure stuck mid-trick)
}
