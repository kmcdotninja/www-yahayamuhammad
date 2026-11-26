// The playground canvas's layout: every project clip once, in five columns of 608px cards with 32px gaps,
// each product spread over the columns and never stacked on itself, the columns levelled to one height.
// Worked out once (a seeded search, ported from the GDG talk deck's deck.js) and stored here, so the page
// doesn't spend half a second searching on every visit. Design px; the canvas scales it to the window.

export const CARD_BG = { 'ks-web-letters': '#111315' } // a clip shown whole on its card's own colour

export const LAYOUT_W = 3200
export const LAYOUT_H = 4357.15

// [clip, kind (phone, tablet, image or a plain clip), x, y, width, height]
const ROWS = [
  ["g-worldtour", "", 0, 0, 608, 370.57],
  ["kl-islands", "", 0, 402.57, 608, 771.37],
  ["ks-post-meet", "image", 0, 1205.94, 608, 741.14],
  ["g-stunt", "", 0, 1979.07, 608, 333.51],
  ["b-learn", "", 0, 2344.59, 608, 771.37],
  ["g-lusail", "", 0, 3147.95, 608, 385.2],
  ["ks-kikos-look", "phone", 0, 3565.15, 608, 760],
  ["ks-kiko-alive", "phone", 640, 140, 608, 760],
  ["g-podium", "", 640, 932, 608, 369.97],
  ["kl-child", "", 640, 1333.97, 608, 770.12],
  ["ks-tracing", "phone", 640, 2136.09, 608, 760],
  ["g-photo", "", 640, 2928.09, 608, 332.97],
  ["b-feeling", "", 640, 3293.06, 608, 770.12],
  ["g-airport", "", 640, 4095.18, 608, 369.97],
  ["g-dala", "", 1280, 0, 608, 380.02],
  ["ks-web-trace-abc", "", 1280, 412.02, 608, 649.03],
  ["kk-testimonials", "", 1280, 1093.05, 608, 382.02],
  ["b-player", "", 1280, 1507.06, 608, 791.04],
  ["g-chests", "", 1280, 2330.1, 608, 380.02],
  ["kl-qr", "", 1280, 2742.12, 608, 791.04],
  ["ks-game-time", "phone", 1280, 3565.15, 608, 760],
  ["kl-walk", "", 1920, 140, 608, 775.32],
  ["ks-story-time", "phone", 1920, 947.32, 608, 760],
  ["g-cockpit", "", 1920, 1739.32, 608, 372.47],
  ["ks-runner", "phone", 1920, 2143.79, 608, 760],
  ["b-find", "", 1920, 2935.79, 608, 335.22],
  ["g-changi", "", 1920, 3303.01, 608, 335.22],
  ["ks-web-levelup", "", 1920, 3670.23, 608, 794.92],
  ["b-playground", "", 2560, 0, 608, 405.43],
  ["ks-ipad-catch-levelup", "tablet", 2560, 437.43, 608, 434],
  ["g-night", "", 2560, 903.43, 608, 390.03],
  ["ks-web-letters", "", 2560, 1325.46, 608, 843.7],
  ["kk-start-prompting", "", 2560, 2201.16, 608, 392.08],
  ["g-fire", "", 2560, 2625.24, 608, 390.03],
  ["ks-ipad-journey", "tablet", 2560, 3047.27, 608, 434],
  ["kl-baa", "", 2560, 3513.27, 608, 811.88],
]

export const TILES = ROWS.map(([name, kind, x, y, w, h]) => ({ name, kind, x, y, w, h }))
