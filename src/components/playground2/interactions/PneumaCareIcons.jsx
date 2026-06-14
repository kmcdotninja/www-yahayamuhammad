import { useState } from 'react'
import { motion } from 'framer-motion'
import './PneumaCareIcons.css'
import { useReducedMotion } from '../../../hooks/useReducedMotion.js'

/* PneumaCare icon set, brought to life. Each icon keeps its original artwork
   verbatim and only animates the element that carries its meaning — the heart
   beats, the dumbbell curls, the chat dots ripple like a typing indicator, the
   clock hands hinge from the dial centre, the check stamps itself. Techniques
   used: a staggered spring entrance, per-element transform loops
   (scale/rotate/translate driven declaratively so they pause cleanly
   off-screen), correct fill-box transform origins, and a hover lift. Everything
   stops under reduced motion. */

// The accent is painted with `currentColor`, so setting the container's CSS
// `color` from state recolours every blue element at once.
const ACCENT = 'currentColor'

// Swatches for the colour control (rendered in the Apple-Carousel pill). Blue
// is first, so it's the default accent (see the `accent` state below).
const PALETTE = [
  { name: 'Blue', value: '#00AAF9' },
  { name: 'Green', value: '#2FD24F' },
  { name: 'Pink', value: '#FF2EA6' },
  { name: 'Orange', value: '#FFA31A' },
  { name: 'Purple', value: '#8B3DF2' },
  { name: 'Red', value: '#FA2A2A' },
]

// Container/tile variants — a soft spring pop, rippling left-to-right.
const GRID = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
}
const TILE = {
  hidden: { opacity: 0, scale: 0.55, y: 12 },
  shown: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 440, damping: 24 },
  },
}

// Transition every loop falls back to when `playing` flips false (off-screen
// or reduced motion), so motion always parks gracefully at its rest pose.
const REST = { duration: 0.35 }

// 1 — Video: the play head pulses like a heartbeat of "now playing".
function VideoIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <g clipPath="url(#li-video)">
        <rect x="18.667" y="38.6641" width="26.6667" height="13.3333" fill={ACCENT} />
        <rect x="10.667" y="9.33203" width="42.6667" height="34.6667" fill="white" />
        <motion.path
          d="M41.333 27.332L26.333 35.9923L26.333 18.6718L41.333 27.332Z"
          fill={ACCENT}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          animate={playing ? { scale: [1, 1.16, 1, 1] } : { scale: 1 }}
          transition={playing ? { duration: 1.6, times: [0, 0.18, 0.42, 1], repeat: Infinity, ease: 'easeInOut' } : REST}
        />
      </g>
      <defs>
        <clipPath id="li-video">
          <rect width="64" height="64" rx="7.35591" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

// 2 — Dumbbell: a slow bicep curl, rotating about the icon centre.
function DumbbellIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={playing ? { rotate: [0, -11, 0, 0] } : { rotate: 0 }}
        transition={playing ? { duration: 2, times: [0, 0.32, 0.62, 1], repeat: Infinity, ease: 'easeInOut' } : REST}
      >
        <rect x="28.0088" y="45.0781" width="13.0338" height="24.6193" transform="rotate(-127.812 28.0088 45.0781)" fill="white" />
        <rect x="49.7656" y="11.6953" width="5.71699" height="11.434" transform="rotate(-37.812 49.7656 11.6953)" fill="white" />
        <rect x="4" y="47.2109" width="5.71699" height="11.434" transform="rotate(-37.812 4 47.2109)" fill="white" />
        <rect x="5.52734" y="36.8594" width="13.0338" height="26.6793" transform="rotate(-37.812 5.52734 36.8594)" fill={ACCENT} />
        <rect x="34.1406" y="14.6602" width="13.0338" height="26.6793" transform="rotate(-37.812 34.1406 14.6602)" fill={ACCENT} />
      </motion.g>
    </svg>
  )
}

// 3 — Phone: a notification buzz — quick shake, long pause.
function PhoneIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={playing ? { rotate: [0, -4, 4, -4, 4, -3, 0] } : { rotate: 0 }}
        transition={playing ? { duration: 0.6, repeat: Infinity, repeatDelay: 2.1, ease: 'easeInOut' } : REST}
      >
        <rect width="50" height="31" transform="matrix(0 -1 -1 0 45 57)" fill="white" />
        <circle cx="29.5" cy="48.5" r="4.5" fill={ACCENT} />
        <rect x="24" y="10" width="11" height="3" rx="1.5" fill={ACCENT} />
      </motion.g>
    </svg>
  )
}

// 4 — Chat: the three dots bounce in sequence, a live typing indicator.
function ChatIcon({ playing }) {
  const dot = (delay) => ({
    style: { transformBox: 'fill-box', transformOrigin: 'center' },
    animate: playing ? { y: [0, -6, 0, 0] } : { y: 0 },
    transition: playing
      ? { duration: 1.1, times: [0, 0.2, 0.42, 1], repeat: Infinity, ease: 'easeInOut', delay }
      : REST,
  })
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <g clipPath="url(#li-chat)">
        <path d="M14.4623 58.7798L13.8039 32.5015L36.3453 44.2156L14.4623 58.7798Z" fill="white" />
        <rect x="6.66699" y="16" width="49.3333" height="33.3333" rx="4.48485" fill="white" />
        <motion.rect x="13.334" y="28" width="10.6667" height="10.6667" rx="5.33333" fill={ACCENT} {...dot(0)} />
        <motion.rect x="26.667" y="28" width="10.6667" height="10.6667" rx="5.33333" fill={ACCENT} {...dot(0.14)} />
        <motion.rect x="40" y="28" width="10.6667" height="10.6667" rx="5.33333" fill={ACCENT} {...dot(0.28)} />
      </g>
      <defs>
        <clipPath id="li-chat">
          <rect width="64" height="64" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

// Shared double-thump heartbeat used by Mind and Home Care.
const heartbeat = (playing) => ({
  style: { transformBox: 'fill-box', transformOrigin: 'center' },
  animate: playing ? { scale: [1, 1.18, 1, 1.12, 1, 1] } : { scale: 1 },
  transition: playing
    ? { duration: 1.7, times: [0, 0.1, 0.22, 0.34, 0.5, 1], repeat: Infinity, ease: 'easeInOut' }
    : REST,
})

// 5 — Mind: the heart held in the head beats.
function MindIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <path d="M50.052 25.5011C50.052 36.405 41.2127 45.2444 30.3087 45.2444C19.4048 45.2444 10.5654 36.405 10.5654 25.5011C10.5654 14.5972 19.4048 5.75781 30.3087 5.75781C41.2127 5.75781 50.052 14.5972 50.052 25.5011Z" fill="white" />
      <path d="M20.3631 35.4465H40.6959V58.2456H20.3631V35.4465Z" fill="white" />
      <path d="M38.2006 27.6054L46.7958 19.0102L55.391 27.6054L46.7958 36.2006L38.2006 27.6054Z" fill="white" />
      <path d="M36.0733 29.981C36.0733 28.291 37.4433 26.921 39.1333 26.921H49.5768C51.2668 26.921 52.6369 28.291 52.6369 29.981V39.2182C52.6369 40.9083 51.2668 42.2783 49.5768 42.2783H39.1333C37.4433 42.2783 36.0733 40.9083 36.0733 39.2182V29.981Z" fill="white" />
      <motion.path
        d="M30.032 35.9426L39.3359 26.6482C40.3123 25.6866 40.8608 24.3823 40.8608 23.0223C40.8608 21.6623 40.3123 20.3581 39.3359 19.3964C38.3595 18.4348 37.0352 17.8945 35.6543 17.8945C34.2734 17.8945 32.9491 18.4348 31.9727 19.3964L30.032 21.1766L28.0912 19.3964C27.1148 18.4348 25.7905 17.8945 24.4097 17.8945C23.0288 17.8945 21.7045 18.4348 20.7281 19.3964C19.7517 20.3581 19.2031 21.6623 19.2031 23.0223C19.2031 24.3823 19.7517 25.6866 20.7281 26.6482L30.032 35.9426Z"
        fill={ACCENT}
        {...heartbeat(playing)}
      />
    </svg>
  )
}

// 6 — Food: the chopsticks lift a morsel out of the bowl and dip back.
function FoodIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={playing ? { y: [0, -2.6, 0, 0], x: [0, -1.4, 0, 0], rotate: [0, -5, 0, 0] } : { y: 0, x: 0, rotate: 0 }}
        transition={playing ? { duration: 2.2, times: [0, 0.32, 0.6, 1], repeat: Infinity, ease: 'easeInOut' } : REST}
      >
        <path d="M17.2366 23.6669C16.8891 24.2 16.1754 24.3505 15.6423 24.0031L9.20744 19.8094C8.67436 19.4619 8.52385 18.7482 8.87127 18.2151C9.2187 17.682 9.93248 17.5315 10.4656 17.8789L16.9004 22.0727C17.4335 22.4201 17.584 23.1339 17.2366 23.6669Z" fill="white" />
        <path d="M18.4859 22.7884C19.0757 22.5497 19.3605 21.8781 19.1219 21.2883L16.2417 14.1679C16.0031 13.5781 15.3314 13.2933 14.7416 13.5319C14.1517 13.7705 13.867 14.4422 14.1056 15.032L16.9858 22.1523C17.2244 22.7422 17.896 23.027 18.4859 22.7884Z" fill="white" />
        <path d="M18.1809 23.3505C17.6897 23.7549 16.9636 23.6846 16.5592 23.1933L11.6772 17.2637C11.2727 16.7724 11.3431 16.0464 11.8343 15.6419C12.3255 15.2375 13.0516 15.3079 13.4561 15.7991L18.3381 21.7287C18.7425 22.22 18.6721 22.9461 18.1809 23.3505Z" fill="white" />
        <path d="M27.1114 30.8763C27.9225 32.9074 25.6465 34.7814 23.8089 33.5954L12.9974 26.6175C11.7201 25.7931 11.6142 23.9641 12.7878 22.9978L18.827 18.0256C20.0007 17.0593 21.7753 17.5144 22.3391 18.9262L27.1114 30.8763Z" fill={ACCENT} />
      </motion.g>
      <circle cx="35.0064" cy="25.3863" r="8.41755" fill={ACCENT} />
      <circle cx="45.2272" cy="29.5963" r="10.2213" fill={ACCENT} />
      <rect x="28.9941" y="48.2344" width="15.6326" height="6.01253" rx="1.20251" fill={ACCENT} />
      <path d="M59.0562 27.7927C59.0562 33.6928 56.7124 39.3512 52.5404 43.5232C48.3684 47.6953 42.71 50.0391 36.8099 50.0391C30.9098 50.0391 25.2513 47.6953 21.0793 43.5233C16.9073 39.3512 14.5635 33.6928 14.5635 27.7927L59.0562 27.7927Z" fill="white" />
    </svg>
  )
}

// 7 — Home Care: the heart inside the home beats.
function HomeIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <path d="M8 24L31.3333 8L56 24H8Z" fill="white" />
      <path d="M8 24H56V56H8V24Z" fill="white" />
      <motion.path
        d="M32 47.0781L42.3101 36.7785C43.3921 35.7129 44 34.2675 44 32.7605C44 31.2534 43.3921 29.8081 42.3101 28.7424C41.2281 27.6768 39.7606 27.0781 38.2304 27.0781C36.7002 27.0781 35.2326 27.6768 34.1506 28.7424L32 30.7151L29.8494 28.7424C28.7674 27.6768 27.2998 27.0781 25.7696 27.0781C24.2394 27.0781 22.7719 27.6768 21.6899 28.7424C20.6079 29.8081 20 31.2534 20 32.7605C20 34.2675 20.6079 35.7129 21.6899 36.7785L32 47.0781Z"
        fill={ACCENT}
        {...heartbeat(playing)}
      />
    </svg>
  )
}

// One clock hand, drawn from the dial centre. It spins via a compositor-driven
// CSS animation, which sweeps seamlessly and — unlike a JS/spring loop — never
// hitches at the loop seam or restarts when the component re-renders (e.g. on a
// colour change). The transparent anchor rect — centred on (32,32) — makes the
// group's box centre the dial centre, so fill-box rotation hinges in place.
function ClockHand({ playing, d, duration }) {
  return (
    <g
      className="li__hand"
      style={{
        transformBox: 'fill-box',
        transformOrigin: 'center',
        animationDuration: `${duration}s`,
        animationPlayState: playing ? 'running' : 'paused',
      }}
    >
      <rect x="17" y="17" width="30" height="30" fill="none" />
      {/* flat (butt) caps + no rounding, matching the original Clock.svg stroke */}
      <path d={d} stroke={ACCENT} strokeWidth="5.74895" />
    </g>
  )
}

// 8 — Clock: two hands that hinge from the dial centre like a real clock — the
// minute hand sweeps once every 4s, the hour hand creeps 12× slower.
function ClockIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <rect x="11.3994" y="11.3984" width="41.2008" height="41.2008" rx="20.6004" fill="white" />
      {/* hand lengths mirror the original artwork's two arms (~11 and ~14) */}
      <ClockHand playing={playing} d="M32 32L43 32" duration={48} />
      <ClockHand playing={playing} d="M32 32L32 18" duration={4} />
    </svg>
  )
}

// 9 — Talk: the face breathes while a speech bubble emerges from its mouth.
function TalkIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
        animate={playing ? { scale: [1, 1.08, 1], y: [0, -2.4, 0] } : { scale: 1, y: 0 }}
        transition={playing ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : REST}
      >
        <circle cx="37.7909" cy="35.7812" r="19.7538" fill="white" />
        <circle cx="29.4732" cy="29.5454" r="4.1587" fill={ACCENT} />
        <circle cx="46.1079" cy="29.5454" r="4.1587" fill={ACCENT} />
        <path d="M26.3545 37.8633H48.1877V38.3831C48.1877 44.4122 43.3001 49.2997 37.2711 49.2997V49.2997C31.242 49.2997 26.3545 44.4122 26.3545 38.3831V37.8633Z" fill={ACCENT} />
      </motion.g>
      {/* the bubble emerges from the mouth: it starts tiny down at the mouth
          (offset ~+20,+29 from its rest spot), grows out to the top-left, holds,
          then is drawn back in — like speech leaving the character. */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={playing ? { x: [20, 0, 0, 20], y: [29, 0, 0, 29], scale: [0, 1, 1, 0] } : { x: 0, y: 0, scale: 1 }}
        transition={playing ? { duration: 3.2, times: [0, 0.18, 0.82, 1], repeat: Infinity, ease: 'easeOut' } : REST}
      >
        <path d="M11.0158 22.4171L10.7822 13.0944L18.7791 17.2502L11.0158 22.4171Z" fill="white" />
        <rect x="8.25" y="7.24219" width="17.5019" height="11.8256" rx="4.06218" fill="white" />
      </motion.g>
    </svg>
  )
}

// 10 — Check Mark: the original two-rect artwork is left intact and simply
// uncovered through a mask whose thick stroke traces the tick's centreline. As
// that stroke draws on (pathLength), it reveals the artwork from the short arm,
// down through the elbow, then out along the long tail — like a teacher marking
// a script. It holds, fades, and re-marks. (Centreline points derived from the
// rects: short-arm tip → elbow → long-arm tip.)
function CheckIcon({ playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="li__svg" aria-hidden="true">
      <mask id="li-check-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
        <motion.path
          d="M8.94 24.55L23.8 44.04L56.02 19.52"
          fill="none"
          stroke="white"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={playing ? { pathLength: [0, 1, 1, 1, 0], opacity: [1, 1, 1, 0, 0] } : { pathLength: 1, opacity: 1 }}
          transition={playing ? { duration: 3, times: [0, 0.24, 0.82, 0.92, 1], repeat: Infinity, ease: 'easeInOut' } : REST}
        />
      </mask>
      <g mask="url(#li-check-mask)">
        <rect width="17.3333" height="48.2957" transform="matrix(-0.60586 -0.795571 -0.795571 0.60586 61.2695 26.4141)" fill={ACCENT} />
        <rect x="35.9678" y="45.6797" width="17.3333" height="33.1999" transform="rotate(142.709 35.9678 45.6797)" fill="white" />
      </g>
    </svg>
  )
}

// Order matches the reference sheet: two rows of five.
const ICONS = [
  { key: 'video', label: 'Video', Cmp: VideoIcon },
  { key: 'dumbbell', label: 'Fitness', Cmp: DumbbellIcon },
  { key: 'phone', label: 'Phone', Cmp: PhoneIcon },
  { key: 'chat', label: 'Chat', Cmp: ChatIcon },
  { key: 'mind', label: 'Mind', Cmp: MindIcon },
  { key: 'food', label: 'Food', Cmp: FoodIcon },
  { key: 'home', label: 'Home care', Cmp: HomeIcon },
  { key: 'clock', label: 'Time', Cmp: ClockIcon },
  { key: 'talk', label: 'Talk', Cmp: TalkIcon },
  { key: 'check', label: 'Done', Cmp: CheckIcon },
]

export default function PneumaCareIcons({ play = true }) {
  const reduced = useReducedMotion()

  // Latch the entrance: it plays once the card first scrolls into view, then
  // stays "shown" even after it scrolls back out (only the loops pause). This
  // guarded set-state-during-render is React's documented way to record a
  // value from a previous render without an effect.
  const [entered, setEntered] = useState(reduced)
  if (play && !entered) setEntered(true)

  // Accent colour, applied as the container's `color` so every `currentColor`
  // element recolours together. Defaults to the first swatch.
  const [accent, setAccent] = useState(PALETTE[0].value)

  const playing = play && !reduced

  return (
    <div className="li" aria-label="PneumaCare icon set" style={{ color: accent }}>
      <motion.div
        className="li__grid"
        variants={GRID}
        initial={reduced ? 'shown' : 'hidden'}
        animate={entered ? 'shown' : 'hidden'}
      >
        {ICONS.map(({ key, label, Cmp }) => (
          <motion.div
            key={key}
            className="li__tile"
            variants={TILE}
            whileHover={{ scale: 1.14 }}
            transition={{ type: 'spring', stiffness: 460, damping: 22 }}
            title={label}
          >
            <Cmp playing={playing} />
          </motion.div>
        ))}
      </motion.div>

      {/* Accent-colour control — same pill treatment as the Apple Carousel. */}
      <div className="li__palette" role="group" aria-label="Accent colour">
        {PALETTE.map(({ name, value }) => (
          <button
            key={name}
            type="button"
            aria-label={name}
            aria-pressed={accent === value}
            className={`li__swatch${accent === value ? ' li__swatch--active' : ''}`}
            style={{ '--swatch': value }}
            onClick={() => setAccent(value)}
          />
        ))}
      </div>
    </div>
  )
}
