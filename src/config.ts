import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveTheme } from './theme.ts'
import type { ResolvedVideo, VideoConfig } from './types.ts'

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
  if (!config.baseUrl && !config.serve) throw new Error('video needs "baseUrl" (an app to film) or "serve" (a folder of static files)')
  const seen = new Set<string>()
  for (const s of config.scenes) {
    if (!s.id || seen.has(s.id)) throw new Error(`scene ids must be unique and non-empty (problem at ${JSON.stringify(s.id)})`)
    if (!s.say?.trim()) throw new Error(`scene "${s.id}" has no "say" line`)
    seen.add(s.id)
  }
  return {
    name: config.name,
    scenes: config.scenes,
    baseUrl: (config.baseUrl ?? '').replace(/\/$/, ''),
    serve: config.serve ? path.resolve(dir, config.serve) : null,
    prepare: config.prepare,
    appRoot: config.appRoot ?? null,
    layout: { width: 1920, height: 1080, zoom: 1.25, fps: 30, ...config.layout },
    theme: resolveTheme(config.theme),
    voice: { voice: 'af_heart', speed: 1, ...config.voice },
    sound: { music: 'generated', musicGain: 0.4, effects: true, lufs: -16, ...config.sound },
    pace: { leadMs: 350, tailMs: 800, ...config.pace },
    banned: config.banned ?? [],
    target: config.target ?? {},
    dir,
  }
}

/** Import a video file (its default export) and resolve it. */
export async function loadVideo(file: string): Promise<ResolvedVideo> {
  const abs = path.resolve(file)
  const mod = await import(pathToFileURL(abs).href) as { default?: VideoConfig }
  if (!mod.default) throw new Error(`${file} has no default export. End it with: export default defineVideo({ ... })`)
  return resolveVideo(mod.default, path.dirname(abs))
}
