import { useCallback, useEffect, useRef } from 'react'
import SndImport from 'snd-lib'

// snd-lib ships as CJS with `exports.default = Snd`. Vite's ESM interop
// hands us a wrapper, so the real constructor can be one or two `.default`
// levels deep. Unwrap defensively.
const Snd = SndImport?.default?.default || SndImport?.default || SndImport

// Singleton across the React tree so the kit is only loaded once.
let sndInstance = null
let kitLoaded = false
let loadPromise = null

function getSnd() {
  if (!sndInstance) {
    sndInstance = new Snd({ easySetup: false })
  }
  return sndInstance
}

function ensureKit(kit) {
  if (kitLoaded) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = getSnd()
    .load(kit)
    .then(() => {
      kitLoaded = true
    })
    .catch(() => {
      // ignore — audio just won't play
    })
  return loadPromise
}

// snd-lib's KITS are simple string ids: "01", "02", "03"
export function useSnd(kit = '01') {
  const readyRef = useRef(false)

  useEffect(() => {
    ensureKit(kit).then(() => {
      readyRef.current = true
    })
  }, [kit])

  const play = useCallback((sound) => {
    if (!sound) return
    try {
      getSnd().play(sound)
    } catch {
      // ignore — autoplay may be blocked until a user gesture
    }
  }, [])

  // SOUNDS keys are stable strings ('button', 'celebration', etc.).
  // Inline them so we don't depend on the static class field being resolved
  // before the function runs.
  const SOUNDS = {
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

  return { play, SOUNDS }
}
