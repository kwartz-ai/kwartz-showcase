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
}

export type ThemeInput = Partial<Omit<Theme, 'type'>> & { type?: Partial<Theme['type']> }

export function resolveTheme(input: ThemeInput = {}): Theme {
  return { ...defaultTheme, ...input, type: { ...defaultTheme.type, ...input.type } }
}

export const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)'
export const EASE_IN_OUT = 'cubic-bezier(.45,0,.2,1)'
