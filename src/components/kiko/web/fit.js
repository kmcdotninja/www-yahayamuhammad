// The website's measure of a letter's strokes (the same box as the app's fit, shared/lessons/trace.jsx), made cheap:
// one hidden probe kept on the page, sealed off (contain:strict) and reused, its one path's d swapped per stroke. The
// app's fit adds and removes an <svg> for every letter, and each of those re-lays out the whole page: leaving The
// making of Kiko (a very long page) for Home, its 37 letters took seconds on a phone
const fits = new Map();
let probe, path;
export function fit(st, n, pad = 0){
  const k = st.join() + n + pad; if (fits.has(k)) return fits.get(k);
  if (!probe){
    const ns = 'http://www.w3.org/2000/svg';
    probe = document.createElementNS(ns, 'svg'); path = document.createElementNS(ns, 'path');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none;contain:strict;overflow:hidden';
    probe.append(path); document.body.append(probe);
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of st) {
    path.setAttribute('d', d);
    const b = path.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
  }
  const m = Math.max(n, Math.max(x1 - x0, y1 - y0) + pad), v = `${(x0 + x1 - m) / 2} ${(y0 + y1 - m) / 2} ${m} ${m}`;
  fits.set(k, v); return v;
}
