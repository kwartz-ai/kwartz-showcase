// The runner: narration first, then the browser, the scenes, capture and encoding.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { captionCues, writeVtt } from './captions.ts'
import { encode } from './encode.ts'
import { Recorder, loadFonts, preparePage } from './recorder.ts'
import { serveStatic } from './serve.ts'
import { effects, musicBed } from './sound.ts'
import { Stage } from './stage.ts'
import type { Clip, Cue, ResolvedVideo, SceneContext, Take } from './types.ts'
import { sleep } from './util.ts'
import { narrate } from './voice/tts.ts'

export interface RenderOptions {
  /** No voice, no music, no effects: for checking the picture. */
  draft?: boolean
  /** Show the browser window. */
  headed?: boolean
  /** Film another instance than the one in the video file. */
  baseUrl?: string
  music?: string | false
  effects?: boolean
  log?: (line: string) => void
}

export const outDir = (video: ResolvedVideo) => path.join(video.dir, 'out')
export const outFiles = (video: ResolvedVideo) => {
  const dir = outDir(video)
  return {
    dir,
    mp4: path.join(dir, `${video.name}.mp4`),
    vtt: path.join(dir, `${video.name}.vtt`),
    take: path.join(dir, `${video.name}.take.json`),
    frames: path.join(dir, `frames-${video.name}`),
    failed: path.join(dir, 'failed.png'),
  }
}

/** Build the file from a take: the sound mix and the encode, no browser. */
export async function finish(video: ResolvedVideo, take: Take, opts: RenderOptions = {}): Promise<string> {
  const files = outFiles(video)
  const wantFx = opts.effects ?? video.sound.effects
  const wantMusic = opts.music ?? video.sound.music
  const sfx = take.draft || !wantFx ? [] : await effects(take.events)
  const music = take.draft || wantMusic === false ? null
    : wantMusic === 'generated' ? await musicBed() : path.resolve(video.dir, wantMusic)
  await encode({
    frames: take.frames, endMs: take.endMs, clips: take.audio, sfx, music,
    musicGain: video.sound.musicGain, dissolves: take.dissolves, lufs: video.sound.lufs,
    layout: video.layout, outFile: files.mp4, workDir: files.dir,
  })
  writeVtt(files.vtt, take.cues)
  return files.mp4
}

/** Rebuild the file from the last take, without recording. */
export async function remix(video: ResolvedVideo, opts: RenderOptions = {}): Promise<string> {
  const files = outFiles(video)
  if (!fs.existsSync(files.take)) throw new Error(`no take to remix: render "${video.name}" once first`)
  return finish(video, JSON.parse(fs.readFileSync(files.take, 'utf8')) as Take, opts)
}

/** Record every scene and build the file. Returns the take and the path of the MP4. */
export async function render(video: ResolvedVideo, opts: RenderOptions = {}): Promise<{ take: Take; file: string }> {
  const log = opts.log ?? console.log
  const draft = opts.draft ?? false
  const files = outFiles(video)
  fs.mkdirSync(files.dir, { recursive: true })

  const clips = await narrate(video.scenes.map((s) => s.say), { ...video.voice, draft })
  log(`narration: ${(clips.reduce((n, c) => n + c.ms, 0) / 1000).toFixed(1)} s over ${video.scenes.length} scenes${draft ? ' (draft, silent)' : ''}`)

  const server = video.serve ? await serveStatic(video.serve) : null
  const baseUrl = (opts.baseUrl ?? server?.url ?? video.baseUrl).replace(/\/$/, '')
  const { layout, theme, pace } = video
  const browser = await chromium.launch({ headless: !opts.headed })
  const page = await (await browser.newContext({ viewport: { width: layout.width, height: layout.height } })).newPage()
  let current = 'prepare'
  let take: Take | null = null
  try {
    await preparePage(page, layout, theme)
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    const rec = new Recorder(page, files.frames, layout)
    const stage = new Stage(page, layout, theme, () => rec.now(), video.appRoot)
    if (video.prepare) await video.prepare({ page, baseUrl, theme })
    const missingFonts = await loadFonts(page, theme)
    if (missingFonts.length) log(`fonts not loaded, fallback in use: ${missingFonts.join(', ')}`)

    await rec.start()
    const audio: Clip[] = []
    const cues: Cue[] = []
    const seen: Take['seen'] = []
    for (const [i, scene] of video.scenes.entries()) {
      current = scene.id
      const clip = clips[i]!
      const start = rec.now()
      const voiceAt = start + pace.leadMs
      const sceneCues = captionCues(scene.caption ?? scene.say, voiceAt, clip.ms)
      cues.push(...sceneCues)
      if (clip.file) audio.push({ file: clip.file, at: voiceAt })

      // captions follow the narration on their own clock while the steps run
      let live = true
      const captions = (async () => {
        for (const c of sceneCues) {
          await sleep(Math.max(0, c.start - rec.now()))
          if (!live) return
          await stage.setCaption(c.text)
        }
      })()
      const ctx: SceneContext = {
        page, stage, baseUrl, theme, sleep,
        sayMs: clip.ms,
        untilSaid: (fraction) => sleep(Math.max(0, voiceAt + clip.ms * fraction - rec.now())),
      }
      log(`scene ${i + 1}/${video.scenes.length} ${scene.id} @ ${(start / 1000).toFixed(1)} s`)
      await scene.run(ctx)
      await sleep(Math.max(0, voiceAt + clip.ms + pace.tailMs - rec.now()))
      live = false
      await captions
      seen.push({ id: scene.id, text: await page.evaluate(() => document.body.innerText) })
      await stage.setCaption(null)
    }
    const endMs = await rec.stop()
    log(`recorded ${rec.frames.length} frames, ${(endMs / 1000).toFixed(1)} s`)
    const holds = stage.dissolves.map((d) => Math.round(d.t2 - d.t1))
    if (holds.length) log(`dissolves held the old screen for (ms): ${holds.join(' ')}`)
    take = { draft, frames: rec.frames, endMs, audio, cues, events: stage.events, dissolves: stage.dissolves, seen, missingFonts }
    fs.writeFileSync(files.take, JSON.stringify(take))
  } catch (e) {
    await page.screenshot({ path: files.failed }).catch(() => {})
    // Playwright colours its messages for a terminal; the codes are noise in a log
    const reason = (e as Error).message.replace(/\x1b\[[0-9;]*m/g, '')
    throw new Error(`render stopped in scene "${current}": ${reason}\nThe page at that moment: ${files.failed}`)
  } finally {
    await browser.close()
    await server?.close()
  }
  const file = await finish(video, take, opts)
  return { take, file }
}
