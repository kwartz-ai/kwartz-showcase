// Copies the facts the site shows from the kit's own source, so the two cannot drift:
// the themes, the font pairings and the version. Run with Bun: `bun run sync:kit`.
// The result is committed, and CI fails when it is out of date.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { THEMES } from '../../src/brief/themes.ts'
import { FONT_PRESETS } from '../../src/brief/fonts.ts'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(here, '../../package.json'), 'utf8'))

const themes = Object.entries(THEMES).map(([name, t]) => {
  const look = t.look(t.accent)
  const fonts = t.fonts ?? FONT_PRESETS[t.fontPreset ?? 'modern']!
  return {
    name,
    style: t.style,
    use: t.use,
    aliases: t.aliases,
    ink: t.ink,
    accent: t.accent,
    paper: t.paper,
    fontPreset: t.fontPreset ?? null,
    display: fonts.display,
    text: fonts.text,
    feel: t.feel,
    enter: look.enter,
    mood: t.mood,
    backdrop: t.backdrop,
    radius: t.radius,
    look: { canvas: look.canvas, fg: look.fg, muted: look.muted, panel: look.panel, panelFg: look.panelFg, chip: look.chip, label: look.label, caption: look.caption, upper: look.upper },
  }
})

const fontPresets = Object.entries(FONT_PRESETS).map(([name, f]) => ({ name, display: f.display, text: f.text, mono: f.mono }))

const out = { version: pkg.version as string, license: pkg.license as string, repository: 'https://github.com/kwartz-ai/kwartz-showcase', themes, fontPresets }
mkdirSync(join(here, '../lib/generated'), { recursive: true })
writeFileSync(join(here, '../lib/generated/kit.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`kit.json: version ${out.version}, ${themes.length} themes, ${fontPresets.length} font pairings`)
