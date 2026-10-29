// Feature flags. Flip a single value here to toggle behaviour app-wide.

// Show the voxel icons next to the Work / Playground / About nav items
// (both the desktop top nav and the mobile menu). Set to `true` to bring
// the icons back everywhere.
export const SHOW_NAV_ICONS = false

// Show the light/dark toggle (desktop top nav and mobile menu). While this is
// off the site leads with dark for everyone — see useTheme.js, which ignores any
// stored preference rather than stranding someone in light with no control to
// switch back. Set to `true` to bring the toggle back; stored preferences were
// never cleared, so people get their old choice returned to them.
export const SHOW_THEME_TOGGLE = false

// Show the Playground: its nav entry (desktop header and mobile menu) and the
// /playground page itself, which 404s while this is off. Off for now. Nothing
// was deleted: flip to `true` and put its line back in public/sitemap.xml
// (it's in that file's git history).
export const SHOW_PLAYGROUND = false

// Show Ask YahayaLLM (highlight text, ask about it). Off everywhere, the local
// dev server too: something better is coming. The code is all still here
// (AskYahaya.jsx, lib/yahaya*.js); set to `true` (or `import.meta.env.DEV` for
// dev only) to bring it back.
export const SHOW_ASK_YAHAYA = false

// Show the video polaroid (Building Rednoxx) among the hero's stickers. Hidden for
// now; HeroVideoCard.jsx is all still there. Set to `true` to bring it back.
export const SHOW_HERO_VIDEO = false
