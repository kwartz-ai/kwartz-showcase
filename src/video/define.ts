import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEFAULT_BORDER, resolveTheme } from '../core/theme.ts'
import type { Border, Layout, ResolvedVideo, VideoConfig } from '../core/types.ts'

/** Complete a partial layout. With only a size and a zoom it is a 'fill' layout:
 *  the filmed page is the whole video and captions are overlays in the page. */
export function resolveLayout(input: Partial<Layout> = {}): Layout {
  const base = { width: 1920, height: 1080, zoom: 1.25, fps: 30, ui: 1, mode: 'fill' as const, captions: 'page' as const, ...input }
  return {
    ...base,
    canvas: input.canvas ?? { width: base.width, height: base.height },
    window: input.window ?? { x: 0, y: 0, width: base.width, height: base.height },
    captionBand: input.captionBand ?? { y: 0, height: 0 },
    safe: input.safe ?? { top: 0, bottom: 0 },
  }
}

/** Declare a video. This only returns its argument: it exists for type checking
 *  and editor completion in the video file. */
export function defineVideo(config: VideoConfig): VideoConfig {
  return config
}

/** Fill in the defaults and check the parts that would otherwise fail late. */
export function resolveVideo(config: VideoConfig, dir: string): ResolvedVideo {
  if (!config.name || !/^[\w.-]+$/.test(config.name)) {
    throw new Error(`video "name" must be letters, digits, dots, dashes or underscores (got ${JSON.stringify(config.name)})`)
  }
  if (!config.scenes?.length) throw new Error('video has no scenes')
  // a video made only of motion graphics and clips films no product
  if (!config.baseUrl && !config.serve && config.scenes.some((s) => s.run)) {
    const ids = config.scenes.filter((s) => s.run).map((s) => s.id).join(', ')
    throw new Error(`video needs "baseUrl" (an app to film) or "serve" (a folder of static files): it has scenes that run on a product (${ids}). For a video with no product ("motionOnly"), remove those scenes and "prepare": every scene must be a motion scene or a clip`)
  }
  const seen = new Set<string>()
  for (const s of config.scenes) {
    if (!s.id || seen.has(s.id)) throw new Error(`scene ids must be unique and non-empty (problem at ${JSON.stringify(s.id)})`)
    if (!s.say?.trim() && !s.clip) throw new Error(`scene "${s.id}" has no "say" line`)
    if ([s.run, s.motion, s.clip].filter(Boolean).length !== 1) {
      throw new Error(`scene "${s.id}" needs exactly one of "run" (steps on the app), "motion" (full-screen graphics) or "clip" (a video file)`)
    }
    if (s.clip) {
      const file = path.resolve(dir, typeof s.clip === 'string' ? s.clip : s.clip.file ?? '')
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`scene "${s.id}": the clip ${file} does not exist`)
    }
    seen.add(s.id)
  }
  return {
    name: config.name,
    scenes: config.scenes,
    baseUrl: (config.baseUrl ?? '').replace(/\/$/, ''),
    serve: config.serve ? path.resolve(dir, config.serve) : null,
    prepare: config.prepare,
    appRoot: config.appRoot ?? null,
    layout: resolveLayout(config.layout),
    theme: resolveTheme(config.theme),
    voice: { voice: 'af_heart', speed: 1, ...config.voice },
    sound: { music: 'generated', musicGain: 0.4, effects: true, lufs: -16, ...config.sound },
    pace: { leadMs: 350, tailMs: 800, ...config.pace },
    banned: config.banned ?? [],
    target: config.target ?? {},
    format: config.format ?? 'landscape',
    cta: config.cta ?? null,
    motion: { blur: config.motion?.blur ?? true },
    session: config.session ? path.resolve(dir, config.session) : null,
    readOnly: typeof config.readOnly === 'object'
      ? { on: true, allow: config.readOnly.allow ?? [] }
      : { on: config.readOnly ?? false, allow: [] },
    border: resolveBorder(config.border),
    dir,
  }
}

/** The border with its defaults: on, unless the video says otherwise. */
export function resolveBorder(input: VideoConfig['border']): Border {
  if (input === false) return { ...DEFAULT_BORDER, on: false }
  const border = { ...DEFAULT_BORDER, ...(typeof input === 'object' ? input : {}), on: true }
  if (!(border.inset >= 0 && border.inset <= 0.2)) throw new Error(`border "inset" must be between 0 and 0.2 (got ${border.inset})`)
  if (!(border.radius >= 0 && border.radius <= 0.2)) throw new Error(`border "radius" must be between 0 and 0.2 (got ${border.radius})`)
  if (border.colors.length !== 3 || border.colors.some((c) => !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c))) throw new Error('border "colors" must be three hex colours, for example ["#1B2A8F", "#3D5AF1", "#B9A5FF"]')
  if (!['glow', 'waves', 'plain'].includes(border.pattern)) throw new Error(`border "pattern" must be glow, waves or plain (got ${border.pattern})`)
  return border
}

/** Import a video file (its default export) and resolve it. */
export async function loadVideo(file: string): Promise<ResolvedVideo> {
  const abs = path.resolve(file)
  const mod = await import(pathToFileURL(abs).href) as { default?: VideoConfig }
  if (!mod.default) throw new Error(`${file} has no default export. End it with: export default defineVideo({ ... })`)
  return resolveVideo(mod.default, path.dirname(abs))
}
