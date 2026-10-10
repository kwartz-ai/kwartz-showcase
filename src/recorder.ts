import fs from 'node:fs'
import path from 'node:path'
import type { Page } from 'playwright'
import type { Theme } from './theme.ts'
import type { Frame, Layout } from './types.ts'

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
        const file = path.join(this.dir, `f${String(this.frames.length).padStart(6, '0')}.jpg`)
        fs.writeFileSync(file, data)
        this.frames.push({ file, t: Math.max(0, timestamp - this.t0) })
      },
    })
  }

  /** Milliseconds since recording started: the video's own clock. */
  now(): number { return Date.now() - this.t0 }

  async stop(): Promise<number> {
    const end = this.now()
    await this.page.screencast.stop()
    return end
  }
}
