export const projects = [
  {
    name: 'Kutuby',
    description:
      'A learning app that turns Islamic studies for kids 6 to 12 into short, illustrated lessons that feel more like play than school.',
    roles: ['Product Design', 'Art Direction', 'Website Design', 'Interaction Design'],
    team: [
      { name: 'Yahaya Muhammad', role: 'Product Designer' },
      { name: 'Oselu Irabor', role: 'Illustrator' },
      { name: 'Dave Joseph', role: 'Motion' },
      { name: 'Mohammad Ghayen', role: 'Developer' },
    ],
    // Flat array drives the horizontal scroller on the works page.
    images: [
      '/projects/kutuby/mobile-app-1.webp',
      '/projects/kutuby/mobile-app-2.webp',
      '/projects/kutuby/components.webp',
      '/projects/kutuby/logo.png',
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
    name: 'Waffle',
    // Drawer is parked for now — the scroller, info block, and
    // `sections` content below stay so we can flip this back on later.
    comingSoon: true,
    description:
      'A developer platform for shipping AI customer agents in days, not months. I designed Waffle end to end, from the wordmark to the marketing site that gets developers to the docs.',
    roles: ['Brand Identity', 'Web Design', 'Marketing Design', 'Art Direction'],
    team: [
      { name: 'Yahaya Muhammad', role: 'Product Designer' },
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
