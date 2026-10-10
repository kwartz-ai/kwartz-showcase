// From a brief to the videos it asks for: one per shape, each a full video config.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { defaultTheme, type ThemeInput } from '../core/theme.ts'
import type { Cta, ResolvedVideo, Scene, VideoConfig } from '../core/types.ts'
import { resolveVideo } from '../video/define.ts'
import { isHosted, type Brief } from './brief.ts'
import { planFor, type Plan } from './plan.ts'
import { FORMATS, KIND_ADVICE, MOTION_FEELS, PLATFORMS, layoutFor } from './presets.ts'
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
const WEIGHTS = { display: '500;600;700;800', text: '400;500;600;700', mono: '500;700' }

/** The brief's style as a theme: the person's fonts and colours over the defaults. */
export function themeFor(brief: Brief): ThemeInput {
  const s = brief.style ?? {}
  const feel = MOTION_FEELS[brief.motion?.feel ?? 'calm']
  const fonts = s.fonts ?? {}
  const type: ThemeInput['type'] = {}
  if (fonts.display) type.display = `'${fonts.display}', ${defaultTheme.type.text}`
  if (fonts.text) type.text = `'${fonts.text}', 'Segoe UI', system-ui, sans-serif`
  if (fonts.mono) type.mono = `'${fonts.mono}', Consolas, monospace`
  const theme: ThemeInput = { type, ease: feel.ease, speed: feel.speed, captionScale: CAPTION_SCALE[s.captions ?? 'medium'] }
  if (s.ink) theme.ink = s.ink
  if (s.accent) theme.accent = s.accent
  if (s.fontSource === 'installed') {
    theme.fontsCss = null
    theme.fontsToLoad = []
  } else if (Object.keys(fonts).length) {
    // link the person's families and the defaults for the roles they left alone
    const families = {
      display: fonts.display ?? 'Plus Jakarta Sans',
      text: fonts.text ?? 'Inter',
      mono: fonts.mono ?? 'JetBrains Mono',
    }
    theme.fontsCss = 'https://fonts.googleapis.com/css2?'
      + (Object.keys(families) as (keyof typeof families)[]).map((r) => `family=${families[r].replace(/ /g, '+')}:wght@${WEIGHTS[r]}`).join('&')
      + '&display=swap'
    theme.fontsToLoad = [`800 40px "${families.display}"`, `500 20px "${families.text}"`, `500 16px "${families.mono}"`]
  }
  return theme
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
      theme: themeFor(brief),
      voice: brief.voice ? { voice: brief.voice } : undefined,
      sound: { music: brief.music ?? 'generated', effects: brief.sound?.effects !== 'none' },
      banned: brief.safety?.banned ?? [],
      target: { minSec: plan.minSec, maxSec: plan.maxSec },
      format: target.label,
      cta,
      motion: { blur: brief.motion?.blur ?? true },
      session: brief.auth?.session ?? null,
      readOnly: readOnly ? { allow: brief.safety?.allow ?? [] } : false,
      border: brief.style?.border === 'none' ? false
        : brief.style?.backdrop ? { colors: brief.style.backdrop as [string, string, string] } : true,
    }
    return { target, video: resolveVideo(config, dir) }
  })
  return { plan, videos, notes }
}

export { FORMATS, PLATFORMS }
