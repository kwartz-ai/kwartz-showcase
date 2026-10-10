import fs from 'node:fs'
import path from 'node:path'
import type { Border, CaptionImage, Clip, Dissolve, Frame, Layout } from '../core/types.ts'
import { run } from '../core/util.ts'
import { borderFilter, buildBorder } from './border.ts'
import { captionTrack } from './compose.ts'

/** Plan one dissolve against a frame list: which picture holds, which it blends
 *  into, and when the blended frames go. Null when there is nothing to blend. */
export function planDissolve(frames: Frame[], d: Dissolve, fps: number) {
  let ia = -1, ib = -1
  frames.forEach((f, j) => {
    if (f.t <= d.t1) ia = j
    if (f.t <= d.t2) ib = j
  })
  const a = frames[Math.max(0, ia)], b = frames[ib]
  if (!a || !b || a.file === b.file) return null
  const n = Math.max(2, Math.round(d.ms / (1000 / fps)))
  const times = Array.from({ length: n }, (_, k) => d.t2 - d.ms + k * (1000 / fps)).filter((t) => t > a.t)
  return { a, b, n, times }
}

/** For each dissolve, drop what was filmed between its two ends and put a blend of
 *  the two end pictures there instead: the old screen holds, then fades into the
 *  new one. Returns a new frame list; the recorded frames are left alone. */
export async function blendDissolves(frames: Frame[], dissolves: Dissolve[], workDir: string, fps: number): Promise<Frame[]> {
  if (!dissolves.length) return frames
  const dir = path.join(workDir, 'blends')
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  let out = frames.slice()
  for (const [i, d] of dissolves.entries()) {
    const plan = planDissolve(out, d, fps)
    if (!plan) continue
    const secs = (plan.n / fps).toFixed(3)
    await run('ffmpeg', ['-y', '-v', 'error',
      '-loop', '1', '-framerate', String(fps), '-t', secs, '-i', plan.a.file,
      '-loop', '1', '-framerate', String(fps), '-t', secs, '-i', plan.b.file,
      '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${secs}:offset=0`,
      '-frames:v', String(plan.n), '-q:v', '2', path.join(dir, `d${i}_%02d.jpg`)])
    const blend = plan.times
      .map((t, k) => ({ file: path.join(dir, `d${i}_${String(k + 1 + plan.n - plan.times.length).padStart(2, '0')}.jpg`), t }))
      .filter((f) => fs.existsSync(f.file))
    out = [...out.filter((f) => f.t <= d.t1 || f.t > d.t2), ...blend, { file: plan.b.file, t: d.t2 }]
      .sort((x, y) => x.t - y.t)
  }
  return out
}

export interface EncodeInput {
  frames: Frame[]
  endMs: number
  /** Narration clips at their scene starts. */
  clips: Clip[]
  /** Effects at their event times. */
  sfx?: Clip[]
  music?: string | null
  musicGain?: number
  dissolves?: Dissolve[]
  lufs?: number
  /** Captions drawn on the canvas, for layouts where the page is a window. */
  captionImages?: CaptionImage[]
  /** The rounded border and backdrop. Left out, or off: the picture fills the frame. */
  border?: Border | null
  layout: Layout
  outFile: string
  workDir: string
}

/** Frames (each lasting until the next) plus the sound mix -> MP4.
 *  Sound: narration, effects, and an optional music bed that drops while the voice
 *  speaks. The mix gets one fixed gain to the loudness target and a peak limiter. */
export async function encode(input: EncodeInput): Promise<void> {
  const { endMs, clips, sfx = [], music = null, musicGain = 0.4, dissolves = [], lufs = -16, captionImages = [], border = null, layout, outFile, workDir } = input
  if (!input.frames.length) {
    throw new Error('no frames were captured. This can happen on a cold start: render again. If it repeats, run "showcase doctor".')
  }
  const frames = await blendDissolves(input.frames, dissolves, workDir, layout.fps)
  const list = ['ffconcat version 1.0']
  frames.forEach((f, i) => {
    // the first frame also covers the time before it arrived
    const from = i === 0 ? 0 : f.t
    const until = frames[i + 1]?.t ?? endMs
    list.push(`file '${f.file.replace(/\\/g, '/')}'`, `duration ${(Math.max(1, until - from) / 1000).toFixed(4)}`)
  })
  list.push(`file '${frames.at(-1)!.file.replace(/\\/g, '/')}'`)
  const listFile = path.join(workDir, 'frames.ffconcat')
  fs.writeFileSync(listFile, list.join('\n'))

  const secs = (endMs / 1000).toFixed(3)
  // Filmed and drawn frames differ slightly as files. Without this the filter
  // graph is rebuilt where they meet, and the caption track is lost from there on.
  const video = ['-reinit_filter', '0', '-f', 'concat', '-safe', '0', '-i', listFile]
  const { width, height } = layout.canvas
  let picture = `[0:v]fps=${layout.fps},scale=${width}:${height},format=yuv420p[v]`
  if (captionImages.length) {
    // a second picture input that shows each caption image for its own time
    const blank = path.join(workDir, 'caption-blank.png')
    await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=black@0.0:s=${width}x${layout.captionBand.height},format=rgba`, '-frames:v', '1', blank])
    const track = path.join(workDir, 'captions.ffconcat')
    fs.writeFileSync(track, captionTrack(captionImages, endMs, blank))
    video.push('-f', 'concat', '-safe', '0', '-i', track)
    picture = `[0:v]fps=${layout.fps},scale=${width}:${height}[base];[1:v]fps=${layout.fps},format=rgba[cap];`
      + `[base][cap]overlay=0:${layout.captionBand.y}:eof_action=pass,format=yuv420p[v]`
  }
  let audioAt = captionImages.length ? 2 : 1
  if (border?.on) {
    // two still pictures join the inputs: the backdrop and the rounded mask
    const assets = await buildBorder(layout, border, workDir)
    for (const file of [assets.backdrop, assets.mask]) video.push('-loop', '1', '-framerate', String(layout.fps), '-i', file)
    picture = picture.replace(/format=yuv420p\[v\]$/, 'null[flat]') + ';' + borderFilter('flat', assets.box, audioAt, audioAt + 1)
    audioAt += 2
  }
  const x264 = ['-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', '-t', secs]

  // 1. the sound mix on its own
  const args = ['-y', '-v', 'error']
  const filters: string[] = []
  let n = -1
  const bus = (items: Clip[], name: string): string | null => {
    if (!items.length) return null
    const labels = items.map((c) => {
      args.push('-i', c.file)
      n += 1
      filters.push(`[${n}:a]aresample=48000,volume=${c.gain ?? 1},adelay=${Math.round(Math.max(0, c.at))}:all=1[${name}${n}]`)
      return `[${name}${n}]`
    })
    filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0[${name}]`)
    return name
  }
  const voice = bus(clips, 'vo')
  const fx = bus(sfx, 'fx')
  const mix: string[] = []
  if (music) {
    args.push('-stream_loop', '-1', '-i', music)
    n += 1
    const fadeOut = Math.max(0, endMs / 1000 - 3).toFixed(2)
    filters.push(`[${n}:a]aresample=48000,atrim=0:${secs},volume=${musicGain},afade=t=in:d=2,afade=t=out:st=${fadeOut}:d=3[bed]`)
    if (voice) {
      // the voice also keys a compressor on the bed, so music drops under speech
      filters.push('[vo]asplit=2[vo1][vokey]',
        '[bed][vokey]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=600[duck]')
      mix.push('[vo1]', '[duck]')
    } else mix.push('[bed]')
  } else if (voice) mix.push('[vo]')
  if (fx) mix.push('[fx]')
  if (!mix.length) {
    await run('ffmpeg', ['-y', '-v', 'error', ...video, '-filter_complex', picture, '-map', '[v]', ...x264, outFile])
    return
  }
  const mixFile = path.join(workDir, 'mix.wav')
  filters.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0,apad[a]`)
  await run('ffmpeg', [...args, '-filter_complex', filters.join(';'), '-map', '[a]', '-t', secs, mixFile])

  // 2. one fixed gain to the loudness target, with a limiter that only catches
  //    peaks. A fixed gain keeps the balance of voice and music; an automatic
  //    leveller would pump the music up in every pause.
  const measured = await loudness(mixFile)
  const gain = lufs - measured.lufs

  // 3. picture plus the levelled mix
  await run('ffmpeg', ['-y', '-v', 'error', ...video, '-i', mixFile,
    '-filter_complex', `${picture};[${audioAt}:a]volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=false[a]`,
    '-map', '[v]', '-map', '[a]', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', ...x264, outFile])
  fs.rmSync(mixFile, { force: true })
}

/** Integrated loudness (LUFS) and true peak (dBTP) of a file's audio. */
export async function loudness(file: string): Promise<{ lufs: number; peak: number }> {
  const out = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { stderr: true })
  const from = out.lastIndexOf('{')
  const m = JSON.parse(out.slice(from, out.indexOf('}', from) + 1)) as { input_i: string; input_tp: string }
  return { lufs: parseFloat(m.input_i), peak: parseFloat(m.input_tp) }
}
