// Clip scenes: a finished video file placed on the timeline as one scene.
//
// The clip is turned into frames the size of the canvas, at the video's frame
// rate, and those frames go on the timeline exactly as a motion scene's do. The
// clip is never played in the browser, so its timing does not depend on the machine.
import fs from 'node:fs'
import path from 'node:path'
import type { BrowserContext } from 'playwright'
import type { Theme } from '../core/theme.ts'
import type { ClipSpec, Cue, Frame, Layout } from '../core/types.ts'
import { run } from '../core/util.ts'
import { motionDocument } from './motion.ts'

export interface ClipInfo { seconds: number; hasSound: boolean; width: number; height: number }

/** What a `clip` setting means: a path alone is the whole clip, fitted inside the
 *  frame, without its own sound. */
export function clipSpec(clip: string | ClipSpec): Required<Omit<ClipSpec, 'seconds'>> & { seconds: number | null } {
  const c = typeof clip === 'string' ? { file: clip } : clip
  return { file: c.file, fit: c.fit ?? 'contain', sound: c.sound ?? false, from: c.from ?? 0, seconds: c.seconds ?? null }
}

/** Length, size and whether a video file has sound. */
export async function probeClip(file: string): Promise<ClipInfo> {
  if (!fs.existsSync(file)) throw new Error(`clip not found: ${file}`)
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', file])
  const json = JSON.parse(out) as { format?: { duration?: string }; streams?: { codec_type: string; width?: number; height?: number }[] }
  const v = json.streams?.find((s) => s.codec_type === 'video')
  if (!v) throw new Error(`${path.basename(file)} has no picture: a clip must be a video file`)
  return {
    seconds: parseFloat(json.format?.duration ?? '0'),
    hasSound: !!json.streams?.some((s) => s.codec_type === 'audio'),
    width: v.width ?? 0, height: v.height ?? 0,
  }
}

/** How long a clip scene lasts, ms: the part of the clip that is used, or the
 *  narration with its lead-in and pause, whichever is longer. */
export function clipSceneMs(clipSeconds: number, spec: { from: number; seconds: number | null }, speechMs: number): number {
  const used = Math.max(0, (spec.seconds ?? clipSeconds - spec.from)) * 1000
  return Math.round(Math.max(used, speechMs))
}

/** The FFmpeg filter that puts a clip in the frame: fitted inside it on the dark
 *  colour, or covering it with the overflow cut off. */
export function clipFilter(layout: Layout, ink: string, fit: 'contain' | 'cover'): string {
  const { width: W, height: H } = layout.canvas
  return fit === 'cover'
    ? `fps=${layout.fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`
    : `fps=${layout.fps},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${ink.replace('#', '0x')},setsar=1`
}

/** The whole filter for a clip: the picture, then each caption laid on it for its
 *  own time. Captions are inputs 1 onwards. */
export function clipGraph(layout: Layout, ink: string, fit: 'contain' | 'cover', cues: Cue[]): string {
  let graph = `[0:v]${clipFilter(layout, ink, fit)}[c0]`
  cues.forEach((c, i) => {
    graph += `;[c${i}][${i + 1}:v]overlay=enable='between(t,${(c.start / 1000).toFixed(3)},${(c.end / 1000).toFixed(3)})'[c${i + 1}]`
  })
  return graph
}

/** Draw each caption as a clear picture the size of the canvas, in the same box
 *  the page captions use. */
async function captionPictures(context: BrowserContext, cues: Cue[], layout: Layout, theme: Theme, dir: string): Promise<string[]> {
  const page = await context.newPage()
  try {
    await page.setViewportSize(layout.canvas)
    // the motion document already has the caption box; only its background goes
    await page.setContent(motionDocument('', layout, theme).replace(`background:${theme.band}}`, 'background:transparent}'), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    const files: string[] = []
    for (const [i, cue] of cues.entries()) {
      await page.evaluate((text) => {
        const cap = document.getElementById('showcase-caption')!
        cap.textContent = text
        cap.style.display = 'block'
      }, cue.text)
      const file = path.join(dir, `cap${String(i).padStart(3, '0')}.png`)
      await page.screenshot({ path: file, omitBackground: true })
      files.push(file)
    }
    return files
  } finally {
    await page.close()
  }
}

export interface ClipInput {
  file: string
  fit: 'contain' | 'cover'
  from: number
  durationMs: number
  /** Captions to draw on the clip, with times from the start of the scene. Null
   *  when the layout draws captions on the canvas instead. */
  cues: Cue[] | null
  layout: Layout
  theme: Theme
  dir: string
}

/** Turn a clip into frames on the canvas. Returns them with times from the scene's
 *  start. When the clip is shorter than the scene, its last frame holds. */
export async function renderClip(context: BrowserContext, input: ClipInput): Promise<Frame[]> {
  const { layout, theme, dir } = input
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const cues = input.cues ?? []
  const pictures = cues.length ? await captionPictures(context, cues, layout, theme, dir) : []
  const args = ['-y', '-v', 'error', '-ss', String(input.from), '-i', input.file]
  for (const p of pictures) args.push('-loop', '1', '-framerate', String(layout.fps), '-i', p)
  await run('ffmpeg', [...args, '-filter_complex', clipGraph(layout, theme.band, input.fit, cues), '-map', `[c${cues.length}]`,
    '-t', (input.durationMs / 1000).toFixed(3), '-q:v', '2', '-start_number', '0', path.join(dir, 'k%05d.jpg')])
  const step = 1000 / layout.fps
  const frames = fs.readdirSync(dir).filter((f) => /^k\d{5}\.jpg$/.test(f)).sort()
    .map((f, i) => ({ file: path.join(dir, f), t: +(i * step).toFixed(3) }))
  if (!frames.length) throw new Error(`no frames could be read from ${path.basename(input.file)}`)
  return frames
}

/** The clip's own sound, as a file the mix can place. */
export async function clipSound(file: string, from: number, durationMs: number, dir: string): Promise<string> {
  const out = path.join(dir, 'sound.wav')
  await run('ffmpeg', ['-y', '-v', 'error', '-ss', String(from), '-i', file, '-vn', '-t', (durationMs / 1000).toFixed(3), '-ar', '48000', '-ac', '2', out])
  return out
}
