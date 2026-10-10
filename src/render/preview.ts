// A preview of a theme: one picture, in seconds, of how its cards, captions and
// labels look in a wide frame and a tall one. It is what a person, or an agent,
// looks at before spending minutes on a render.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { workingFontsUrl } from '../brief/fonts.ts'
import { layoutFor } from '../brief/presets.ts'
import { themeFor } from '../brief/resolve.ts'
import { resolveTheme, scaleCss, type Theme } from '../core/theme.ts'
import type { Layout } from '../core/types.ts'
import { run } from '../core/util.ts'
import { CARD_KEYS, endCard, hookCard, stepsCard } from '../graphics/cards.ts'
import { motionDocument } from '../graphics/motion.ts'

/** A stand-in for a product screen, with the theme's highlight ring and callout
 *  label on it: the overlays as they would sit over a real product. */
export function overlaySpecimen(theme: Theme, layout: Layout): string {
  const { look } = theme
  const tall = layout.canvas.height > layout.canvas.width
  const u = tall ? 1.5 : 1
  const row = (w: number) => `<div style="height:${14 * u}px;width:${w}%;background:#D8DEE8;border-radius:${4 * u}px"></div>`
  const rows = [62, 48, 70, 40, 56].map((w, i) => `<div style="display:flex;gap:${16 * u}px;padding:${14 * u}px ${20 * u}px;border-top:1px solid #E6EAF0">${row(18)}${row(w)}${i === 1 ? '<i id="spot"></i>' : ''}</div>`).join('')
  return `${CARD_KEYS}
    <div style="position:absolute;inset:0;background:#EEF1F6"></div>
    <div style="position:absolute;left:${tall ? 6 : 14}%;right:${tall ? 6 : 14}%;top:${tall ? 16 : 14}%;background:#FFFFFF;border:1px solid #DDE2EA;border-radius:${12 * u}px;box-shadow:0 12px 30px rgba(20,30,50,.08);overflow:hidden">
      <div style="padding:${18 * u}px ${20 * u}px;font:700 ${20 * u}px/1 ${theme.type.text};color:#18202E">A product screen</div>
      ${rows}
    </div>
    <div style="position:absolute;left:${tall ? 9 : 16}%;top:${tall ? 26.5 : 36}%;width:${tall ? 60 : 44}%;height:${44 * u}px;${scaleCss(look.ring, u)};box-shadow:0 0 0 9999px rgba(8,16,30,.5);box-sizing:border-box"></div>
    <div style="position:absolute;left:${tall ? 9 : 16}%;top:${tall ? 31 : 46.5}%;${scaleCss(look.label, u)};font:700 ${16 * u}px/1.3 ${theme.type.text};padding:${8 * u}px ${14 * u}px ${9 * u}px">A callout label</div>`
}

const SCENES: ((theme: Theme, layout: Layout) => string)[] = [
  (t) => hookCard(t, { overline: 'THE PROBLEM', title: 'A title in this theme.', sub: 'A quieter line under it.', questions: ['The highlight colour?'] }, 3000),
  (t) => stepsCard(t, { overline: 'HOW IT WORKS', title: 'Panels in this theme', steps: [{ title: 'One', body: 'A panel with a short line.' }, { title: 'Two', body: 'Another, beside it.' }, { title: 'Three', body: 'And a third.' }] }, 3000),
  overlaySpecimen,
  (t) => endCard(t, { title: 'The end card', overline: 'CHIPS AND A CLOSING LINE', chips: ['Chips', 'Look', 'So'], cta: 'A next step.', ctaSub: 'example.com', note: 'Small print at the bottom.' }, 3000),
]

/** Draw a theme's cards and overlays in both shapes, on one sheet. Returns the file. */
export async function previewTheme(name: string | undefined, dir: string, outFile: string): Promise<string> {
  const input = themeFor(name ? { theme: name } : {}, null, [], dir)
  input.fontsCss = await workingFontsUrl(input.fontsCss ?? null) ?? input.fontsCss
  const work = path.join(path.dirname(outFile), `.preview-${path.basename(outFile, path.extname(outFile))}`)
  fs.rmSync(work, { recursive: true, force: true })
  fs.mkdirSync(work, { recursive: true })
  const browser = await chromium.launch()
  const shots: Record<string, string[]> = { landscape: [], vertical: [] }
  try {
    for (const format of ['landscape', 'vertical'] as const) {
      const layout = layoutFor(format)
      // cards are drawn larger on a tall frame, as the runner does
      const theme = resolveTheme({ ...input, scale: layout.mode === 'fill' ? 1 : 1.35 })
      const page = await browser.newPage({ viewport: layout.canvas })
      for (const [i, scene] of SCENES.entries()) {
        await page.setContent(motionDocument(scene(theme, layout), layout, resolveTheme(input)), { waitUntil: 'networkidle' })
        await page.evaluate(async (want) => {
          await Promise.all(want.map((f) => document.fonts.load(f).catch(() => [])))
          await document.fonts.ready
          for (const a of document.getAnimations()) { a.pause(); a.currentTime = 60_000 }
          const cap = document.getElementById('showcase-caption')
          if (cap) { cap.textContent = 'A caption, as the voice reads the line.'; cap.style.display = 'block' }
        }, theme.fontsToLoad)
        // on a tall frame captions are drawn large on the band, not in a box
        if (layout.captions === 'composite') {
          await page.evaluate(({ y, h, size, colour, font }) => {
            document.getElementById('showcase-caption')!.style.display = 'none'
            const d = document.createElement('div')
            d.style.cssText = `position:fixed;left:0;right:0;top:${y}px;height:${h}px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 6%;box-sizing:border-box;color:${colour};font:600 ${size}px/1.28 ${font}`
            d.textContent = 'A caption, as the voice reads the line.'
            document.body.appendChild(d)
          }, { y: layout.captionBand.y, h: layout.captionBand.height, size: Math.round(layout.canvas.width * 0.041), colour: theme.bandText, font: theme.type.text })
        }
        const file = path.join(work, `${format}-${i}.jpg`)
        await page.screenshot({ path: file, type: 'jpeg', quality: 88 })
        shots[format]!.push(file)
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
  // two rows of two wide frames, then the four tall ones beside each other
  const inputs = [...shots.landscape!, ...shots.vertical!].flatMap((f) => ['-i', f])
  const wide = [0, 1, 2, 3].map((i) => `[${i}:v]scale=800:450[w${i}]`).join(';')
  const tall = [4, 5, 6, 7].map((i) => `[${i}:v]scale=400:712[t${i}]`).join(';')
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  await run('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex',
    `${wide};${tall};[w0][w1]hstack[r0];[w2][w3]hstack[r1];[t4][t5][t6][t7]hstack=inputs=4[r2];[r0][r1][r2]vstack=inputs=3[out]`,
    '-map', '[out]', '-frames:v', '1', '-q:v', '3', outFile])
  fs.rmSync(work, { recursive: true, force: true })
  return outFile
}
