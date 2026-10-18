let instance = null

export const setLenis = (lenis) => {
  instance = lenis
}

export const getLenis = () => instance

// Work that has to land in the same frame as the smooth scroll, after Lenis has
// moved the page (the scroll flare: drawn any earlier, it trails the page by a
// frame). The Lenis loop in useScrollAnimations calls runAfterScroll each frame.
const afterScroll = new Set()
let lastRun = 0

export const onAfterScroll = (fn) => {
  afterScroll.add(fn)
  return () => afterScroll.delete(fn)
}

export const runAfterScroll = (time) => {
  lastRun = performance.now()
  afterScroll.forEach((fn) => fn(time))
}

// True while the Lenis loop is running these (it runs every frame once loaded).
export const scrollDriven = () => performance.now() - lastRun < 100
