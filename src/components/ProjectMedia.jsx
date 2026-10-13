import { useRef } from 'react'
import '../styles/kiko-fonts.css'
import Picture from './Picture.jsx'
import PhoneTile from './PhoneTile.jsx'
import TabletTile from './TabletTile.jsx'
import { NewInKiko, KikoIcon, Peekaboo, ChildCard, KikoTalks } from './kiko/KikoSnippets.jsx'
import { useLazyLoop } from '../hooks/useLazyLoop.js'

// <ProjectMedia> — one entry of a project's `images` / section `images` array.
// Rasters go through <Picture> (AVIF + original) exactly as before; an `.mp4`
// entry renders a silent, looping, inline <video> instead (lazy: see
// useLazyLoop), and an object entry `{ phone, caption }` renders a <PhoneTile>:
// the phone mockup in code with a looping screen recording (or a still) inside.
//
// The poster is found by convention: `/video/kiko-loop.mp4` and
// `/video/kiko-launch.mp4` both use `/video/kiko-poster.webp` (the `-loop` /
// `-launch` suffix is dropped and `-poster.webp` added).
//
// `controls` is for the drawer, where someone may want to unmute the film; the
// homepage tile stays control-free so a click still opens the case study.

const VIDEO = /\.mp4$/i

// Captions under the phone / snippet tiles (the uppercase mono line). Off for
// now (Yahya, 2026-10-13); the captions stay in data.js, flip this to bring
// them back.
const SHOW_CAPTIONS = false
const cap = (src) => (SHOW_CAPTIONS ? src.caption : undefined)

const PeekabooLight = (props) => <Peekaboo {...props} light />
const SNIPPETS = { 'new-in-kiko': NewInKiko, icon: KikoIcon, peekaboo: Peekaboo, 'peekaboo-light': PeekabooLight, child: ChildCard, 'kiko-talks': KikoTalks }

const isVideo = (src) => VIDEO.test(src || '')

const posterFor = (src) =>
  src.replace(/(-loop|-launch|-sm)?\.mp4$/i, '-poster.webp')

export default function ProjectMedia({
  src,
  alt = '',
  controls = false,
  onLoad,
  loading,
  decoding,
  fetchPriority,
  draggable,
  sizes,
  className,
}) {
  // `{ image, area }`: a plain image that carries grid placement
  if (src && typeof src === 'object' && src.image) {
    // its size, when given, reserves the box before it loads (no shift in the masonry)
    return (
      <Picture
        src={src.image}
        width={src.width}
        height={src.height}
        {...{ alt, loading, decoding, fetchPriority, draggable, sizes, className, onLoad }}
      />
    )
  }
  // `{ snippet }`: one of Kiko's animated tiles, built in code
  if (src && typeof src === 'object' && src.snippet) {
    const Snip = SNIPPETS[src.snippet]
    return Snip ? <Snip caption={cap(src)} {...(src.ratio ? { ratio: src.ratio } : null)} /> : null
  }
  if (src && typeof src === 'object' && src.tablet) {
    return <TabletTile tablet={src.tablet} caption={cap(src)} />
  }
  if (src && typeof src === 'object' && src.phone) {
    return <PhoneTile phone={src.phone} caption={cap(src)} />
  }
  // `{ video, width, height }`: a plain looping clip; the size reserves its box
  // before the poster arrives (no layout shift in the masonry)
  if (src && typeof src === 'object' && src.video) {
    return (
      <LoopVideo
        className={className}
        src={src.video}
        width={src.width}
        height={src.height}
        alt={alt}
        controls={controls}
        onLoad={onLoad}
      />
    )
  }
  if (isVideo(src)) {
    return (
      <LoopVideo
        className={className}
        src={src}
        alt={alt}
        controls={controls}
        onLoad={onLoad}
      />
    )
  }
  return (
    <Picture
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      draggable={draggable}
      onLoad={onLoad}
      sizes={sizes}
    />
  )
}

function LoopVideo({ className, src, alt, controls, onLoad, width, height }) {
  const ref = useRef(null)
  useLazyLoop(ref, src)
  return (
    <video
      ref={ref}
      className={className}
      width={width}
      height={height}
      poster={posterFor(src)}
      muted
      loop
      playsInline
      preload="none"
      controls={controls}
      aria-label={alt || undefined}
      // Report the clip's real size the same way an <img> onLoad does, so the
      // drawer's pair-up logic (naturalWidth / naturalHeight) still works.
      onLoadedMetadata={
        onLoad
          ? (e) => {
              const v = e.currentTarget
              onLoad({
                currentTarget: { naturalWidth: v.videoWidth, naturalHeight: v.videoHeight },
              })
            }
          : undefined
      }
    />
  )
}
