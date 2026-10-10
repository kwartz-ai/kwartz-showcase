// one still per scene per theme, in both shapes: a fast look before full renders
import { chromium } from 'playwright'
import fs from 'node:fs'
import { THEME_NAMES } from './src/brief/themes.ts'
import { layoutFor } from './src/brief/presets.ts'
import { themeFor } from './src/brief/resolve.ts'
import { workingFontsUrl } from './src/brief/fonts.ts'
import { resolveTheme } from './src/core/theme.ts'
import { motionDocument } from './src/graphics/motion.ts'
import scenes from './examples/motion/video.ts'
const out = process.argv[2]!
const only = process.argv[3]?.split(',')
const b = await chromium.launch()
for (const name of ['classic', ...THEME_NAMES]) {
  if (only && !only.includes(name)) continue
  const input = themeFor(name === 'classic' ? {} : { theme: name })
  input.fontsCss = await workingFontsUrl(input.fontsCss ?? null) ?? undefined
  for (const format of ['landscape', 'vertical']) {
    const layout = layoutFor(format)
    const theme = resolveTheme({ ...input, scale: layout.mode === 'fill' ? 1 : 1.35 })
    const page = await b.newPage({ viewport: layout.canvas })
    for (const [i, scene] of scenes.scenes.entries()) {
      const html = scene.motion!({ theme, sayMs: 6000, format, layout, cta: { text: 'Write your first video.', sub: 'showcase init --config' } })
      await page.setContent(motionDocument(html, layout, resolveTheme(input)), { waitUntil: 'networkidle' })
      await page.evaluate(async (w) => { await Promise.all(w.map((f) => document.fonts.load(f).catch(() => []))); await document.fonts.ready
        for (const a of document.getAnimations()) { a.pause(); a.currentTime = 7000 }
        const c = document.getElementById('showcase-caption')!; c.textContent = 'A caption, as the voice reads the line.'; c.style.display = 'block' }, theme.fontsToLoad)
      await page.screenshot({ path: `${out}/${name}-${format}-${i}.jpg`, type: 'jpeg', quality: 80 })
    }
    await page.close()
  }
  console.log('drew', name)
}
await b.close()
