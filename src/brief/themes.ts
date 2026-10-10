// Themes: one word that sets the whole look of a video.
//
// A theme bundles what a designer would choose together: the colours, the font
// pairing, how surfaces are drawn (the look), how things move, the backdrop behind
// the picture, and the mood of the sounds. A person can still override any part.
//
// Every look here is written for video, not for a web page. Three rules shaped
// them: captions keep strong contrast whatever the style; nothing depends on a
// hairline or a faint shadow that compression would erase; and the highlight colour
// is one colour, clearly different from everything around it.
// See docs/themes.md, and the skill for each theme in skills/.
import type { Look } from '../core/theme.ts'
import type { FontSet } from './fonts.ts'
import type { MotionFeel } from './presets.ts'

export interface ThemePreset {
  /** The design style this theme follows. */
  style: string
  /** What kind of product or video it suits. */
  use: string
  /** Other words a person may write for it. */
  aliases: string[]
  ink: string
  accent: string
  mist: string
  paper: string
  /** The solid colour behind captions on a tall frame, and their text colour. */
  band: string
  bandText: string
  /** A font pairing by name, or three faces with how titles are set. */
  fontPreset?: string
  fonts?: FontSet & { displayWeight: number; tracking: number }
  feel: MotionFeel
  /** The backdrop behind the rounded picture. */
  backdrop: { colors: [string, string, string]; pattern: 'glow' | 'waves' | 'plain' }
  /** Corner radius of the picture, as a share of the frame's short side. */
  radius: number
  /** Words that describe how it should sound. */
  mood: string
  /** How surfaces are drawn, given the highlight colour in use. */
  look: (accent: string) => Look
}

const glassPanel = (fill: string, edge: string, radius: number, blur: number, shadow: string) =>
  `background:${fill};border:1px solid ${edge};border-radius:${radius}px;-webkit-backdrop-filter:blur(${blur}px);backdrop-filter:blur(${blur}px);box-shadow:${shadow}`

export const THEMES: Record<string, ThemePreset> = {
  minimal: {
    style: 'Minimalism', aliases: ['minimalism', 'clean'],
    use: 'business software, finance, anything that must feel calm and exact',
    ink: '#0E1320', accent: '#2563EB', mist: '#5B6475', paper: '#FFFFFF', band: '#F6F7F9', bandText: '#0E1320',
    fontPreset: 'minimal', feel: 'crisp', radius: 0.022, mood: 'soft dry minimal',
    backdrop: { colors: ['#E7EAF0', '#F3F5F8', '#FFFFFF'], pattern: 'plain' },
    look: (a) => ({
      canvas: '#F6F7F9', fg: '#0E1320', muted: '#5B6475', paper: '#FFFFFF', paperFg: '#0E1320',
      panel: 'background:#FFFFFF;border:1.5px solid #AEB7C5;border-radius:10px', panelFg: '#0E1320',
      chip: 'border:1.5px solid #0E1320;color:#0E1320;border-radius:8px',
      label: 'background:#0E1320;color:#FFFFFF;border-radius:6px',
      ring: `border:2.5px solid ${a};border-radius:6px`,
      caption: 'background:#0E1320;color:#FFFFFF;border-radius:8px',
      enter: 'rise', upper: false, wall: false, steps: 'row',
    }),
  },
  glass: {
    style: 'Glassmorphism', aliases: ['glassmorphism', 'frosted'],
    use: 'modern apps, AI products, launch videos',
    ink: '#1E1B4B', accent: '#FDE68A', mist: '#DDD6FE', paper: '#EDE9FE', band: '#1E1B4B', bandText: '#FFFFFF',
    fontPreset: 'geometric', feel: 'calm', radius: 0.04, mood: 'light airy soft',
    backdrop: { colors: ['#312E81', '#4F46E5', '#F0ABFC'], pattern: 'waves' },
    look: (a) => ({
      canvas: 'linear-gradient(135deg,#4C1D95 0%,#1D4ED8 55%,#BE185D 100%)', fg: '#FFFFFF', muted: 'rgba(255,255,255,.82)',
      paper: 'linear-gradient(135deg,#5B21B6 0%,#2563EB 60%,#DB2777 100%)', paperFg: '#FFFFFF',
      panel: glassPanel('rgba(255,255,255,.17)', 'rgba(255,255,255,.45)', 22, 16, '0 14px 40px rgba(15,10,60,.3)'), panelFg: '#FFFFFF',
      chip: `${glassPanel('rgba(255,255,255,.16)', 'rgba(255,255,255,.55)', 999, 10, 'none')};color:#FFFFFF`,
      label: 'background:rgba(255,255,255,.94);color:#1E1B4B;border-radius:12px;box-shadow:0 8px 24px rgba(15,10,60,.35)',
      ring: `border:2.5px solid ${a};border-radius:14px`,
      caption: `${glassPanel('rgba(24,18,70,.74)', 'rgba(255,255,255,.3)', 16, 12, '0 8px 28px rgba(10,6,40,.4)')};color:#FFFFFF`,
      enter: 'float', upper: false, wall: false, steps: 'row',
    }),
  },
  liquid: {
    style: 'Liquid glass', aliases: ['liquid-glass', 'liquidglass'],
    use: 'consumer apps, products that want to look current',
    ink: '#0B2A4A', accent: '#FDE047', mist: '#CFFAFE', paper: '#E0F2FE', band: '#0B2A4A', bandText: '#FFFFFF',
    fontPreset: 'modern', feel: 'calm', radius: 0.052, mood: 'soft glassy light',
    backdrop: { colors: ['#0F766E', '#1D4ED8', '#A5F3FC'], pattern: 'waves' },
    look: (a) => ({
      canvas: 'radial-gradient(circle at 16% 20%,#F59E0B 0,transparent 30%),radial-gradient(circle at 84% 76%,#22D3EE 0,transparent 36%),linear-gradient(160deg,#0F766E,#1D4ED8)',
      fg: '#FFFFFF', muted: 'rgba(255,255,255,.86)',
      paper: 'radial-gradient(circle at 80% 18%,#38BDF8 0,transparent 34%),radial-gradient(circle at 14% 82%,#34D399 0,transparent 32%),linear-gradient(160deg,#155E75,#1E40AF)', paperFg: '#FFFFFF',
      panel: 'background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.6);border-radius:34px;-webkit-backdrop-filter:blur(7px) saturate(1.7);backdrop-filter:blur(7px) saturate(1.7);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 -14px 24px rgba(255,255,255,.13),inset 0 12px 18px rgba(255,255,255,.08),0 16px 36px rgba(0,20,60,.32)',
      panelFg: '#FFFFFF',
      chip: 'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.65);color:#FFFFFF;border-radius:999px;-webkit-backdrop-filter:blur(6px) saturate(1.6);backdrop-filter:blur(6px) saturate(1.6);box-shadow:inset 0 1px 0 rgba(255,255,255,.85),inset 0 -6px 10px rgba(255,255,255,.12)',
      label: 'background:rgba(255,255,255,.93);color:#0B2A4A;border-radius:999px;box-shadow:inset 0 1px 0 #FFFFFF,0 8px 22px rgba(0,20,60,.4)',
      ring: `border:2.5px solid ${a};border-radius:22px`,
      caption: 'background:rgba(8,24,48,.6);border:1px solid rgba(255,255,255,.5);color:#FFFFFF;border-radius:24px;-webkit-backdrop-filter:blur(14px) saturate(1.6);backdrop-filter:blur(14px) saturate(1.6);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 10px 28px rgba(0,16,48,.4)',
      enter: 'float', upper: false, wall: false, steps: 'row',
    }),
  },
  soft: {
    style: 'Neumorphism', aliases: ['neumorphism', 'neomorphism', 'neumorphic'],
    use: 'calm dashboards, health and wellness, hardware controls',
    ink: '#2B3447', accent: '#4F46E5', mist: '#5A6478', paper: '#E3E7EE', band: '#E3E7EE', bandText: '#2B3447',
    fontPreset: 'corporate', feel: 'calm', radius: 0.045, mood: 'muted soft quiet',
    backdrop: { colors: ['#CBD2DD', '#DDE2EA', '#F4F6F9'], pattern: 'plain' },
    look: (a) => ({
      canvas: '#E3E7EE', fg: '#232B3D', muted: '#55607A', paper: '#E3E7EE', paperFg: '#232B3D',
      // the shadows are deeper than the style usually has: faint ones vanish when encoded
      panel: 'background:#E3E7EE;border-radius:26px;box-shadow:12px 12px 24px #B4BCC9,-12px -12px 24px #FFFFFF', panelFg: '#232B3D',
      chip: 'background:#E3E7EE;color:#232B3D;border-radius:999px;box-shadow:inset 5px 5px 10px #B4BCC9,inset -5px -5px 10px #FFFFFF',
      label: 'background:#232B3D;color:#FFFFFF;border-radius:12px;box-shadow:6px 6px 14px rgba(40,50,70,.35)',
      ring: `border:3px solid ${a};border-radius:16px`,
      caption: 'background:#232B3D;color:#FFFFFF;border-radius:16px;box-shadow:8px 8px 18px rgba(40,50,70,.3)',
      enter: 'rise', upper: false, wall: false, steps: 'row',
    }),
  },
  clay: {
    style: 'Claymorphism', aliases: ['claymorphism'],
    use: 'consumer apps, education, friendly brands',
    ink: '#4A2B1A', accent: '#D4401C', mist: '#8A5A44', paper: '#FFF3EA', band: '#FFE8D9', bandText: '#4A2B1A',
    fontPreset: 'playful', feel: 'lively', radius: 0.06, mood: 'playful round warm',
    backdrop: { colors: ['#FDBA8C', '#FF8F6B', '#FFF1E6'], pattern: 'glow' },
    look: (a) => ({
      canvas: '#FFE8D9', fg: '#4A2B1A', muted: '#7A4E3A', paper: '#FFF3EA', paperFg: '#4A2B1A',
      panel: 'background:#FF8F6B;border-radius:34px;box-shadow:0 16px 28px rgba(214,96,60,.38),inset 0 -10px 14px rgba(120,30,0,.2),inset 0 10px 14px rgba(255,255,255,.5)', panelFg: '#FFFFFF',
      chip: 'background:#7BD3C5;color:#0E3B35;border-radius:999px;box-shadow:0 8px 14px rgba(40,140,125,.3),inset 0 -5px 8px rgba(0,60,50,.2),inset 0 5px 8px rgba(255,255,255,.55)',
      label: 'background:#4A2B1A;color:#FFFFFF;border-radius:18px;box-shadow:0 8px 16px rgba(74,43,26,.35),inset 0 3px 5px rgba(255,255,255,.2)',
      ring: `border:3.5px solid ${a};border-radius:20px`,
      caption: 'background:#4A2B1A;color:#FFFFFF;border-radius:22px;box-shadow:0 10px 20px rgba(74,43,26,.32),inset 0 3px 6px rgba(255,255,255,.18)',
      enter: 'pop', upper: false, wall: false, steps: 'row',
    }),
  },
  brutal: {
    style: 'Brutalism', aliases: ['brutalism', 'neobrutalism', 'neo-brutalism'],
    use: 'developer tools, creative studios, brands that want attitude',
    ink: '#000000', accent: '#1D4ED8', mist: '#000000', paper: '#FFFFFF', band: '#FFE500', bandText: '#000000',
    fontPreset: 'technical', feel: 'crisp', radius: 0, mood: 'dry mechanical hard',
    backdrop: { colors: ['#111111', '#111111', '#111111'], pattern: 'plain' },
    look: (a) => ({
      canvas: '#FFE500', fg: '#000000', muted: '#000000', paper: '#FFFFFF', paperFg: '#000000',
      panel: 'background:#FFFFFF;border:4px solid #000000;border-radius:0;box-shadow:8px 8px 0 #000000', panelFg: '#000000',
      chip: 'background:#000000;color:#FFE500;border-radius:0',
      label: 'background:#000000;color:#FFE500;border-radius:0;box-shadow:5px 5px 0 rgba(0,0,0,.35)',
      ring: `border:4px solid ${a};border-radius:0`,
      caption: 'background:#FFFFFF;color:#000000;border:3px solid #000000;border-radius:0;box-shadow:6px 6px 0 #000000',
      enter: 'cut', upper: true, wall: false, steps: 'row',
    }),
  },
  maximal: {
    style: 'Maximalism', aliases: ['maximalism', 'max'],
    use: 'entertainment, fashion, events, short social video',
    ink: '#1A0B3D', accent: '#FFD400', mist: '#FBCFE8', paper: '#FFD400', band: '#1A0B3D', bandText: '#FFFFFF',
    fontPreset: 'bold', feel: 'lively', radius: 0.05, mood: 'bright playful loud',
    backdrop: { colors: ['#BE185D', '#FF3D81', '#FFD400'], pattern: 'waves' },
    look: (a) => ({
      // the shapes sit in the corners, clear of where titles and graphics go
      canvas: 'radial-gradient(circle at 0% 0%,#FF3D81 0 11%,transparent 11.3%),radial-gradient(circle at 100% 100%,#00C2FF 0 13%,transparent 13.3%),radial-gradient(circle at 100% 0%,#FFD400 0 7%,transparent 7.3%),radial-gradient(circle at 0% 100%,#7C3AED 0 9%,transparent 9.3%),repeating-linear-gradient(45deg,rgba(255,255,255,.06) 0 18px,transparent 18px 36px),#1A0B3D',
      fg: '#FFFFFF', muted: '#FBCFE8',
      paper: 'repeating-linear-gradient(-45deg,rgba(26,11,61,.07) 0 20px,transparent 20px 40px),#FFD400', paperFg: '#1A0B3D',
      panel: 'background:#FF3D81;border:4px solid #1A0B3D;border-radius:6px 28px 6px 28px;box-shadow:8px 8px 0 #00C2FF', panelFg: '#FFFFFF',
      chip: 'background:#00C2FF;color:#1A0B3D;border:3px solid #FFFFFF;border-radius:6px 18px 6px 18px',
      label: 'background:#FFD400;color:#1A0B3D;border:3px solid #1A0B3D;border-radius:4px 14px 4px 14px;box-shadow:5px 5px 0 #FF3D81',
      ring: `border:4px solid ${a};border-radius:10px`,
      caption: 'background:#1A0B3D;color:#FFFFFF;border:3px solid #FF3D81;border-radius:6px 18px 6px 18px;box-shadow:5px 5px 0 #00C2FF',
      enter: 'pop', upper: false, wall: false, steps: 'row',
    }),
  },
  bento: {
    style: 'Bento grid', aliases: ['bento-grid', 'bentogrid'],
    use: 'feature overviews, "everything it does" videos',
    ink: '#0F1420', accent: '#F0A63A', mist: '#9AA6BC', paper: '#0F1420', band: '#0F1420', bandText: '#FFFFFF',
    fontPreset: 'modern', feel: 'crisp', radius: 0.04, mood: 'soft clean precise',
    backdrop: { colors: ['#0A0E18', '#1B2333', '#3B4A66'], pattern: 'glow' },
    look: (a) => ({
      canvas: '#0F1420', fg: '#FFFFFF', muted: '#9AA6BC', paper: '#0F1420', paperFg: '#FFFFFF',
      panel: 'background:#1B2333;border:1.5px solid #46557A;border-radius:22px', panelFg: '#FFFFFF',
      chip: 'background:#1B2333;border:1.5px solid #2F3B54;color:#FFFFFF;border-radius:14px',
      label: `background:${a};color:#0F1420;border-radius:10px;box-shadow:0 8px 22px rgba(0,0,0,.4)`,
      ring: `border:2.5px solid ${a};border-radius:14px`,
      caption: 'background:#1B2333;border:1.5px solid #2F3B54;color:#FFFFFF;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.4)',
      enter: 'rise', upper: false, wall: false, steps: 'grid',
    }),
  },
  real: {
    style: 'Skeuomorphism', aliases: ['skeuomorphism', 'skeumorphism', 'skeuomorphic'],
    use: 'music and audio tools, products about a physical thing, deliberate nostalgia',
    ink: '#2B2118', accent: '#F2C14E', mist: '#D9C7A8', paper: '#F4EBD9', band: '#2E2015', bandText: '#FBF3E4',
    fontPreset: 'elegant', feel: 'calm', radius: 0.026, mood: 'physical paper switch',
    backdrop: { colors: ['#2A1C10', '#5A3F27', '#C9A66B'], pattern: 'glow' },
    look: (a) => ({
      canvas: 'linear-gradient(#6B4E33,#3A2717)', fg: '#FBF3E4', muted: '#E2D2B4',
      paper: 'linear-gradient(#F6EEDD,#E4D5B8)', paperFg: '#2B2118',
      panel: 'background:linear-gradient(#FDFDFD,#D2D2D2);border:1px solid #868686;border-radius:12px;box-shadow:inset 0 1px 0 #FFFFFF,inset 0 -5px 9px rgba(0,0,0,.2),0 8px 14px rgba(0,0,0,.5)', panelFg: '#242424',
      chip: 'background:linear-gradient(#F7D774,#C08E22);color:#3B2A08;border:1px solid #8A6516;border-radius:999px;box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 4px 6px rgba(0,0,0,.45)',
      label: 'background:linear-gradient(#FFF8DC,#EFDf9A);color:#3B2A08;border:1px solid #B79B4A;border-radius:6px;box-shadow:0 5px 10px rgba(0,0,0,.45)',
      ring: `border:3px solid ${a};border-radius:10px`,
      caption: 'background:linear-gradient(#33271C,#1A130D);color:#FBF3E4;border:1px solid #7A5B3D;border-radius:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 8px 16px rgba(0,0,0,.5)',
      enter: 'rise', upper: false, wall: false, steps: 'row',
    }),
  },
  spatial: {
    style: 'Spatial UI', aliases: ['spatial-ui', 'visionos'],
    use: 'hardware, 3D and AR products, premium technology',
    ink: '#070A14', accent: '#7DD3FC', mist: '#C7D2FE', paper: '#0B1020', band: '#070A14', bandText: '#FFFFFF',
    fontPreset: 'geometric', feel: 'calm', radius: 0.05, mood: 'airy soft deep',
    backdrop: { colors: ['#05070F', '#1B2550', '#7DD3FC'], pattern: 'glow' },
    look: (a) => ({
      canvas: 'radial-gradient(circle at 50% 36%,#33427A 0%,#070A14 78%)', fg: '#FFFFFF', muted: 'rgba(255,255,255,.78)',
      paper: 'radial-gradient(circle at 50% 30%,#2A3D7A 0%,#080B18 80%)', paperFg: '#FFFFFF',
      panel: `${glassPanel('rgba(255,255,255,.13)', 'rgba(255,255,255,.36)', 28, 20, '0 30px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.38)')}`, panelFg: '#FFFFFF',
      chip: `${glassPanel('rgba(255,255,255,.12)', 'rgba(255,255,255,.4)', 999, 14, '0 12px 24px rgba(0,0,0,.45)')};color:#FFFFFF`,
      label: 'background:rgba(255,255,255,.93);color:#0B1020;border-radius:999px;box-shadow:0 14px 28px rgba(0,0,0,.55)',
      ring: `border:2.5px solid ${a};border-radius:18px`,
      caption: `${glassPanel('rgba(14,20,42,.74)', 'rgba(255,255,255,.3)', 999, 16, '0 16px 32px rgba(0,0,0,.55)')};color:#FFFFFF`,
      enter: 'depth', upper: false, wall: false, steps: 'row',
    }),
  },
  editorial: {
    style: 'Editorial', aliases: ['magazine', 'print'],
    use: 'finance, law, publishing, reports',
    ink: '#111111', accent: '#B4232A', mist: '#555555', paper: '#FFFFFF', band: '#FAF9F6', bandText: '#111111',
    fontPreset: 'editorial', feel: 'calm', radius: 0, mood: 'paper soft quiet',
    backdrop: { colors: ['#D9D6CE', '#E9E6DF', '#FFFFFF'], pattern: 'plain' },
    look: (a) => ({
      canvas: '#FAF9F6', fg: '#111111', muted: '#4A4A4A', paper: '#FFFFFF', paperFg: '#111111',
      panel: 'background:transparent;border-top:3px solid #111111;border-bottom:1.5px solid #111111;border-radius:0', panelFg: '#111111',
      chip: 'border-top:2.5px solid #111111;border-bottom:2.5px solid #111111;color:#111111;border-radius:0',
      label: 'background:#111111;color:#FFFFFF;border-radius:0',
      ring: `border:2.5px solid ${a};border-radius:0`,
      caption: 'background:#111111;color:#FFFFFF;border-radius:0',
      enter: 'rise', upper: false, wall: false, steps: 'row',
    }),
  },
  terminal: {
    style: 'Terminal', aliases: ['console', 'cli'],
    use: 'developer tools, APIs, security products',
    ink: '#08100B', accent: '#4ADE80', mist: '#86EFAC', paper: '#08100B', band: '#08100B', bandText: '#D1FAE5',
    fonts: { display: 'JetBrains Mono', text: 'IBM Plex Sans', mono: 'JetBrains Mono', displayWeight: 700, tracking: 0.4 },
    feel: 'crisp', radius: 0.012, mood: 'dry keys mechanical',
    backdrop: { colors: ['#030705', '#0C1A11', '#14532D'], pattern: 'plain' },
    look: (a) => ({
      canvas: '#08100B', fg: '#D1FAE5', muted: '#86EFAC', paper: '#08100B', paperFg: '#D1FAE5',
      panel: 'background:#0C1710;border:1.5px solid #2F8052;border-radius:6px', panelFg: '#D1FAE5',
      chip: `border:1.5px solid ${a};color:${a};border-radius:4px`,
      label: `background:${a};color:#08100B;border-radius:4px`,
      ring: `border:2.5px solid ${a};border-radius:4px`,
      caption: 'background:#0C1710;border:1.5px solid #23492F;color:#D1FAE5;border-radius:4px',
      enter: 'type', upper: false, wall: false, steps: 'row',
    }),
  },
}

/** The names a person can write, in the order they are listed to people. */
export const THEME_NAMES = Object.keys(THEMES)

/** The theme a word means: its own name, or one of its other names. */
export function themeNamed(name: string): { name: string; preset: ThemePreset } | null {
  const key = name.trim().toLowerCase().replace(/[\s_]+/g, '-')
  if (key === 'classic' || key === 'default') return null
  for (const [n, preset] of Object.entries(THEMES)) if (n === key || preset.aliases.includes(key)) return { name: n, preset }
  throw new Error(`unknown theme "${name}". Themes: classic, ${THEME_NAMES.join(', ')}`)
}

/** Whether a word names a theme. */
export function isTheme(name: unknown): boolean {
  if (typeof name !== 'string') return false
  try {
    themeNamed(name)
    return true
  } catch {
    return false
  }
}
