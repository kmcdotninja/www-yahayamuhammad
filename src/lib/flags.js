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
