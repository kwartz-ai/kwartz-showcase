// Motion scenes: full-screen graphics rendered frame by frame.
//
// An app scene is filmed as the browser paints, so its timing depends on the
// machine. A motion scene is different: the page is never played. Every animation
// is paused, set to an exact time, and photographed. The same scene gives the same
// frames on any machine, and moving things can be blurred as a camera would.
import fs from 'node:fs'
import path from 'node:path'
import type { BrowserContext, Page } from 'playwright'
import type { Theme } from '../core/theme.ts'
import type { Cue, Frame, Layout } from '../core/types.ts'
import { esc, run } from '../core/util.ts'

/** Pictures blended into one frame for motion blur. */
export const BLUR_SAMPLES = 4

export interface MotionInput {
  /** The scene's HTML: what a card function returns. */
  html: string
  durationMs: number
  /** Captions to draw in the frames, with times from the start of the scene.
   *  Null when the layout draws captions on the canvas instead. */
  cues: Cue[] | null
  layout: Layout
  theme: Theme
  blur: boolean
  /** A folder for this scene's frames. */
  dir: string
}

/** The document a motion scene is rendered in: the canvas, the theme's fonts, the
 *  scene's HTML, and a caption that the seek function fills in. */
export function motionDocument(html: string, layout: Layout, theme: Theme): string {
  const { width, height } = layout.canvas
  // a wide canvas is zoomed like the app is, so cards look the same in both
  const zoom = layout.mode === 'fill' ? layout.zoom : 1
  const u = (layout.mode === 'fill' ? layout.ui : 1) * theme.captionScale
  return `<!doctype html><html><head><meta charset="utf-8">
${theme.fontsCss ? `<link rel="stylesheet" href="${esc(theme.fontsCss)}">` : ''}
<style>html{zoom:${zoom}} html,body{margin:0;width:${width / zoom}px;height:${height / zoom}px;overflow:hidden;background:${theme.ink}}</style>
</head><body>
<div id="showcase-scene" style="position:fixed;inset:0;font-family:${theme.type.text}">${html}</div>
<div id="showcase-caption" style="position:fixed;left:50%;bottom:${30 * u + layout.safe.bottom / zoom}px;transform:translateX(-50%);
  width:max-content;max-width:${Math.min(580 * u, width / zoom - 40 * u)}px;display:none;
  background:${theme.ink};opacity:.94;color:#fff;padding:${11 * u}px ${22 * u}px ${12 * u}px;border-radius:${11 * u}px;text-align:center;
  font:500 ${19.5 * u}px/1.34 ${theme.type.text};letter-spacing:.003em;text-wrap:balance;
  box-shadow:0 8px 28px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14)"></div>
</body></html>`
}

/** Runs in the page: put every animation at exactly `t` ms, and show the caption
 *  that is on screen at that time. */
function seekInPage({ t, cues }: { t: number; cues: { text: string; start: number; end: number }[] | null }): void {
  for (const a of document.getAnimations()) {
    a.pause()
    a.currentTime = t
  }
  const cap = document.getElementById('showcase-caption')
  if (!cap) return
  const cue = cues?.find((c) => t >= c.start && t < c.end)
  cap.style.display = cue ? 'block' : 'none'
  if (cue && cap.textContent !== cue.text) cap.textContent = cue.text
}

/** Runs in the page: the time after which nothing moves any more, ms. Animations
 *  that never end, or outlast the scene, keep it moving to the end. */
function settledAfterInPage(durationMs: number): number {
  let last = 0
  for (const a of document.getAnimations()) {
    const end = a.effect?.getComputedTiming().endTime
    const ms = typeof end === 'number' ? end : Number(end)
    last = Math.max(last, Number.isFinite(ms) ? Math.min(ms, durationMs) : durationMs)
  }
  return last
}

/** The times to photograph: every frame while something moves, then only where a
 *  caption changes. A still screen needs one frame, not thirty a second. */
export function frameTimes(durationMs: number, settledMs: number, fps: number, cues: Cue[] | null): number[] {
  const step = 1000 / fps
  const times: number[] = []
  // counted by frame number: adding the step up drifts, and gave one frame too many
  const until = Math.min(durationMs, settledMs + step) - 1e-6
  for (let i = 0; i * step < until; i++) times.push(+(i * step).toFixed(3))
  if (!times.length) times.push(0)
  for (const c of cues ?? []) {
    for (const edge of [c.start, c.end]) {
      const t = +(Math.ceil(edge / step) * step).toFixed(3)
      if (t > times.at(-1)! && t < durationMs) times.push(t)
    }
  }
  return [...new Set(times)].sort((a, b) => a - b)
}

async function shoot(page: Page, file: string, t: number, cues: Cue[] | null): Promise<void> {
  await page.evaluate(seekInPage, { t, cues })
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 })
}

/** Render one motion scene. Returns its frames with times from the scene's start. */
export async function renderMotion(context: BrowserContext, input: MotionInput): Promise<Frame[]> {
  const { layout, theme, durationMs, cues, dir } = input
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const page = await context.newPage()
  try {
    await page.setViewportSize(layout.canvas)
    await page.setContent(motionDocument(input.html, layout, theme), { waitUntil: 'load' })
    await page.evaluate(async (want) => {
      await Promise.all(want.map((f) => document.fonts.load(f).catch(() => [])))
      await document.fonts.ready
    }, theme.fontsToLoad)
    const settled = await page.evaluate(settledAfterInPage, durationMs)
    const times = frameTimes(durationMs, settled, layout.fps, cues)
    const step = 1000 / layout.fps
    const name = (i: number) => path.join(dir, `m${String(i).padStart(5, '0')}.jpg`)

    // blur only while things move: a settled frame blurred is the same frame
    const moving = input.blur ? times.filter((t) => t <= settled) : []
    if (moving.length) {
      // a 180 degree shutter: each frame blends samples from the half frame before it
      let n = 0
      for (const t of moving) {
        for (let j = BLUR_SAMPLES - 1; j >= 0; j--) {
          await shoot(page, path.join(dir, `s${String(n++).padStart(6, '0')}.jpg`), Math.max(0, t - j * step / 2 / BLUR_SAMPLES), cues)
        }
      }
      await run('ffmpeg', ['-y', '-v', 'error', '-framerate', String(layout.fps * BLUR_SAMPLES), '-i', path.join(dir, 's%06d.jpg'),
        '-vf', `tmix=frames=${BLUR_SAMPLES},select='not(mod(n+1\\,${BLUR_SAMPLES}))'`, '-fps_mode', 'vfr', '-q:v', '2', '-start_number', '0', path.join(dir, 'm%05d.jpg')])
      for (let i = 0; i < n; i++) fs.rmSync(path.join(dir, `s${String(i).padStart(6, '0')}.jpg`), { force: true })
    }
    for (let i = moving.length; i < times.length; i++) await shoot(page, name(i), times[i]!, cues)
    const frames = times.map((t, i) => ({ file: name(i), t }))
    const missing = frames.find((f) => !fs.existsSync(f.file))
    if (missing) throw new Error(`motion scene: frame ${path.basename(missing.file)} was not written`)
    return frames
  } finally {
    await page.close()
  }
}

/** The words a motion scene shows, for the banned-text check. */
export function textOf(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}
