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
  /** false skips the layout check. */
  inspect?: boolean
}

/** The document a motion scene is rendered in: the canvas, the theme's fonts, the
 *  scene's HTML, and a caption that the seek function fills in. */
export function motionDocument(html: string, layout: Layout, theme: Theme): string {
  const { width, height } = layout.canvas
  // a wide canvas is zoomed like the app is, so cards look the same in both
  const zoom = layout.mode === 'fill' ? layout.zoom : 1
  const u = (layout.mode === 'fill' ? layout.ui : 1) * theme.captionScale
  // Where captions are drawn on the canvas, they are white on the dark colour. A
  // motion scene fills the whole canvas, so the band is kept dark under any scene.
  const band = layout.captions === 'composite'
    ? `<div id="showcase-band" style="position:fixed;left:0;right:0;top:${layout.captionBand.y}px;bottom:0;background:${theme.ink}"></div>` : ''
  return `<!doctype html><html><head><meta charset="utf-8">
${theme.fontsCss ? `<link rel="stylesheet" href="${esc(theme.fontsCss)}">` : ''}
<style>html{zoom:${zoom}} html,body{margin:0;width:${width / zoom}px;height:${height / zoom}px;overflow:hidden;background:${theme.ink}}</style>
</head><body>
<div id="showcase-scene" style="position:fixed;inset:0;font-family:${theme.type.text}">${html}</div>
${band}
<div id="showcase-caption" style="position:fixed;left:50%;bottom:${30 * u + layout.safe.bottom / zoom}px;transform:translateX(-50%);
  width:max-content;max-width:${Math.min(580 * u, width / zoom - 40 * u)}px;display:none;
  background:${theme.ink};opacity:.94;color:#fff;padding:${11 * u}px ${22 * u}px ${12 * u}px;border-radius:${11 * u}px;text-align:center;
  font:500 ${19.5 * u}px/1.34 ${theme.type.text};letter-spacing:.003em;text-wrap:balance;
  box-shadow:0 8px 28px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14)"></div>
</body></html>`
}

/** Runs in the page: put every animation at exactly `t` ms, and show the caption
 *  that is on screen at that time. */
function seekInPage({ t, captionAt, cues }: { t: number; captionAt: number; cues: { text: string; start: number; end: number }[] | null }): void {
  for (const a of document.getAnimations()) {
    a.pause()
    a.currentTime = t
  }
  const cap = document.getElementById('showcase-caption')
  if (!cap) return
  const cue = cues?.find((c) => captionAt >= c.start && captionAt < c.end)
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

/** How close to the edge of its area a graphic may come, as a share of the frame.
 *  Something that touches the edge looks cut even when it is not. */
export const LAYOUT_MARGIN = 0.012

/** The area graphics must stay inside, as shares of the canvas: the whole frame,
 *  less what a phone app covers and the band where captions are drawn. */
export function graphicsArea(layout: Layout): { top: number; bottom: number } {
  return layout.captions === 'composite'
    ? { top: layout.safe.top / layout.canvas.height, bottom: layout.captionBand.y / layout.canvas.height }
    : { top: 0, bottom: 1 }
}

/** Runs in the page: find text, and the boxes around text, that reach outside the
 *  area for graphics, or that the caption covers. Sizes are reported in canvas px. */
export function inspectInPage({ top, bottom, margin, canvasH, canvasW }: { top: number; bottom: number; margin: number; canvasH: number; canvasW: number }): string[] {
  const scene = document.getElementById('showcase-scene')
  if (!scene) return []
  const ref = scene.getBoundingClientRect()
  const ky = canvasH / ref.height, kx = canvasW / ref.width
  const lo = ref.top + (top + margin) * ref.height, hi = ref.top + (bottom - margin) * ref.height
  const left = ref.left + margin * ref.width, right = ref.right - margin * ref.width
  const cap = document.getElementById('showcase-caption')
  const capBox = cap && getComputedStyle(cap).display !== 'none' ? cap.getBoundingClientRect() : null
  const seen = (el: Element) => {
    let o = 1
    for (let e: Element | null = el; e && e !== scene; e = e.parentElement) {
      const s = getComputedStyle(e)
      if (s.display === 'none' || s.visibility === 'hidden') return false
      o *= Number(s.opacity)
    }
    return o > 0.15
  }
  const name = (el: Element) => `"${((el as HTMLElement).innerText || el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 32)}"`
  const out = new Set<string>()
  const done = new Set<Element>()
  const measure = (el: Element, label: string) => {
    if (done.has(el)) return
    done.add(el)
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    if (r.width > ref.width * 0.97 && r.height > ref.height * 0.9) return      // a background, not a graphic
    const by = (px: number, k: number) => Math.round(px * k)
    if (r.bottom > hi + 0.5) out.add(`${label} is cut off or too close at the bottom, by ${by(r.bottom - hi, ky)} px`)
    if (r.top < lo - 0.5) out.add(`${label} is cut off or too close at the top, by ${by(lo - r.top, ky)} px`)
    if (r.right > right + 0.5) out.add(`${label} runs off the right side, by ${by(r.right - right, kx)} px`)
    if (r.left < left - 0.5) out.add(`${label} runs off the left side, by ${by(left - r.left, kx)} px`)
    if (capBox && r.left < capBox.right && r.right > capBox.left && r.top < capBox.bottom - 2 && r.bottom > capBox.top + 2) out.add(`the caption covers ${label}`)
  }
  for (const el of scene.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'style' || tag === 'script') continue
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
    if (!hasText && tag !== 'svg') continue
    if (!seen(el)) continue
    measure(el, tag === 'svg' ? 'a drawing' : name(el))
    // the box around the text is part of the graphic: a card, a chip, a bar
    for (let box = el.parentElement; box && box !== scene; box = box.parentElement) {
      const s = getComputedStyle(box)
      if (parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== 'none') measure(box, `the box around ${name(el)}`)
    }
  }
  return [...out]
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

/** Photograph the scene at time `t`. The caption is the one on screen at
 *  `captionAt`: the samples blended into one blurred frame all carry that frame's
 *  caption, so a caption never shows half changed. */
/** Look at the scene at several moments (a quarter, half and three quarters of
 *  the way through, when everything has arrived, at its end, and in the middle of
 *  every caption) and collect whatever sits outside its area. */
async function inspectMotion(page: Page, input: MotionInput, settledMs: number): Promise<string[]> {
  const { layout, durationMs, cues } = input
  const area = graphicsArea(layout)
  const times = new Set([0.25, 0.5, 0.75].map((f) => Math.round(durationMs * f)))
  times.add(Math.min(Math.round(settledMs), durationMs - 1))
  times.add(durationMs - 1)
  for (const c of cues ?? []) times.add(Math.round((c.start + c.end) / 2))
  const found = new Set<string>()
  for (const t of [...times].filter((x) => x >= 0 && x < durationMs).sort((a, b) => a - b)) {
    await page.evaluate(seekInPage, { t, captionAt: t, cues })
    const problems = await page.evaluate(inspectInPage, { ...area, margin: LAYOUT_MARGIN, canvasH: layout.canvas.height, canvasW: layout.canvas.width })
    for (const p of problems) found.add(p)
  }
  // a thing that moves is seen in several places: report it once, at its worst
  const worst = new Map<string, { text: string; px: number }>()
  for (const text of found) {
    const m = text.match(/^(.*), by (\d+) px$/)
    const key = m ? m[1]! : text, px = m ? Number(m[2]) : 0
    if (!worst.has(key) || px > worst.get(key)!.px) worst.set(key, { text, px })
  }
  return [...worst.values()].map((w) => w.text)
}

async function shoot(page: Page, file: string, t: number, cues: Cue[] | null, captionAt = t): Promise<void> {
  await page.evaluate(seekInPage, { t, captionAt, cues })
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 })
}

/** Render one motion scene. Returns its frames with times from the scene's start. */
export async function renderMotion(context: BrowserContext, input: MotionInput): Promise<Frame[] & { problems: string[] }> {
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
    const problems = input.inspect === false ? [] : await inspectMotion(page, input, settled)
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
          await shoot(page, path.join(dir, `s${String(n++).padStart(6, '0')}.jpg`), Math.max(0, t - j * step / 2 / BLUR_SAMPLES), cues, t)
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
    return Object.assign(frames, { problems })
  } finally {
    await page.close()
  }
}

/** The words a motion scene shows, for the banned-text check. */
export function textOf(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}
