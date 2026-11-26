// The heavy clips (over 1.5MB): each has a lighter canvas version at up to 1200px ({name}.c.av1/.hevc/.h264.mp4),
// visually the same at the size a card shows, and its full-quality file ({name}.mp4), which plays when its card is
// opened. Every other clip is light already and has just the one file.
export const TIERED = new Set([
  'b-feeling', 'b-learn', 'b-player', 'b-playground',
  'g-airport', 'g-changi', 'g-cockpit', 'g-dala', 'g-fire', 'g-lusail', 'g-night', 'g-photo', 'g-podium', 'g-stunt', 'g-worldtour',
  'kk-start-prompting', 'kk-testimonials',
])
