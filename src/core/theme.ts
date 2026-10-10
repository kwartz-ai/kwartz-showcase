// The look of everything the video draws on top of the app: captions, callouts,
// the pointer, cards. One theme per video, so the overlays match the product.

/** The border every video gets unless it is turned off. */
export const DEFAULT_BORDER = {
  on: true,
  inset: 0.022,
  radius: 0.034,
  colors: ['#1B2A8F', '#3D5AF1', '#B9A5FF'] as [string, string, string],
  shadow: 0.45,
  pattern: 'glow' as 'glow' | 'waves' | 'plain',
  image: null as string | null,
}

/** How surfaces are drawn: the part of a theme that makes glass look like glass
 *  and clay like clay. Every value is CSS, written for a wide frame at its natural
 *  size; `scaleCss` adapts the lengths for other frames. Use single quotes only. */
export interface Look {
  /** Background of a dark, full-screen card. */
  canvas: string
  /** Text on the canvas, and quieter text on it. */
  fg: string
  muted: string
  /** Background and text of a light card (the "how it works" card). */
  paper: string
  paperFg: string
  /** A panel: a card within a card. Background, border, radius, shadow. */
  panel: string
  panelFg: string
  /** A chip: a small rounded tag. Its text colour is included. */
  chip: string
  /** The callout label beside a spotlight. Its text colour is included. */
  label: string
  /** The spotlight ring: border and radius. */
  ring: string
  /** The caption box. Its text colour is included. */
  caption: string
  /** How things arrive: rise softly, pop, cut in at once, float in out of a blur,
   *  be typed from the left, or come forward out of the depth. */
  enter: 'rise' | 'pop' | 'cut' | 'float' | 'type' | 'depth'
  /** Titles in capitals. */
  upper: boolean
  /** Rows of anonymous data drifting behind the opening card. */
  wall: boolean
  /** Steps of a "how it works" card in a row, or as a grid of tiles. */
  steps: 'row' | 'grid'
}

/** Multiply every px length in a piece of CSS. */
export const scaleCss = (css: string, k: number) => k === 1 ? css
  : css.replace(/(-?\d+(?:\.\d+)?)px/g, (_, n: string) => `${+(Number(n) * k).toFixed(2)}px`)

/** The kit's own look, built from a theme's four colours. */
export function classicLook(c: { ink: string; accent: string; mist: string; paper: string }): Look {
  return {
    canvas: c.ink, fg: '#fff', muted: c.mist,
    paper: c.paper, paperFg: c.ink,
    panel: 'background:#fff;border:1px solid rgba(11,29,53,.14);border-radius:16px;box-shadow:0 10px 30px rgba(11,29,53,.07)',
    panelFg: c.ink,
    chip: `border:2px solid ${c.accent};color:#fff;border-radius:999px`,
    label: `background:${c.accent};color:${c.ink};border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.28)`,
    ring: `border:2.5px solid ${c.accent};border-radius:8px`,
    caption: `background:${c.ink};opacity:.94;color:#fff;border-radius:11px;box-shadow:0 8px 28px rgba(0,0,0,.28)`,
    enter: 'rise', upper: false, wall: true, steps: 'row',
  }
}

export interface Theme {
  /** Dark colour: card backgrounds, caption box, pointer. */
  ink: string
  /** The one highlight colour: spotlight ring, callout labels, overlines. */
  accent: string
  /** Secondary text on dark cards. */
  mist: string
  /** Light page colour, behind light cards. */
  paper: string
  /** Font stacks. Use single quotes only: they are placed inside style attributes. */
  type: {
    /** Cards and titles: heavy, tightly tracked. */
    display: string
    /** Captions and labels. Best set to the app's own face. */
    text: string
    /** Small overlines and data. */
    mono: string
  }
  /** A stylesheet URL that provides the faces above, linked into the page before
   *  recording. Null when every face is already installed or loaded by the app. */
  fontsCss: string | null
  /** Faces to wait for before the first frame, in CSS `font` shorthand. */
  fontsToLoad: string[]
  /** Weight of titles on cards. 800 suits a grotesque; a serif wants less. */
  displayWeight: number
  /** Multiplier for the tight tracking of titles: 1 for a grotesque, less for a
   *  serif, 0 for a condensed face. */
  tracking: number
  /** Multiplier for the size of main titles: a condensed face needs to be larger
   *  to carry the same weight on screen. */
  titleScale: number
  /** Multiplier for the type on cards, so a card fits a narrower frame. */
  scale: number
  /** Multiplier for caption size. */
  captionScale: number
  /** How things arrive on cards: a CSS easing curve. */
  ease: string
  /** Multiplier for how long card movements take. Above 1 is slower. */
  speed: number
  /** How surfaces are drawn. Left out, it is the kit's own look in this theme's colours. */
  look: Look
  /** The solid colour behind captions that are drawn on the frame, and around a
   *  product window. Left out, it is `ink`. */
  band: string
  /** The colour of captions drawn on the band. */
  bandText: string
  /** The name of the theme this came from, for the record. */
  name: string
}

export const defaultTheme: Theme = {
  ink: '#0B1D35',
  accent: '#F59E0B',
  mist: '#B8C7DA',
  paper: '#F4F7FB',
  type: {
    display: `'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, sans-serif`,
    text: `'Inter', 'Segoe UI', system-ui, sans-serif`,
    mono: `'JetBrains Mono', Consolas, monospace`,
  },
  fontsCss: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap',
  fontsToLoad: ['800 40px "Plus Jakarta Sans"', '600 20px "Plus Jakarta Sans"', '500 16px "JetBrains Mono"', '500 20px "Inter"', '700 16px "Inter"'],
  displayWeight: 800,
  tracking: 1,
  titleScale: 1,
  scale: 1,
  captionScale: 1,
  ease: 'cubic-bezier(.2,.8,.2,1)',
  speed: 1,
  look: classicLook({ ink: '#0B1D35', accent: '#F59E0B', mist: '#B8C7DA', paper: '#F4F7FB' }),
  band: '#0B1D35',
  bandText: '#fff',
  name: 'classic',
}

export type ThemeInput = Partial<Omit<Theme, 'type'>> & { type?: Partial<Theme['type']> }

export function resolveTheme(input: ThemeInput = {}): Theme {
  const theme = { ...defaultTheme, ...input, type: { ...defaultTheme.type, ...input.type } }
  // a theme that only changes colours keeps the kit's look, in those colours
  if (!input.look) theme.look = classicLook(theme)
  if (!input.band) theme.band = theme.ink
  return theme
}

export const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)'
export const EASE_IN_OUT = 'cubic-bezier(.45,0,.2,1)'
