// <Picture> — drop-in replacement for <img> that emits an AVIF source
// alongside the original WebP / PNG / JPG. Modern browsers fetch only the
// AVIF (typically 30–40% smaller than WebP at matched quality), older
// browsers fall back to the original `src` automatically.
//
// The AVIF path is derived from `src` by swapping the extension. The build
// step (`npm run compress:images`) generates a sibling `<name>.avif` for
// every raster asset over the size threshold.
//
// Props beyond the listed ones are spread onto the inner <img> so this is
// a stylistic no-op compared to using a plain <img>.

const RASTER = /\.(webp|png|jpe?g)$/i

// Sources we deliberately render as their original raster (no AVIF). These
// sit under the compress-images.mjs size floor, so no AVIF sibling is
// emitted by the build — and once the browser commits to AVIF via
// <source type="image/avif">, a 404 does NOT fall back to <img src>.
// Listing them here keeps the <picture> from advertising an AVIF that
// doesn't exist.
const NO_AVIF = new Set([
  '/projects/kutuby/logo.png',
  '/projects/kutuby/character-bird.png',
  // Below the compress:images 60KB floor, so no AVIF sibling is emitted.
  '/projects/Groq/5.png',
])

function deriveAvif(src) {
  if (!src || !RASTER.test(src)) return null
  if (NO_AVIF.has(src)) return null
  return src.replace(RASTER, '.avif')
}

export default function Picture({
  src,
  alt = '',
  width,
  height,
  className,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  draggable,
  onLoad,
  sizes,
  ...rest
}) {
  const avif = deriveAvif(src)

  return (
    <picture>
      {avif && <source srcSet={avif} type="image/avif" sizes={sizes} />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading}
        decoding={decoding}
        fetchpriority={fetchPriority}
        draggable={draggable}
        onLoad={onLoad}
        sizes={sizes}
        {...rest}
      />
    </picture>
  )
}
