// ---------------------------------------------------------------------------
// /about-timeline — all the editable content for the page lives here.
// ---------------------------------------------------------------------------
// Nothing in this file is layout or logic. Change the words, dates and photos
// here and the page follows; you never need to open AboutTimelinePage.jsx.
//
// ── Adding / editing a chapter ──────────────────────────────────────────────
//
//   {
//     id:      'kutuby',              // unique; also the #anchor in the URL
//     date:    '2025-07',             // YYYY-MM. Drives everything on the ruler.
//     title:   'Kutuby, and\nbuilding again',   // \n = a deliberate line break
//     body:    'One or two sentences.',
//     layout:  'masonry' | 'strip',   // optional; omit for a justified row
//     collapse: true,                 // optional; masonry only — see below
//     shots: [                        // optional; [] or omit for a text chapter
//       { src: '/about/photo.webp', alt: 'Described for screen readers',
//         cap: 'CAPTION', ar: 1800 / 2225,
//         capTone: 'dark' },          // optional; for light-cornered photos
//     ],
//   }
//
// `layout` picks how the photographs sit. Leave it off and they justify into a
// row — every photo keeps its shape and the row fills the width exactly, which
// suits two or three. Set it to 'masonry' once there are enough that a row would
// run out of page: they then stack into columns at their own heights. Add
// `collapse: true` to a masonry chapter and it opens showing only the top of the
// grid behind a fade, with an "All photos" button that expands the rest — worth
// it past about six photographs, so one chapter can't swamp the page.
//
// Three rules worth knowing:
//
//   1. KEEP THE ARRAY IN DATE ORDER. `date` is the only positional input — the
//      ruler works out its span, ticks, year numerals and the playhead's travel
//      from these alone — but the reading order comes from the array order, so
//      the two have to agree.
//
//   2. `ar` is the width / height the photo is *shown* at (write it as a
//      division, e.g. 1800 / 2225). Use the file's real numbers and nothing is
//      cropped; give it a shorter ratio and the photo crops to fit. Either way
//      it reserves the exact box before the image loads, so nothing jumps as the
//      page fills in, and it is what lets a row justify cleanly.
//      `pos` (optional) is the CSS object-position that decides which part of a
//      cropped photo you keep — '50% 60%' frames low, '50% 0' keeps the top.
//      `capTone: 'dark'` (optional) prints the caption in ink rather than white,
//      for photographs whose bottom-left corner is light.
//
//   3. `\n` in a title is an authored line break. These are set in a display
//      face at hero size, so where a line turns is a composition decision — it
//      shouldn't be left to whatever the column width happens to be.
//
// Photos live in /public/about and /public/images. Drop a new one in, run
// `npm run compress:images`, then reference the .webp — the .avif sibling is
// picked up automatically.
// ---------------------------------------------------------------------------

export const HEADLINE =
  'Product Designer\nbuilding digital products\nfor humans'

export const LEDE =
  'I’ve designed products across healthcare, fintech, retail, and enterprise, taking ideas from research to production. My civil engineering background helps me solve real problems through design. I also lead and mentor designers at Friends of Figma Kano.'

// The career and the trips on one track — which is why this page has no
// separate work-experience list and no photo marquee. Every chapter reads the
// same way, work or travel: a date, a title, a paragraph, some photographs.
// Where a role was and who it was for belongs in the paragraph, not in a
// separate label that only half the chapters would carry.
export const TIMELINE = [
  {
    id: 'yoda-box',
    date: '2020-03',
    title: 'From site engineer\nto digital design',
    body: 'I trained as a civil engineer, but YodaBox gave me my first chance as a designer. Engineering taught me to understand the problem before the solution, a mindset I carried into designing learning experiences for kids.',
    // A contact-sheet strip: common height, natural widths, left-aligned. Work
    // shows a few artefacts rather than a wall of photographs, so they should
    // sit at a readable size instead of being stretched to the page rail.
    layout: 'strip',
    shots: [
      { src: '/about/Yodabox/Mobile App.webp', alt: 'The Yoda Box mobile app', cap: 'Mobile app', ar: 858 / 1322 , capTone: 'dark'},
      { src: '/about/Yodabox/The box.webp', alt: 'A Yoda Box sticker held in the hand', cap: 'The box', ar: 929 / 646 },
      { src: '/about/Yodabox/Logo.webp', alt: 'The Yoda Box logo and its construction grid', cap: 'Logo', ar: 1014 / 647 , capTone: 'dark'},
    ],
  },
  {
    id: 'healthcare',
    date: '2022-04',
    title: 'Healthcare design\nend to end',
    body: 'My parents always wanted me to be a doctor but life had other plans, somehow I still found myself in healthcare. Three years in line I have spent my time designing products that help clinicians care for patients, from hospital systems to vaccination platforms. Funny how things worked out.',
    layout: 'strip',
    shots: [
      { src: '/about/Healthcare/North App.webp', alt: 'A patient appointment app for clinicians', cap: 'North app', ar: 723 / 1341 , capTone: 'dark'},
      { src: '/about/Healthcare/Pneumacare Illustration.webp', alt: 'PneumaCare provider dashboard', cap: 'Pneumacare', ar: 960 / 945 , capTone: 'dark'},
    ],
  },
  {
    id: 'kutuby',
    date: '2025-07',
    title: 'Kutuby and\nbuilding for education again',
    body: 'After designing learning experiences at YodaBox, getting to do it again at Kutuby has been one of the sweetest parts of my journey. This time, helping kids learn Arabic through thoughtful lessons, games, and onboarding has made the work even more meaningful.',
    layout: 'strip',
    shots: [
      { src: '/about/workspace.webp', alt: 'A call with the Kutuby team on screen', cap: 'At the studio', ar: 1800 / 2225 },
      { src: '/about/Kutuby/the website design.webp', alt: 'The Kutuby website design on screen', cap: 'The website design', ar: 960 / 1187 },
      { src: '/about/Kutuby/character illustrations.webp', alt: 'Kutuby character illustrations on screen', cap: 'Character illustrations', ar: 960 / 1187 },
    ],
  },
  {
    id: 'umrah',
    date: '2025-11',
    title: 'Makkah,\nthen Madina',
    // Masonry rather than a justified row: a row strands the last photo on a
    // phone with a third of the width empty beside it, and columns have no
    // orphan to strand. Seven of them, so it opens at a peek like Singapore.
    layout: 'masonry',
    collapse: true,
    body: 'One of the greatest blessings of my life was answering the call to Makkah for pilgrimage. Two weeks away from work and the world, a lifetime of memories, and a journey that will stay with me forever.',
    shots: [
      { src: '/about/transit.webp', alt: 'On the flight out', cap: 'In transit', ar: 1800 / 2373 , capTone: 'dark'},
      { src: '/about/mecca.webp', alt: 'The Kaaba at Masjid al-Haram, Makkah', cap: 'Makkah', ar: 1800 / 2225 , capTone: 'dark'},
      { src: '/about/Makkah/Muqam Ibrahim.webp', alt: 'Pilgrims in ihram passing Maqam Ibrahim at the Haram', cap: 'Maqam Ibrahim', ar: 783 / 1125 , capTone: 'dark'},
      { src: '/about/Makkah/Uhud Mount.webp', alt: 'Mount Uhud, outside Madina', cap: 'Mount Uhud', ar: 783 / 1152 , capTone: 'dark'},
      { src: '/about/Makkah/Madina Minaret.webp', alt: 'A minaret of the Prophet’s Mosque, Madina', cap: 'Madina minaret', ar: 783 / 1210 , capTone: 'dark'},
      { src: '/about/madina.webp', alt: 'Arches at the Prophet’s Mosque, Madina', cap: 'Madina', ar: 1800 / 2225 , capTone: 'dark'},
      { src: '/about/Makkah/Islamic History Museum.webp', alt: 'A scale model of the old city at the Islamic history museum', cap: 'Islamic history museum', ar: 783 / 1210 },
    ],
  },
  {
    id: 'singapore',
    date: '2026-07',
    title: '10 days on\nSingapore Island',
    body: 'I had the opportunity to explore Singapore, so I said, why not? From Arab Street and the riverside shophouses to the temples and Marina Bay after dark, it was a reminder that great cities, like great products, are defined by the small details.',
    // Enough photographs that a single justified row would run out of page —
    // masonry lets them stack at their own heights instead, and `collapse` opens
    // it at a peek with an "All photos" control so ten shots don't bury the
    // chapter after it.
    layout: 'masonry',
    collapse: true,
    shots: [
      { src: '/about/Singapore/Selfie.webp', alt: 'Yahaya Muhammad in Singapore', cap: 'Selfie', ar: 743 / 1321 },
      { src: '/about/Singapore/Arab Street Exploration.webp', alt: 'Exploring Arab Street, Singapore', cap: 'Arab Street', ar: 932 / 1657 , capTone: 'dark'},
      { src: '/about/Singapore/Marina Bay Night.webp', alt: 'Marina Bay after dark', cap: 'Marina Bay night',
        // Top third is empty night sky. Cropped shorter and framed low so the
        // height comes out of the black, not off the building.
        ar: 743 / 1020, pos: '50% 85%' },
      { src: '/about/Singapore/India Temple.webp', alt: 'A Hindu temple in Little India, Singapore', cap: 'India temple', ar: 922 / 1639 },
      { src: '/about/Singapore/River Side Shops.webp', alt: 'Shop houses along the river', cap: 'River side shops', ar: 922 / 1639 },
      { src: '/about/Singapore/Marina Bay Trees.webp', alt: 'The Supertrees at Gardens by the Bay', cap: 'Marina Bay trees',
        // Shot straight up, so a fifth of the frame is empty sky and at its true
        // 1107/2623 it towered over every other photo in the column. Cropped
        // shorter and framed low, which takes the height out of the sky rather
        // than off the trees.
        ar: 1107 / 2100, pos: '50% 60%' },
      { src: '/about/Singapore/Temasek Shop House.webp', alt: 'A Temasek shop house', cap: 'Temasek shop house', ar: 1334 / 1321 },
      { src: '/about/Singapore/Marina Shop.webp', alt: 'A shopfront at Marina Bay', cap: 'Marina shop', ar: 944 / 1321 },
      { src: '/about/Singapore/Audi Shop.webp', alt: 'An Audi showroom', cap: 'Audi shop', ar: 967 / 1639 },
      { src: '/about/Singapore/Trip Friends.webp', alt: 'With friends on the trip', cap: 'Trip friends', ar: 1800 / 1694 , capTone: 'dark'},
    ],
  },
]

// The "My approach" grid under the timeline. `icon` is an SVG sticker from
// /public/playground/stickers; `w`/`h` are its viewBox dimensions.
export const APPROACH = [
  {
    icon: '/playground/stickers/Search.svg',
    w: 238,
    h: 224,
    title: 'Start with the problem',
    body: 'I came to design from civil engineering, so I dig into the constraints and root cause before touching a pixel.',
  },
  {
    icon: '/playground/stickers/Pallete.svg',
    w: 284,
    h: 239,
    title: 'Sweat the craft',
    body: 'Clear, human, and joyful. The details are where trust is earned, so I obsess over them.',
  },
  {
    icon: '/playground/stickers/Door.svg',
    w: 259,
    h: 252,
    title: 'Design for outcomes',
    body: 'Design isn’t decoration. I treat it as a lever for retention, conversion, and real business growth.',
  },
  {
    icon: '/playground/stickers/5.svg',
    w: 433,
    h: 360,
    title: 'Learn & give back',
    body: 'I keep learning across design and engineering, and give back by mentoring the designers coming up behind me.',
  },
]
