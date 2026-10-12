// The feels and backdrops a theme or a brief can name. Plain data, with nothing that
// reads the disk, so the theme rules that use it can also run in a web page.

/** The feel of every movement on a card: how things arrive, and how fast. */
export const MOTION_FEELS = {
  calm: { ease: 'cubic-bezier(.2,.8,.2,1)', speed: 1.15 },
  crisp: { ease: 'cubic-bezier(.3,.9,.3,1)', speed: 0.8 },
  lively: { ease: 'cubic-bezier(.34,1.45,.64,1)', speed: 0.95 },
} as const
export type MotionFeel = keyof typeof MOTION_FEELS

/** Backdrops for the rounded picture: from, to, the glow, and what is drawn. */
export const BACKDROPS: Record<string, { colors: [string, string, string]; pattern: 'glow' | 'waves' | 'plain' }> = {
  indigo: { colors: ['#1B2A8F', '#3D5AF1', '#B9A5FF'], pattern: 'glow' },
  aurora: { colors: ['#1B2A8F', '#3D5AF1', '#C4B5FD'], pattern: 'waves' },
  ocean: { colors: ['#06324F', '#0E7490', '#7DD3FC'], pattern: 'waves' },
  forest: { colors: ['#0B3B2E', '#15803D', '#A7F3D0'], pattern: 'glow' },
  sunset: { colors: ['#7C2D12', '#EA580C', '#FDE68A'], pattern: 'waves' },
  rose: { colors: ['#831843', '#DB2777', '#FBCFE8'], pattern: 'glow' },
  graphite: { colors: ['#111827', '#374151', '#9CA3AF'], pattern: 'plain' },
  paper: { colors: ['#E5E7EB', '#F3F4F6', '#FFFFFF'], pattern: 'plain' },
}
