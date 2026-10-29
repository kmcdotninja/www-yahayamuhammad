// The Robot's thirty feelings and their poses (robot3d.js renders them). Owned by the pose work: hand targets, head,
// body, sit/lie/kick, which eyes (eyes.js) and which extras each feeling shows. Matched cell by cell to the sheet.
/* ---- the feelings: the sheet's thirty, and the classic figure's names mapped onto them ---- */
export const EMOTIONS = ['neutral', 'happy', 'excited', 'laughing', 'proud', 'confident', 'curious', 'thinking', 'confused', 'surprised',
  'amazed', 'skeptical', 'sad', 'crying', 'worried', 'scared', 'shy', 'embarrassed', 'angry', 'frustrated',
  'determined', 'bored', 'sleepy', 'exhausted', 'loving', 'grateful', 'playful', 'winking', 'celebrating', 'welcoming'];
const ALIAS = { idle: 'neutral', speaking: 'neutral', suprised: 'surprised', dissapointed: 'sad', exicited: 'excited', love: 'loving',
  silly: 'playful', sleep: 'sleepy', cry: 'crying', cool: 'confident', clueless: 'confused', error: 'scared', wink: 'winking',
  laugh: 'laughing', shocked: 'scared', smug: 'skeptical', starstruck: 'amazed', dizzy: 'exhausted', kiss: 'loving', cooldive: 'celebrating' };
export const emotionOf = f => (EMOTIONS.includes(f) ? f : ALIAS[f] || (f === 'peeking' || f === 'peekwave' ? f : null)) || 'neutral';

/* ---- the poses. Body space: x to the viewer's right, y up from the bottom of the body, z toward the viewer. The
   shoulders sit at (±.36, .47, .08); the visor's lower edge at about y .74, z .58 (corners x ±.6); the chin at (0, .7, .58).
   A hand: [x, y, z] where it goes, the way its elbow points, and its shape (fist, thumb, peace).
   Written for the hand on the viewer's left (L); the right (R) mirrors it unless given. ---- */
const H = (t, pole = [-1, -.6, -.5], shape = 'fist') => ({ t, pole, shape });
const mirror = h => ({ t: [-h.t[0], h.t[1], h.t[2]], pole: [-h.pole[0], h.pole[1], h.pole[2]], shape: h.shape });
const HANG = H([-.58, .1, .14]), HIPS = H([-.5, .2, .08], [-1, .1, -.6]), CHEEK = H([-.46, .64, .54], [-1, -1, -.2]),
  CHIN = H([-.24, .6, .6], [-1, -1, .2]), CLASP = H([-.11, .52, .62], [-1, -1, 0]), LOW = H([-.1, .26, .5], [-1, -.4, -.1]),
  FIST = H([-.8, .66, .2], [-.4, -1, -.3]), WAVE = H([-.84, .92, .2], [-.3, -1, -.4]),
  SHRUG = H([-.74, .42, .36], [-.6, -1, -.4]), WIDE = H([-.8, .4, .22], [-.6, -1, -.5]), KNEE = H([-.4, .04, .6], [-1, -.3, 0]);
const P = (eyes, o = {}) => ({ eyes, fx: o.fx || null, L: o.L || HANG, R: o.R || mirror(o.L || HANG), head: o.head || [0, 0, 0],
  body: o.body || [0, 0], sit: o.sit || 0, lie: o.lie || 0, kickL: o.kickL || 0, kickR: o.kickR || 0 });
const m = mirror;
export const POSES = {
  neutral: P('line'),                                                                    // arms easy at the sides
  happy: P('happy', { L: FIST }),                                                        // fists up and out, level with the chin
  excited: P('chevron', { L: H([-.84, .86, .2], [-.4, -1, -.3]), kickR: 1, head: [-.04, 0, .04] }),                      // fists higher, one foot kicked out
  laughing: P('happy', { L: HANG, R: m(WAVE), head: [-.06, .06, .26], body: [0, .06], kickR: 1 }),
  proud: P('line', { L: HIPS }),                                                         // hands on hips
  confident: P('smug', { L: HIPS, R: H([.86, .62, .2], [.4, -1, -.4], 'thumb') }),       // hand on hip, thumbs up
  curious: P('line', { L: HANG, R: H([.32, .61, .6], [1, -1, .1]), head: [0, .12, .22], body: [0, .04] }),   // hand at the chin, head cocked
  thinking: P('line', { L: CHIN, R: m(HIPS), head: [-.04, .04, .1] }),                    // hand at the chin, the other on the hip
  confused: P('line', { L: SHRUG, head: [0, .06, -.26] }),                               // shrug, head cocked the other way
  surprised: P('ring', { L: CHEEK }),                                                    // hands on the cheeks
  amazed: P('star', { fx: 'sparkL', L: CLASP }),                                        // hands together under the chin
  skeptical: P('skeptical', { L: H([.34, .44, .56], [-1, -.2, .4]), R: H([-.34, .4, .6], [1, -.2, .4]), head: [0, .06, .08] }),  // arms crossed
  sad: P('sad', { L: H([-.54, .02, .06]), head: [.14, 0, .04] }),                         // arms limp, head low
  crying: P('cry', { L: H([-.38, .68, .56], [-1, -1, -.2]), head: [.06, 0, 0] }),         // fists at the eyes
  worried: P('worried', { L: H([-.12, .57, .62], [-1, -1, 0]), head: [.06, .06, .1] }),   // hands at the mouth
  scared: P('ringsm', { fx: 'shake', L: H([-.78, .44, .26], [-.6, -1, -.3]), R: H([.5, .66, .52], [1, -1, -.2]), body: [0, .05], head: [0, 0, .08], kickR: 1 }),
  shy: P('dots', { L: LOW, head: [.08, 0, -.08] }),                                      // hands clasped low, looking down
  embarrassed: P('blush', { L: H([-.14, .2, .5], [-1, -.4, -.1]), R: H([.06, .21, .52], [1, -.4, -.1]), head: [.06, -.04, .16] }),
  angry: P('angry', { fx: 'anger', L: WIDE }),                                           // fists out wide
  frustrated: P('chevronline', { fx: 'puff', L: H([-.72, .82, .3], [-.3, -1, -.2]) }),    // fists up by the head
  determined: P('angry', { L: H([-.72, .68, .3], [-.3, -1, -.2]), R: m(H([-.6, .04, .08])) }),   // one fist up
  bored: P('bored', { sit: 1, L: H([-.52, .22, .3], [-1, -.4, -.2]), R: H([.28, .66, .58], [1, -1, .1]), head: [.04, .08, -.12] }),
  sleepy: P('sleepy', { fx: 'zzz', sit: 1, L: KNEE, R: H([.3, .67, .58], [1, -1, .1]), head: [.08, 0, .26] }),
  // flat on its front (robot3d.js lays it down): the head turned to face the viewer, rolled upright and tipped; one paw on the ground
  exhausted: P('bored', { fx: 'swirl', lie: 1, L: H([-.4, .3, .2], [-1, -.4, 0]), R: H([.52, .68, .34], [1, -.6, -.4]), head: [0, 1.5, -1.2] }),
  loving: P('heart', { fx: 'hearts', L: CLASP, head: [-.02, 0, .08], kickR: 1 }),        // hands clasped, a foot kicked up
  grateful: P('happy', { fx: 'sparkR', L: H([-.11, .5, .62], [-1, -1, 0]), head: [.04, 0, .2] }),
  playful: P('playwink', { L: H([-.9, .46, .2], [-.4, -1, -.3]), R: H([.9, .8, .14], [.4, -1, -.3]), head: [0, -.06, .08], body: [0, -.05], kickL: 1 }),
  winking: P('wink', { L: HANG, R: H([.9, .76, .2], [.4, -1, -.4], 'peace') }),
  celebrating: P('chevron', { fx: 'sparkBoth', L: H([-.9, .9, .3], [-.4, -1, -.3]), kickR: 1, body: [0, .04] }),
  welcoming: P('line', { L: HANG, R: m(WAVE), head: [0, .04, .06] }),                    // a wave
  // not on the sheet: peeking over the edge of the screen (Peek.jsx), both paws up on the ledge either side of the head,
  // like a child at a window
  // forearms resting on the ledge, elbows up and back, paws draping forward over the edge (only their tops show)
  peeking: P('dots', { L: H([-.6, .64, .5], [-.4, 1, -.6]), head: [.02, 0, 0], body: [.12, 0] }),
  peekwave: P('happy', { L: H([-.6, .64, .5], [-.4, 1, -.6]), R: H([.74, 1.12, .3], [.6, -1, -.2]), head: [0, 0, -.06], body: [.12, 0] }),
};
// while it listens or thinks with nothing else to show, it looks the part
export const STATE = { listening: 'curious', thinking: 'thinking' };

