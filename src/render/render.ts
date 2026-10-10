// The runner: narration first, then the browser, the scenes, capture and encoding.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import type { Palette } from '../audio/palette.ts'
import { effects, musicBed } from '../audio/sound.ts'
import { narrate } from '../audio/tts.ts'
import { guardReadOnly } from '../capture/readonly.ts'
import { Recorder, loadFonts, preparePage } from '../capture/recorder.ts'
import { serveStatic } from '../capture/serve.ts'
import { sessionFor } from '../capture/session.ts'
import { Stage } from '../capture/stage.ts'
import type { Clip, Cue, LayoutIssue, ResolvedVideo, SceneContext, Take } from '../core/types.ts'
import { sleep } from '../core/util.ts'
import { clipSceneMs, clipSound, clipSpec, probeClip, renderClip } from '../graphics/clip.ts'
import { renderMotion, textOf } from '../graphics/motion.ts'
import { captionCues, writeVtt } from './captions.ts'
import { composeFrames, renderCaptionImages } from './compose.ts'
import { encode } from './encode.ts'

export interface RenderOptions {
  /** No voice, no music, no effects: for checking the picture. */
  draft?: boolean
  /** Show the browser window. */
  headed?: boolean
  /** Film another instance than the one in the video file. */
  baseUrl?: string
  music?: string | false
  effects?: boolean
  /** The sound set chosen for this project. Without one, the kit's defaults. */
  palette?: Palette
  /** false leaves the rounded border and backdrop off. */
  border?: boolean
  log?: (line: string) => void
}

/** How long a motion scene blends with the scenes around it, ms. */
/** How much larger a card is drawn when the page is a window on a tall frame. */
export const TALL_CARD_SCALE = 1.35
const MOTION_DISSOLVE_MS = 380

/** The page behind a video that films no product. */
export const blankPage = (ink: string) => `data:text/html,${encodeURIComponent(`<!doctype html><html><head><title>.</title></head><body style="margin:0;background:${ink}"></body></html>`)}`

export const outDir = (video: ResolvedVideo) => path.join(video.dir, 'out')
export const outFiles = (video: ResolvedVideo) => {
  const dir = outDir(video)
  return {
    dir,
    mp4: path.join(dir, `${video.name}.mp4`),
    vtt: path.join(dir, `${video.name}.vtt`),
    take: path.join(dir, `${video.name}.take.json`),
    frames: path.join(dir, `frames-${video.name}`),
    /** Filmed frames placed on the canvas, for layouts where they are a window. */
    canvasFrames: path.join(dir, `frames-${video.name}-canvas`),
    motion: path.join(dir, `motion-${video.name}`),
    captions: path.join(dir, `captions-${video.name}`),
    failed: path.join(dir, 'failed.png'),
  }
}

/** Build the file from a take: the sound mix and the encode, no browser. */
export async function finish(video: ResolvedVideo, take: Take, opts: RenderOptions = {}): Promise<string> {
  const files = outFiles(video)
  const wantFx = opts.effects ?? video.sound.effects
  const wantMusic = opts.music ?? video.sound.music
  const sfx = take.draft || !wantFx ? [] : await effects(take.events, opts.palette)
  const music = take.draft || wantMusic === false ? null
    : wantMusic === 'generated' ? await musicBed() : path.resolve(video.dir, wantMusic)
  const frames = await composeFrames(take.frames, video.layout, video.theme, files.frames, files.canvasFrames)
  await encode({
    frames, endMs: take.endMs, clips: take.audio, sfx, music,
    musicGain: video.sound.musicGain, dissolves: take.dissolves, lufs: video.sound.lufs,
    captionImages: take.captionImages ?? [],
    border: opts.border === false ? null : video.border,
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

  // a clip scene may have nothing to say: only spoken lines go to the voice
  const spoken = video.scenes.map((s) => s.say?.trim() ?? '')
  const voiced = await narrate(spoken.filter(Boolean), { ...video.voice, draft })
  const clips = spoken.map((line) => (line ? voiced.shift()! : { file: null, ms: 0 }))
  log(`narration: ${(clips.reduce((n, c) => n + c.ms, 0) / 1000).toFixed(1)} s over ${video.scenes.length} scenes${draft ? ' (draft, silent)' : ''}`)

  const server = video.serve ? await serveStatic(video.serve) : null
  const baseUrl = (opts.baseUrl ?? server?.url ?? video.baseUrl).replace(/\/$/, '')
  const { layout, theme, pace, format, cta } = video
  const session = sessionFor(video.session)
  const browser = await chromium.launch({ headless: !opts.headed })
  const context = await browser.newContext({ viewport: { width: layout.width, height: layout.height }, ...(session ? { storageState: session } : {}) })
  const blocked = video.readOnly.on ? await guardReadOnly(context, video.readOnly.allow) : []
  const page = await context.newPage()
  let current = 'prepare'
  let take: Take | null = null
  try {
    await preparePage(page, layout, theme)
    // with no product to film, the page is a blank one in the video's dark colour
    await page.goto(baseUrl || blankPage(theme.ink), { waitUntil: 'networkidle' })
    const rec = new Recorder(page, files.frames, layout)
    const stage = new Stage(page, layout, theme, () => rec.now(), video.appRoot)
    if (video.prepare) await video.prepare({ page, baseUrl, theme })
    const missingFonts = await loadFonts(page, theme)
    if (missingFonts.length) log(`fonts not loaded, fallback in use: ${missingFonts.join(', ')}`)
    fs.rmSync(files.motion, { recursive: true, force: true })

    await rec.start()
    const audio: Clip[] = []
    const cues: Cue[] = []
    const seen: Take['seen'] = []
    const issues: LayoutIssue[] = []
    let afterMotion = false
    for (const [i, scene] of video.scenes.entries()) {
      current = scene.id
      const clip = clips[i]!
      // let the app paint the cleared caption before a card takes over, so the
      // last picture of the app that the card dissolves from has no caption on it
      if ((scene.motion || scene.clip) && i > 0 && !afterMotion) await sleep(90)
      const start = rec.now()
      const voiceAt = start + pace.leadMs
      const sceneCues = clip.ms ? captionCues(scene.caption ?? scene.say, voiceAt, clip.ms) : []
      cues.push(...sceneCues)
      if (clip.file) audio.push({ file: clip.file, at: voiceAt })
      log(`scene ${i + 1}/${video.scenes.length} ${scene.id} @ ${(start / 1000).toFixed(1)} s${scene.motion ? ' (motion)' : scene.clip ? ' (clip)' : ''}`)

      if (scene.clip) {
        // like a motion scene, a clip is made into frames while the clock is stopped
        const spec = clipSpec(scene.clip)
        const file = path.resolve(video.dir, spec.file)
        const info = await probeClip(file)
        const durationMs = clipSceneMs(info.seconds, spec, clip.ms ? pace.leadMs + clip.ms + pace.tailMs : 0)
        const dir = path.join(files.motion, String(i).padStart(2, '0'))
        rec.pause()
        const frames = await renderClip(context, {
          file, fit: spec.fit, from: spec.from, durationMs, layout, theme, dir,
          cues: layout.captions === 'page' ? sceneCues.map((c) => ({ ...c, start: c.start - start, end: c.end - start })) : null,
        })
        rec.insert(frames.map((f) => ({ file: f.file, t: start + f.t })))
        if (spec.sound && info.hasSound && !draft) audio.push({ file: await clipSound(file, spec.from, durationMs, dir), at: start, gain: clip.ms ? 0.35 : 1 })
        if (i > 0) stage.markDissolve(start - 0.5, start + MOTION_DISSOLVE_MS, MOTION_DISSOLVE_MS)
        rec.resume(durationMs)
        // what a clip shows cannot be read, so the banned-text check does not cover it
        seen.push({ id: scene.id, text: '' })
        afterMotion = true
        continue
      }

      if (scene.motion) {
        // The clock stops while the scene is rendered frame by frame, then moves on
        // by the scene's length, so its frames sit on the timeline at exact times.
        const durationMs = pace.leadMs + clip.ms + pace.tailMs
        rec.pause()
        // a card on a tall frame is read on a phone: its type is drawn larger
        const cardTheme = layout.mode === 'fill' ? theme : { ...theme, scale: theme.scale * TALL_CARD_SCALE }
        const html = scene.motion({ theme: cardTheme, sayMs: clip.ms, format, layout, cta })
        const frames = await renderMotion(context, {
          html, durationMs, layout, theme,
          cues: layout.captions === 'page' ? sceneCues.map((c) => ({ ...c, start: c.start - start, end: c.end - start })) : null,
          blur: video.motion.blur && !draft,
          dir: path.join(files.motion, String(i).padStart(2, '0')),
        })
        rec.insert(frames.map((f) => ({ file: f.file, t: start + f.t })))
        for (const problem of frames.problems) issues.push({ scene: scene.id, problem })
        if (i > 0) stage.markDissolve(start - 0.5, start + MOTION_DISSOLVE_MS, MOTION_DISSOLVE_MS)
        rec.resume(durationMs)
        seen.push({ id: scene.id, text: textOf(html) })
        afterMotion = true
        continue
      }

      // after a motion scene the app has not painted for a while: nudge it, so the
      // card dissolves into a fresh picture of the app
      if (afterMotion) await stage.dissolve(() => stage.nudge(), { ms: MOTION_DISSOLVE_MS })
      afterMotion = false

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
        page, stage, baseUrl, theme, format, layout, cta, sleep,
        sayMs: clip.ms,
        untilSaid: (fraction) => sleep(Math.max(0, voiceAt + clip.ms * fraction - rec.now())),
      }
      const before = stage.problems.length
      await scene.run!(ctx)
      for (const problem of new Set(stage.problems.slice(before))) issues.push({ scene: scene.id, problem })
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
    if (blocked.length) log(`read-only mode refused ${blocked.length} request(s) that could change data`)
    // captions that are drawn on the canvas are made here, while the browser is open
    const captionProblems: string[] = []
    const captionImages = layout.captions === 'composite' ? await renderCaptionImages(context, cues, layout, theme, files.captions, captionProblems) : undefined
    for (const problem of captionProblems) issues.push({ scene: 'captions', problem })
    for (const i of issues) log(`layout: scene "${i.scene}": ${i.problem}`)
    take = { draft, frames: rec.frames, endMs, audio, cues, events: stage.events, dissolves: stage.dissolves, seen, missingFonts, captionImages, blocked: [...new Set(blocked)], layout: issues }
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
