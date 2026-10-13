import { useEffect, useState } from 'react'

// Kiko's sung sonic logo ("Kiko!", the app's splash sound) for the Peekaboo
// cards, and Kiko's recorded lines for the Kiko talks card (playKiko's `src`).
// Opt-in per card, off on every load. One shared <audio> for every card,
// unlocked by the toggle tap itself (iPhone Safari then allows the later plays
// at each logo reveal). Only one card owns the sound at a time: turning one on
// turns the others off. Leaving the tab stops it.

const SRC = '/sounds/kiko.mp3'
let audio = null
let loaded = SRC // the clip loaded in the shared element
let owner = null
const subs = new Set()

const el = () => {
  if (!audio && typeof Audio !== 'undefined') {
    audio = new Audio(SRC)
    audio.preload = 'auto'
  }
  return audio
}

const emit = () => subs.forEach((f) => f(owner))

export function stopKiko() {
  if (!audio) return
  audio.pause()
  try {
    audio.currentTime = 0
  } catch {
    /* not loaded yet */
  }
}

// call from the tap: claims the sound for `id` (or releases it) and unlocks the element
export function setKikoSound(id, wantOn, playNow = false) {
  const a = el()
  if (!a) return
  if (!wantOn) {
    if (owner === id) {
      owner = null
      stopKiko()
      emit()
    }
    return
  }
  owner = id
  stopKiko()
  if (playNow) {
    a.muted = false
    a.play().catch(() => {})
  } else {
    // unlock inside the gesture without a sound: a muted play, stopped at once
    a.muted = true
    a.play()
      .then(() => {
        if (a.muted) {
          a.pause()
          a.currentTime = 0
        }
        a.muted = false
      })
      .catch(() => {
        a.muted = false
      })
  }
  emit()
}

// the reveal moment: play from the top if `id` owns the sound (`src`: another
// clip on the same, already unlocked, element)
export function playKiko(id, src = SRC) {
  if (owner !== id || !audio || document.hidden) return
  if (src !== loaded) {
    loaded = src
    audio.src = src
  }
  audio.muted = false
  try {
    audio.currentTime = 0
  } catch {
    /* not loaded yet */
  }
  audio.play().catch(() => {})
}

export function pauseKikoFor(id) {
  if (owner === id) stopKiko()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopKiko()
  })
}

// whether card `id` has the sound on (follows the other cards taking it)
export function useKikoSound(id) {
  const [cur, setCur] = useState(owner)
  useEffect(() => {
    subs.add(setCur)
    return () => {
      subs.delete(setCur)
      if (owner === id) {
        owner = null
        stopKiko()
        emit()
      }
    }
  }, [id])
  return cur === id
}
