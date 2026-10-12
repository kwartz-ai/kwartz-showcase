import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { themeFor } from '../../../src/brief/resolve.ts'
import { checkReadable, presetFrom, presetTheme } from '../../../src/brief/theme-rules.ts'
import { THEMES, THEME_NAMES } from '../../../src/brief/themes.ts'
import type { Brief } from '../../../src/brief/brief.ts'

const SRC = path.resolve(__dirname, '../../../src')

/** Every file a module pulls in, by following its relative imports. Type-only
 *  imports are skipped: they leave nothing behind when the code is built. */
function reach(entry: string, seen = new Set<string>()): Set<string> {
  const file = path.resolve(entry)
  if (seen.has(file)) return seen
  seen.add(file)
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(/^(?:import|export)\s+(type\s+)?[^'"]*?from\s+'(\.[^']+)'/gm)) {
    if (!m[1]) reach(path.resolve(path.dirname(file), m[2]!), seen)
  }
  return seen
}

describe('the theme rules can run in a web page', () => {
  // the website's theme studio bundles these for the browser
  for (const entry of ['brief/theme-rules.ts', 'graphics/cards.ts', 'brief/hosted.ts']) {
    it(`${entry} reaches no code that needs the disk or a process`, () => {
      const files = [...reach(path.join(SRC, entry))]
      const node = files.filter((f) => /from\s+'node:|from\s+'(fs|path|os|child_process)'|from\s+'playwright'/.test(fs.readFileSync(f, 'utf8')))
      expect(node.map((f) => path.relative(SRC, f))).toEqual([])
    })
  }
})

describe('presetTheme', () => {
  it.each(THEME_NAMES)('gives the %s theme the same cards as a video that names it', (name) => {
    const fromBrief = themeFor({ theme: name } as Brief)
    const own = presetTheme(THEMES[name]!, name)
    // a video also carries the caption size of its brief, which is not part of a theme
    const { captionScale: _size, ...video } = fromBrief
    expect(own).toEqual(video)
  })

  it('carries a theme file through: its colours, its look and its faces', () => {
    const preset = presetFrom({ extends: 'clay', colors: { accent: '#6A4BEA' }, fontPreset: 'geometric', feel: 'crisp' })
    const theme = presetTheme(preset, 'acme')
    expect(theme.accent).toBe('#6A4BEA')
    expect(theme.look!.ring).toContain('#6A4BEA')
    expect(theme.type!.display).toContain("'Sora'")
    expect(theme.speed).toBe(0.8)
    expect(checkReadable(preset).errors).toEqual([])
  })
})
