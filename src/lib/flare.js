import { onAfterScroll, scrollDriven } from './lenisStore.js'

// Scroll flare: images entering from the bottom of the screen spread outward in
// a soft curve where they meet the bottom edge, then settle into a clean
// rectangle as they rise. The curve stretches the picture itself, which CSS
// can't do, so registered images are drawn by WebGL on one fixed canvas; the
// real <img> stays in the page, invisible, for layout, screen readers and saving.
// The canvas keeps each image's crop, fades, hover zoom and rounded corners.
// Videos work too: the canvas shows the poster until the clip has frames, then
// redraws the current frame while it plays.
// Desktop only (touch scrolling would let the canvas lag a frame behind), and
// off with reduced motion or without WebGL: the images then show as normal.

const ROWS = 64 // strips down each image; more rows make a smoother curve

const VERTEX = `
attribute vec2 a_corner;
uniform vec4 u_rect;   // x, y, width, height in CSS pixels
uniform vec2 u_view;   // viewport size
uniform float u_band;  // height of the zone above the bottom edge where images flare
uniform float u_flare; // how far each side spreads at the very bottom
uniform vec4 u_uv;     // texture crop: offset x, y, scale x, y
varying vec2 v_uv;
varying vec2 v_local;
void main() {
  float x = u_rect.x + a_corner.x * u_rect.z;
  float y = u_rect.y + a_corner.y * u_rect.w;
  // 0 above the band, 1 at the bottom edge; a quarter-circle curve, so the side
  // leaves the image straight and meets the bottom edge flat.
  float t = clamp((y - (u_view.y - u_band)) / u_band, 0.0, 1.0);
  x += (a_corner.x * 2.0 - 1.0) * u_flare * (1.0 - sqrt(1.0 - t * t));
  gl_Position = vec4(x / u_view.x * 2.0 - 1.0, 1.0 - y / u_view.y * 2.0, 0.0, 1.0);
  v_uv = u_uv.xy + a_corner * u_uv.zw;
  v_local = a_corner;
}`

const FRAGMENT = `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_alpha;
uniform vec2 u_size;    // box size in CSS pixels
uniform float u_radius; // corner radius in CSS pixels
uniform float u_outline; // strength of the 1px white inner edge (the CSS outline)
varying vec2 v_uv;
varying vec2 v_local;
void main() {
  // Rounded corners: distance outside a rounded rectangle, softened by a pixel.
  vec2 p = abs(v_local * u_size - u_size * 0.5) - (u_size * 0.5 - u_radius);
  float outside = length(max(p, 0.0)) + min(max(p.x, p.y), 0.0) - u_radius;
  float edge = u_radius > 0.0 ? clamp(0.5 - outside, 0.0, 1.0) : 1.0;
  vec4 color = texture2D(u_texture, v_uv);
  // The photo's outline: the 1px just inside the edge, lightened towards white.
  float ring = clamp(outside + 1.0, 0.0, 1.0) * u_outline;
  color.rgb = mix(color.rgb, vec3(color.a), ring);
  gl_FragColor = color * u_alpha * edge;
}`

let gl = null
let canvas = null
let uniforms = {}
let frame = 0
let unsupported = false
const items = new Set()

// The zone above the bottom edge where things flare, and how far each side
// spreads at the very bottom. Shared by the images (WebGL) and the built tiles
// (SVG filter, below) so the two can never drift apart.
const bandFor = (vh) => Math.min(140, Math.max(80, vh * 0.14))
// Smaller images flare less, so thumbnails don't sprout wings.
const flareFor = (w) => Math.min(28, w * 0.06)

// Desktop Safari scrolls the page with the flare on at ~30fps (the tile warp's SVG
// filter is redrawn on the CPU every frame) and still stutters with the photo flare
// alone (each photo's first upload stalls a frame): it gets the page without the
// flare, at full speed. Chrome, Edge and Firefox keep it; phones never had it.
const SAFARI = typeof navigator !== 'undefined' && /^((?!chrome|chromium|crios|fxios|android|edg).)*safari/i.test(navigator.userAgent)

function supported() {
  if (unsupported || SAFARI) return false
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function compile(type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

function setup() {
  canvas = document.createElement('canvas')
  canvas.className = 'flare-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true })
  if (!gl) {
    unsupported = true
    canvas = null
    return false
  }

  const program = gl.createProgram()
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    unsupported = true
    gl = canvas = null
    return false
  }
  gl.useProgram(program)

  // A strip two vertices wide (left and right edge) and ROWS tall.
  const corners = []
  for (let i = 0; i <= ROWS; i++) corners.push(0, i / ROWS, 1, i / ROWS)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW)
  const corner = gl.getAttribLocation(program, 'a_corner')
  gl.enableVertexAttribArray(corner)
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0)

  for (const name of ['u_rect', 'u_view', 'u_band', 'u_flare', 'u_uv', 'u_alpha', 'u_size', 'u_radius', 'u_outline']) {
    uniforms[name] = gl.getUniformLocation(program, name)
  }
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  // First in the page, so anything meant to sit on an image (with a z-index)
  // still draws over it.
  document.body.prepend(canvas)
  resize()
  window.addEventListener('resize', resize)
  return true
}

function teardown() {
  cancelAnimationFrame(frame)
  frame = 0
  window.removeEventListener('resize', resize)
  canvas?.remove()
  gl = canvas = null
}

// The area the fixed canvas covers: the window minus any scrollbar. (innerWidth
// includes a classic scrollbar, which squeezed every drawn image and left a strip
// of background at the right edge of full-width images like the hero.)
function viewSize() {
  const root = document.documentElement
  return [root.clientWidth, root.clientHeight]
}

let dpr = 1

// Very large screens (a 49" monitor at 2x is over 10,000 pixels wide) can pass
// the GPU's largest drawing surface; the browser then silently shrinks it and
// anything past that edge would never draw. Keep within the limit, trading a
// little sharpness, and draw to the surface the browser actually gave us.
function resize() {
  const [vw, vh] = viewSize()
  const [maxW, maxH] = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
  const maxSide = Math.min(maxW, maxH, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
  dpr = Math.min(window.devicePixelRatio || 1, 2, maxSide / vw, maxSide / vh)
  canvas.width = Math.floor(vw * dpr)
  canvas.height = Math.floor(vh * dpr)
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
}

const isVideo = (el) => el.tagName === 'VIDEO'
const mediaWidth = (el) => el.videoWidth || el.naturalWidth || el.width
const mediaHeight = (el) => el.videoHeight || el.naturalHeight || el.height

// What to draw for an item: the image, or for a video its current frame once
// it has one and its poster until then. Null while nothing has loaded.
function sourceOf(item) {
  const { img } = item
  if (!isVideo(img)) return img.complete && img.naturalWidth ? img : null
  if (img.readyState >= 2 && img.videoWidth) return img
  return item.poster?.complete && item.poster.naturalWidth ? item.poster : null
}

// Texture crop matching object-fit: cover and the image's object-position.
function coverCrop(img, source, width, height) {
  const imageAspect = mediaWidth(source) / mediaHeight(source)
  const boxAspect = width / height
  const [px, py] = statics(img).pos
  if (imageAspect > boxAspect) {
    const sx = boxAspect / imageAspect
    return [(1 - sx) * px, 0, sx, 1]
  }
  const sy = imageAspect / boxAspect
  return [0, (1 - sy) * py, 1, sy]
}

// Follows the scroll reveal and any other fades on the image's containers.
function opacityOf(img) {
  let alpha = 1
  for (const el of statics(img).up) {
    alpha *= parseFloat(getComputedStyle(el).opacity)
    if (alpha === 0) break
  }
  return alpha
}

// The corner radius: the image's own, or (on this site) the card that clips
// it, since the tiles round their frame rather than the picture.
// True when an ancestor that clips its content (overflow other than visible)
// doesn't fully contain the image. The card that rounds a tile contains it
// exactly, so it never counts.
function clipped(img, r) {
  for (const el of statics(img).clips) {
    const b = el.getBoundingClientRect()
    if (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1) return true
  }
  return false
}

// What doesn't change while an image is on the page, read once rather than on
// every frame (Safari pays dearly for style reads in the scroll loop): its
// ancestors, the ones that clip it, its corner radius and its crop position.
const fixed = new WeakMap()
function statics(img) {
  let f = fixed.get(img)
  if (f) return f
  const up = []
  for (let el = img.parentElement; el && el !== document.body; el = el.parentElement) up.push(el)
  const clips = up.filter((el) => { const s = getComputedStyle(el); return !(s.overflowX === 'visible' && s.overflowY === 'visible') })
  const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5))
  f = { up, clips, radius: radiusRead(img), pos }
  fixed.set(img, f)
  return f
}

function radiusOf(img) {
  return statics(img).radius
}

function radiusRead(img) {
  const own = parseFloat(getComputedStyle(img).borderTopLeftRadius) || 0
  if (own) return own
  const card = img.closest('.project__tile, .tl__shot, .ab2__portrait')
  return card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0 : 0
}

function render() {
  const [vw, vh] = viewSize()
  // A scrollbar appearing or going away changes the size without a resize event.
  if (canvas.width !== Math.floor(vw * dpr) || canvas.height !== Math.floor(vh * dpr)) resize()
  const band = bandFor(vh)

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.uniform2f(uniforms.u_view, vw, vh)
  gl.uniform1f(uniforms.u_band, band)

  for (const item of items) {
    const { img } = item
    // The picture changed (e.g. the Studio team portrait): upload the new one.
    if (!isVideo(img) && item.src !== img.currentSrc) {
      if (item.texture) gl.deleteTexture(item.texture)
      item.texture = null
      item.src = img.currentSrc
      if (img.complete) upload(item)
    }
    if (!item.texture) continue
    const source = sourceOf(item)
    if (!source) continue

    const r = img.getBoundingClientRect()
    if (!r.width || r.bottom < 0 || r.top > vh) continue
    const alpha = opacityOf(img)
    if (alpha <= 0) continue
    // Cut off by a container that clips it (the About page's folded gallery):
    // the canvas can't clip, so the real image shows instead until it's clear.
    if (clipped(img, r)) {
      img.style.opacity = ''
      continue
    }
    img.style.opacity = '0'

    // A hover zoom scales the image inside its frame: draw the frame's box and
    // zoom the picture within it instead of drawing past the frame.
    const w = img.offsetWidth || r.width
    const h = img.offsetHeight || r.height
    const zoom = r.width / w
    const [ox, oy, sx, sy] = coverCrop(img, source, w, h)
    const zx = sx / zoom
    const zy = sy / zoom

    gl.bindTexture(gl.TEXTURE_2D, item.texture)
    // A playing video (or one that just switched from its poster) gets its
    // current frame.
    if (isVideo(img) && (source !== item.drawn || !img.paused)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      item.drawn = source
    }
    gl.uniform4f(uniforms.u_rect, r.left + (r.width - w) / 2, r.top + (r.height - h) / 2, w, h)
    gl.uniform4f(uniforms.u_uv, ox + (sx - zx) / 2, oy + (sy - zy) / 2, zx, zy)
    gl.uniform2f(uniforms.u_size, w, h)
    gl.uniform1f(uniforms.u_radius, radiusOf(img))
    gl.uniform1f(uniforms.u_outline, item.outline)
    // Smaller images flare less, so thumbnails don't sprout wings.
    gl.uniform1f(uniforms.u_flare, flareFor(w))
    gl.uniform1f(uniforms.u_alpha, alpha)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, (ROWS + 1) * 2)
  }
}

// Drawn right after Lenis moves the page, in the same frame (lenisStore); this
// loop only draws on its own when Lenis isn't running (it keeps the loop alive
// either way, for playing videos).
function tick() {
  if (!scrollDriven()) render()
  frame = items.size ? requestAnimationFrame(tick) : 0
}
onAfterScroll(() => {
  if (gl && items.size) render()
  if (elements.size) renderElements()
})

// A photo bigger than the GPU's largest texture, scaled down to fit.
function fitTexture(img) {
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  const scale = Math.min(1, max / mediaWidth(img), max / mediaHeight(img))
  if (scale === 1) return img
  const c = document.createElement('canvas')
  c.width = Math.floor(mediaWidth(img) * scale)
  c.height = Math.floor(mediaHeight(img) * scale)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c
}

function upload(item) {
  const source = gl && !item.texture && sourceOf(item)
  if (!source) return
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fitTexture(source))
  item.drawn = source
  // If the GPU refused it, the page keeps showing the real image.
  if (gl.getError() !== gl.NO_ERROR) {
    gl.deleteTexture(texture)
    return
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  item.texture = texture
  // The canvas draws it from now on.
  item.img.style.opacity = '0'
}

// Draws `img` (an image or a video) with the flare. Returns a function that
// hands it back to the page.
export function flareImage(img) {
  if (!supported() || (!gl && !setup())) return () => {}

  // Draws the image's CSS outline too (the faint white edge on photos), since the
  // real element is hidden while the canvas shows it.
  const style = getComputedStyle(img)
  const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0 ? 0.1 : 0
  const item = { img, texture: null, src: img.currentSrc, poster: null, drawn: null, outline }
  const onLoad = () => upload(item)
  const loadEvent = isVideo(img) ? 'loadeddata' : 'load'
  items.add(item)
  if (isVideo(img) && img.poster) {
    item.poster = new Image()
    item.poster.addEventListener('load', onLoad)
    item.poster.src = img.poster
  }
  onLoad()
  img.addEventListener(loadEvent, onLoad)
  if (!frame) frame = requestAnimationFrame(tick)

  return () => {
    img.removeEventListener(loadEvent, onLoad)
    item.poster?.removeEventListener('load', onLoad)
    img.style.opacity = ''
    if (item.texture && gl) gl.deleteTexture(item.texture)
    items.delete(item)
    if (!items.size) teardown()
  }
}

// ---------------------------------------------------------------------------
// The same flare for things that aren't a single picture: Kiko's phone and iPad
// mockups (a frame drawn in CSS around a playing video) and its animated cards
// (live components). WebGL can't draw those, so the element itself is warped by
// an SVG filter: a displacement map that does exactly what the vertex shader
// above does, each row scaled out from the centre by the same quarter-circle
// profile across the same band. The map is drawn once per size; on scroll only
// its position moves. Only elements inside the band carry the filter at all.
// ---------------------------------------------------------------------------

const SVGNS = 'http://www.w3.org/2000/svg'
const MAP_W = 128 // the map's own resolution: each row is a straight ramp, so this is plenty
const MAP_H = 64
let defs = null
let nextId = 0
let elFrame = 0
const elements = new Set()

function svgDefs() {
  if (defs) return defs
  const svg = document.createElementNS(SVGNS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
  defs = document.createElementNS(SVGNS, 'defs')
  svg.appendChild(defs)
  document.body.appendChild(svg)
  return defs
}

const make = (tag, attrs) => {
  const n = document.createElementNS(SVGNS, tag)
  for (const k in attrs) n.setAttribute(k, attrs[k])
  return n
}

// The displacement map for a box `w` wide spreading `f` at the bottom: red holds
// where each output pixel samples from (0.5 = itself), over the box plus `pad`
// either side, from the top of the band (row 0) to the bottom edge (last row).
function drawMap(w, f, pad) {
  const c = document.createElement('canvas')
  c.width = MAP_W
  c.height = MAP_H
  const ctx = c.getContext('2d')
  const data = ctx.createImageData(MAP_W, MAP_H)
  const span = w + pad * 2
  const scale = pad * 2
  for (let py = 0; py < MAP_H; py++) {
    const t = py / (MAP_H - 1)
    const spread = f * (1 - Math.sqrt(1 - t * t))
    const ratio = w / 2 / (w / 2 + spread) // output half-width -> source half-width
    for (let px = 0; px < MAP_W; px++) {
      const x = -pad + (px / (MAP_W - 1)) * span
      const offset = (x - w / 2) * (ratio - 1)
      const r = Math.round(Math.min(1, Math.max(0, 0.5 + offset / scale)) * 255)
      const i = (py * MAP_W + px) * 4
      data.data[i] = r
      data.data[i + 1] = 128
      data.data[i + 2] = 128
      data.data[i + 3] = 255
    }
  }
  ctx.putImageData(data, 0, 0)
  return c.toDataURL()
}

function renderElements() {
  const vh = document.documentElement.clientHeight
  const band = bandFor(vh)
  for (const item of elements) {
    const { el } = item
    const r = el.getBoundingClientRect()
    const w = el.offsetWidth
    const h = el.offsetHeight
    // Only while the element reaches into the band; otherwise no filter at all.
    const inBand = w && r.bottom > vh - band && r.top < vh
    if (!inBand) {
      if (item.on) {
        el.style.filter = ''
        item.on = false
      }
      continue
    }
    const f = flareFor(w)
    const pad = Math.ceil(f) + 2
    if (item.w !== w || item.h !== h) {
      item.w = w
      item.h = h
      const region = { x: -pad, y: 0, width: w + pad * 2, height: h }
      for (const k in region) item.filter.setAttribute(k, region[k])
      item.flood.setAttribute('x', -pad)
      item.flood.setAttribute('width', w + pad * 2)
      item.flood.setAttribute('height', h)
      item.image.setAttribute('x', -pad)
      item.image.setAttribute('width', w + pad * 2)
      item.image.setAttribute('href', drawMap(w, f, pad))
      item.displace.setAttribute('scale', pad * 2)
    }
    // The band sits at the bottom of the window; in the element's own space its
    // top is this far down (the element's scale is 1, a hover lift only moves it).
    // Set only when it moved: any change makes the browser repaint the tile.
    const y = Math.round((vh - band - r.top) * 2) / 2
    if (item.y !== y || item.band !== band) {
      item.y = y
      item.band = band
      item.image.setAttribute('y', y)
      item.image.setAttribute('height', band)
    }
    if (!item.on) {
      el.style.filter = `url(#${item.id})`
      item.on = true
    }
  }
}

function tickElements() {
  if (!scrollDriven()) renderElements()
  elFrame = elements.size ? requestAnimationFrame(tickElements) : 0
}

// Flares an element (a whole tile) the way flareImage flares a picture. Returns
// a function that takes the filter off again.
export function flareElement(el) {
  if (!supported()) return () => {}
  const id = `flare-el-${nextId++}`
  const filter = make('filter', {
    id,
    filterUnits: 'userSpaceOnUse',
    primitiveUnits: 'userSpaceOnUse',
    'color-interpolation-filters': 'sRGB',
  })
  // Neutral grey everywhere (no shift), the map over the band on top of it.
  const flood = make('feFlood', { 'flood-color': 'rgb(128,128,128)', y: 0, result: 'neutral' })
  const image = make('feImage', { preserveAspectRatio: 'none', result: 'band' })
  const merge = make('feMerge', { result: 'map' })
  merge.append(make('feMergeNode', { in: 'neutral' }), make('feMergeNode', { in: 'band' }))
  const displace = make('feDisplacementMap', {
    in: 'SourceGraphic',
    in2: 'map',
    xChannelSelector: 'R',
    yChannelSelector: 'G',
  })
  filter.append(flood, image, merge, displace)
  svgDefs().appendChild(filter)

  const item = { el, id, filter, flood, image, displace, w: 0, h: 0, on: false }
  elements.add(item)
  if (!elFrame) elFrame = requestAnimationFrame(tickElements)

  return () => {
    el.style.filter = ''
    filter.remove()
    elements.delete(item)
  }
}
