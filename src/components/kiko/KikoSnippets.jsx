import './KikoSnippets.css'

// Kiko's animated snippet tiles for the homepage grid, built in code (text,
// shapes and the real Kiko layers rendered from Kiko's Brand page; nothing is
// redrawn). Each runs only while on screen and stays still with reduced motion.
//   <NewInKiko/>  "New in Kiko" + v1.6 pop in, then the pills fall into a pile (NewInKiko.jsx)
//   <KikoIcon/>   the app icon, Kiko flips inside it every few seconds (KikoIcon.jsx)
//   <Peekaboo/>   Kiko peeks, pops up, and becomes the logo lockup (Peekaboo.jsx; light: on cream)
//   <ChildCard/>  a child's card: ten children, each with their own Kiko colour
//   <KikoTalks/>  Kiko says its recorded lines, mouth moving, each line typing in under it

/* ---------------- New in Kiko ---------------- */

// its own component (NewInKiko.jsx + .css, the physics in pillWorld.js)
export { default as NewInKiko } from './NewInKiko.jsx'

/* ---------------- the app icon, Peekaboo ---------------- */

// their own files: KikoIcon.jsx / Peekaboo.jsx (+ .css, motion.js)
export { default as KikoIcon } from './KikoIcon.jsx'
export { default as Peekaboo } from './Peekaboo.jsx'

/* ---------------- the child card ---------------- */

// now its own component (ChildCard.jsx); re-exported so the grid's import stays
export { default as ChildCard } from './ChildCard.jsx'

/* ---------------- Kiko talks ---------------- */

export { default as KikoTalks } from './KikoTalks.jsx'
