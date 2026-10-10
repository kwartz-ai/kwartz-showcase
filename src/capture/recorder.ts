import fs from 'node:fs'
import path from 'node:path'
import type { Page } from 'playwright'
import type { Theme } from '../core/theme.ts'
import type { Frame, Layout } from '../core/types.ts'

/** Zoom the page, and link the video's fonts, before the app's first paint.
 *  The window is `layout.width` wide and the page is zoomed, so the app lays out as
 *  on a smaller screen while the captured frames stay sharp at full size. */
export async function preparePage(page: Page, layout: Layout, theme: Theme): Promise<void> {
  await page.addInitScript(({ zoom, css }) => {
    const add = () => {
      const s = document.createElement('style')
      s.textContent = `html{zoom:${zoom}}`
      document.documentElement.appendChild(s)
      if (css) {
        const l = document.createElement('link')
        l.rel = 'stylesheet'
        l.href = css
        document.documentElement.appendChild(l)
      }
    }
    if (document.documentElement) add()
    else document.addEventListener('DOMContentLoaded', add)
  }, { zoom: layout.zoom, css: theme.fontsCss })
}

/** Wait for the fonts, so no frame is filmed in a fallback face. Returns the faces
 *  that did not load (the render still works, in the fallback). */
export async function loadFonts(page: Page, theme: Theme): Promise<string[]> {
  return page.evaluate(async (want) => {
    await Promise.all(want.map((f) => document.fonts.load(f).catch(() => [])))
    await document.fonts.ready
    return want.filter((f) => !document.fonts.check(f))
  }, theme.fontsToLoad)
}

/** Writes every repainted frame to disk as it arrives, with its timestamp. When
 *  nothing on the page changes, no frame arrives, and the encoder holds the last. */
export class Recorder {
  readonly frames: Frame[] = []
  private t0 = 0
  /** Wall-clock time not counted, and video time added without waiting: together
   *  they let a motion scene be rendered offline and still sit on the timeline. */
  private lost = 0
  private skipped = 0
  private pausedAt: number | null = null
  /** Filmed frames are numbered on their own, with no gaps, whatever else is on
   *  the timeline: later steps read them as one numbered sequence. */
  private filmed = 0

  constructor(private page: Page, private dir: string, private layout: Layout) {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
  }

  async start(): Promise<void> {
    this.t0 = Date.now()
    await this.page.screencast.start({
      quality: 92,
      size: { width: this.layout.width, height: this.layout.height },
      onFrame: ({ data, timestamp }) => {
        if (this.pausedAt !== null) return       // the app is not on screen during a motion scene
        const file = path.join(this.dir, `f${String(this.filmed++).padStart(6, '0')}.jpg`)
        fs.writeFileSync(file, data)
        this.frames.push({ file, t: Math.max(0, timestamp - this.t0 - this.lost + this.skipped) })
      },
    })
  }

  /** Milliseconds since recording started: the video's own clock. */
  now(): number { return (this.pausedAt ?? Date.now()) - this.t0 - this.lost + this.skipped }

  /** Stop the clock and ignore the browser's frames. */
  pause(): void {
    if (this.pausedAt === null) this.pausedAt = Date.now()
  }

  /** Start the clock again, `skipMs` of video time later than where it stopped. */
  resume(skipMs = 0): void {
    if (this.pausedAt === null) return
    this.lost += Date.now() - this.pausedAt
    this.skipped += skipMs
    this.pausedAt = null
  }

  /** Put frames made elsewhere (a motion scene) on the timeline. */
  insert(frames: Frame[]): void {
    this.frames.push(...frames)
    this.frames.sort((a, b) => a.t - b.t)
  }

  async stop(): Promise<number> {
    const end = this.now()
    await this.page.screencast.stop()
    return end
  }
}
