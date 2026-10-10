// The look of everything the video draws on top of the app: captions, callouts,
// the pointer, cards. One theme per video, so the overlays match the product.

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
}

export type ThemeInput = Partial<Omit<Theme, 'type'>> & { type?: Partial<Theme['type']> }

export function resolveTheme(input: ThemeInput = {}): Theme {
  return { ...defaultTheme, ...input, type: { ...defaultTheme.type, ...input.type } }
}

export const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)'
export const EASE_IN_OUT = 'cubic-bezier(.45,0,.2,1)'
