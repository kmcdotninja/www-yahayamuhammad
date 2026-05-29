import { useCallback, useEffect } from 'react'

// snd-lib is ~30KB minified. The sounds can't play until the first user
// gesture (browsers block AudioContext otherwise), so importing it on
// boot would only burn JS-parse time for nothing. We import it the
// moment the first sound is requested OR on the first pointerdown,
// whichever fires earlier.

const instances = {}
const loadPromises = {}
let libPromise = null

function loadLib() {
  if (!libPromise) {
    libPromise = import('snd-lib').then((mod) => {
      // snd-lib ships as CJS — peel through the interop wrapper.
      return mod?.default?.default || mod?.default || mod
    })
  }
  return libPromise
}

async function ensureKit(kit) {
  if (loadPromises[kit]) return loadPromises[kit]
  loadPromises[kit] = (async () => {
    const Snd = await loadLib()
    if (!instances[kit]) instances[kit] = new Snd({ easySetup: false })
    try {
      await instances[kit].load(kit)
    } catch {
      // ignore — audio just won't play
    }
    return instances[kit]
  })()
  return loadPromises[kit]
}

export const KITS = {
  DEFAULT: '01',
  ALT: '02',
  INDUSTRIAL: '03',
}

export const SOUNDS = {
  BUTTON: 'button',
  CAUTION: 'caution',
  CELEBRATION: 'celebration',
  DISABLED: 'disabled',
  NOTIFICATION: 'notification',
  PROGRESS_LOOP: 'progress_loop',
  RINGTONE_LOOP: 'ringtone_loop',
  SELECT: 'select',
  SWIPE: 'swipe',
  TAP: 'tap',
  TOGGLE_ON: 'toggle_on',
  TOGGLE_OFF: 'toggle_off',
  TRANSITION_DOWN: 'transition_down',
  TRANSITION_UP: 'transition_up',
  TYPE: 'type',
}

// Warm the kit on first user pointer so the very first sfx hit is silent
// (it's been pre-fetched in the background) instead of waiting on the
// import. Idempotent.
if (typeof window !== 'undefined') {
  const warm = () => {
    ensureKit(KITS.DEFAULT)
    window.removeEventListener('pointerdown', warm)
    window.removeEventListener('keydown', warm)
  }
  window.addEventListener('pointerdown', warm, { once: true, passive: true })
  window.addEventListener('keydown', warm, { once: true })
}

export function useSnd(kit = KITS.DEFAULT) {
  useEffect(() => {
    // Don't trigger the import on mount — wait for first use.
  }, [kit])

  const play = useCallback(
    (sound, options) => {
      if (!sound) return
      const targetKit = options?.kit ?? kit
      // Fire-and-forget: kick off the load if it hasn't started, and play
      // as soon as the instance is ready. If the user has already played
      // a sound before this kit is loaded, both promises resolve in order
      // and the audio still lands.
      ensureKit(targetKit)
        .then((inst) => {
          try {
            inst.play(sound, { volume: 0.5, ...options })
          } catch {
            // ignore — autoplay may be blocked until a user gesture
          }
        })
        .catch(() => {})
    },
    [kit],
  )

  return { play, SOUNDS, KITS }
}
