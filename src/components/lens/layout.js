// The playground canvas's layout: every project clip once, in five columns of 608px cards with 32px gaps,
// each product spread over the columns and never stacked on itself, the columns levelled to one height.
// Worked out once (a seeded search, ported from the GDG talk deck's deck.js) and stored here, so the page
// doesn't spend half a second searching on every visit. Design px; the canvas scales it to the window.

export const CARD_BG = { 'ks-web-letters': '#111315' } // a clip shown whole on its card's own colour

export const LAYOUT_W = 3200
export const LAYOUT_H = 4232.98

// [clip, kind (phone, tablet, image or a plain clip), x, y, width, height]
const ROWS = [
  ["g-worldtour", "", 0, 0, 608, 390.33],
  ["kl-walk", "", 0, 422.33, 608, 812.5],
  ["g-airport", "", 0, 1266.83, 608, 390.33],
  ["ks-web-letters", "", 0, 1689.16, 608, 844.34],
  ["g-lusail", "", 0, 2565.5, 608, 405.74],
  ["b-playground", "", 0, 3003.24, 608, 405.74],
  ["ks-tracing", "phone", 0, 3440.98, 608, 760],
  ["ks-ipad-catch-levelup", "tablet", 640, 140, 608, 434],
  ["g-podium", "", 640, 606, 608, 392.98],
  ["b-feeling", "", 640, 1030.98, 608, 818.02],
  ["g-cockpit", "", 640, 1881, 608, 392.98],
  ["ks-kiko-alive", "phone", 640, 2305.98, 608, 760],
  ["g-chests", "", 640, 3097.98, 608, 392.98],
  ["kl-baa", "", 640, 3522.96, 608, 818.02],
  ["g-dala", "", 1280, 0, 608, 370.42],
  ["ks-web-trace-abc", "", 1280, 402.42, 608, 632.64],
  ["g-stunt", "", 1280, 1067.06, 608, 333.38],
  ["kl-islands", "", 1280, 1432.44, 608, 771.06],
  ["g-night", "", 1280, 2235.5, 608, 370.42],
  ["b-player", "", 1280, 2637.92, 608, 771.06],
  ["ks-story-time", "phone", 1280, 3440.98, 608, 760],
  ["kl-qr", "", 1920, 140, 608, 763.98],
  ["b-find", "", 1920, 935.98, 608, 330.32],
  ["ks-kikos-look", "phone", 1920, 1298.3, 608, 760],
  ["g-photo", "", 1920, 2090.3, 608, 330.32],
  ["ks-game-time", "phone", 1920, 2452.62, 608, 760],
  ["g-changi", "", 1920, 3244.62, 608, 330.32],
  ["ks-post-meet", "image", 1920, 3606.94, 608, 734.04],
  ["ks-ipad-journey", "tablet", 2560, 0, 608, 434],
  ["g-fire", "", 2560, 466, 608, 390.14],
  ["ks-runner", "phone", 2560, 888.14, 608, 760],
  ["kl-child", "", 2560, 1680.14, 608, 812.1],
  ["ks-web-levelup", "", 2560, 2524.24, 608, 832.64],
  ["b-learn", "", 2560, 3388.87, 608, 812.1],
]

export const TILES = ROWS.map(([name, kind, x, y, w, h]) => ({ name, kind, x, y, w, h }))
