// The Robot's eyes (drawn on its visor) and the extras around its head (hearts, z's, sparks…), as 2D canvas drawing.
// robot3d.js calls drawEyes for the visor texture and drawFx on each robot's canvas.
/* ---- the eyes: drawn on a canvas for each robot, glowing warm cream on the black glass ----
   Friendly, baby-face proportions: big round eyes set a little low and wide apart, a soft warm glow,
   a small catchlight so they look alive, and a faint pink blush on the glass in the warm moods. */
export const EW = 320, EH = 188, GLOW = '#fff3cf', HALO = 'rgba(255,192,96,.9)';
const spares = [];
const spare = i => {   // reusable offscreen canvases the size of the visor
  if (!spares[i]) { const k = document.createElement('canvas'); k.width = EW; k.height = EH; spares[i] = k; }
  const k = spares[i]; k.getContext('2d').clearRect(0, 0, EW, EH); return k;
};
const WARM = new Set(['happy', 'chevron', 'heart', 'wink', 'playwink', 'blush', 'dots']);   // eye shapes the warm moods use
const TAU = Math.PI * 2;
const SMILE = false;   // true adds a tiny glowing smile under the eyes in the warm moods (the sheet has no mouth, so it's off)
export function drawEyes(c, e, o){
  const x = c.getContext('2d');
  x.clearRect(0, 0, EW, EH);
  const lv = Math.max(0, Math.min(1, o.lv || 0)), b = o.blink, s = 1 + lv * .08;
  const dx = o.ex * 13, dy = o.ey * 8, L = 70 + dx, Rr = 250 + dx, Y = 110 + dy;
  // everything is drawn flat on the ink canvas first, then stamped onto the visor with a soft glow
  const ink = spare(0), g = ink.getContext('2d');
  g.fillStyle = GLOW; g.strokeStyle = GLOW; g.lineCap = 'round'; g.lineJoin = 'round';
  const shine = [];   // [cx, cy, r, lidded]: where each round eye gets its catchlight
  // a blink: the open eye squashes and fades while a soft closed lid (‿, as wide as the eye) fades in
  const ease = v => v * v * (3 - 2 * v), shut = ease(Math.max(0, Math.min(1, (b - .38) / .32)));
  const closed = (cx, r, a) => {
    if (a <= 0) return; const w = r * s * .92;
    g.save(); g.globalAlpha = a; g.lineWidth = 11; g.beginPath(); g.moveTo(cx - w, Y - 3); g.quadraticCurveTo(cx, Y + r * .62, cx + w, Y - 3); g.stroke(); g.restore();
  };
  const dot = (cx, r = 32) => {
    const ry = r * s * Math.max(.25, 1 - b * .9);
    if (shut < 1) { g.save(); g.globalAlpha = 1 - shut; g.beginPath(); g.ellipse(cx, Y + (r * s - ry) * .4, r * s, ry, 0, 0, TAU); g.fill(); g.restore(); }
    closed(cx, r, shut);
    if (b < .2) shine.push([cx, Y - ry * .1, r * s]);
  };
  const arcUp = (cx, w = 15) => { g.lineWidth = w; g.beginPath(); g.arc(cx, Y + 12, 26 * s, Math.PI * 1.06, Math.PI * 1.94); g.stroke(); };          // ∩
  const arcDown = (cx, w = 12, r = 24) => { g.lineWidth = w; g.beginPath(); g.arc(cx, Y - 9, r, Math.PI * .12, Math.PI * .88); g.stroke(); };    // ‿
  const chev = (cx, dir) => {   // > or <, its point just eased round
    g.lineWidth = 14; g.beginPath(); g.moveTo(cx - 16 * dir, Y - 21 * s);
    g.arcTo(cx + 15 * dir, Y, cx - 16 * dir, Y + 21 * s, 6); g.lineTo(cx - 16 * dir, Y + 21 * s); g.stroke();
  };
  const ring = (cx, r = 24, w = 12) => { g.lineWidth = w; g.beginPath(); g.arc(cx, Y, r * s, 0, TAU); g.stroke(); };
  const lid = (cx, side, cut, tilt, r = 32, curve = 0) => {   // an eye cut along its top: tilt > 0 lowers the inner corner
    // cut a slightly smaller eye on a spare canvas, then grow it back by stamping it round a little circle:
    // the cut keeps its line but its corners come out rounded instead of sharp
    const k = spare(1), h = k.getContext('2d'), m = 5, R = r * s - m;
    cut += (2 * r - 2 * m - 12 - cut) * Math.max(0, Math.min(1, b * 1.4)); tilt *= 1 - b * .6;   // blinking: the lid comes down
    h.fillStyle = GLOW; h.beginPath(); h.ellipse(cx, Y, R, R, 0, 0, TAU); h.fill();
    const y0 = Y - r * s + cut * s + m, yIn = y0 + tilt, yOut = y0 - tilt, xl = cx - r - 6, xr = cx + r + 6, yl = side < 0 ? yOut : yIn, yr = side < 0 ? yIn : yOut;
    h.globalCompositeOperation = 'destination-out';
    h.beginPath(); h.moveTo(xl, yl); h.quadraticCurveTo(cx, (yl + yr) / 2 + curve, xr, yr); h.lineTo(xr, 0); h.lineTo(xl, 0); h.closePath(); h.fill();
    h.globalCompositeOperation = 'source-over';
    g.save(); g.globalAlpha = 1 - shut;
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.drawImage(k, Math.cos(a) * m, Math.sin(a) * m); }
    g.drawImage(k, 0, 0); g.restore();
    closed(cx, r, shut);
    if (b < .2) { const top = Y - r * s + cut * s; shine.push([cx + r * .08, (top + Y + r * s) / 2 + r * .3, Math.min(r, (Y + r * s - top) * 1.1) * s, 1]); }   // centred in what the lid leaves
  };
  const star = cx => {   // a plump four-point sparkle: points joined by curves pulled in toward the middle
    const R = 35 * s, k = 10 * s; g.beginPath(); g.moveTo(cx, Y - R);
    for (let i = 1; i <= 4; i++) { const a = -Math.PI / 2 + i * Math.PI / 2, mm = a - Math.PI / 4; g.quadraticCurveTo(cx + Math.cos(mm) * k, Y + Math.sin(mm) * k, cx + Math.cos(a) * R, Y + Math.sin(a) * R); }
    g.fill();
    g.lineWidth = 4; g.stroke();   // softens the tips
  };
  const heart = cx => {
    g.save(); g.translate(cx, Y + 3); g.scale(s * 1.5, s * 1.5); g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(-30, -2, -18, -26, 0, -10); g.bezierCurveTo(18, -26, 30, -2, 0, 16); g.fill();
    g.lineWidth = 2.5; g.stroke(); g.restore();
    if (b < .5) shine.push([cx - 8 * s, Y - 6 * s, 20 * s]);   // on the left lobe
  };
  let bridgeAt = null;
  const bridge = (y1 = 0, y2 = 0) => { bridgeAt = [y1, y2]; };
  switch (e) {
    case 'line': bridge(); dot(L); dot(Rr); break;
    case 'dots': dot(L, 29); dot(Rr, 29); break;
    case 'blush': dot(L, 29); dot(Rr, 29); break;
    case 'happy': arcUp(L); arcUp(Rr); break;
    case 'chevron': chev(L, 1); chev(Rr, -1); break;
    case 'chevronline': chev(L, 1); chev(Rr, -1); bridge(); break;
    case 'ring': ring(L); ring(Rr); break;
    case 'ringsm': ring(L, 21, 14); ring(Rr, 21, 14); break;   // wide eyes with a dark pupil (added below)
    case 'star': star(L); star(Rr); break;
    case 'heart': heart(L); heart(Rr); break;
    case 'smug': lid(L, -1, 17, 7, 32, 6); lid(Rr, 1, 17, 7, 32, 6); break;
    case 'skeptical': lid(L, -1, 29, 0, 32, 3); lid(Rr, 1, 25, 0, 32, 3); bridge(-2, -2); break;
    case 'angry': lid(L, -1, 15, 8, 32, 6); lid(Rr, 1, 15, 8, 32, 6); break;
    case 'sad': lid(L, -1, 17, -7, 32, 5); lid(Rr, 1, 17, -7, 32, 5); break;
    case 'worried': lid(L, -1, 15, -8, 29, 5); dot(Rr, 27); break;
    case 'bored': lid(L, -1, 29, 0, 32, 4); lid(Rr, 1, 29, 0, 32, 4); bridge(5, 5); break;
    case 'sleepy': arcDown(L); arcDown(Rr); bridge(5, 5); break;
    case 'playwink': dot(L, 30); chev(Rr, -1); break;
    case 'wink': dot(L, 30); arcUp(Rr); break;
    case 'cry': g.lineWidth = 14; [[L, -1], [Rr, 1]].forEach(([cx, sd]) => {   // arcs drooping at the outer ends
      g.save(); g.translate(cx, Y); g.rotate(sd * .16); g.beginPath(); g.arc(0, 13, 25, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.restore(); }); break;
    default: dot(L); dot(Rr);
  }
  // a gentle warm shading: lightest toward the top left of each eye, a touch deeper and warmer at the bottom right
  g.save(); g.globalCompositeOperation = 'source-atop';
  [L, Rr].forEach(cx => {
    const gr = g.createRadialGradient(cx - 12, Y - 14, 2, cx - 4, Y - 4, 46);
    gr.addColorStop(0, '#fffbef'); gr.addColorStop(.55, GLOW); gr.addColorStop(1, '#ffdf9a');
    g.fillStyle = gr; g.fillRect(cx - 70, 0, 140, EH);
  });
  g.restore();
  if (bridgeAt) {   // the thin line joining the eyes, where the sheet has it
    const [y1, y2] = bridgeAt; g.save(); g.lineWidth = 3; g.globalAlpha = .7; g.globalCompositeOperation = 'destination-over';   // tucked under the eyes so it always meets them
    g.beginPath(); g.moveTo(L + 20, Y + y1); g.lineTo(Rr - 20, Y + y2); g.stroke(); g.restore();
  }

  if (SMILE && WARM.has(e)) { const mx = (L + Rr) / 2; g.lineWidth = 5; g.beginPath(); g.arc(mx, Y + 22, 11, Math.PI * .2, Math.PI * .8); g.stroke(); }

  // the warm moods: a faint pink glow on the glass under each eye
  if (WARM.has(e)) {
    [[L, -1], [Rr, 1]].forEach(([cx, sd]) => {
      const bx = cx + sd * 8, by = Y + 42, gr = x.createRadialGradient(bx, by, 0, bx, by, 34);
      // see-through pink over black glass turns maroon, so the middle is nearly solid and light, fading out at the edge
      gr.addColorStop(0, 'rgba(255,104,118,1)'); gr.addColorStop(.4, 'rgba(255,96,112,.6)'); gr.addColorStop(.75, 'rgba(255,90,108,.15)'); gr.addColorStop(1, 'rgba(255,90,108,0)');
      x.save(); x.translate(bx, by); x.scale(1, .68); x.translate(-bx, -by); x.fillStyle = gr; x.beginPath(); x.arc(bx, by, 34, 0, TAU); x.fill(); x.restore();
    });
  }

  // stamp the eyes: a wide soft halo, then the crisp core with a close glow. Both breathe a little with the voice.
  x.save();
  x.shadowColor = HALO; x.shadowBlur = 30 + lv * 18; x.globalAlpha = .5 + lv * .25; x.drawImage(ink, 0, 0);
  x.shadowColor = 'rgba(255,214,140,.95)'; x.shadowBlur = 10 + lv * 6; x.globalAlpha = 1; x.drawImage(ink, 0, 0);
  x.restore();

  if (e === 'blush') {   // three little red strokes under each eye
    x.save(); x.strokeStyle = '#ff5a6e'; x.lineWidth = 5; x.lineCap = 'round'; x.shadowColor = 'rgba(255,90,110,.7)'; x.shadowBlur = 7;
    [L, Rr].forEach(cx => { for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(cx + i * 11 - 4, Y + 50); x.lineTo(cx + i * 11 + 4, Y + 38); x.stroke(); } });
    x.restore();
  }
  if (e === 'ringsm') {   // the pupils, each with its own little catchlight
    x.save(); x.fillStyle = '#4a2a12'; [L, Rr].forEach(cx => { x.beginPath(); x.arc(cx, Y, 10 * s, 0, TAU); x.fill(); }); x.restore();
    if (b < .5) [L, Rr].forEach(cx => shine.push([cx + 3, Y + 3, 13 * s]));
  }
  // catchlights: a small bright spot up and to the left, with a tiny one opposite. They drift a touch with the gaze.
  if (shine.length) {
    x.save(); x.fillStyle = '#ffffff'; x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = 4;
    shine.forEach(([cx, cy, r, lidded]) => {
      const hx = cx - r * .36 + o.ex * 3, hy = cy - r * .36 + o.ey * 2;
      x.globalAlpha = .95; x.beginPath(); x.arc(hx, hy, r * .24, 0, TAU); x.fill();
      if (!lidded) { x.globalAlpha = .7; x.beginPath(); x.arc(cx + r * .3 + o.ex * 2, cy + r * .3 + o.ey * 1.5, r * .08, 0, TAU); x.fill(); }
    });
    x.restore();
  }
  if (e === 'cry') {   // blue tears running from the outer ends of both eyes down the glass
    x.save(); x.shadowColor = 'rgba(80,170,255,.75)'; x.shadowBlur = 10;
    [L, Rr].forEach((cx, k) => {
      const tx = cx + (k ? 26 : -26), y0 = Y + 6, y1 = EH - 12, gr = x.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, '#8fd6ff'); gr.addColorStop(1, '#46aeff');
      x.fillStyle = gr; x.beginPath(); x.moveTo(tx - 3, y0); x.quadraticCurveTo(tx, y0 - 4, tx + 3, y0);
      x.lineTo(tx + 9, y1 - 10); x.arc(tx, y1 - 10, 9, 0, Math.PI); x.closePath(); x.fill();
      const p = ((o.t * 1.4 + k * .5) % 1); x.fillStyle = 'rgba(220,244,255,.9)'; x.beginPath(); x.arc(tx, y0 + 10 + p * (y1 - y0 - 26), 3, 0, TAU); x.fill();
    });
    x.restore();
  }
}

/* ---- the extras around the head, drawn on the robot's own canvas. hx, hy: the top of the head; u: half its width ---- */
const INK = '#e9ecf5';
export function drawFx(x, fx, hx, hy, u, t){
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  const sparks = (cx, cy, angs) => {   // yellow wedges fanning out, thin at the inside, wide at the tip
    x.fillStyle = x.strokeStyle = '#ffc21a'; x.lineWidth = u * .03;   // stroked in the same colour so the corners come out round
    angs.forEach((a, i) => {
      const l0 = u * .1, l1 = u * (.42 + .04 * Math.sin(t * 6 + i)), w0 = u * .015, w1 = u * .065, c = Math.cos(a), s = Math.sin(a);
      x.beginPath(); x.moveTo(cx + c * l0 - s * w0, cy + s * l0 + c * w0); x.lineTo(cx + c * l1 - s * w1, cy + s * l1 + c * w1);
      x.lineTo(cx + c * l1 + s * w1, cy + s * l1 - c * w1); x.lineTo(cx + c * l0 + s * w0, cy + s * l0 - c * w0); x.closePath(); x.fill(); x.stroke();
    });
  };
  const P = Math.PI;
  if (fx === 'sparkL') sparks(hx - u * 1.2, hy + u * .5, [P * .87, P * 1.13]);                                        // amazed: two, on the left
  else if (fx === 'sparkR') sparks(hx + u * 1.15, hy + u * .3, [-P * .3, -P * .05, P * .18]);                         // grateful: three, top right
  else if (fx === 'sparkBoth') { sparks(hx - u * 1.2, hy + u * .25, [P * .72, P * .97, P * 1.2]); sparks(hx + u * 1.2, hy + u * .25, [P * .28, P * .03, -P * .2]); }
  else if (fx === 'hearts') {   // two on the left (one high, one by the ear), one on the right
    x.fillStyle = '#ff5a76';
    [[-1.3, -.1, 1.15], [-1.5, .55, .95], [1.5, .55, 1.05]].forEach(([dx, dy, k], i) => {
      const sz = u * .2 * k * (1 + .08 * Math.sin(t * 4 + i)), cx = hx + dx * u, cy = hy + dy * u - Math.sin(t * 1.5 + i) * u * .04;
      x.beginPath(); x.moveTo(cx, cy + sz * .7); x.bezierCurveTo(cx - sz * 1.2, cy - sz * .1, cx - sz * .65, cy - sz * 1.1, cx, cy - sz * .45); x.bezierCurveTo(cx + sz * .65, cy - sz * 1.1, cx + sz * 1.2, cy - sz * .1, cx, cy + sz * .7); x.fill();
    });
  } else if (fx === 'zzz') {   // a small z then a bigger Z, rising to the top right
    x.strokeStyle = INK; x.lineWidth = u * .065;
    const Z = (cx, cy, sz) => { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + sz, cy); x.lineTo(cx, cy + sz); x.lineTo(cx + sz, cy + sz); x.stroke(); };
    [[1.45, .2, .18], [1.78, -.15, .24]].forEach(([dx, dy, sz], i) => { x.globalAlpha = .6 + .4 * Math.abs(Math.sin(t * 1.4 + i)); Z(hx + dx * u, hy + dy * u - Math.sin(t + i) * u * .05, sz * u); });
  } else if (fx === 'anger') {   // the red anger mark: four curves bowing in toward a middle, top right
    x.strokeStyle = '#ff3b3b'; x.lineWidth = u * .06; const cx = hx + u * 1.25, cy = hy + u * .08, d = u * .15 * (1 + .1 * Math.sin(t * 8));
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const a = Math.atan2(-sy, -sx); x.beginPath(); x.arc(cx + sx * d * 1.45, cy + sy * d * 1.45, d * .85, a - .85, a + .85); x.stroke(); });
  } else if (fx === 'puff') {   // a puff of steam each side: a little cloud with a tail toward the head
    x.strokeStyle = INK; x.lineWidth = u * .04;
    [[-1.4, 0, 1], [1.5, .35, -1]].forEach(([dx, dy, sd], i) => {
      const cx = hx + dx * u, cy = hy + dy * u, r = u * .085 * (1 + .1 * Math.sin(t * 5 + i));
      x.beginPath(); x.arc(cx - r * 1.1, cy + r * .3, r, P * .6, P * 1.55); x.arc(cx - r * .3, cy - r * .7, r, P * 1.1, P * 1.9);
      x.arc(cx + r * .8, cy - r * .4, r, P * 1.35, P * .2); x.arc(cx + r * .5, cy + r * .75, r * .9, P * 1.8, P * .9); x.closePath(); x.stroke();
      x.beginPath(); x.moveTo(cx + sd * r * 1.2, cy + r * 1.3); x.lineTo(cx + sd * r * 1.9, cy + r * 2); x.stroke();
    });
  } else if (fx === 'shake') {   // zig-zag shake lines, both sides
    x.strokeStyle = INK; x.lineWidth = u * .04;
    [[-1, .45], [1, .2]].forEach(([sd, y0]) => { x.beginPath(); for (let i = 0; i <= 7; i++) { const yy = hy + u * y0 + i * u * .1, xx = hx + sd * u * 1.42 + (i % 2 ? u * .06 : -u * .06) + Math.sin(t * 22) * u * .015; i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); });
  } else if (fx === 'swirl') {   // a dizzy coil: loops growing up and to the right from a little tail
    x.strokeStyle = INK; x.lineWidth = u * .04; const cx = hx + u * .75, cy = hy - u * .5, n = 90;
    x.beginPath(); x.moveTo(cx - u * .06, cy + u * .32);
    for (let i = 0; i <= n; i++) { const k = i / n, a = k * P * 8 + t * 4, R = u * (.05 + .07 * k); x.lineTo(cx + u * .25 * k + R * Math.cos(a), cy + u * .12 - u * .3 * k + R * .7 * Math.sin(a)); }
    x.stroke();
  }
  x.restore();
}

