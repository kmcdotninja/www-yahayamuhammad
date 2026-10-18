// ---------------------------------------------------------------------------
// YahayaLLM — the answer engine behind the Ask panel.
// ---------------------------------------------------------------------------
// One entry point, `askYahaya()`, with two possible engines behind it.
//
//   Local (today).  A small retrieval index over src/lib/yahayaKnowledge.js,
//   built once at module load. No network, no key, no per-question cost, and
//   it cannot invent a fact that isn't in the repo, because every answer is a
//   chunk someone wrote. The trade is that it matches rather than reasons: an
//   unusual phrasing that scores under FLOOR gets the honest fallback instead
//   of a wrong answer.
//
//   Hosted (later).  Set ENDPOINT to a route that proxies the Claude API with
//   the same knowledge as context, and every caller upgrades untouched. The
//   contract both engines honour is the AnswerShape below. Nothing else in the
//   app imports the knowledge base or knows which engine answered, so the swap
//   really is this one constant plus the route.
//
// AnswerShape = {
//   answer:      string        prose to render
//   images:      string[]      optional snippet strip
//   links:       {label,href}[] optional
//   suggestions: string[]      follow-up chips
//   source:      string|null   chunk title, shown as attribution
//   grounded:    boolean       false when it fell back
// }
// ---------------------------------------------------------------------------

import { FALLBACK, KNOWLEDGE } from './yahayaKnowledge.js'

// Flip to '/api/ask' once a serverless route exists. See askRemote().
const ENDPOINT = null

// Words that carry no signal. Kept deliberately short: an aggressive list
// starts eating the words questions are actually made of ("who", "how").
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'of', 'to', 'in', 'on',
  'at', 'by', 'for', 'with', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this',
  'these', 'those', 'it', 'its', 'as', 'from', 'about', 'into', 'over', 'can', 'could',
  'would', 'should', 'do', 'does', 'did', 'have', 'has', 'had', 'me', 'my', 'your', 'you',
  'i', 'we', 'us', 'they', 'them', 'so', 'just', 'any', 'some', 'more', 'most', 'much',
  'tell', 'give', 'say', 'said', 'please', 'know', 'like', 'want', 'get', 'go',
  // Interrogatives. On their own they say nothing about which chunk is meant,
  // and being short and common they used to dominate a two-word question.
  // The phrase pass below still sees them, so "how do you work" is unaffected.
  'who', 'what', 'when', 'where', 'why', 'how', 'which', 'whose', 'whom',
])

// Crude suffix stripping. Good enough to fold design/designs/designing onto one
// stem, which is all the matching needs; a real stemmer would be overkill here.
function stem(word) {
  if (word.length <= 4) return word
  for (const suffix of ['ing', 'ers', 'er', 'ed', 'es', 's']) {
    if (word.length - suffix.length >= 4 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length)
    }
  }
  return word
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    // Curly and straight apostrophes both collapse so "i'm" tokenizes as "im".
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem)
}

// Field weights. Keywords are the hand-picked terms for a chunk, so they say
// the most about intent; the answer body is the noisiest, so it says the least.
const WEIGHT = { keyword: 6, title: 4, body: 1 }

// Build the index once. Each entry holds a term -> weight map plus the raw
// keyword phrases, which are checked separately for whole-phrase hits.
// Repetition must not compound. A keyword list is a set of aliases for the same
// idea, so a term appearing in four of them ("work with", "worked with", "who
// do you work with"...) says no more than appearing in one — before this was
// capped, that stacking let the collaboration chunk outrank "How I work" on the
// question "how do you work". Body text keeps a little frequency signal, capped
// so a long answer can't win on repetition alone.
const BODY_CAP = 3

const INDEX = KNOWLEDGE.map((chunk) => {
  const weights = new Map()
  const bump = (term, weight) => weights.set(term, (weights.get(term) || 0) + weight)

  const keywordTerms = new Set()
  ;(chunk.keywords || []).forEach((k) => tokenize(k).forEach((t) => keywordTerms.add(t)))
  keywordTerms.forEach((t) => bump(t, WEIGHT.keyword))

  new Set(tokenize(chunk.title)).forEach((t) => bump(t, WEIGHT.title))

  const bodyCounts = new Map()
  tokenize(chunk.answer).forEach((t) => bodyCounts.set(t, (bodyCounts.get(t) || 0) + 1))
  bodyCounts.forEach((n, t) => bump(t, Math.min(n, BODY_CAP) * WEIGHT.body))

  return {
    chunk,
    weights,
    titleTerms: new Set(tokenize(chunk.title)),
    phrases: (chunk.keywords || [])
      .map((k) => String(k).toLowerCase())
      .filter((k) => k.includes(' ')),
  }
})

// Inverse document frequency, so a term in one chunk counts for far more than
// one sprayed across twenty. Without this "design" alone matches everything.
const IDF = (() => {
  const docFreq = new Map()
  INDEX.forEach(({ weights }) => {
    weights.forEach((_, term) => docFreq.set(term, (docFreq.get(term) || 0) + 1))
  })
  const total = INDEX.length
  const table = new Map()
  docFreq.forEach((count, term) => table.set(term, Math.log(1 + total / count)))
  return table
})()

// Score floor. Tuned so a real question about the site clears it and small talk
// ("hey", "what's up") does not, landing on the fallback instead of on whatever
// chunk happened to share a word.
const FLOOR = 3.2

function scoreAgainst(entry, terms, phraseText, multiplier, useCoverage) {
  if (terms.length === 0) return 0
  let score = 0
  terms.forEach((term) => {
    const weight = entry.weights.get(term)
    if (weight) score += weight * (IDF.get(term) || 1)
  })
  // A whole keyword phrase appearing verbatim in the question is a strong
  // signal that single-term overlap would under-count.
  entry.phrases.forEach((phrase) => {
    if (phraseText.includes(phrase)) score += 12
  })
  // How much of the chunk's own title the question accounts for. This is what
  // separates two chunks that both legitimately mention a word: "kutuby" is the
  // whole of the title "Kutuby" but a sixth of "Kutuby and building for
  // education again", so the project answers rather than the diary entry.
  if (useCoverage && entry.titleTerms.size > 0) {
    let hit = 0
    entry.titleTerms.forEach((t) => {
      if (terms.includes(t)) hit += 1
    })
    score += (hit / entry.titleTerms.size) * 5
  }
  // Normalise by question length so a long question isn't automatically a
  // higher-scoring one.
  return (score / Math.sqrt(terms.length)) * multiplier
}

// A follow-up this short ("tell me more", "why?") is read as being about the
// previous topic rather than as a question in its own right.
const THIN_QUESTION = 1

function rankAll(question, quote) {
  const qTerms = tokenize(question)
  const qText = String(question || '').toLowerCase()
  const sTerms = tokenize(quote).slice(0, 40)
  const sText = String(quote || '').toLowerCase()

  // The highlighted passage is normally context rather than the question, so it
  // is scored down: it should break a tie, not win outright. The exception is a
  // question that carries no scoreable terms of its own ("what is this?", "what
  // does this mean") — which is exactly what people type after highlighting
  // something. There the selection IS the query, so it is scored at full weight.
  const quoteWeight = qTerms.length === 0 ? 1 : 0.35

  const ranked = INDEX.map((entry) => ({
    entry,
    score:
      scoreAgainst(entry, qTerms, qText, 1, true) +
      // Coverage is a signal about what the question is aiming at, so it is not
      // applied to the selection: a passage that happens to repeat a chunk's
      // title word shouldn't outrank the chunk the passage was lifted from.
      scoreAgainst(entry, sTerms, sText, quoteWeight, false),
  })).sort((a, b) => b.score - a.score)

  return { ranked, qTerms }
}

// A thin follow-up ("tell me more", "and?") carries almost no terms of its own,
// so it is answered as a continuation: the best chunk that shares vocabulary
// with the last answer and is not simply that answer repeated.
function continueFrom(previousId, ranked) {
  const prev = INDEX.find((e) => e.chunk.id === previousId)
  if (!prev) return null
  const related = ranked
    .filter((r) => r.entry.chunk.id !== previousId)
    .map((r) => {
      let shared = 0
      prev.weights.forEach((_, term) => {
        if (r.entry.weights.has(term)) shared += 1
      })
      return { ...r, shared }
    })
    .filter((r) => r.shared >= 3)
    .sort((a, b) => b.shared - a.shared || b.score - a.score)
  return related[0] || null
}

const linksOf = (chunk) =>
  chunk.links || (chunk.href ? [{ label: 'Open', href: chunk.href }] : [])

// Builds the reply from one chunk, or from two when the question asked for two
// things. De-duplicates the follow-ups so a composed answer doesn't offer the
// same chip twice.
function shape(chunks, grounded, fallbackSuggestions) {
  const list = [].concat(chunks)
  const suggestions = [...new Set(list.flatMap((c) => c.suggestions || []))]
  return {
    id: list[0].id,
    // A blank line between the halves: they are two answers, not one paragraph.
    answer: list.map((c) => c.answer).join('\n\n'),
    images: list.flatMap((c) => c.images || []).slice(0, 3),
    links: list.flatMap(linksOf),
    suggestions: (suggestions.length > 0 ? suggestions : fallbackSuggestions || FALLBACK.suggestions).slice(0, 4),
    source: grounded ? list.map((c) => c.title).join(' · ') : null,
    grounded,
  }
}

function askLocal(question, quote, previousId) {
  const { ranked, qTerms } = rankAll(question, quote)
  const top = ranked[0]

  // Short follow-up with a topic already on the table.
  if (qTerms.length <= THIN_QUESTION && previousId && (!top || top.score < FLOOR)) {
    const next = continueFrom(previousId, ranked)
    if (next) return shape(next.entry.chunk, true)
  }

  if (!top || top.score < FLOOR) {
    // Name the nearest topics instead of always offering the same four, so even
    // a miss points somewhere useful.
    const near = ranked
      .filter((r) => r.score > FLOOR * 0.35)
      .slice(0, 3)
      .map((r) => `Tell me about ${r.entry.chunk.title.toLowerCase()}`)
    return shape(FALLBACK, false, near.length > 0 ? near : FALLBACK.suggestions)
  }

  // A question can ask for two things ("what do you use, and who with?"). Any
  // terms the best chunk didn't account for are re-scored on their own: if what
  // is left over clears the floor by itself, it was a second question, and it
  // gets a second answer. Comparing the runner-up against the winner's total
  // would never work here, because a chunk answering the other half of the
  // question only ever matches half the terms.
  // "Covered" has to mean the chunk is actually about that term, not that the
  // word happens to appear in its prose. Without the threshold, the technologies
  // answer saying an interaction "works" counted as covering "who have you
  // worked with", and the second half of the question went unanswered.
  const uncovered = qTerms.filter(
    (t) => (top.entry.weights.get(t) || 0) < WEIGHT.title,
  )
  if (uncovered.length > 0) {
    const leftover = INDEX.map((entry) => ({
      entry,
      score: scoreAgainst(entry, uncovered, String(question).toLowerCase(), 1, true),
    }))
      .filter((r) => r.entry.chunk.id !== top.entry.chunk.id && r.score >= FLOOR)
      .sort((a, b) => b.score - a.score)
    if (leftover[0]) return shape([top.entry.chunk, leftover[0].entry.chunk], true)
  }

  return shape(top.entry.chunk, true)
}

// The hosted path. Deliberately unused until ENDPOINT is set: it is here so the
// contract is visible, and so switching engines is a one-line edit rather than
// a refactor. Any failure falls back to the local engine so the panel always
// answers with something true rather than an error.
async function askRemote(question, quote, previousId) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, quote, previousId }),
    })
    if (!res.ok) throw new Error(`ask failed: ${res.status}`)
    const data = await res.json()
    return {
      answer: data.answer,
      images: data.images || [],
      links: data.links || [],
      suggestions: data.suggestions || FALLBACK.suggestions,
      source: data.source || null,
      grounded: true,
    }
  } catch {
    return askLocal(question, quote, previousId)
  }
}

export async function askYahaya(question, { quote, previousId } = {}) {
  if (!String(question || '').trim()) return shape(FALLBACK, false)
  return ENDPOINT
    ? askRemote(question, quote, previousId)
    : askLocal(question, quote, previousId)
}
