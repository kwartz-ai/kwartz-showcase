// A theme of your own: a small JSON file in the project, in a `themes` folder
// beside the config. It starts from a built-in theme and changes what it needs.
//
// The same file is written by hand, by an AI agent following a skill, or by
// "showcase theme new --prompt". However it was made, it passes the same checks as
// the built-in themes before a video may use it: the CSS must be safe to place in
// a page, and captions and text must stay readable.
import fs from 'node:fs'
import path from 'node:path'
import { classicLook, defaultTheme, type Look } from '../core/theme.ts'
import { FONT_PRESETS } from './fonts.ts'
import { BACKDROPS, MOTION_FEELS, type MotionFeel } from './presets.ts'
import { THEMES, THEME_NAMES, themeNamed, type ThemePreset } from './themes.ts'

export const THEMES_DIR = 'themes'

/** What a theme file may hold. Everything but `extends` is optional. */
export interface ThemeFile {
  $schema?: string
  /** For people: what the theme is for. */
  description?: string
  /** The built-in theme it starts from, or "classic". */
  extends?: string
  colors?: { ink?: string; accent?: string; mist?: string; paper?: string; band?: string; bandText?: string }
  fontPreset?: string
  fonts?: { display?: string; text?: string; mono?: string; displayWeight?: number; tracking?: number }
  feel?: MotionFeel
  /** A backdrop by name, or its three colours. */
  backdrop?: string | string[]
  backdropPattern?: 'glow' | 'waves' | 'plain'
  /** Corner radius of the picture, as a share of the frame's short side. */
  radius?: number
  /** Words that describe how it should sound. */
  mood?: string
  /** Any of the surfaces of a look. "{accent}" and "{ink}" stand for those colours. */
  look?: Partial<Record<keyof Look, string | boolean>>
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const NAME = /^[a-z][a-z0-9-]{1,30}$/
const FILE_KEYS = ['$schema', 'description', 'extends', 'colors', 'fontPreset', 'fonts', 'feel', 'backdrop', 'backdropPattern', 'radius', 'mood', 'look']
const COLOR_KEYS = ['ink', 'accent', 'mist', 'paper', 'band', 'bandText']
const CSS_KEYS: (keyof Look)[] = ['canvas', 'paper', 'panel', 'chip', 'label', 'ring', 'caption']
const COLOUR_KEYS: (keyof Look)[] = ['fg', 'muted', 'paperFg', 'panelFg']
const ENTERS = ['rise', 'pop', 'cut', 'float', 'type', 'depth']
const LOOK_KEYS = [...CSS_KEYS, ...COLOUR_KEYS, 'enter', 'upper', 'wall', 'steps']

/** The colours a look's CSS may refer to by name. */
const fill = (css: string, c: { accent: string; ink: string }) => css.replace(/\{accent\}/g, c.accent).replace(/\{ink\}/g, c.ink)

/** Why a piece of CSS may not be placed in a page. It goes into a style attribute
 *  of a page the kit renders, so it may only describe how a box looks. */
export function unsafeCss(css: string): string | null {
  const plain = css.replace(/\{accent\}|\{ink\}/g, '#000000')
  if (plain.length > 900) return 'is too long (over 900 characters)'
  if (/["<>\\{}@]/.test(plain)) return 'holds a character that is not allowed (", <, >, \\, {, } or @)'
  if (/url\s*\(|expression\s*\(|javascript:|behavior\s*:|-moz-binding/i.test(plain)) return 'may not load or run anything (url(...), expression(...), javascript:)'
  if (/(^|;)\s*(position|inset|top|left|right|bottom|display|width|height|z-index|animation|transition|content|transform)\s*:/i.test(plain)) {
    return 'may only describe a surface (background, border, radius, shadow, colour, blur), not where a box sits or how it moves'
  }
  if (/^\s*;|;\s*$/.test(plain)) return 'must not start or end with a semicolon'
  return null
}

/** WCAG contrast between two hex colours: 1 to 21. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
    const [r, g, bl] = [0, 2, 4].map((i) => {
      const c = parseInt(full.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }) as [number, number, number]
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
/** The value of a property in a piece of CSS, when it is a plain hex colour. */
const solid = (css: string, prop: string) => css.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(#[0-9A-Fa-f]{3,6})\\s*(?:;|$)`))?.[1] ?? null

export interface ThemeReport { errors: string[]; warnings: string[] }

/** Check the shape of a theme file: every mistake at once. */
export function checkThemeFile(input: unknown): string[] {
  const bad: string[] = []
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['a theme file must be a JSON object, for example { "extends": "glass", "colors": { "accent": "#FF5A1F" } }']
  const t = input as ThemeFile & Record<string, unknown>
  for (const k of Object.keys(t)) if (!FILE_KEYS.includes(k)) bad.push(`"${k}" is not a setting of a theme. Known: ${FILE_KEYS.filter((x) => x !== '$schema').join(', ')}`)
  if (t.extends !== undefined && t.extends !== 'classic' && !(typeof t.extends === 'string' && THEMES[t.extends])) bad.push(`"extends" must be a built-in theme: classic, ${THEME_NAMES.join(', ')}`)
  for (const [k, v] of Object.entries(t.colors ?? {})) {
    if (!COLOR_KEYS.includes(k)) bad.push(`"colors.${k}" is not a colour of a theme. Known: ${COLOR_KEYS.join(', ')}`)
    else if (typeof v !== 'string' || !HEX.test(v)) bad.push(`"colors.${k}" must be a hex colour such as #0B1D35 (got ${JSON.stringify(v)})`)
  }
  if (t.fontPreset !== undefined && !(typeof t.fontPreset === 'string' && FONT_PRESETS[t.fontPreset])) bad.push(`"fontPreset" must be one of: ${Object.keys(FONT_PRESETS).join(', ')}`)
  for (const [k, v] of Object.entries(t.fonts ?? {})) {
    if (['display', 'text', 'mono'].includes(k)) { if (typeof v !== 'string' || !/^[A-Za-z0-9 ]{2,40}$/.test(v)) bad.push(`"fonts.${k}" must be a plain font family name, for example "Roboto"`) }
    else if (k === 'displayWeight') { if (!(typeof v === 'number' && v >= 400 && v <= 900)) bad.push('"fonts.displayWeight" must be a number from 400 to 900') }
    else if (k === 'tracking') { if (!(typeof v === 'number' && v >= 0 && v <= 1.5)) bad.push('"fonts.tracking" must be a number from 0 to 1.5') }
    else bad.push(`"fonts.${k}" is not a font setting. Known: display, text, mono, displayWeight, tracking`)
  }
  if (t.feel !== undefined && !(t.feel in MOTION_FEELS)) bad.push(`"feel" must be one of: ${Object.keys(MOTION_FEELS).join(', ')}`)
  if (t.backdrop !== undefined) {
    const colours = Array.isArray(t.backdrop) && t.backdrop.length === 3 && t.backdrop.every((c) => typeof c === 'string' && HEX.test(c))
    if (!colours && !(typeof t.backdrop === 'string' && BACKDROPS[t.backdrop])) bad.push(`"backdrop" must be three hex colours, or one of: ${Object.keys(BACKDROPS).join(', ')}`)
  }
  if (t.backdropPattern !== undefined && !['glow', 'waves', 'plain'].includes(t.backdropPattern)) bad.push('"backdropPattern" must be glow, waves or plain')
  if (t.radius !== undefined && !(typeof t.radius === 'number' && t.radius >= 0 && t.radius <= 0.2)) bad.push('"radius" must be a number from 0 to 0.2')
  if (t.mood !== undefined && (typeof t.mood !== 'string' || t.mood.length > 80)) bad.push('"mood" must be a few words, up to 80 characters')
  if (t.description !== undefined && typeof t.description !== 'string') bad.push('"description" must be text')
  for (const [k, v] of Object.entries(t.look ?? {})) {
    if (!LOOK_KEYS.includes(k)) { bad.push(`"look.${k}" is not a part of a look. Known: ${LOOK_KEYS.join(', ')}`); continue }
    if (k === 'upper' || k === 'wall') { if (typeof v !== 'boolean') bad.push(`"look.${k}" must be true or false`) }
    else if (k === 'enter') { if (!ENTERS.includes(v as string)) bad.push(`"look.enter" must be one of: ${ENTERS.join(', ')}`) }
    else if (k === 'steps') { if (v !== 'row' && v !== 'grid') bad.push('"look.steps" must be row or grid') }
    else if (typeof v !== 'string' || !v.trim()) bad.push(`"look.${k}" must be CSS as text`)
    else {
      const why = unsafeCss(v)
      if (why) bad.push(`"look.${k}" ${why}`)
    }
  }
  return bad
}

/** A theme file as a theme: its base, with the file's changes over it. */
export function presetFrom(file: ThemeFile): ThemePreset {
  const base: ThemePreset | null = file.extends && file.extends !== 'classic' ? THEMES[file.extends]! : null
  const c = file.colors ?? {}
  const ink = c.ink ?? base?.ink ?? defaultTheme.ink
  const accent = c.accent ?? base?.accent ?? defaultTheme.accent
  const mist = c.mist ?? base?.mist ?? defaultTheme.mist
  const paper = c.paper ?? base?.paper ?? defaultTheme.paper
  const named = typeof file.backdrop === 'string' ? BACKDROPS[file.backdrop] : null
  const backdrop = {
    colors: (Array.isArray(file.backdrop) ? file.backdrop : named?.colors ?? base?.backdrop.colors ?? ['#1B2A8F', '#3D5AF1', '#B9A5FF']) as [string, string, string],
    pattern: file.backdropPattern ?? named?.pattern ?? base?.backdrop.pattern ?? 'glow',
  }
  const fonts = file.fonts ?? {}
  const pairing = FONT_PRESETS[file.fontPreset ?? base?.fontPreset ?? 'modern']!
  const ownFaces = fonts.display || fonts.text || fonts.mono || (!file.fontPreset && base?.fonts)
  const look = (a: string): Look => {
    // when the base is the kit's own look, it is rebuilt in this theme's colours
    const from = base ? base.look(a) : classicLook({ ink, accent: a, mist, paper })
    const out = { ...from } as Record<string, unknown>
    for (const [k, v] of Object.entries(file.look ?? {})) out[k] = typeof v === 'string' ? fill(v, { accent: a, ink }) : v
    return out as unknown as Look
  }
  return {
    style: file.description ?? `A theme of your own, from ${file.extends ?? 'classic'}`,
    use: file.description ?? 'this project',
    aliases: [],
    ink, accent, mist, paper,
    band: c.band ?? base?.band ?? ink,
    bandText: c.bandText ?? base?.bandText ?? '#FFFFFF',
    ...(ownFaces
      ? { fonts: {
          display: fonts.display ?? base?.fonts?.display ?? pairing.display, text: fonts.text ?? base?.fonts?.text ?? pairing.text, mono: fonts.mono ?? base?.fonts?.mono ?? pairing.mono,
          displayWeight: fonts.displayWeight ?? base?.fonts?.displayWeight ?? pairing.displayWeight, tracking: fonts.tracking ?? base?.fonts?.tracking ?? pairing.tracking,
        } }
      : { fontPreset: file.fontPreset ?? base?.fontPreset ?? 'modern' }),
    feel: file.feel ?? base?.feel ?? 'calm',
    backdrop,
    radius: file.radius ?? base?.radius ?? 0.034,
    mood: file.mood ?? base?.mood ?? '',
    look,
  }
}

/** Check that a theme can be read on video: the same rules the built-in themes
 *  are held to. A rule that cannot be measured (a see-through or shaded surface)
 *  gives a warning, so a person looks at it. */
export function checkReadable(preset: ThemePreset): ThemeReport {
  const errors: string[] = [], warnings: string[] = [], unmeasured: string[] = []
  const look = preset.look(preset.accent)
  const need = (what: string, a: string | null, b: string | null, min: number) => {
    if (!a || !b || !HEX.test(a) || !HEX.test(b)) { unmeasured.push(what); return }
    const c = contrast(a, b)
    if (c < min) errors.push(`${what}: contrast is ${c.toFixed(1)} to 1 (${a} on ${b}); it must be at least ${min} to 1 to be read on a video`)
  }
  need('caption text on its box', solid(look.caption, 'color'), solid(look.caption, 'background'), 7)
  need('captions on the band of a tall frame', preset.bandText, preset.band, 7)
  need('text on the ground of a card', look.fg, look.canvas, 7)
  need('text on the light ground', look.paperFg, look.paper, 7)
  need('the highlight on the ground of a card', preset.accent, look.canvas, 3)
  need('the callout label', solid(look.label, 'color'), solid(look.label, 'background'), 4.5)
  const panel = solid(look.panel, 'background')
  if (panel && HEX.test(look.panelFg)) need('text on a panel', look.panelFg, panel, 4.5)
  for (const key of ['chip', 'label', 'caption'] as const) if (!/(^|;)\s*color\s*:/.test(look[key])) errors.push(`"look.${key}" must set its own text colour (color:...)`)
  // a see-through or shaded surface has no single colour to measure: a person must look
  if (unmeasured.length) warnings.push(`contrast could not be measured where a surface is see-through or shaded (${unmeasured.join('; ')}). Look at these in the preview.`)
  return { errors, warnings }
}

/** Where a custom theme's file is: `themes/<name>.json` beside the config, or a path. */
export function themeFile(name: string, dir: string): string | null {
  const file = name.endsWith('.json') ? path.resolve(dir, name) : path.join(dir, THEMES_DIR, `${name}.json`)
  return fs.existsSync(file) ? file : null
}

/** The names of the themes a project has made for itself. */
export function customThemes(dir: string): string[] {
  const folder = path.join(dir, THEMES_DIR)
  if (!fs.existsSync(folder)) return []
  return fs.readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((n) => NAME.test(n)).sort()
}

/** Read and check a theme file. Throws with everything that is wrong. */
export function loadThemeFile(file: string): { preset: ThemePreset; warnings: string[]; raw: ThemeFile } {
  let json: unknown
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`${path.basename(file)} is not valid JSON: ${(e as Error).message}`)
  }
  const shape = checkThemeFile(json)
  if (shape.length) throw new Error(`the theme ${path.basename(file)} has ${shape.length === 1 ? 'a problem' : `${shape.length} problems`}:\n- ${shape.join('\n- ')}`)
  const preset = presetFrom(json as ThemeFile)
  const { errors, warnings } = checkReadable(preset)
  if (errors.length) throw new Error(`the theme ${path.basename(file)} would be hard to read on video:\n- ${errors.join('\n- ')}`)
  return { preset, warnings, raw: json as ThemeFile }
}

export interface FoundTheme { name: string; preset: ThemePreset; custom: boolean; file?: string; base?: string; warnings: string[] }

/** The theme a word means: a built-in one, or one the project made. With no folder
 *  to look in, only the built-in themes are known. Null means the kit's own look. */
export function findTheme(name: string, dir?: string): FoundTheme | null {
  const key = name.trim()
  if (dir) {
    const file = themeFile(key, dir)
    if (file) {
      const { preset, warnings, raw } = loadThemeFile(file)
      return { name: path.basename(file, '.json'), preset, custom: true, file, base: raw.extends ?? 'classic', warnings }
    }
  }
  try {
    const found = themeNamed(key)
    return found ? { ...found, custom: false, warnings: [] } : null
  } catch (e) {
    const own = dir ? customThemes(dir) : []
    throw new Error((e as Error).message + (own.length ? `. Your own: ${own.join(', ')}` : '')
      + (dir ? `. To make your own: showcase theme new ${NAME.test(key) ? key : 'my-brand'}` : ''))
  }
}

/** A name a custom theme may have: lower case, digits and dashes, and not the name
 *  of a built-in theme. */
export function checkThemeName(name: string): string | null {
  if (!NAME.test(name)) return 'a theme name is lower case letters, digits and dashes, starting with a letter (for example "acme" or "my-brand")'
  if (name === 'classic' || THEMES[name] || Object.values(THEMES).some((t) => t.aliases.includes(name))) return `"${name}" is the name of a built-in theme. Choose another.`
  return null
}

/** A theme file to start from: the base, with the parts people most often change
 *  written out so they are easy to find. */
export function starterTheme(from: string, changes: { accent?: string; ink?: string; description?: string } = {}): ThemeFile {
  const base = from === 'classic' ? null : THEMES[from]!
  return {
    $schema: './node_modules/kwartz-showcase/schema/showcase.theme.schema.json',
    description: changes.description ?? `Our own look, starting from ${from}`,
    extends: from,
    colors: { accent: changes.accent ?? base?.accent ?? defaultTheme.accent, ...(changes.ink ? { ink: changes.ink } : {}) },
    ...(base?.fontPreset || !base ? { fontPreset: base?.fontPreset ?? 'modern' } : {}),
    feel: base?.feel ?? 'calm',
    backdrop: base?.backdrop.colors ?? ['#1B2A8F', '#3D5AF1', '#B9A5FF'],
    radius: base?.radius ?? 0.034,
    mood: base?.mood ?? 'calm soft',
    look: {},
  }
}
