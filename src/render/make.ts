// Make every video a brief asks for: one render per shape, a named copy per
// platform, the sound set chosen for the project, and a record of where each
// sound came from.
import fs from 'node:fs'
import path from 'node:path'
import { credits, resolvePalette, type Palette } from '../audio/palette.ts'
import { loadBrief } from '../brief/brief.ts'
import { fitAdvice, type Plan } from '../brief/plan.ts'
import { loadScenes, resolveBrief, type BriefVideo } from '../brief/resolve.ts'
import { PLATFORMS } from '../brief/presets.ts'
import { verify, type Check } from '../verify/verify.ts'
import { outFiles, remix, render, type RenderOptions } from './render.ts'

export interface Made {
  format: string
  file: string
  /** Copies named for the platforms that share this shape. */
  copies: string[]
  checks: Check[]
  /** What to change when the length is off. Null when it fits. */
  advice: string | null
}

export interface MakeResult { plan: Plan; made: Made[]; notes: string[]; palette: Palette | null; creditsFile: string | null }

/** Where a project keeps its working files: the chosen sounds, the saved session,
 *  the product map. Never committed. */
export const workDir = (dir: string) => path.join(dir, '.showcase')

/** Resolve a config file into the videos it asks for, without rendering. */
export async function loadProject(configFile?: string): Promise<{ dir: string; plan: Plan; videos: BriefVideo[]; notes: string[]; brief: ReturnType<typeof loadBrief>['brief'] }> {
  const { brief, dir } = loadBrief(configFile)
  const resolved = resolveBrief(brief, dir, await loadScenes(brief, dir))
  return { dir, brief, ...resolved }
}

export async function make(configFile: string | undefined, opts: RenderOptions & { remix?: boolean } = {}): Promise<MakeResult> {
  const log = opts.log ?? console.log
  const { dir, brief, plan, videos, notes } = await loadProject(configFile)
  for (const n of notes) log(`note: ${n}`)

  // one sound set for the whole project, chosen once and then kept
  const choice = brief.sound?.effects ?? 'auto'
  let palette: Palette | null = null
  if (choice !== 'none' && !opts.draft) {
    palette = await resolvePalette(choice, brief.sound?.mood ?? '', path.join(workDir(dir), 'sounds.json'))
    for (const role of ['click', 'callout', 'transition'] as const) log(`sound, ${role}: ${palette[role].name} (${palette[role].why})`)
  }

  const made: Made[] = []
  for (const { target, video } of videos) {
    log(`\n== ${target.label}: ${video.layout.canvas.width}x${video.layout.canvas.height}, ${video.layout.mode} layout`)
    const options = { ...opts, palette: palette ?? undefined }
    const file = opts.remix ? await remix(video, options) : (await render(video, options)).file
    const checks = await verify(video)
    const seconds = parseFloat(checks.find((c) => c.name === 'length')?.detail ?? '')
    const files = outFiles(video)
    const base = brief.name ?? 'video'
    const copies: string[] = []
    for (const p of target.platforms) {
      if (!PLATFORMS[p]) continue
      const copy = path.join(files.dir, `${base}.${p}.mp4`)
      fs.copyFileSync(file, copy)
      if (fs.existsSync(files.vtt)) fs.copyFileSync(files.vtt, copy.replace(/\.mp4$/, '.vtt'))
      copies.push(copy)
    }
    made.push({ format: target.label, file, copies, checks, advice: Number.isFinite(seconds) ? fitAdvice(seconds, plan) : null })
  }

  let creditsFile: string | null = null
  if (palette && videos.length) {
    creditsFile = path.join(outFiles(videos[0]!.video).dir, `${brief.name ?? 'video'}.credits.txt`)
    fs.writeFileSync(creditsFile, credits(palette))
  }
  return { plan, made, notes, palette, creditsFile }
}
