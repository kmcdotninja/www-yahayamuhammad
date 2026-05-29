const stickerBase = '/playground/stickers'

// Tighter cluster — positions pulled ~25% closer to centre so the stickers
// pile up on each other rather than spreading to the card edges. Sizes
// trimmed another step so the overlap reads as a stack instead of a crowd.
export const kmcStickers = [
  // 3 — brain anchor, mid-left
  { src: `${stickerBase}/3.svg`, x: -135, y:  30,  rot: -6,  fromX: -700, fromY:  300, size: 230 },
  // 1 — "I'M A DESIGNER" top-right
  { src: `${stickerBase}/1.svg`, x:  140, y: -70,  rot:  4,  fromX:  800, fromY: -300, size: 240 },
  // 2 — "PORTFOLIO WEBSITE" bottom-centre
  { src: `${stickerBase}/2.svg`, x:  10,  y:  135, rot: -3,  fromX: -200, fromY:  700, size: 195 },
  // 6 — "KA DEMI KUDI DANLAMI" mid-right
  { src: `${stickerBase}/6.svg`, x:  160, y:  60,  rot:  5,  fromX:  800, fromY:  500, size: 175 },
  // 4 — pin/thumbtack top-left
  { src: `${stickerBase}/4.svg`, x: -170, y: -110, rot:  7,  fromX: -800, fromY: -400, size: 150 },
  // 5 — open book top-centre
  { src: `${stickerBase}/5.svg`, x: -25,  y: -125, rot: -2,  fromX:  200, fromY: -600, size: 135 },
  // 7 — videographer, springs up from far below and settles in the centre
  { src: `${stickerBase}/7.svg`, x: -5,   y:  25,  rot: -4,  fromX:  0,   fromY:  900, size: 200 },
]
