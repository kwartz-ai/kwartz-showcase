// From a brief to the videos it asks for: one per shape, each a full video config.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { defaultTheme, type ThemeInput } from '../core/theme.ts'
import type { Cta, ResolvedVideo, Scene, VideoConfig } from '../core/types.ts'
import { resolveVideo } from '../video/define.ts'
import { isHosted, type Brief } from './brief.ts'
import { planFor, type Plan } from './plan.ts'
import { FONT_PRESETS, GOOGLE_FONTS, facesToLoad, googleFontsUrl } from './fonts.ts'
import { BACKDROPS, FORMATS, KIND_ADVICE, MOTION_FEELS, PLATFORMS, layoutFor } from './presets.ts'
import { applyScript, parseScript, scriptFit } from './script.ts'

/** What a scenes file exports: the scenes, and optionally how to reach the first
 *  screen. A scene may leave out `say` when the brief names a script file. */
export interface ScenesModule {
  scenes: (Omit<Scene, 'say'> & { say?: string })[]
  prepare?: VideoConfig['prepare']
  appRoot?: string
}

/** Declare the scenes of a brief-driven video. Returns its argument; it exists
 *  for type checking and editor completion. */
export function defineScenes(module: ScenesModule): ScenesModule {
  return module
}

export interface Target { format: string; label: string; platforms: string[] }

/** The shapes a brief asks for, each with the platforms that will get a copy.
 *  Platforms sharing a shape share one render. */
export function targetsFor(brief: Brief): Target[] {
  const targets = new Map<string, Target>()
  const add = (format: string, label: string) => targets.get(format) ?? targets.set(format, { format, label, platforms: [] }).get(format)!
  for (const p of brief.platforms ?? []) add(PLATFORMS[p]!.format, PLATFORMS[p]!.format).platforms.push(p)
  for (const f of brief.formats ?? []) {
    if (typeof f === 'string') add(f, f)
    else add(JSON.stringify(f), `${f.width}x${f.height}`)
  }
  if (!targets.size) add('landscape', 'landscape')
  return [...targets.values()]
}

/** The closing line. A hosted product's own address is a fair default; a local
 *  address means nothing to a viewer, so there is none and the person is told. */
export function ctaFor(brief: Brief): Cta | null {
  if (brief.cta) return brief.cta
  if (!brief.url || !isHosted(brief.url)) return null
  const u = new URL(brief.url)
  return { text: 'See it for yourself.', sub: u.hostname.replace(/^www\./, '') }
}

const CAPTION_SCALE = { small: 0.85, medium: 1, large: 1.2 }

/** What "showcase explore" found out about the product's own look. */
export interface Explored { font: string | null; accent: string | null; fontOnGoogle?: boolean | null }

/** The explored look of the product beside a config, when it has been explored. */
export function exploredStyle(dir: string): Explored | null {
  const file = path.join(dir, '.showcase', 'explore', 'map.json')
  if (!fs.existsSync(file)) return null
  try {
    return (JSON.parse(fs.readFileSync(file, 'utf8')) as { style?: Explored }).style ?? null
  } catch {
    return null
  }
}

const channels = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}
const toHex = (rgb: number[]) => '#' + rgb.map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('')
/** A colour moved part of the way toward another. */
export const mix = (a: string, b: string, share: number) => toHex(channels(a).map((n, i) => n + (channels(b)[i]! - n) * share))

/** How far apart two colours are in brightness, as WCAG measures it: 1 to 21. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = channels(hex).map((n) => {
      const c = n / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }) as [number, number, number]
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** How a display face of a kind is set: its heaviest useful weight and how much
 *  of the tight title tracking it can take. */
const SETTING = { sans: 1, serif: 0.35, condensed: 0, rounded: 0.6, mono: 0.5 }

/** The brief's style as a theme: the person's fonts and colours first, then the
 *  product's own (when it was explored), then the kit's. `notes` collects what was
 *  taken from the product, so the person is told. */
export function themeFor(brief: Brief, explored: Explored | null = null, notes: string[] = []): ThemeInput {
  const s = brief.style ?? {}
  const feel = MOTION_FEELS[brief.motion?.feel ?? 'calm']
  const match = s.match !== false ? explored : null
  const theme: ThemeInput = { ease: feel.ease, speed: feel.speed, captionScale: CAPTION_SCALE[s.captions ?? 'medium'] }
  const type: ThemeInput['type'] = {}

  if (s.ink) theme.ink = s.ink
  if (s.accent) theme.accent = s.accent
  else if (match?.accent) {
    // a highlight must stand out on the dark cards it is drawn on
    const ink = s.ink ?? defaultTheme.ink
    if (contrast(match.accent, ink) >= 3) {
      theme.accent = match.accent
      notes.push(`accent colour ${match.accent} taken from the product's own buttons (set "style.accent" to choose another)`)
    } else notes.push(`the product's button colour ${match.accent} is too dark to use as the highlight on cards; the default is kept`)
  }

  const named = s.fonts ?? {}
  const preset = FONT_PRESETS[s.fontPreset ?? 'modern']!
  // the product's own face is used for captions and labels, unless the person chose
  let matchedText: string | undefined
  if (match?.font && !named.text && !s.fontPreset && s.fontSource !== 'installed') {
    if (match.fontOnGoogle) {
      matchedText = match.font
      if (match.font !== preset.text) notes.push(`caption font "${match.font}" taken from the product (set "style.fonts.text" or "style.fontPreset" to choose another)`)
    } else if (match.fontOnGoogle === false) {
      notes.push(`the product's font "${match.font}" is not on Google Fonts, so captions use ${preset.text}. Set "style.fontSource" to "installed" if it is on this machine.`)
    }
  }
  const fonts = { display: named.display ?? preset.display, text: named.text ?? matchedText ?? preset.text, mono: named.mono ?? preset.mono }
  const chosen = !!s.fontPreset || Object.keys(named).length > 0 || (!!matchedText && matchedText !== preset.text)
  if (chosen) {
    type.display = `'${fonts.display}', ${defaultTheme.type.text}`
    type.text = `'${fonts.text}', 'Segoe UI', system-ui, sans-serif`
    type.mono = `'${fonts.mono}', Consolas, monospace`
    const known = GOOGLE_FONTS[fonts.display]
    if (named.display && known) {
      theme.displayWeight = Math.min(800, Math.max(...known.weights))
      theme.tracking = SETTING[known.kind]
      theme.titleScale = known.kind === 'condensed' ? 1.28 : 1
    } else if (!named.display) {
      theme.displayWeight = preset.displayWeight
      theme.tracking = preset.tracking
      theme.titleScale = preset.titleScale ?? 1
    }
  }
  theme.type = type
  if (s.fontSource === 'installed') {
    theme.fontsCss = null
    theme.fontsToLoad = []
  } else if (chosen) {
    theme.fontsCss = googleFontsUrl(fonts)
    theme.fontsToLoad = facesToLoad(fonts, theme.displayWeight ?? 800)
  }
  return theme
}

/** The backdrop a brief asks for, as a border setting. */
export function borderFor(brief: Brief, dir: string, accent: string): VideoConfig['border'] {
  const s = brief.style ?? {}
  if (s.border === 'none') return false
  const bd = s.backdrop
  let border: Exclude<VideoConfig['border'], boolean | undefined> = {}
  if (Array.isArray(bd)) border = { colors: bd as [string, string, string] }
  else if (bd === 'brand') border = { colors: [mix(accent, '#000000', 0.62), mix(accent, '#000000', 0.18), mix(accent, '#ffffff', 0.62)], pattern: 'glow' }
  else if (typeof bd === 'string' && BACKDROPS[bd]) border = { ...BACKDROPS[bd] }
  else if (typeof bd === 'string') {
    const image = path.resolve(dir, bd)
    if (!fs.existsSync(image)) throw new Error(`"style.backdrop" points at ${image}, which does not exist`)
    border = { image }
  }
  if (s.backdropPattern) border.pattern = s.backdropPattern
  return Object.keys(border).length ? border : true
}

/** Load the scenes file a brief points at. */
export async function loadScenes(brief: Brief, dir: string): Promise<ScenesModule> {
  const file = path.resolve(dir, brief.scenes ?? 'video.ts')
  if (!fs.existsSync(file)) {
    throw new Error(`no scenes file at ${file}.\nThe kit films scenes; it does not write them. Run "showcase plan" to see what the video needs, `
      + 'then write the scenes yourself or ask Claude Code with /kwartz-showcase.')
  }
  const mod = await import(pathToFileURL(file).href) as { default?: ScenesModule }
  if (!mod.default?.scenes) throw new Error(`${file} must end with: export default defineScenes({ scenes: [ ... ] })`)
  return mod.default
}

export interface BriefVideo { target: Target; video: ResolvedVideo }

/** Everything a brief resolves to: the plan, one video per shape, and notes for
 *  the person (things that are allowed but worth knowing). */
export function resolveBrief(brief: Brief, dir: string, module: ScenesModule): { plan: Plan; videos: BriefVideo[]; notes: string[] } {
  const notes: string[] = []
  const length = brief.length ?? 30
  const plan = planFor(length)
  const name = brief.name ?? 'video'

  let scenes = module.scenes
  if (brief.script) {
    const file = path.resolve(dir, brief.script)
    if (!fs.existsSync(file)) throw new Error(`"script" points at ${file}, which does not exist`)
    const script = parseScript(fs.readFileSync(file, 'utf8'))
    const fit = scriptFit(script, plan.words)
    if (fit.message) notes.push(fit.message)
    scenes = applyScript(scenes, script)
  }

  const cta = ctaFor(brief)
  if (!cta) notes.push('no call to action: the address is local, which means nothing to a viewer. Add "cta" to the config.')
  const targets = targetsFor(brief)
  for (const t of targets) {
    for (const p of t.platforms) {
      const advice = KIND_ADVICE[PLATFORMS[p]!.kind]
      if (length > advice.maxSec) notes.push(`${PLATFORMS[p]!.label}: ${length} s is long for this kind of platform; ${advice.note}`)
    }
  }
  const hosted = isHosted(brief.url)
  const theme = themeFor(brief, exploredStyle(dir), notes)
  const border = borderFor(brief, dir, theme.accent ?? defaultTheme.accent)
  const readOnly = brief.safety?.readOnly ?? hosted

  const videos = targets.map((target) => {
    const shape = target.format.startsWith('{') ? JSON.parse(target.format) as { width: number; height: number } : target.format
    const layout = layoutFor(shape, brief.layout, brief.motion?.fps ?? 30)
    const mine = scenes.filter((s) => !s.formats || s.formats.includes(target.label))
    const config: VideoConfig = {
      name: targets.length > 1 ? `${name}.${target.label}` : name,
      baseUrl: brief.url,
      serve: brief.serve,
      scenes: mine as Scene[],
      prepare: module.prepare,
      appRoot: module.appRoot,
      layout,
      theme,
      voice: brief.voice ? { voice: brief.voice } : undefined,
      sound: { music: brief.music ?? 'generated', effects: brief.sound?.effects !== 'none' },
      banned: brief.safety?.banned ?? [],
      target: { minSec: plan.minSec, maxSec: plan.maxSec },
      format: target.label,
      cta,
      motion: { blur: brief.motion?.blur ?? true },
      session: brief.auth?.session ?? null,
      readOnly: readOnly ? { allow: brief.safety?.allow ?? [] } : false,
      border,
    }
    return { target, video: resolveVideo(config, dir) }
  })
  return { plan, videos, notes }
}

export { FORMATS, PLATFORMS }
