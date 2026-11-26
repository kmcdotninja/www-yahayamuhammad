// The playground canvas: every project clip on an endless surface you drag around, seen through a fisheye
// lens, as if the cards were printed on a ball facing you. The middle swells, the edges squeeze in and every
// card's straight sides curve. The lens stays put; the cards slide through it, paused, drifting or dragged.
// Click a card and it flattens out of the lens into the middle; click again (or Esc) and it bends back home.
//
// Drawn in WebGL: each card is a sheet bent through the lens, and every pixel works out exactly which point of
// its card it shows, so edges and corners curve smoothly. The clips play in hidden <video>s and are copied in
// each frame. The Kiko phone and iPad frames (deviceTiles.css) are pictured once from their HTML, the clip
// playing in their screen. Without WebGL it falls back to the flat canvas of HTML cards.
//
// Ported from the GDG talk deck (deck.js). Layout in design px (layout.js); the window shows about 1920x1080
// of it on a desktop, less on a phone.

import { TILES, LAYOUT_W as W, LAYOUT_H as H, CARD_BG } from './layout.js'
import deviceCss from './deviceTiles.css?raw'

// LENS_ZOOM: how much the middle is magnified. LENS_EDGE: how far round the ball the window's corners reach,
// in radians (bigger = a stronger squeeze at the edges).
const LENS_ZOOM = 1.2
const LENS_EDGE = 1.3

const SIG = '<svg viewBox="0 0 19 12" class="ptile__sig"><rect x="0" y="8" width="3.2" height="4" rx="1"/><rect x="5.2" y="5.5" width="3.2" height="6.5" rx="1"/><rect x="10.4" y="3" width="3.2" height="9" rx="1"/><rect x="15.6" y="0" width="3.2" height="12" rx="1"/></svg>'
const WIFI = '<svg viewBox="0 0 17 12" class="ptile__wifi"><path d="M8.5 2.4c2.4 0 4.6.9 6.2 2.5l1.2-1.2C13.9 1.7 11.3.6 8.5.6S3.1 1.7 1.1 3.7l1.2 1.2C3.9 3.3 6.1 2.4 8.5 2.4zm0 3.5c1.4 0 2.8.6 3.8 1.5l1.2-1.2C12.2 4.9 10.4 4.1 8.5 4.1S4.8 4.9 3.5 6.2l1.2 1.2c1-.9 2.4-1.5 3.8-1.5zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.4 7 9.9c.4-.4.9-.6 1.5-.6z"/></svg>'
const BAT = '<svg viewBox="0 0 27 13" class="ptile__bat"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.3"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill-opacity=".4"/></svg>'

const VS = `#version 300 es
in vec2 aUV;
uniform vec2 uHalf;   // half the window, in design px
uniform vec4 uRect;   // the card's centre (from the window's middle) and size, on the flat canvas
uniform float uGrow;  // its arrival scale
uniform vec2 uLens;   // zoom, radius
uniform float uMorph; // 0: in the lens; 1: flat, at uTarget (open)
uniform vec4 uTarget; // centre (from the window's middle) and size
out vec2 vLocalV;
void main() {
  // a little larger than the card all round: the pixels decide the exact edge
  vec2 p = uRect.xy + (aUV - 0.5) * (uRect.zw * uGrow + 8.0);
  float r = length(p);
  float a = min(r / uLens.y, 1.5707963);
  vec2 q = r > 0.0 ? p * (uLens.x * uLens.y * sin(a) / r) : p;
  vLocalV = (p - uRect.xy) / uGrow + uRect.zw * 0.5;
  q = mix(q, uTarget.xy + (vLocalV / uRect.zw - 0.5) * uTarget.zw, uMorph);
  gl_Position = vec4(q.x / uHalf.x, -q.y / uHalf.y, 0.0, 1.0);
}`

const FS = `#version 300 es
precision highp float;
in vec2 vLocalV;
uniform vec2 uHalf;
uniform vec2 uRes;      // the canvas in device px
uniform vec4 uRect;
uniform float uGrow;
uniform vec2 uLens;
uniform float uMorph;
uniform vec4 uTarget;
uniform float uDim;     // the shade over the other cards while one is open
uniform vec3 uShade;
uniform vec2 uSize;
uniform int uKind;      // 0: clip or image, covering; 1: clip contained on its card colour; 2: phone or iPad
uniform bool uHasTex;
uniform sampler2D uTex, uUnder, uOver;
uniform float uAspect;  // the clip's own width / height
uniform vec3 uBg;
uniform float uAlpha;
uniform vec4 uScreen;   // the device's screen in the card: x, y, w, h
uniform float uScreenR;
out vec4 o;
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float edge(float d) { return clamp(0.5 - d / max(fwidth(d), 1e-4), 0.0, 1.0); }
vec2 cover(vec2 uv, float bx, float media) {
  vec2 s = bx > media ? vec2(1.0, media / bx) : vec2(bx / media, 1.0);
  return (uv - 0.5) * s + 0.5;
}
vec2 contain(vec2 uv, float bx, float media) {
  vec2 s = bx > media ? vec2(bx / media, 1.0) : vec2(1.0, media / bx);
  return (uv - 0.5) * s + 0.5;
}
void main() {
  // this pixel in the window (from the middle, in design px), back through the lens to the flat canvas
  vec2 q = vec2(gl_FragCoord.x / uRes.x * 2.0 * uHalf.x - uHalf.x, uHalf.y - gl_FragCoord.y / uRes.y * 2.0 * uHalf.y);
  float rq = length(q);
  vec2 p = rq > 0.0 ? q * (uLens.y * asin(min(1.0, rq / (uLens.x * uLens.y))) / rq) : q;
  // (while a card flies to or from the middle, its own sheet says where each pixel is)
  vec2 vLocal = uMorph != 0.0 ? vLocalV : (p - uRect.xy) / uGrow + uSize * 0.5;
  vec2 uv = vLocal / uSize;
  // the card's shape right now: its own on the canvas, the clip's full shape when open
  vec2 bx = mix(uSize, uTarget.zw, uMorph);
  float ba = bx.x / bx.y;
  vec3 col = uBg;
  if (uKind == 2) {
    col = texture(uUnder, uv).rgb;
    vec2 sp = vLocal - uScreen.xy;
    if (uHasTex) {
      float m = edge(box(sp - uScreen.zw * 0.5, uScreen.zw * 0.5, uScreenR));
      col = mix(col, texture(uTex, cover(sp / uScreen.zw, uScreen.z / uScreen.w, uAspect)).rgb, m);
    }
    vec4 ov = texture(uOver, uv); // the status bar and island, over the clip
    col = ov.rgb + col * (1.0 - ov.a);
  } else if (uHasTex) {
    if (uKind == 1) {
      vec2 m = contain(uv, ba, uAspect);
      vec3 c = texture(uTex, m).rgb;
      if (m.x >= 0.0 && m.x <= 1.0 && m.y >= 0.0 && m.y <= 1.0) col = c;
    } else col = texture(uTex, cover(uv, ba, uAspect)).rgb;
  }
  col = mix(col, uShade, 0.72 * uDim);
  vec2 lb = uv * bx; // the rounded corners measured in the card's current shape, so they stay round
  float a = edge(box(lb - bx * 0.5, bx * 0.5, 10.0 + 4.0 * uMorph)) * uAlpha;
  o = vec4(col * a, a);
}`

const mod = (a, n) => ((a % n) + n) % n
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)

export function createLensCanvas(root, { base = '/playground/canvas/' } = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const world = document.createElement('div')
  world.className = 'lens__world'
  root.append(world)

  // ── the cards as HTML: they hold the clips (and the device frames), and are the canvas itself without WebGL ──
  const tiles = TILES.map((spec) => {
    const el = document.createElement('div')
    el.className = 'lens__tile'
    el.style.width = `${spec.w}px`
    el.style.height = `${spec.h}px`
    let v = null
    const video = (cls) => {
      const x = document.createElement('video')
      x.muted = true; x.loop = true; x.playsInline = true; x.preload = 'none'
      x.setAttribute('muted', ''); x.setAttribute('playsinline', '')
      if (cls) x.className = cls
      x.poster = `${base}${spec.name}-poster.webp`
      x.src = `${base}${spec.name}.mp4`
      return x
    }
    if (spec.kind === 'image') {
      const img = document.createElement('img')
      img.src = `${base}${spec.name}.webp`; img.alt = ''; img.draggable = false; img.decoding = 'async'
      el.append(img)
    } else if (spec.kind === 'phone' || spec.kind === 'tablet') {
      const t = document.createElement('div')
      if (spec.kind === 'phone') {
        t.className = 'ptile ptile--nocap'
        t.innerHTML = '<span class="ptile__btn ptile__btn--action"></span><span class="ptile__btn ptile__btn--up"></span><span class="ptile__btn ptile__btn--down"></span><span class="ptile__btn ptile__btn--power"></span>'
          + '<div class="ptile__phone"><div class="ptile__bezel"></div><div class="ptile__screen">'
          + `<div class="ptile__status"><span class="ptile__time">9:41</span><span class="ptile__icons">${SIG}${WIFI}${BAT}</span></div><span class="ptile__island"></span></div></div>`
      } else {
        t.className = 'ptile ttile ptile--nocap'
        t.innerHTML = '<div class="ttile__pad"><div class="ttile__bezel"></div><span class="ttile__cam"></span><div class="ttile__screen">'
          + `<div class="ttile__status"><span>9:41&nbsp;&nbsp;Mon Oct 13</span><span class="ptile__icons ttile__icons">${WIFI}${BAT}</span></div></div></div>`
      }
      v = video('ptile__media')
      t.querySelector('.ptile__screen, .ttile__screen').prepend(v)
      el.append(t)
    } else {
      v = video()
      if (CARD_BG[spec.name]) { v.style.objectFit = 'contain'; v.style.background = CARD_BG[spec.name] }
      el.append(v)
    }
    world.append(el)
    return { ...spec, el, v, playing: false, seen: false, cx: 0, cy: 0, d: 0 }
  })

  // ── the window, in design px ──
  let k = 1, VW = 1920, VH = 1080, R = 1, SEE = 1
  const measure = () => {
    const r = root.getBoundingClientRect()
    const cw = Math.max(1, r.width), ch = Math.max(1, r.height)
    k = Math.max(cw / 1920, ch / 1080) * (cw < 700 ? 0.5 : 1) // a phone sees more of the canvas, smaller
    VW = cw / k; VH = ch / k
    const hd = Math.hypot(VW / 2, VH / 2)
    R = hd / (LENS_ZOOM * Math.sin(LENS_EDGE))
    SEE = R * LENS_EDGE + 40 // how far out on the flat canvas the window's corners reach
    world.style.transform = `scale(${k})`
  }
  measure()

  // the same opening view every time: The Walled City (World Tour) in the top-left corner
  const home = tiles.find((t) => t.name === 'g-worldtour')
  let ox = 24 - home.x, oy = 12 - home.y, vx = 0, vy = 0, dragging = false, lastMove = 0
  tiles.forEach((t) => { t.d = reduced ? 0 : Math.min(900, Math.hypot(t.x + t.w / 2 + ox - VW / 2, t.y + t.h / 2 + oy - VH / 2) * 0.45) })

  let lens = null
  let open = null // the card open in the middle: { t, to }
  let fly = null  // a card on its way out or home: { t, to, open, ms, at, done, resolve }

  function place() {
    for (const t of tiles) {
      // wrap so each card shows exactly once, measured from the middle of the window, so the wrap seam stays
      // round the back of the ball, out of sight
      const cx = mod(t.x + ox + t.w / 2 - VW / 2 + W / 2, W) - W / 2
      const cy = mod(t.y + oy + t.h / 2 - VH / 2 + H / 2, H) - H / 2
      t.cx = cx; t.cy = cy
      let seen
      if (lens) {
        seen = Math.hypot(Math.max(Math.abs(cx) - t.w / 2, 0), Math.max(Math.abs(cy) - t.h / 2, 0)) < SEE
      } else {
        const x = cx + VW / 2 - t.w / 2, y = cy + VH / 2 - t.h / 2
        t.el.style.transform = `translate3d(${x}px, ${y}px, 0)`
        seen = x < VW && x + t.w > 0 && y < VH && y + t.h > 0
      }
      t.seen = seen || (fly && fly.t === t) || (open && open.t === t)
      if (!t.v) continue
      if (t.seen && !t.playing) { t.playing = true; t.v.play().catch(() => {}) }
      else if (!t.seen && t.playing) { t.playing = false; t.v.pause() }
    }
  }

  // ── the lens ──
  lens = (() => {
    const canvas = document.createElement('canvas')
    canvas.className = 'lens__gl'
    const g = canvas.getContext('webgl2', { antialias: false, alpha: false })
    if (!g) return null
    const sh = (type, src) => { const x = g.createShader(type); g.shaderSource(x, src); g.compileShader(x); if (!g.getShaderParameter(x, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(x)); return x }
    let prog
    try {
      prog = g.createProgram()
      g.attachShader(prog, sh(g.VERTEX_SHADER, VS)); g.attachShader(prog, sh(g.FRAGMENT_SHADER, FS))
      g.linkProgram(prog)
      if (!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog))
    } catch (err) { console.warn('playground canvas: lens off', err); return null }
    g.useProgram(prog)
    const U = {}
    for (const n of ['uHalf', 'uRes', 'uRect', 'uGrow', 'uLens', 'uMorph', 'uTarget', 'uDim', 'uShade', 'uSize', 'uKind', 'uHasTex', 'uTex', 'uUnder', 'uOver', 'uAspect', 'uBg', 'uAlpha', 'uScreen', 'uScreenR']) U[n] = g.getUniformLocation(prog, n)
    g.uniform1i(U.uTex, 0); g.uniform1i(U.uUnder, 1); g.uniform1i(U.uOver, 2)

    // one finely divided sheet, shared by every card
    const N = 48, uvs = [], idx = []
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) uvs.push(i / N, j / N)
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
    const vao = g.createVertexArray(); g.bindVertexArray(vao)
    g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, new Float32Array(uvs), g.STATIC_DRAW)
    const loc = g.getAttribLocation(prog, 'aUV'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0)
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), g.STATIC_DRAW)
    g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA)

    const texture = () => {
      const x = g.createTexture(); g.bindTexture(g.TEXTURE_2D, x)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR)
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, 1, 1, 0, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))
      g.generateMipmap(g.TEXTURE_2D)
      return x
    }
    const upload = (x, src, premul) => {
      g.bindTexture(g.TEXTURE_2D, x)
      g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premul)
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, src)
      g.generateMipmap(g.TEXTURE_2D)
    }
    const blank = texture()

    // the phone and iPad frames, pictured from their HTML as two layers: the device, and what sits over its
    // screen (status bar, island); the clip plays in between
    const css = deviceCss.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    const capture = async (t, over) => {
      const clone = t.el.cloneNode(true)
      clone.querySelectorAll('video').forEach((v) => v.remove())
      clone.removeAttribute('style'); clone.className = 'tile'
      const extra = `.tile{position:relative;width:${t.w}px;height:${t.h}px;border-radius:10px;overflow:hidden;background:#1a1a1c}
.tile .ptile{height:100%;aspect-ratio:auto}
.tile .ptile.ttile.ttile > .ttile__pad.ttile__pad{transform:translate(-50%,-50%) scale(0.96)}` + (over ? `
.tile,.ptile,.ptile__phone,.ttile__pad,.ptile__screen,.ttile__screen{background:transparent!important}
.ptile__phone::before,.ttile__pad::before{display:none}
.ptile__bezel,.ttile__bezel,.ptile__btn,.ttile__cam{visibility:hidden}` : '')
      const S = 2 // twice the size, so the frame stays sharp in the middle of the lens
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${t.w * S}" height="${t.h * S}" viewBox="0 0 ${t.w} ${t.h}"><foreignObject x="0" y="0" width="${t.w}" height="${t.h}"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css}${extra}</style>${new XMLSerializer().serializeToString(clone)}</div></foreignObject></svg>`
      const img = new Image()
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      await img.decode()
      const c = document.createElement('canvas'); c.width = t.w * S; c.height = t.h * S
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      return c
    }

    const cleanups = []
    for (const t of tiles) {
      const L = t.gl = { tex: texture(), has: false, aspect: t.w / t.h, kind: t.kind === 'phone' || t.kind === 'tablet' ? 2 : CARD_BG[t.name] ? 1 : 0, bg: rgb(CARD_BG[t.name] || '#1a1a1c'), dirty: true }
      // the poster until the clip has a frame
      const poster = new Image()
      poster.decoding = 'async'
      poster.onload = () => { if (!L.frame) { upload(L.tex, poster, false); L.has = true; L.aspect = poster.naturalWidth / poster.naturalHeight } }
      poster.src = t.kind === 'image' ? `${base}${t.name}.webp` : `${base}${t.name}-poster.webp`
      if (t.v && 'requestVideoFrameCallback' in t.v) {
        let id = 0
        const cb = () => { L.dirty = true; id = t.v.requestVideoFrameCallback(cb) }
        id = t.v.requestVideoFrameCallback(cb)
        cleanups.push(() => t.v.cancelVideoFrameCallback(id))
      } else if (t.v) L.always = true
      if (L.kind === 2) {
        // where the screen sits in the card, in deviceTiles.css's design units (u = card width / 1800)
        const u = t.w / 1800
        if (t.kind === 'phone') { L.screen = [(488 + 27) * u, (216 + 27 + 48) * u, 770 * u, 1669 * u]; L.screenR = 114 * u }
        else {
          const s = 0.96, pw = 1540 * u * s, ph = 1101 * u * s, l = t.w / 2 - pw / 2, tp = t.h / 2 - ph / 2
          L.screen = [l + 50 * u * s, tp + 50 * u * s, 1440 * u * s, 1001 * u * s]; L.screenR = 46 * u * s
        }
        L.under = texture(); L.over = texture()
        Promise.all([capture(t, false), capture(t, true)])
          .then(([a, b]) => { upload(L.under, a, false); upload(L.over, b, true); L.ready = true })
          .catch(() => { L.kind = 0 }) // (a browser that won't picture HTML: the clip alone, still in the lens)
      }
    }

    let cw = 0, ch = 0
    const shade = rgb('#141518')
    let bg = rgb('#0a0a0a')
    const readBg = () => {
      const c = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
      if (/^#[0-9a-f]{6}$/i.test(c)) bg = rgb(c)
    }
    readBg()

    const draw = (now, t0) => {
      const r = root.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr))
      if (w !== cw || h !== ch) { canvas.width = cw = w; canvas.height = ch = h }
      g.viewport(0, 0, cw, ch)
      g.uniform2f(U.uHalf, VW / 2, VH / 2)
      g.uniform2f(U.uRes, cw, ch)
      g.uniform2f(U.uLens, LENS_ZOOM, R)
      g.uniform3f(U.uShade, ...shade)

      // a card flying between its place in the lens and the middle
      let m = 0, dim = 0
      if (fly) {
        const p = Math.min(1, (now - fly.at) / fly.ms)
        // opening: a spring, so the card swells a touch past full size and settles; closing: it glides home
        const spring = 1 - Math.exp(-7 * p) * Math.cos(9 * p) * (1 - p)
        const glide = 1 - Math.pow(1 - p, 5)
        m = fly.open ? (p >= 1 || reduced ? (reduced ? glide : 1) : spring) : Math.max(0, 1 - glide)
        dim = Math.min(1, Math.max(0, fly.open ? glide : 1 - glide))
        if (p >= 1 && !fly.done) { fly.done = true; fly.resolve() }
      } else if (open) { m = 1; dim = 1 }
      const back = bg.map((c, i) => c + (shade[i] - c) * 0.72 * dim)
      g.clearColor(back[0], back[1], back[2], 1); g.clear(g.COLOR_BUFFER_BIT)

      const lifted = fly ? fly.t : open ? open.t : null
      const target = fly ? fly.to : open ? open.to : null
      const order = lifted ? tiles.filter((t) => t !== lifted).concat(lifted) : tiles
      for (const t of order) {
        const flying = t === lifted
        if (!flying && !t.seen) continue
        const L = t.gl
        if (t.v && (L.dirty || L.always) && t.v.readyState >= 2 && t.v.videoWidth) {
          upload(L.tex, t.v, false); L.has = true; L.frame = true; L.dirty = false; L.aspect = t.v.videoWidth / t.v.videoHeight
        }
        const p = Math.min(1, Math.max(0, (now - t0 - t.d) / 900)), e = reduced ? 1 : 1 - Math.pow(1 - p, 3)
        g.uniform1f(U.uMorph, flying ? m : 0)
        g.uniform1f(U.uDim, flying ? 0 : dim)
        if (flying) g.uniform4f(U.uTarget, target.x, target.y, target.w, target.h)
        else g.uniform4f(U.uTarget, 0, 0, t.w, t.h)
        g.uniform4f(U.uRect, t.cx, t.cy, t.w, t.h)
        g.uniform1f(U.uGrow, 0.92 + 0.08 * e)
        g.uniform1f(U.uAlpha, e)
        g.uniform2f(U.uSize, t.w, t.h)
        const device = L.kind === 2 && L.ready
        g.uniform1i(U.uKind, L.kind === 2 && !device ? 0 : L.kind)
        g.uniform1i(U.uHasTex, L.has && !(L.kind === 2 && !device) ? 1 : 0)
        g.uniform1f(U.uAspect, L.aspect)
        g.uniform3f(U.uBg, ...L.bg)
        if (L.screen) { g.uniform4f(U.uScreen, ...L.screen); g.uniform1f(U.uScreenR, L.screenR) }
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, L.tex)
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, L.under || blank)
        g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, L.over || blank)
        g.drawElements(g.TRIANGLES, idx.length, g.UNSIGNED_SHORT, 0)
      }
    }

    canvas.addEventListener('webglcontextlost', () => off())
    root.append(canvas)
    world.style.visibility = 'hidden' // the HTML cards stay, unseen, to play the clips
    return { draw, canvas, readBg, dispose: () => { cleanups.forEach((f) => f()); g.getExtension('WEBGL_lose_context')?.loseContext() } }
  })()
  // if the lens goes, go back to the flat canvas of HTML cards
  function off() {
    if (!lens) return
    lens.canvas.remove(); lens = null; open = null; fly = null
    world.style.visibility = ''
    place()
  }

  // ── through the lens: a point in the window to the flat canvas, and back ──
  const toFlat = (x, y) => { const r = Math.hypot(x, y); const s = r ? (R * Math.asin(Math.min(1, r / (LENS_ZOOM * R)))) / r : 1 / LENS_ZOOM; return [x * s, y * s] }
  const tileAt = (clientX, clientY) => {
    const r = root.getBoundingClientRect()
    const [px, py] = toFlat((clientX - r.left) / k - VW / 2, (clientY - r.top) / k - VH / 2)
    return tiles.find((t) => t.seen && Math.abs(px - t.cx) <= t.w / 2 && Math.abs(py - t.cy) <= t.h / 2) || null
  }

  // ── open a card in the middle, and send it home ──
  const flyTo = (t, to, isOpen, ms) => new Promise((resolve) => { fly = { t, to, open: isOpen, ms, at: performance.now(), done: false, resolve } })
  function show(t) {
    if (!lens || open || fly) return
    // a plain clip opens in its own shape; the phone, iPad and image cards as the cards they are
    const ar = t.kind === 'tablet' ? 1.4 : t.kind ? 0.8 : t.v && t.v.videoWidth ? t.v.videoWidth / t.v.videoHeight : t.gl.aspect || t.w / t.h
    let w = VW * (VW < 1200 ? 0.92 : 0.84), h = w / ar
    if (h > VH * 0.8) { h = VH * 0.8; w = h * ar }
    const to = { x: 0, y: 0, w, h } // centred
    open = { t, to }
    root.classList.add('is-open')
    flyTo(t, to, true, reduced ? 240 : 820).then(() => { fly = null })
  }
  function hide() {
    if (!open || (fly && !fly.open)) return
    const { t, to } = open
    flyTo(t, to, false, reduced ? 200 : 600).then(() => { fly = null; open = null; root.classList.remove('is-open') })
  }

  // ── motion ──
  let raf = 0, t0 = performance.now()
  lastMove = t0
  function frame(now) {
    if (!dragging && !open) {
      ox += vx; oy += vy
      vx *= 0.94; vy *= 0.94
      // drift on its own when nobody's touching it
      if (!reduced && now - lastMove > 1800) { const s = Math.min(1, (now - lastMove - 1800) / 1500); ox -= 0.35 * s; oy -= 0.18 * s }
    }
    place()
    if (lens) lens.draw(now, t0)
    raf = requestAnimationFrame(frame)
  }

  // ── input: drag (mouse, pen or finger), wheel and trackpad; a click or tap opens a card ──
  let px = 0, py = 0, pt = 0, down = null
  const onDown = (e) => {
    if (open) return
    dragging = true; root.classList.add('is-dragging'); root.setPointerCapture?.(e.pointerId)
    px = e.clientX; py = e.clientY; pt = performance.now(); vx = vy = 0
    down = { x: e.clientX, y: e.clientY, t: pt }
  }
  const onMove = (e) => {
    if (!dragging) return
    const now = performance.now()
    const dx = (e.clientX - px) / k, dy = (e.clientY - py) / k
    ox += dx; oy += dy
    const dt = Math.max(1, now - pt)
    vx = vx * 0.6 + (dx / dt) * 16 * 0.4; vy = vy * 0.6 + (dy / dt) * 16 * 0.4
    px = e.clientX; py = e.clientY; pt = now; lastMove = now
  }
  const onUp = (e) => {
    if (open) { hide(); return }
    if (!dragging) return
    dragging = false; root.classList.remove('is-dragging'); lastMove = performance.now()
    if (performance.now() - pt > 80) vx = vy = 0
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 400) {
      const t = lens ? tileAt(e.clientX, e.clientY) : null
      if (t) { vx = vy = 0; show(t) }
    }
    down = null
  }
  const onCancel = () => { dragging = false; down = null; root.classList.remove('is-dragging') }
  const onWheel = (e) => { e.preventDefault(); if (open) return; ox -= e.deltaX / k; oy -= e.deltaY / k; lastMove = performance.now() }
  const onKey = (e) => { if (e.key === 'Escape') hide() }
  root.addEventListener('pointerdown', onDown)
  root.addEventListener('pointermove', onMove)
  root.addEventListener('pointerup', onUp)
  root.addEventListener('pointercancel', onCancel)
  root.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKey)
  const ro = new ResizeObserver(() => { measure(); place() })
  ro.observe(root)
  const mo = new MutationObserver(() => lens && lens.readBg())
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] })

  place()
  raf = requestAnimationFrame(frame)

  return function destroy() {
    cancelAnimationFrame(raf)
    ro.disconnect(); mo.disconnect()
    root.removeEventListener('pointerdown', onDown)
    root.removeEventListener('pointermove', onMove)
    root.removeEventListener('pointerup', onUp)
    root.removeEventListener('pointercancel', onCancel)
    root.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKey)
    tiles.forEach((t) => { if (t.v) { t.v.pause(); t.v.removeAttribute('src'); t.v.load() } })
    if (lens) { lens.dispose(); lens.canvas.remove() }
    world.remove()
  }
}

