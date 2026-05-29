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

function deriveAvif(src) {
  if (!src || !RASTER.test(src)) return null
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
