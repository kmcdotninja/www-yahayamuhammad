// The Arabic numbers for tracing (trace.jsx), ١ to ٩ (the Eastern Arabic digits; ٠ left out, the owner's call, v1.2): [digit, strokes, its name as Kiko
// says it]. Built exactly like the letters (arabic.js): only straight lines and true circular or elliptical arcs,
// meeting along the same direction, one stroke weight with round ends (trace.css), at the letters' scale and weight,
// each centred on 50,50. Drawn to the digits of the app's Arabic type (SF Arabic Rounded Bold, the scale the letters
// are drawn at: the ink of each stroke reaching where the type's does), so they stand as tall as Alif.
// Strokes in the order and direction children write them, top to bottom, right to left: ٢ ٣ from the tip on the
// right, round the cups (one size, like س's teeth) to the top of the stem, and down it; ٤ from its top, round both
// bowls to its tail; ٥ a round loop, from the top down its left side, as O and ه go; ٦ along the top and down;
// ٧ from the top right, down and up; ٨ from its top, the right leg then the left (as A's legs, mirrored); ٩ its head
// first (round like و's), from where it meets the stem, and down the stem
export const NUM = [
  ['١', ['M46.4 16.65 L53.6 83.35'], 'Wahid'],
  ['٢', ['M72.5 16.65 A21.95 18.35 0 0 1 28.6 16.65 L39 83.35'], 'Ithnan'],
  ['٣', ['M79.2 16.65 A14.3 18.35 0 0 1 50.6 16.65 A14.3 18.35 0 0 1 22 16.65 L32.4 83.35'], 'Thalatha'],
  ['٤', ['M57 18.75 A20.35 14.4 0 0 0 57 47.5 A20.85 16.9 0 0 0 57 81.3 H63.9'], "Arba'a"],
  ['٥', ['M50 25.65 A20 29.35 0 0 0 30 55 A20 19.35 0 0 0 70 55 A20 29.35 0 0 0 50 25.65'], 'Khamsa'],
  ['٦', ['M34.85 17.85 H59.3 L65 82.25'], 'Sitta'],
  ['٧', ['M70.65 16.65 L50 83.35 L29.35 16.65'], "Sab'a"],
  ['٨', ['M50 16.65 L70.65 83.35', 'M50 16.65 L29.35 83.35'], 'Thamaniya'],
  ['٩', ['M52.5 48.97 A17 17 0 1 1 60.94 32.77 L65.3 82.75'], "Tis'a"],
];
