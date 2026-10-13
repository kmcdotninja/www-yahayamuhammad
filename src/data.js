export const projects = [
  {
    name: 'Kiko',
    // A side project, not client work: the third info block reads "Side
    // project" (from `kind`) with the `solo` line in place of a team list.
    // Case study parked for now (same pattern as Groq/Waffle): the card shows
    // the strip + info but the drawer stays closed. Remove `comingSoon` to
    // take the written-up `sections` below live.
    comingSoon: true,
    // the written case study is still parked, but the card opens the live story of how Kiko was made
    link: 'https://trykiko.app/making-of-kiko',
    linkLabel: 'The making of Kiko',
    kind: 'Side project',
    solo: 'Solo. Created, designed and built end to end in 2026 as a web app (PWA). Currently on version 1.6.',
    description:
      'A playful Arabic letters and numbers app for Muslim children aged 4 to 7. Kiko, a little character with its own voice, guides every step, because the children using it cannot read yet.',
    roles: ['Product Design', 'Character & Brand', 'Front-End Engineering', 'Voice & Sound Design'],
    team: [],
    // Flat array drives the masonry on the works page. Strings are images;
    // `{ phone, caption }` is a phone mockup built in code (PhoneTile) with a
    // silent looping recording of the real v1.6 app (or a still) on its
    // screen; `{ video }` is a plain looping clip. See ProjectMedia.jsx.
    // The masonry, each tile at its natural height (`aspect` sets a code-built
    // card's shape: the peekaboos square, the app icon short). The iPad is
    // `wide`: on desktop it opens the grid spanning two columns beside the
    // tile after it (Works2.jsx segmentsOf); the masonry follows below.
    // `{ phone }` / `{ tablet }`: device mockups in code with looping
    // recordings; `{ snippet }`: Kiko's animated cards (components/kiko).
    // Captions are kept here but hidden for now (ProjectMedia SHOW_CAPTIONS).
    images: [
      { snippet: 'peekaboo' },
      { phone: '/video/kiko/game-time.mp4', caption: 'Game Time' },
      { snippet: 'kiko-talks', caption: 'Kiko talks' },
      { snippet: 'new-in-kiko', caption: 'New in Kiko' },
      { phone: '/video/kiko/kikos-look.mp4', caption: "Kiko's look" },
      { snippet: 'child', caption: 'Every child, their own Kiko' },
      { phone: '/video/kiko/tracing.mp4', caption: 'Tracing' },
      { tablet: '/video/kiko/ipad-catch-levelup.mp4', caption: 'The Catch game · Level up', wide: true },
      { snippet: 'icon', ratio: '5 / 4' },
      { phone: '/video/kiko/story-time.mp4', caption: 'Story Time' },
      { image: '/projects/kiko/post-meet.webp', width: 1800, height: 2250 },
      { phone: '/projects/kiko/screens/meet-kiko.webp', caption: 'Meet Kiko' },
      { tablet: '/video/kiko/ipad-journey.mp4', caption: 'The journey', wide: true },
      { phone: '/video/kiko/runner.mp4', caption: 'Game Time · Runner' },
      { phone: '/video/kiko/kiko-alive.mp4', caption: 'Kiko, alive' },
      { snippet: 'peekaboo-light' },
      { phone: '/projects/kiko/screens/parent-lounge.webp', caption: 'Parent lounge' },
    ],
    sections: [
      {
        heading: 'The problem',
        note:
          'The children Kiko is for cannot read yet, and most learning apps still lean on written instructions. A four year old ends up tapping at random or waiting for a grown-up. So I set one rule before drawing anything: the whole app has to work without reading. Kiko\'s recorded voice, sounds and haptics carry every instruction, every tap gets an answer, and a wrong move never gets a silent no. Kiko says why and shows the way.',
        images: [
          { phone: '/projects/kiko/screens/meet-kiko.webp', caption: 'Meet Kiko' },
          { phone: '/video/kiko/kiko-alive.mp4', caption: 'Kiko, alive' },
        ],
      },
      {
        heading: 'Kiko',
        note:
          'Kiko is the guide, the logo and the friend in one. I drew its expressions as SVGs and built them into a single living character: 27 faces, a set of moves, 12 colourways and accessories, with its mouth moving in sync with every line it says. Around it sits a full brand: the mark and lockup, SF Pro Rounded, one cyan accent on a dark and quiet app, an illustration set and its own sounds.',
        images: [
          { snippet: 'peekaboo' },
          { snippet: 'icon' },
        ],
      },
      {
        heading: 'Tracing and Game Time',
        note:
          'Home is one path with one next step. Each Arabic letter and number is traced with a finger from a green start dot, with a pencil sound under it and Kiko cheering when it lands. After every three letters comes Game Time: Pop, Catcher, Fit it and Runner, four games that replay the letters just learned, so practice feels like a reward rather than a test.',
        images: [
          { phone: '/video/kiko/tracing.mp4', caption: 'Tracing' },
          { phone: '/video/kiko/game-time.mp4', caption: 'Game Time' },
        ],
      },
      {
        heading: 'Stories',
        note:
          'Every level ends with a short narrated film about one of the Prophets, told for little ears. The Prophets are never drawn. Their stories are carried by words and respectful symbols, like the Kaaba or Suleiman\'s crown, and Kiko tells the story without ever playing a part in it. Only the page in front speaks, so a film never talks over anything else.',
        images: [
          { phone: '/video/kiko/story-time.mp4', caption: 'Story Time' },
        ],
      },
      {
        heading: 'Kiko\'s look and the Parent lounge',
        note:
          'Coins earned while learning buy Kiko new colours and glasses, and whatever a child picks, Kiko wears everywhere in the app. Behind a grown-ups\' code sits the Parent lounge: progress for each child, printable worksheets and screen time, with several children sharing one device.',
        images: [
          { phone: '/video/kiko/kikos-look.mp4', caption: "Kiko's look" },
          { phone: '/projects/kiko/screens/parent-lounge.webp', caption: 'Parent lounge' },
        ],
      },
      {
        heading: 'Voice, QA and launch',
        note:
          'Kiko has one recorded voice (Gemini Live, voice Sulafat), made through a pipeline I built for it: record every line, check it, pick the best take. Each release goes through device QA on iPhone and Android before it ships. Version 1.6 added Stories, Game Time, Kiko\'s look and the Parent lounge, and went out with this launch film and a set of release posts.',
        images: [
          { video: '/video/kiko-launch.mp4', width: 720, height: 900 },
          { snippet: 'new-in-kiko' },
        ],
      },
    ],
  },
  {
    name: 'Kutuby',
    description:
      'A learning app that turns Islamic studies for kids, age 4 to 10 into short, illustrated lessons that feel more like play than school.',
    roles: ['Product Design', 'Art Direction', 'Website Design', 'Interaction Design'],
    team: [
      { name: 'Oselu Irabor', role: 'Illustrator' },
      { name: 'David Odinegun', role: 'Motion Designer' },
      { name: 'Mohammad Ghayen', role: 'Mobile Engineer' },
      { name: 'Surafel Haimanot', role: 'Fulltack Engineer' },
      { name: 'Yaseer Ahmed', role: 'CEO & Product Lead' },
    ],
    // Flat array drives the horizontal scroller on the works page.
    images: [
      '/projects/kutuby/logo.png',
      '/projects/kutuby/mobile-app-1.webp',
      '/projects/kutuby/mobile-app-2.webp',
      '/projects/kutuby/components.webp',
      '/projects/kutuby/type-2.webp',
      '/projects/kutuby/type-2-1.png',
      '/projects/kutuby/type-1.png',
      '/projects/kutuby/color-1.png',
      '/projects/kutuby/characters.png',
      '/projects/kutuby/character-bear.png',
      '/projects/kutuby/character-bird.png',
      '/projects/kutuby/character-cat.png',
      '/projects/kutuby/character-elephant.png',
      '/projects/kutuby/character-stickers.webp',
      '/projects/kutuby/website.webp',
      '/projects/kutuby/website-2.webp',
      '/projects/kutuby/website-3.webp',
      '/projects/kutuby/website-4.png',
    ],
    // Grouped sections drive the drawer layout (headings + per-section copy).
    sections: [
      {
        heading: 'Brand',
        note:
          'I started with one question. What does a brand for Muslim kids look like when the category leans either too serious or too generic. Electric Violet became the anchor: joyful at a glance, grounded enough to carry the rigour underneath. Around it I built a typographic kit and a sticker system that let the same voice travel from a tiny app icon to a school hallway banner.',
        images: [
          '/projects/kutuby/logo.png',
          '/projects/kutuby/type-2.webp',
          '/projects/kutuby/type-2-1.png',
          '/projects/kutuby/type-1.png',
          '/projects/kutuby/color-1.png',
        ],
      },
      {
        heading: 'Character',
        note:
          'Characters carry most of the emotional weight in the product, so I spent the time getting them right. Working with our illustrator Oselu, I shaped four guides: Amira, Waleed, Azeez, and Hakeem. Each one is readable by silhouette alone, so a six year old can pick a favourite from the lock screen before they can read the name. Choosing one is the first act of agency in the app, and it sets the tone for everything that follows.',
        images: [
          '/projects/kutuby/characters.png',
          '/projects/kutuby/character-bear.png',
          '/projects/kutuby/character-bird.png',
          '/projects/kutuby/character-cat.png',
          '/projects/kutuby/character-elephant.png',
          '/projects/kutuby/character-stickers.webp',
        ],
      },
      {
        heading: 'Mobile app',
        note:
          'I designed for two very different users at once. A six year old who needs space and softness, and an eleven year old ready for density. The interface runs on a one screen a day rhythm: open, finish a lesson, see your streak, leave feeling good. Inside lessons the character narrates and asks for one action at a time, so reading ability is never the blocker. I also built the design system the team builds new lesson types on today.',
        images: [
          '/projects/kutuby/mobile-app-1.webp',
          '/projects/kutuby/mobile-app-2.webp',
          '/projects/kutuby/components.webp',
        ],
      },
      {
        heading: 'Website',
        note:
          'The marketing site has one job. Convince a parent to download. I designed the hero to do the heaviest lifting with the fewest words: a clear promise, the store badges right under it, everything else one click away. The brand world shows up at full saturation across every page, so the leap from website to first app open feels seamless.',
        images: [
          '/projects/kutuby/website.webp',
          '/projects/kutuby/website-2.webp',
          '/projects/kutuby/website-3.webp',
          '/projects/kutuby/website-4.png',
        ],
      },
    ],
  },
  {
    name: 'Rednoxx',
    // Parked as a teaser (same pattern as Groq/Waffle) — the card shows the
    // board + info but the drawer stays closed. Flip `comingSoon` off and add a
    // `sections` array to take it fully live.
    comingSoon: true,
    // This one is actively being written up, so its ribbon and hover pill
    // read "Currently Building" instead of the default "Coming Soon".
    statusLabel: 'Currently Building',
    description:
      'Rednoxx is a healthcare platform for enrolments, payments, insurance, consultations, prescriptions, labs, surgery, and reporting. Built on a design system with foundations, 36 components, and 30 healthcare blocks, validated across a 50 screen product demo.',
    roles: ['Product Design', 'Design System Engineer', 'Interaction Design', 'Accessibility'],
    team: [
      { name: 'Jamil Galadanchi', role: 'Project Lead' },
      { name: 'Ibrahim Muhammad', role: 'Product Manager' },
      { name: 'Abdulrahman Muhammad', role: 'Lead Engineer' },
      { name: 'Abdulmalik Muhammad', role: 'Lead Frontend Engineer' },
      { name: 'Kareema Imam', role: 'Frontend Engineer' },
    ],
    // Order is tuned for the masonry, not for reading: the two tall panels (the
    // registration slip and the discharge summary) are pushed into separate
    // columns and the short ones spread around them. Grouping them by topic
    // instead stacked both giants in one column, which left the middle column
    // ~300px short and opened a dead gap under it.
    images: [
      '/projects/Rednoxx/Reg%20Slip.webp',
      '/projects/Rednoxx/Rednoxx%20Logo.webp',
      '/projects/Rednoxx/Foundations.webp',
      '/projects/Rednoxx/Table.webp',
      '/projects/Rednoxx/Empty%20State%201.webp',
      '/projects/Rednoxx/Button.webp',
      '/projects/Rednoxx/Color%20Token.webp',
      '/projects/Rednoxx/Components.webp',
      '/projects/Rednoxx/Drawer.webp',
      '/projects/Rednoxx/Discharge%20summary.webp',
      '/projects/Rednoxx/No%20duplicate%20candidates.webp',
      '/projects/Rednoxx/Badge.webp',
    ],
  },
  {
    name: 'Groq',
    // Parked as a teaser for now (same pattern as Waffle) — the card shows the
    // image strip + info but the drawer stays closed. Flip `comingSoon` off and
    // add a `sections` array to take it fully live.
    comingSoon: true,
    description:
      'Groq is a crypto payment platform designed to help freelancers and businesses seamlessly receive and spend cryptocurrency.',
    roles: ['Brand Design', 'Product Design', 'Product Strategy', 'Illustration & Icon Design'],
    team: [
      { name: 'Saidu Bello', role: 'Backend Developer' },
      { name: 'Moses Chimaso', role: 'Frontend Developer' },
    ],
    // Flat array drives the horizontal scroller on the works page.
    images: [
      '/projects/Groq/1.png',
      '/projects/Groq/2.png',
      '/projects/Groq/3.png',
      '/projects/Groq/4.png',
      '/projects/Groq/5.png',
      '/projects/Groq/6.png',
      '/projects/Groq/7.png',
      '/projects/Groq/8.png',
      '/projects/Groq/9.png',
      '/projects/Groq/10.png',
      '/projects/Groq/11.png',
      '/projects/Groq/12.png',
    ],
  },
  {
    name: 'Waffle',
    // Drawer is parked for now — the scroller, info block, and
    // `sections` content below stay so we can flip this back on later.
    comingSoon: true,
    description:
      'A developer platform for shipping AI customer agents in days, not months. I designed Waffle end to end, from the wordmark to the marketing site that gets developers to the docs.',
    roles: ['Brand Identity', 'Web Design', 'Marketing Design', 'Art Direction'],
    team: [
      { name: 'Sarah Chen', role: 'Frontend Engineer' },
    ],
    images: [
      '/projects/waffle/logo.webp',
      '/projects/waffle/header.png',
      '/projects/waffle/hero-images.webp',
      '/projects/waffle/features-1.webp',
      '/projects/waffle/features-2.png',
      '/projects/waffle/features-3.webp',
      '/projects/waffle/cta.webp',
      '/projects/waffle/cta-1.webp',
    ],
    sections: [
      {
        heading: 'Brand',
        note:
          'The AI-tools category is crowded with the same gradient-on-dark-mode look, so I pulled Waffle in the opposite direction. A confident serif wordmark, a deep electric blue, and an off-white that carries warmth. The bug uses a small tilted square so the mark always has a little motion built in. Brand assets are designed to read at the size of a favicon and the size of a billboard without losing themselves.',
        images: ['/projects/waffle/logo.webp'],
      },
      {
        heading: 'Hero',
        note:
          'The homepage carries the whole pitch in one scroll. I led with a confident promise, "Build, deploy, and scale AI customer agents", and backed it with one piece of real social proof: a 3-day launch story from an actual customer. The hero composition layers a chat bubble, a portrait, and a metric so a developer scanning the page picks up product, user, and proof in a single beat.',
        images: ['/projects/waffle/hero-images.webp'],
      },
      {
        heading: 'Features',
        note:
          'Developer-tools pages tend to read as feature checklists, which is boring to look at and forgettable to read. I built each feature block around a hand-rendered halftone visual so the page has texture, then let the words stay short and confident underneath. Two layouts trade off through the scroll: a calm cream presentation for the foundational APIs, and a louder wavy version that turns the same content into a moment.',
        images: [
          '/projects/waffle/features-1.webp',
          '/projects/waffle/features-2.png',
          '/projects/waffle/features-3.webp',
        ],
      },
      {
        heading: 'Call to action',
        note:
          'The final CTA is the moment that decides whether a developer opens the docs or closes the tab, so I designed two versions of it. A calm one with a halftone mountain that feels like the end of a long landing, and a loud one that reuses the wavy hero motif at full saturation. Same words, same button, two emotional registers.',
        images: [
          '/projects/waffle/cta.webp',
          '/projects/waffle/cta-1.webp',
        ],
      },
    ],
  },
]
