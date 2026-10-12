// The theme studio's own logic: turning what a visitor chose into a theme file, a
// config and a prompt. Everything about what a theme IS comes from the kit's code,
// bundled by scripts/sync-engine.mjs: the looks, the rules and the cards.
import * as engine from '@/lib/generated/engine.js'

export interface Look {
  canvas: string
  fg: string
  muted: string
  paper: string
  paperFg: string
  panel: string
  panelFg: string
  chip: string
  label: string
  ring: string
  caption: string
  enter: string
  upper: boolean
}
export interface Preset {
  style: string
  use: string
  ink: string
  accent: string
  band: string
  bandText: string
  fontPreset?: string
  fonts?: { display: string; text: string; mono: string }
  feel: Feel
  radius: number
  backdrop: { colors: [string, string, string]; pattern: 'glow' | 'waves' | 'plain' }
  look: (accent: string) => Look
}
export interface CardTheme {
  accent: string
  look: Look
  type: { display: string; text: string; mono: string }
  fontsCss: string | null
  displayWeight: number
}
export type Feel = 'calm' | 'crisp' | 'lively'
export interface ThemeFile {
  description?: string
  extends?: string
  colors?: { accent?: string; ink?: string }
  fontPreset?: string
  feel?: Feel
  radius?: number
  backdrop?: string[]
  look?: { label?: string }
}

// the kit's functions, with the types this page needs
const kit = engine as unknown as {
  THEMES: Record<string, Preset>
  THEME_NAMES: string[]
  FONT_PRESETS: Record<string, { display: string; text: string; mono: string; use: string }>
  defaultTheme: { ink: string; accent: string }
  checkThemeFile: (file: unknown) => string[]
  checkThemeName: (name: string) => string | null
  checkReadable: (preset: Preset) => { errors: string[]; warnings: string[] }
  presetFrom: (file: ThemeFile) => Preset
  presetTheme: (preset: Preset, name: string) => object
  resolveTheme: (input: object) => CardTheme
  CARD_KEYS: string
  hookCard: (theme: CardTheme, card: object, ms: number) => string
  stepsCard: (theme: CardTheme, card: object, ms: number) => string
  endCard: (theme: CardTheme, card: object, ms: number) => string
}

export const BASES = ['classic', ...kit.THEME_NAMES]
export const FONT_PAIRINGS = Object.entries(kit.FONT_PRESETS).map(([name, f]) => ({ name, display: f.display, text: f.text, use: f.use }))
export const FEELS: Feel[] = ['calm', 'crisp', 'lively']

export const LENGTHS = [30, 60, 90, 180]
/** The shortest and longest video the kit's config accepts, in seconds. */
export const LENGTH_MIN = 10
export const LENGTH_MAX = 600
export const PLATFORM_SETS = [
  { id: 'youtube', label: 'YouTube (16:9)' },
  { id: 'youtube,instagram-reel', label: 'YouTube and Reels (16:9 and 9:16)' },
  { id: 'linkedin', label: 'LinkedIn (1:1)' },
  { id: 'youtube,youtube-shorts,linkedin', label: 'YouTube, Shorts and LinkedIn' },
]

export interface Choice {
  kind: 'site' | 'deck'
  base: string
  accent: string
  ink: string
  fontPreset: string
  feel: Feel
  radius: number
  brandLabel: boolean
  /** The backdrop behind the picture drawn in shades of the brand colour, not the look's own. */
  brandBackdrop: boolean
  name: string
  url: string
  about: string
  length: number
  platforms: string
}

/** What a base gives before anything is changed. "classic" is the kit's own look. */
export function baseOf(base: string) {
  const t = base === 'classic' ? null : kit.THEMES[base]!
  return {
    style: t?.style ?? "The kit's own look",
    use: t?.use ?? 'business software, dashboards, most products',
    accent: t?.accent ?? kit.defaultTheme.accent,
    ink: t?.ink ?? kit.defaultTheme.ink,
    // a base with faces of its own (terminal) has no pairing: it keeps them until one is chosen
    fontPreset: t ? (t.fontPreset ?? '') : 'modern',
    ownFaces: t?.fonts ? `${t.fonts.display}` : '',
    feel: (t?.feel ?? 'calm') as Feel,
    radius: t?.radius ?? 0.034,
    canvas: t ? t.look(t.accent).canvas : kit.defaultTheme.ink,
  }
}

export const startFrom = (base: string, keep: Pick<Choice, 'kind' | 'name' | 'url' | 'about' | 'length' | 'platforms'>): Choice => {
  const b = baseOf(base)
  return { ...keep, base, accent: b.accent, ink: b.ink, fontPreset: b.fontPreset, feel: b.feel, radius: b.radius, brandLabel: false, brandBackdrop: false }
}

export const HEX = /^#[0-9a-fA-F]{6}$/

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)

/** A colour moved toward white (amount above 0) or toward black (below 0). */
function shade(hex: string, amount: number) {
  const to = amount > 0 ? 255 : 0
  const k = Math.abs(amount)
  return '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k) + to * k).toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** A backdrop in the brand colour: two close shades of it and a lighter one for the
 *  glow, as the theme skill advises. Light looks get a light backdrop, dark looks a deep one. */
export function backdropOf(accent: string, base: string): string[] {
  const canvas = baseOf(base).canvas
  const light = HEX.test(canvas) ? luminance(canvas) > 0.5 : false
  return light ? [shade(accent, 0.62), shade(accent, 0.78), shade(accent, 0.92)] : [shade(accent, -0.72), shade(accent, -0.38), shade(accent, 0.45)]
}

/** White or near-black, whichever reads better on a colour. Only used to pick the text
 *  of a brand-coloured label; whether the result passes is the kit's rule to decide. */
export const textOn = (hex: string) => (1.05 / (luminance(hex) + 0.05) >= (luminance(hex) + 0.05) / 0.055 ? '#FFFFFF' : '#10131C')

export const cleanName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^[^a-z]+|-+$/g, '') || 'my-brand'

/** The theme file for a choice: only what differs from its base is written. */
export function themeFileOf(c: Choice): ThemeFile {
  const b = baseOf(c.base)
  const file: ThemeFile = { description: `A theme for ${cleanName(c.name)}, from the ${c.base} look`, extends: c.base, colors: { accent: c.accent.toUpperCase() } }
  if (c.base === 'classic' && c.ink.toUpperCase() !== b.ink.toUpperCase()) file.colors!.ink = c.ink.toUpperCase()
  if (c.fontPreset && c.fontPreset !== b.fontPreset) file.fontPreset = c.fontPreset
  if (c.feel !== b.feel) file.feel = c.feel
  if (Math.abs(c.radius - b.radius) > 0.0005) file.radius = Number(c.radius.toFixed(3))
  if (c.brandBackdrop) file.backdrop = backdropOf(c.accent, c.base)
  if (c.brandLabel) file.look = { label: `background:{accent};color:${textOn(c.accent)};border-radius:12px` }
  return file
}

export function configOf(c: Choice) {
  return {
    name: c.kind === 'deck' ? 'talk' : 'demo',
    ...(c.kind === 'deck' ? { motionOnly: true } : { url: c.url.trim() }),
    length: c.length,
    platforms: c.platforms.split(','),
    theme: cleanName(c.name),
  }
}

/** The skills `showcase init --config --theme <base>` copies into a project. */
export const skillsOf = (c: Choice) => ['kwartz-showcase', ...(c.base === 'classic' ? [] : [`showcase-theme-${c.base}`]), 'showcase-theme-new']

/** The engine's verdict on a choice: the shape of the file, then whether it reads on video. */
export function verdictOf(c: Choice) {
  const file = themeFileOf(c)
  const shape = kit.checkThemeFile(file)
  const nameProblem = kit.checkThemeName(cleanName(c.name))
  if (shape.length) return { file, errors: shape, warnings: [] as string[], nameProblem }
  const { errors, warnings } = kit.checkReadable(kit.presetFrom(file))
  return { file, errors, warnings, nameProblem }
}

/** The rules the kit holds every theme to, in the words its messages use. */
export const RULES = [
  { key: 'caption text on its box', label: 'Caption text on its box', min: 7 },
  { key: 'captions on the band of a tall frame', label: 'Captions on a tall frame', min: 7 },
  { key: 'text on the ground of a card', label: 'Text on a card', min: 7 },
  { key: 'text on the light ground', label: 'Text on the light ground', min: 7 },
  { key: 'the highlight on the ground of a card', label: 'Brand colour on a card', min: 3 },
  { key: 'the callout label', label: 'The callout label', min: 4.5 },
  { key: 'text on a panel', label: 'Text on a panel', min: 4.5 },
]

export type Scene = 'hook' | 'steps' | 'shot' | 'end'

/** One frame of a video in this theme, as a page for a preview frame. The cards are
 *  drawn by the kit's own card functions, at the size a landscape video lays them out
 *  (1536 by 864, shown at 1.25 in a 1920 by 1080 frame). */
export function frameOf(c: Choice, scene: Scene): { html: string; backdrop: string } {
  const preset = kit.presetFrom(themeFileOf(c))
  const theme = kit.resolveTheme(kit.presetTheme(preset, cleanName(c.name)))
  const deck = c.kind === 'deck'
  const ms = 3200
  const caption = (text: string) =>
    `<div style="position:absolute;left:50%;bottom:46px;transform:translateX(-50%);padding:11px 24px;white-space:nowrap;font:600 23px/1.3 ${theme.type.text};${theme.look.caption}">${text}</div>`
  let body = ''
  if (scene === 'hook') {
    body =
      kit.hookCard(theme, deck ? { overline: 'A NEW IDEA', title: 'Three things changed.', sub: 'Here is what they mean.', questions: ['What comes next?'] } : { overline: 'THE PROBLEM', title: 'One demo video.', sub: 'A week of work.', questions: ['Then the product changes.'] }, ms) +
      caption('The voice reads this line, and the caption follows.')
  } else if (scene === 'steps') {
    body =
      kit.stepsCard(theme, { overline: 'HOW IT WORKS', title: deck ? 'Three points, in order' : 'From a script to a video', steps: deck ? [{ title: 'Where we are', body: 'the numbers today' }, { title: 'What changed', body: 'three things' }, { title: 'What is next', body: 'the plan' }] : [{ title: 'Script', body: 'one line per scene' }, { title: 'Browser', body: 'films the real product' }, { title: 'Voice', body: 'reads the line' }] }, ms) +
      caption(deck ? 'Each point arrives as the voice reaches it.' : 'A real browser films your product.')
  } else if (scene === 'end') {
    body = kit.endCard(theme, { title: cleanName(c.name), overline: deck ? 'A PRESENTATION' : 'VIDEO FROM A SCRIPT', chips: ['Written', 'Rendered', 'Checked'], cta: 'Make your first video.', ctaSub: 'bunx showcase init --config' }, ms) + caption('The ending names the next step.')
  } else {
    // over a product: the highlight ring, the callout label and the caption, in the theme's own styles
    const row = (w: number, dark = false) => `<div style="height:16px;width:${w}%;border-radius:8px;background:${dark ? '#3B4254' : '#D9DCE6'}"></div>`
    body = `<div style="position:absolute;inset:0;background:#7C8090"></div>
      <div style="position:absolute;left:190px;right:190px;top:110px;height:450px;background:#fff;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.25);padding:32px;display:flex;flex-direction:column;gap:20px;box-sizing:border-box">
        ${row(36, true)}${row(84)}${row(70)}
        <div style="position:relative;height:48px;border-radius:10px;background:#EEF0F6">
          <div style="position:absolute;inset:-9px;${theme.look.ring}"></div>
          <div style="position:absolute;left:0;top:66px;padding:9px 18px;white-space:nowrap;font:700 19px/1.2 ${theme.type.text};${theme.look.label}">Why this matters</div>
        </div>
        <div style="margin-top:56px">${row(58)}</div>
      </div>${caption('One click keeps only what changed.')}`
  }
  const fonts = theme.fontsCss ? `<link rel="stylesheet" href="${theme.fontsCss}">` : ''
  const html = `<!doctype html><html><head><meta charset="utf-8">${fonts}<style>html,body{margin:0;width:1536px;height:864px;overflow:hidden;position:relative}</style>${kit.CARD_KEYS}</head><body>${body}</body></html>`
  const [from, to, glow] = preset.backdrop.colors
  const backdrop = preset.backdrop.pattern === 'plain' ? `linear-gradient(135deg, ${from}, ${to})` : `radial-gradient(ellipse at 28% 18%, ${glow} 0%, ${to} 45%, ${from} 100%)`
  return { html, backdrop }
}

// The work order asks for an audience, a promise and a next step. The page does not
// collect them, so the prompt says who decides.
const choose = (deck: boolean) => `Choose the audience and the promise yourself, and tell me which you chose. I gave no call to action: end on ${deck ? 'the title of the talk' : 'the name of the product'}, with no next step.`

/** One prompt for Claude Code that carries everything: the kit, the skills, the theme
 *  file, the config and what to make. Each step is a real command of the kit. */
export function promptOf(c: Choice): string {
  const name = cleanName(c.name)
  const deck = c.kind === 'deck'
  const init = `bunx showcase init --config${deck ? ' --motion' : ''}${c.base === 'classic' ? '' : ` --theme ${c.base}`}`
  return [
    deck
      ? `Make a ${c.length} second presentation video with Kwartz Showcase. No product is filmed: every scene is a motion graphic.`
      : `Make a ${c.length} second demo video of ${c.url.trim()} with Kwartz Showcase.`,
    `${deck ? 'The topic' : 'It should show'}: ${c.about.trim().replace(/\.$/, '')}.`,
    '',
    'Do this in order. If a step fails, stop and tell me what the error says.',
    '',
    '1. Install the kit in this folder. If this folder has no package.json, create one first: { "name": "my-video", "private": true, "type": "module" }. Then run "bun add -d kwartz-showcase". If Bun is not installed, run "npm install --save-dev kwartz-showcase" and write "npx" wherever these steps say "bunx".',
    '2. Run "bunx showcase doctor". It lists what is missing, and ends with an error when something is: that is expected. If chromium or voice is missing, run "bunx showcase setup" yourself: it is a one-time download of about 350 MB. If ffmpeg or python is missing, tell me what to install and wait for me.',
    `3. Run "${init}". This adds the config, a starter video.ts and the skills: ${skillsOf(c).join(', ')}. Then add "out/" and ".showcase/" to .gitignore (create the file if there is none).`,
    `4. Save this as themes/${name}.json, exactly as written:`,
    '',
    JSON.stringify(themeFileOf(c), null, 2),
    '',
    '5. Replace the settings in showcase.config.json with these (keep its "$schema" line):',
    '',
    JSON.stringify(configOf(c), null, 2),
    '',
    `6. Run "bunx showcase theme check ${name}". It must pass. Do not change the theme unless it fails.`,
    deck
      ? `7. Follow the kwartz-showcase skill from here. There is no product, so nothing is explored. Run "bunx showcase plan" for the word budget, write the script first, then write every scene as a motion scene: an opening, one scene for each point, and a close. The plan's table may show fewer scenes: keep its word total, and share it across yours. ${choose(true)}`
      : `7. Follow the kwartz-showcase skill from here. Run "bunx showcase explore" and "bunx showcase plan", write the script first, then the scenes. The map's screenshots show only the top of each page: for something further down, scroll it into view in the scene before you click or highlight it. ${choose(false)}`,
    '8. Run "bunx showcase make --draft" until it prints no FAIL line, the length included, and frames from every scene look right. Then run "bunx showcase make". If the full render fails the length check, add or cut the words it says and run it again.',
    '9. Look at frames from the finished video (take stills with ffmpeg): every scene, and every shape if there is more than one. A file named after a platform is a copy of a shape, not another shape. Report each check line with the value it measured.',
    '10. You cannot hear the video. End by asking me to listen to it once before I share it.',
  ].join('\n')
}

// Colours that hold up on video: saturated enough to read as a highlight, and none
// of them a default blue. Bright ones suit dark looks, deep ones suit light looks; the
// kit's contrast rule decides which a look can carry.
const BRIGHT = ['#FDE68A', '#FBBF24', '#FB923C', '#F472B6', '#A3E635', '#34D399', '#22D3EE', '#C4B5FD', '#FCA5A5']
const DEEP = ['#6A4BEA', '#4338CA', '#1D4ED8', '#0F766E', '#15803D', '#B4232A', '#C2410C', '#BE185D', '#7C3AED', '#0E7490', '#1F2937']

/** What goes well with each look: the font pairings that suit its character, the ways
 *  it may move, and how round its picture may be. "" keeps the look's own faces. */
const RECIPES: Record<string, { fonts: string[]; feels: Feel[]; radii: number[] }> = {
  classic: { fonts: ['modern', 'corporate', 'geometric'], feels: ['calm', 'crisp'], radii: [0.026, 0.034, 0.044] },
  minimal: { fonts: ['minimal', 'modern', 'corporate'], feels: ['crisp', 'calm'], radii: [0.012, 0.022, 0.03] },
  glass: { fonts: ['geometric', 'modern', 'bold'], feels: ['calm', 'lively'], radii: [0.034, 0.04, 0.052] },
  liquid: { fonts: ['modern', 'geometric', 'friendly'], feels: ['calm', 'lively'], radii: [0.04, 0.05, 0.06] },
  soft: { fonts: ['corporate', 'friendly', 'modern'], feels: ['calm'], radii: [0.04, 0.05, 0.06] },
  clay: { fonts: ['playful', 'friendly', 'geometric'], feels: ['lively', 'calm'], radii: [0.05, 0.06, 0.07] },
  brutal: { fonts: ['technical', 'poster', 'bold'], feels: ['crisp'], radii: [0, 0, 0.006] },
  maximal: { fonts: ['bold', 'poster', 'playful'], feels: ['lively', 'crisp'], radii: [0.02, 0.034, 0.05] },
  bento: { fonts: ['modern', 'geometric', 'technical'], feels: ['crisp', 'calm'], radii: [0.034, 0.045, 0.055] },
  real: { fonts: ['elegant', 'editorial'], feels: ['calm'], radii: [0.02, 0.03, 0.04] },
  spatial: { fonts: ['geometric', 'modern', 'minimal'], feels: ['calm'], radii: [0.04, 0.05, 0.06] },
  editorial: { fonts: ['editorial', 'elegant'], feels: ['calm', 'crisp'], radii: [0, 0.006, 0.012] },
  terminal: { fonts: ['', 'technical'], feels: ['crisp'], radii: [0.008, 0.014, 0.022] },
}

const pick = <T,>(list: T[], random: () => number): T => list[Math.floor(random() * list.length)]!

/** A new theme, chosen by chance from combinations that suit each other. It differs
 *  from the one on screen, and it is only returned when the kit's rules accept it with
 *  nothing left to judge by eye, so a surprise is never a theme that cannot be read. */
export function surprise(now: Choice, random: () => number = Math.random): Choice {
  const keep = { kind: now.kind, name: now.name, url: now.url, about: now.about, length: now.length, platforms: now.platforms }
  let fallback: Choice | null = null
  for (let attempt = 0; attempt < 80; attempt++) {
    const base = pick(BASES.filter((b) => b !== now.base), random)
    const recipe = RECIPES[base]!
    const from = startFrom(base, keep)
    // most of the time a new brand colour; sometimes the look's own, which always suits it
    const accent = random() < 0.2 ? from.accent : pick([...BRIGHT, ...DEEP], random)
    const next: Choice = { ...from, accent, fontPreset: pick(recipe.fonts, random), feel: pick(recipe.feels, random), radius: pick(recipe.radii, random), brandLabel: random() < 0.25, brandBackdrop: accent !== from.accent }
    const verdict = verdictOf(next)
    if (verdict.errors.length) continue
    // a strong highlight, not one that only just passes: the kit asks 3 to 1, a designer wants more
    const canvas = baseOf(base).canvas
    if (HEX.test(canvas) && contrast(accent, canvas) < 4.5) continue
    if (!verdict.warnings.length || accent === from.accent) return next
    fallback ??= next
  }
  return fallback ?? startFrom(pick(BASES.filter((b) => b !== now.base), random), keep)
}

export const DEFAULTS: Choice = startFrom('glass', {
  kind: 'site',
  name: 'acme',
  url: 'https://my-product.com',
  about: 'how a new user gets started',
  length: 60,
  platforms: 'youtube,instagram-reel',
})
