// Fonts for video, from Google Fonts.
//
// Type on a video is read once, at a distance, often on a phone. That asks for
// three things a web page can get away without: a display face with real heavy
// weights for titles, a text face with open shapes that stays clear at caption
// size, and a mono face for small labels. The families below were each requested
// from Google Fonts with the weights a video uses; what came back is recorded here,
// so a stylesheet is never asked for weights a family does not have (Google then
// leaves that family out without a word, and the face falls back in the video).
// See docs/fonts.md for the reasoning behind the pairings.

export const FONTS_CHECKED = '2026-10-10'

export type FontKind = 'sans' | 'serif' | 'condensed' | 'rounded' | 'mono'
export interface FontInfo { weights: number[]; kind: FontKind }

const sans = (...weights: number[]): FontInfo => ({ weights, kind: 'sans' })
const of = (kind: FontKind, ...weights: number[]): FontInfo => ({ weights, kind })

/** Families checked against Google Fonts, with the weights that exist among those a
 *  video asks for (400 to 800). */
export const GOOGLE_FONTS: Record<string, FontInfo> = {
  // display and text sans
  'Plus Jakarta Sans': sans(400, 500, 600, 700, 800),
  'Inter': sans(400, 500, 600, 700, 800),
  'Sora': sans(400, 500, 600, 700, 800),
  'Manrope': sans(400, 500, 600, 700, 800),
  'Outfit': sans(400, 500, 600, 700, 800),
  'Space Grotesk': sans(400, 500, 600, 700),
  'Bricolage Grotesque': sans(400, 500, 600, 700, 800),
  'Poppins': sans(400, 500, 600, 700, 800),
  'Montserrat': sans(400, 500, 600, 700, 800),
  'Urbanist': sans(400, 500, 600, 700, 800),
  'Figtree': sans(400, 500, 600, 700, 800),
  'Lexend': sans(400, 500, 600, 700, 800),
  'Archivo': sans(400, 500, 600, 700, 800),
  'Syne': sans(400, 500, 600, 700, 800),
  'Unbounded': sans(400, 500, 600, 700, 800),
  'Geist': sans(400, 500, 600, 700, 800),
  'Onest': sans(400, 500, 600, 700, 800),
  'Instrument Sans': sans(400, 500, 600, 700),
  'Red Hat Display': sans(400, 500, 600, 700, 800),
  'Schibsted Grotesk': sans(400, 500, 600, 700, 800),
  'Hanken Grotesk': sans(400, 500, 600, 700, 800),
  'Albert Sans': sans(400, 500, 600, 700, 800),
  'Be Vietnam Pro': sans(400, 500, 600, 700, 800),
  'Rubik': sans(400, 500, 600, 700, 800),
  'DM Sans': sans(400, 500, 600, 700),
  'Roboto': sans(400, 500, 600, 700),
  'IBM Plex Sans': sans(400, 500, 600, 700),
  'Source Sans 3': sans(400, 500, 600, 700),
  'Work Sans': sans(400, 500, 600, 700),
  'Nunito Sans': sans(400, 500, 600, 700),
  'Public Sans': sans(400, 500, 600, 700),
  'Open Sans': sans(400, 500, 600, 700),
  'Noto Sans': sans(400, 500, 600, 700),
  'Mulish': sans(400, 500, 600, 700),
  'Karla': sans(400, 500, 600, 700),
  'Lato': sans(400, 700),
  // serif
  'Fraunces': of('serif', 400, 500, 600, 700, 800),
  'Playfair Display': of('serif', 400, 500, 600, 700, 800),
  'Newsreader': of('serif', 400, 500, 600, 700, 800),
  'Source Serif 4': of('serif', 400, 500, 600, 700, 800),
  'Lora': of('serif', 400, 500, 600, 700),
  'DM Serif Display': of('serif', 400),
  'Instrument Serif': of('serif', 400),
  // condensed: tall and narrow, for short loud lines
  'Barlow Condensed': of('condensed', 400, 500, 600, 700, 800),
  'Oswald': of('condensed', 400, 500, 600, 700),
  'Bebas Neue': of('condensed', 400),
  'Anton': of('condensed', 400),
  // rounded: soft and friendly
  'Nunito': of('rounded', 400, 500, 600, 700, 800),
  'Quicksand': of('rounded', 400, 500, 600, 700),
  'Baloo 2': of('rounded', 400, 500, 600, 700, 800),
  'Fredoka': of('rounded', 400, 500, 600, 700),
  // mono
  'JetBrains Mono': of('mono', 400, 500, 700),
  'IBM Plex Mono': of('mono', 400, 500, 700),
  'Roboto Mono': of('mono', 400, 500, 700),
  'Geist Mono': of('mono', 400, 500, 700),
  'Fira Code': of('mono', 400, 500, 700),
  'Source Code Pro': of('mono', 400, 500, 700),
  'Red Hat Mono': of('mono', 400, 500, 700),
  'DM Mono': of('mono', 400, 500),
  'Space Mono': of('mono', 400, 700),
}

export type FontRole = 'display' | 'text' | 'mono'
export interface FontSet { display: string; text: string; mono: string }

export interface FontPreset extends FontSet {
  /** Weight of titles. A serif or a single-weight face cannot carry 800. */
  displayWeight: number
  /** Multiplier for the tight tracking of titles: 1 for a grotesque, less for a
   *  serif, 0 for a condensed face that is already narrow. */
  tracking: number
  /** Multiplier for the size of main titles. Default 1. */
  titleScale?: number
  /** What kind of product or video it suits. */
  use: string
}

/** Pairings chosen for video. Each has a display face with presence, a text face
 *  that stays clear at caption size, and a mono face that sits well beside them. */
export const FONT_PRESETS: Record<string, FontPreset> = {
  modern: { display: 'Plus Jakarta Sans', text: 'Inter', mono: 'JetBrains Mono', displayWeight: 800, tracking: 1, use: 'the default: business software, dashboards, most products' },
  geometric: { display: 'Sora', text: 'DM Sans', mono: 'DM Mono', displayWeight: 700, tracking: 0.9, use: 'young technology products, AI tools, a clean and confident look' },
  technical: { display: 'Space Grotesk', text: 'IBM Plex Sans', mono: 'IBM Plex Mono', displayWeight: 700, tracking: 0.8, use: 'developer tools, data and infrastructure products' },
  minimal: { display: 'Geist', text: 'Geist', mono: 'Geist Mono', displayWeight: 700, tracking: 1, use: 'quiet, precise interfaces where the product should do the talking' },
  bold: { display: 'Bricolage Grotesque', text: 'Inter', mono: 'JetBrains Mono', displayWeight: 800, tracking: 0.9, use: 'launch videos and marketing with character' },
  editorial: { display: 'Fraunces', text: 'Source Sans 3', mono: 'IBM Plex Mono', displayWeight: 600, tracking: 0.35, use: 'finance, legal, health, publishing: a product that must feel trusted' },
  elegant: { display: 'Playfair Display', text: 'Work Sans', mono: 'Roboto Mono', displayWeight: 700, tracking: 0.3, use: 'premium and lifestyle products' },
  friendly: { display: 'Nunito', text: 'Nunito Sans', mono: 'Roboto Mono', displayWeight: 800, tracking: 0.6, use: 'consumer apps, education, anything for a wide audience' },
  playful: { display: 'Fredoka', text: 'Nunito Sans', mono: 'DM Mono', displayWeight: 600, tracking: 0.3, use: 'products for children, games, light-hearted videos' },
  poster: { display: 'Barlow Condensed', text: 'Inter', mono: 'JetBrains Mono', displayWeight: 800, tracking: 0, titleScale: 1.28, use: 'short vertical video: a tall, loud title that fills a phone screen' },
  corporate: { display: 'Manrope', text: 'Public Sans', mono: 'Roboto Mono', displayWeight: 800, tracking: 1, use: 'enterprise and public-sector products: neutral and serious' },
}

/** The weights each role is drawn in. */
export const ROLE_WEIGHTS: Record<FontRole, number[]> = { display: [500, 600, 700, 800], text: [400, 500, 600, 700], mono: [500, 700] }

/** The weights to ask Google for: those the role uses that the family has. A
 *  family with none of them is asked for what it has; an unknown family is asked
 *  for what the role uses, and checked before the render (see `workingFontsUrl`). */
export function weightsFor(family: string, role: FontRole): number[] {
  const known = GOOGLE_FONTS[family]
  if (!known) return ROLE_WEIGHTS[role]
  const have = ROLE_WEIGHTS[role].filter((w) => known.weights.includes(w))
  return have.length ? have : known.weights
}

const familyParam = (family: string, weights: number[] | null) =>
  `family=${family.trim().replace(/ +/g, '+')}${weights ? `:wght@${weights.join(';')}` : ''}`

/** One stylesheet address for the three faces. A family used in two roles is
 *  asked for once, with the weights of both. */
export function googleFontsUrl(fonts: FontSet): string {
  const want = new Map<string, Set<number>>()
  for (const role of ['display', 'text', 'mono'] as const) {
    const set = want.get(fonts[role]) ?? want.set(fonts[role], new Set()).get(fonts[role])!
    for (const w of weightsFor(fonts[role], role)) set.add(w)
  }
  return 'https://fonts.googleapis.com/css2?'
    + [...want].map(([family, weights]) => familyParam(family, [...weights].sort((a, b) => a - b))).join('&')
    + '&display=swap'
}

/** The faces to wait for before the first frame. */
export function facesToLoad(fonts: FontSet, displayWeight = 800): string[] {
  return [`${displayWeight} 40px "${fonts.display}"`, `500 20px "${fonts.text}"`, `500 16px "${fonts.mono}"`]
}

/** The families in a stylesheet address, with the weights asked for. */
export function familiesIn(url: string): { family: string; weights: number[] | null }[] {
  return [...url.matchAll(/family=([^&:]+)(?::wght@([\d;]+))?/g)]
    .map((m) => ({ family: decodeURIComponent(m[1]!.replace(/\+/g, ' ')), weights: m[2] ? m[2].split(';').map(Number) : null }))
}

const BROWSER = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }

/** The stylesheet Google sends for an address: its text, '' when Google refuses
 *  it, null when Google cannot be reached. */
async function stylesheet(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: BROWSER })
    return res.ok ? await res.text() : ''
  } catch {
    return null       // no network: nothing can be said
  }
}
const provides = (css: string, family: string) => css.includes(`font-family: '${family}'`)
const only = (param: string) => `https://fonts.googleapis.com/css2?${param}&display=swap`

/** Whether Google Fonts has a family at all. Null when it cannot be reached. */
export async function onGoogleFonts(family: string): Promise<boolean | null> {
  if (GOOGLE_FONTS[family]) return true
  if (!family || /["';<>]/.test(family)) return false
  const css = await stylesheet(only(familyParam(family, null)))
  return css === null ? null : provides(css, family)
}

/** Make sure a stylesheet address gives every family it names, before a render
 *  depends on it. Google leaves a family out without a word when it has none of
 *  the weights asked for, and that face then falls back in the video. A family
 *  that is left out is asked for again in its regular weight alone; one that
 *  Google does not have at all is named in the error. */
export async function workingFontsUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith('https://fonts.googleapis.com/css2?')) return url
  const css = await stylesheet(url)
  if (css === null) return url              // no network: the render will say which faces fell back
  const families = familiesIn(url)
  if (families.every((f) => provides(css, f.family))) return url
  const params: string[] = []
  const missing: string[] = []
  for (const f of families) {
    const asked = familyParam(f.family, f.weights)
    if (provides(css, f.family)) params.push(asked)
    else if (provides(await stylesheet(only(familyParam(f.family, null))) ?? '', f.family)) params.push(familyParam(f.family, null))
    else missing.push(f.family)
  }
  if (missing.length) {
    throw new Error(`Google Fonts has no font named ${missing.map((m) => `"${m}"`).join(', ')}. Check the spelling, pick one from docs/fonts.md, `
      + 'or set "style.fontSource" to "installed" if the font is on this machine.')
  }
  return only(params.join('&'))
}
