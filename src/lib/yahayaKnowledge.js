// ---------------------------------------------------------------------------
// The knowledge YahayaLLM answers from.
// ---------------------------------------------------------------------------
// Everything here is either derived from the data files the site already
// renders (src/data.js, src/data/timeline.js) or written once below as a static
// chunk. Deriving rather than re-typing matters: add a project or a timeline
// chapter and the assistant knows about it on the next build, with no second
// copy of the copy to keep in sync.
//
// A chunk is one answerable thing:
//
//   id          unique; used as the React key and for dedupe
//   title       shown as the source label under an answer
//   keywords    extra terms that should match this chunk, beyond its own words
//   answer      first person, in Yahaya's voice, plain language
//   images      optional; rendered as a snippet strip under the answer
//   href        optional; deep link the answer can offer
//   suggestions optional; follow-up questions offered after this answer
//
// House style for `answer`: no em dashes, no jargon, never claim anything the
// repo doesn't actually support.
// ---------------------------------------------------------------------------

import { projects } from '../data.js'
import { SHOW_PLAYGROUND } from './flags.js'
import { APPROACH, TIMELINE } from '../data/timeline.js'

export const EMAIL = 'yahayabinmuhammad@gmail.com'
export const RESUME_HREF = '/yahaya-muhammad-resume.pdf'

// Joins a list the way a person would say it out loud.
function listify(items) {
  const list = items.filter(Boolean)
  if (list.length === 0) return ''
  if (list.length === 1) return list[0]
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

// Timeline titles carry authored line breaks for the display face; they read as
// one line everywhere else.
const flatten = (s) => String(s || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

// Strips the markdown links out of LEDE-style copy so the assistant speaks the
// words without printing the URL syntax.
const unlink = (s) => String(s || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

// ---------------------------------------------------------------------------
// Derived: one chunk per project, plus one per case-study section.
// ---------------------------------------------------------------------------
function projectChunks() {
  const chunks = []

  projects.forEach((p) => {
    const roles = listify(p.roles || [])
    const team = (p.team || []).map((t) => `${t.name} (${t.role})`)
    const status = p.comingSoon
      ? `The full case study is still being written up, so on the site it shows as ${(p.statusLabel || 'Coming Soon').toLowerCase()}.`
      : 'You can open the full case study from the work section on the home page.'

    chunks.push({
      id: `project-${p.name.toLowerCase()}`,
      title: p.name,
      keywords: [p.name, 'project', 'case study', 'work', ...(p.roles || [])],
      answer: [
        p.description,
        roles && `My role covered ${roles}.`,
        team.length > 0 && `I built it with ${listify(team)}.`,
        status,
      ]
        .filter(Boolean)
        .join(' '),
      images: (p.images || []).slice(0, 3),
      suggestions: [
        ...(p.sections || []).slice(0, 2).map((s) => `${p.name}: the ${s.heading.toLowerCase()} work`),
        'What else have you built?',
      ],
    })

    ;(p.sections || []).forEach((s) => {
      chunks.push({
        id: `project-${p.name.toLowerCase()}-${s.heading.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${p.name}, ${s.heading.toLowerCase()}`,
        keywords: [p.name, s.heading, 'case study', 'process'],
        answer: s.note,
        images: (s.images || []).slice(0, 3),
        suggestions: [`Tell me more about ${p.name}`, 'What else have you built?'],
      })
    })
  })

  return chunks
}

// ---------------------------------------------------------------------------
// Derived: one chunk per timeline chapter.
// ---------------------------------------------------------------------------
function timelineChunks() {
  return TIMELINE.map((c) => ({
    id: `timeline-${c.id}`,
    title: flatten(c.title),
    // Not the title: the index already weights that field, and listing it here
    // too double-counted every word in it, which let a diary entry outrank the
    // project of the same name.
    keywords: ['story', 'background', 'journey', c.id.replace(/-/g, ' ')],
    answer: c.body,
    images: (c.shots || []).slice(0, 3).map((s) => s.src),
    href: `/about#${c.id}`,
    suggestions: ['How did you get into design?', 'What are you working on now?'],
  }))
}

// ---------------------------------------------------------------------------
// Written by hand: the things no data file holds.
// ---------------------------------------------------------------------------
const STATIC_CHUNKS = [
  {
    id: 'who',
    title: 'About Yahaya',
    keywords: [
      'who', 'you', 'yahaya', 'yourself', 'about', 'introduce', 'bio', 'hello', 'hi',
      'designer', 'engineer', 'what do you do', 'summary',
    ],
    answer:
      'I’m Yahaya Muhammad, a product designer who engineers. I design digital products and then build a good part of them, which means I can take an idea from the first sketch through to something running in a browser. ' +
      unlink(
        'I’ve designed products across education, healthcare, fintech, retail, and enterprise, taking ideas from research to production. Education is the thread I keep coming back to, from YodaBox’s learning products for kids to the learning app I design today. I also lead and mentor designers at Friends of Figma Kano.',
      ) +
      ' Right now I’m designing at Kutuby.',
    suggestions: [
      'What are you working on now?',
      'How did you get into design?',
      'What have you built?',
    ],
  },
  {
    id: 'now',
    title: 'What I’m working on',
    keywords: ['now', 'currently', 'today', 'these days', 'working on', 'kutuby', 'current', 'job', 'role'],
    answer:
      'I’m currently designing at Kutuby, a learning app that turns Islamic studies for kids aged 4 to 10 into short, illustrated lessons that feel more like play than school. I’ve worked on the brand, the characters, the mobile app, and the design system the team ships new lesson types on. I’m also writing up Rednoxx, a healthcare platform I designed end to end.',
    suggestions: ['Tell me more about Kutuby', 'What else have you built?'],
  },
  {
    id: 'work-index',
    title: 'The work',
    // The multi-word entries are phrase keywords: the engine gives a big bonus
    // when one appears verbatim, which is what keeps "what have you built" here
    // rather than on the chunk about this website.
    keywords: [
      'work', 'projects', 'portfolio', 'built', 'case studies', 'everything', 'list',
      'what have you made', 'have you built', 'show me your work', 'your projects',
    ],
    answer: `The site has ${
      ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][projects.length] || projects.length
    } projects on it: ${listify(
      projects.map((p) => p.name),
    )}. Kiko and Kutuby open their websites, trykiko.app and kutuby.com. Rednoxx opens its live design system. Groq is up as a teaser for now while I finish writing it. Ask me about any of them by name and I’ll tell you what I did.`,
    suggestions: projects.slice(0, 3).map((p) => `Tell me about ${p.name}`),
  },
  {
    id: 'approach',
    title: 'How I work',
    keywords: ['approach', 'process', 'how do you work', 'philosophy', 'principles', 'method', 'thinking'],
    answer: `Four things guide how I work. ${APPROACH.map(
      (a) => `${a.title}: ${a.body}`,
    ).join(' ')}`,
    suggestions: ['How did you get into design?', 'What tools do you use?'],
  },
  {
    id: 'origin',
    title: 'From civil engineering to design',
    keywords: [
      'how did you start', 'get into design', 'background', 'civil', 'engineering', 'career',
      'switch', 'transition', 'before', 'studied', 'university',
    ],
    answer:
      'I trained as a civil engineer. YodaBox gave me my first real chance as a designer back in 2020, and engineering turned out to be good preparation: it taught me to understand the problem before reaching for a solution. That habit is still the thing I lean on most. From there I spent a few years designing healthcare products, and now I’m back to designing for learning at Kutuby.',
    suggestions: ['What have you built?', 'How do you work?'],
  },
  {
    id: 'engineering',
    title: 'The engineering side',
    keywords: [
      'code', 'coding', 'engineer', 'engineering', 'build', 'developer', 'front end',
      'frontend', 'technical', 'programming', 'do you code', 'can you code',
      'design and code', 'both',
    ],
    answer:
      'I design and I build. Day to day that means Figma for design and React for the front end. This site is one of the honest examples: it’s a React and Vite app I designed and coded myself, with GSAP and Lenis driving the scroll work, Framer Motion on the reveals, and a hand-rolled physics solver behind the stickers on the home page. Being able to build means I can prototype the thing rather than describe it.',
    suggestions: ['How do you work?', 'What have you built?'],
  },
  {
    id: 'technologies',
    title: 'Tools and technologies',
    keywords: [
      'tools', 'tool', 'technologies', 'technology', 'tech', 'stack', 'tech stack',
      'software', 'apps', 'framework', 'frameworks', 'library', 'libraries',
      'language', 'languages', 'what do you use', 'what tools', 'built with',
      'figma', 'react', 'vite', 'gsap', 'lenis', 'javascript', 'css', 'html',
      'prototyping', 'design tools',
    ],
    answer:
      'On the design side I live in Figma: that is where the interfaces, the design systems and the prototypes get made, and it is what I hand over to engineers. On the build side it is React and TypeScript-flavoured JavaScript with plain CSS, which is enough to turn most designs into something real. For motion I reach for GSAP when the animation is tied to scroll and Framer Motion when it belongs to a component. Lenis handles smooth scrolling. I deploy on Vercel. Away from the screen I prototype in code rather than in slides, because the fastest way to know whether an interaction works is to use it.',
    suggestions: [
      'What is this website built with?',
      'Do you write code as well as design?',
      'How do you work?',
    ],
  },
  {
    id: 'skills',
    title: 'What I do',
    keywords: [
      'skills', 'skill', 'services', 'disciplines', 'expertise', 'specialise',
      'specialize', 'good at', 'strengths', 'offer', 'capabilities', 'do you do',
      'product design', 'interaction design', 'brand', 'art direction', 'accessibility',
      'ux', 'ui', 'research',
    ],
    answer: `The work splits into a few things. Product design is the core: research, flows, interface design and the prototypes that prove them. Around that I do design systems, interaction and motion design, brand and art direction, and accessibility. I also build front end, which means I can carry a design past the handoff. Across the projects on this site that has looked like ${listify(
      [...new Set(projects.flatMap((p) => p.roles || []))].map((r) => r.toLowerCase()),
    )}.`,
    suggestions: ['What tools do you use?', 'How do you work?', 'What have you built?'],
  },
  {
    id: 'design-systems',
    title: 'Design systems',
    keywords: [
      'design system', 'design systems', 'components', 'component library',
      'tokens', 'foundations', 'pattern library', 'consistency', 'scale',
    ],
    answer:
      'Design systems are a big part of how I work. For Rednoxx I built one from the foundations up: colour and type tokens, 36 components and 30 healthcare-specific blocks, then validated the whole thing across a 50 screen product demo so it was proven rather than theoretical. At Kutuby I built the system the team still ships new lesson types on. A system earns its keep when other people can build with it without asking me anything, so that is the bar I hold them to.',
    suggestions: ['Tell me about Rednoxx', 'Tell me about Kutuby', 'What tools do you use?'],
  },
  {
    id: 'industries',
    title: 'Industries I have worked in',
    keywords: [
      'industries', 'industry', 'sectors', 'domains', 'verticals', 'experience in',
      'healthcare', 'fintech', 'finance', 'crypto', 'retail', 'enterprise',
      'education', 'edtech', 'learning', 'kids',
    ],
    answer:
      'Healthcare, fintech, retail, enterprise and education. Healthcare is the deepest: a few years designing products that help clinicians care for patients, from hospital systems to vaccination platforms, and most recently the Rednoxx platform end to end. Education is the one I keep coming back to, first at YodaBox and now at Kutuby. Groq covered crypto payments. Different rules in each, but the job is the same: understand the constraints, then make the complicated part feel simple.',
    suggestions: ['Tell me about Rednoxx', 'What have you built?', 'How did you get into design?'],
  },
  {
    id: 'collaboration',
    title: 'Working with teams',
    keywords: [
      'team', 'teams', 'collaborate', 'collaboration', 'work with others',
      'engineers', 'developers', 'illustrator', 'stakeholders', 'handoff',
      'who do you work with', 'worked with', 'who have you worked with',
      'remote', 'process with engineers',
    ],
    answer: `Most of the work here was made with other people. Across the projects on this site that is ${
      new Set(projects.flatMap((p) => (p.team || []).map((t) => t.name))).size
    } collaborators: engineers, illustrators, motion designers, product managers and founders. I am used to being the designer sitting closest to engineering, partly because I build too, so handoff tends to be a conversation rather than a document. Ask me about any project and I will tell you who did what.`,
    suggestions: ['What have you built?', 'Do you write code as well as design?'],
  },
  {
    id: 'hiring',
    title: 'Working together',
    keywords: [
      'hire', 'hiring', 'available', 'availability', 'freelance', 'contract',
      'consulting', 'open to', 'looking for', 'job', 'opportunity', 'rates',
      'work together', 'commission', 'project',
    ],
    answer: `I am currently designing at Kutuby. If you have something you would like to talk about, the best thing is to email me at ${EMAIL} and say what you are building. My resume is in the header if you want the background first, and the projects on this site are the clearest picture of the kind of work I take on.`,
    links: [
      { label: 'Email', href: `mailto:${EMAIL}` },
      { label: 'Resume', href: RESUME_HREF },
    ],
    suggestions: ['What have you built?', 'What do you do?'],
  },
  {
    id: 'mentoring',
    title: 'Mentoring',
    keywords: ['mentor', 'mentoring', 'teach', 'community', 'figma', 'friends of figma', 'kano', 'give back', 'speaking'],
    answer:
      'I lead and mentor designers at Friends of Figma Kano. Giving back matters to me. I keep learning across design and engineering, and helping the designers coming up behind me is part of how I do that.',
    href: 'https://friends.figma.com/kano/',
    suggestions: ['How do you work?', 'How can I reach you?'],
  },
  {
    id: 'contact',
    title: 'Getting in touch',
    keywords: [
      'contact', 'email', 'reach', 'hire', 'work together', 'available', 'freelance',
      'social', 'twitter', 'linkedin', 'github', 'instagram', 'links', 'dm', 'message',
    ],
    answer: `The fastest way is email: ${EMAIL}. You can also find me on LinkedIn, GitHub, X and Instagram, all linked in the footer of the site. If you want the short version of my background first, my resume is one click away in the header.`,
    links: [
      { label: 'Email', href: `mailto:${EMAIL}` },
      { label: 'Resume', href: RESUME_HREF },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yahyabinmuhammad/' },
      { label: 'GitHub', href: 'https://github.com/kmcdotninja' },
      { label: 'X', href: 'https://x.com/kmcdotninja' },
      { label: 'Instagram', href: 'https://www.instagram.com/kmcdotninja' },
    ],
    suggestions: ['What are you working on now?', 'What have you built?'],
  },
  {
    id: 'resume',
    title: 'Resume',
    keywords: ['resume', 'cv', 'experience', 'download', 'pdf', 'hire', 'history'],
    answer:
      'My resume is in the header of the site, under Resume, and it opens in a new tab. It covers the roles behind the work here: civil engineering first, then YodaBox, then a few years of healthcare product design, and now Kutuby.',
    links: [{ label: 'Open resume', href: RESUME_HREF }],
    suggestions: ['How did you get into design?', 'How can I reach you?'],
  },
  {
    id: 'site',
    title: 'This site',
    keywords: [
      'site', 'website', 'portfolio site', 'playground', 'design system', 'tech stack',
      'this page', 'this site', 'this website', 'made this', 'built this', 'built with',
    ],
    answer:
      `I designed and built this site myself. It’s React and Vite, with Jaro for the display type and BDO Grotesk for everything else. ${SHOW_PLAYGROUND ? 'The playground page is where I keep the smaller interaction experiments, and the' : 'The'} about page runs as a scrolling timeline rather than a résumé list. The stickers on the home page are a hand-rolled physics solver, and yes, you can throw them.`,
    href: SHOW_PLAYGROUND ? '/playground' : '/about',
    suggestions: ['What have you built?', 'What tools do you use?'],
  },
]

export const KNOWLEDGE = [
  ...STATIC_CHUNKS,
  ...projectChunks(),
  ...timelineChunks(),
]

// Opening line and the chips offered before anything has been asked.
export const GREETING =
  'Ask me anything about Yahaya: the projects, how he works, how he got here, or how to reach him. I answer from what is actually on this site, so if something is not here I will say so.'

export const STARTERS = [
  'Who is Yahaya?',
  'What are you working on now?',
  'Tell me about Kutuby',
  'How can I reach you?',
]

// Used when nothing scores above the confidence floor.
export const FALLBACK = {
  id: 'fallback',
  title: 'Not on the site',
  answer:
    'I don’t have that on the site, so I won’t guess. I can tell you about the projects (Kiko, Kutuby, Rednoxx and Groq), how Yahaya works, how he went from civil engineering to design, the story behind this site, or how to get in touch.',
  suggestions: STARTERS,
}
