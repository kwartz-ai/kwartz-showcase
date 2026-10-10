// Layouts where the filmed page is a window on a larger canvas ('framed', 'fit').
// Two jobs: put every filmed frame on the canvas, and draw the captions on the
// canvas as images, in the band kept for them.
import fs from 'node:fs'
import path from 'node:path'
import type { BrowserContext } from 'playwright'
import type { Theme } from '../core/theme.ts'
import type { CaptionImage, Cue, Frame, Layout } from '../core/types.ts'
import { esc, run } from '../core/util.ts'

/** The FFmpeg filter that places a filmed frame in its window on the canvas. */
export function windowFilter(layout: Layout, ink: string): string {
  const { canvas, window: w } = layout
  return `scale=${w.width}:${w.height},pad=${canvas.width}:${canvas.height}:${w.x}:${w.y}:color=${ink.replace('#', '0x')}`
}

/** Put the filmed frames on the canvas. Frames that are already canvas size (motion
 *  scenes) are left alone. Returns the frame list with the new files. */
export async function composeFrames(frames: Frame[], layout: Layout, theme: Theme, appDir: string, outDir: string): Promise<Frame[]> {
  if (layout.mode === 'fill') return frames
  const inApp = (f: Frame) => path.dirname(f.file) === appDir
  if (!frames.some(inApp)) return frames
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  // the recorder numbers its frames f000000.jpg onwards, so one run handles them all
  await run('ffmpeg', ['-y', '-v', 'error', '-start_number', '0', '-i', path.join(appDir, 'f%06d.jpg'),
    '-vf', windowFilter(layout, theme.ink), '-q:v', '2', '-start_number', '0', path.join(outDir, 'f%06d.jpg')])
  return frames.map((f) => inApp(f) ? { ...f, file: path.join(outDir, path.basename(f.file)) } : f)
}

/** A caption as a page of its own: transparent, exactly the size of the band. */
export function captionDocument(text: string, layout: Layout, theme: Theme): string {
  const { width } = layout.canvas
  const size = Math.round(width * 0.041 * theme.captionScale)       // about 44 px on a 1080 wide phone frame
  return `<!doctype html><html><head><meta charset="utf-8">
${theme.fontsCss ? `<link rel="stylesheet" href="${esc(theme.fontsCss)}">` : ''}
<style>html,body{margin:0;background:transparent}
#band{width:${width}px;height:${layout.captionBand.height}px;display:flex;align-items:center;justify-content:center}
#cap{max-width:${Math.round(width * 0.88)}px;color:#fff;text-align:center;text-wrap:balance;
  font:600 ${size}px/1.28 ${theme.type.text};letter-spacing:.002em}</style>
</head><body><div id="band"><div id="cap">${esc(text)}</div></div></body></html>`
}

/** Draw each caption as a transparent image the size of the caption band. */
export async function renderCaptionImages(context: BrowserContext, cues: Cue[], layout: Layout, theme: Theme, dir: string): Promise<CaptionImage[]> {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const page = await context.newPage()
  try {
    await page.setViewportSize({ width: layout.canvas.width, height: layout.captionBand.height })
    const out: CaptionImage[] = []
    for (const [i, cue] of cues.entries()) {
      await page.setContent(captionDocument(cue.text, layout, theme), { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      const file = path.join(dir, `c${String(i).padStart(4, '0')}.png`)
      await page.screenshot({ path: file, omitBackground: true })
      out.push({ file, start: cue.start, end: cue.end })
    }
    return out
  } finally {
    await page.close()
  }
}

/** One input for FFmpeg that shows each caption image for its own time and nothing
 *  in between: a list in which every entry has a duration. */
export function captionTrack(images: CaptionImage[], endMs: number, blankFile: string): string {
  const list = ['ffconcat version 1.0']
  const add = (file: string, ms: number) => {
    if (ms > 0.5) list.push(`file '${file.replace(/\\/g, '/')}'`, `duration ${(ms / 1000).toFixed(4)}`)
  }
  let t = 0
  for (const img of [...images].sort((a, b) => a.start - b.start)) {
    add(blankFile, img.start - t)
    add(img.file, img.end - Math.max(t, img.start))
    t = Math.max(t, img.end)
  }
  add(blankFile, endMs - t)
  list.push(`file '${blankFile.replace(/\\/g, '/')}'`)
  return list.join('\n')
}
