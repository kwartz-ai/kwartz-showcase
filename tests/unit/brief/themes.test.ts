// Themes: one word that sets the whole look.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { validateBrief } from '../../../src/brief/brief.ts'
import { FONT_PRESETS, GOOGLE_FONTS } from '../../../src/brief/fonts.ts'
import { borderFor, contrast, themeFor } from '../../../src/brief/resolve.ts'
import { THEMES, THEME_NAMES, isTheme, themeNamed } from '../../../src/brief/themes.ts'
import { workOrder } from '../../../src/brief/workorder.ts'
import { classicLook, defaultTheme, resolveTheme, scaleCss, type Look } from '../../../src/core/theme.ts'
import { arrive, endCard, hookCard, stepsCard, titleCard } from '../../../src/graphics/cards.ts'

const HEX = /^#[0-9A-Fa-f]{6}$/
const SURFACES = ['canvas', 'paper', 'panel', 'chip', 'label', 'ring', 'caption'] as const
const looks = () => THEME_NAMES.map((name) => [name, THEMES[name]!.look(THEMES[name]!.accent)] as [string, Look])
/** A solid colour in a piece of CSS: the value of `prop`, when it is a hex colour. */
const solid = (css: string, prop: string) => css.match(new RegExp(`(?:^|;)${prop}:(#[0-9A-Fa-f]{6})(?:;|$)`))?.[1] ?? null
const themed = (name: string) => resolveTheme(themeFor({ theme: name }))

describe('the themes', () => {
  it('are the twelve looks, by short names', () => {
    expect(THEME_NAMES).toEqual(['minimal', 'glass', 'liquid', 'soft', 'clay', 'brutal', 'maximal', 'bento', 'real', 'spatial', 'editorial', 'terminal'])
  })
  it('each name the design style it follows and what it suits', () => {
    for (const [name, t] of Object.entries(THEMES)) {
      expect(t.style.length, name).toBeGreaterThan(5)
      expect(t.use.length, name).toBeGreaterThan(15)
    }
  })
  it('each set solid colours for the parts that must be solid', () => {
    for (const [name, t] of Object.entries(THEMES)) for (const c of [t.ink, t.accent, t.mist, t.paper, t.band, t.bandText]) expect(c, name).toMatch(HEX)
  })
  it('each use a font pairing, or faces, that the font table knows', () => {
    for (const [name, t] of Object.entries(THEMES)) {
      if (t.fontPreset) expect(FONT_PRESETS[t.fontPreset], name).toBeDefined()
      else for (const f of [t.fonts!.display, t.fonts!.text, t.fonts!.mono]) expect(GOOGLE_FONTS[f], `${name}: ${f}`).toBeDefined()
    }
  })
  it('each bring a backdrop of three colours and a corner size', () => {
    for (const [name, t] of Object.entries(THEMES)) {
      expect(t.backdrop.colors, name).toHaveLength(3)
      for (const c of t.backdrop.colors) expect(c, name).toMatch(HEX)
      expect(t.radius, name).toBeGreaterThanOrEqual(0)
      expect(t.radius, name).toBeLessThanOrEqual(0.2)
    }
  })
})

describe('every look, as CSS', () => {
  it('is complete', () => {
    const keys = Object.keys(classicLook(defaultTheme)).sort()
    for (const [name, look] of looks()) expect(Object.keys(look).sort(), name).toEqual(keys)
  })
  it('never holds a double quote, which would cut a style attribute short', () => {
    for (const [name, look] of looks()) for (const key of SURFACES) expect(look[key], `${name}.${key}`).not.toContain('"')
  })
  it('never ends a surface with a stray semicolon or starts one with one', () => {
    for (const [name, look] of looks()) for (const key of SURFACES) expect(look[key], `${name}.${key}`).toMatch(/^[^;].*[^;]$/s)
  })
  it('gives chips, labels and captions their own text colour', () => {
    for (const [name, look] of looks()) for (const key of ['chip', 'label', 'caption'] as const) expect(look[key], `${name}.${key}`).toMatch(/(^|;)color:/)
  })
  it('draws the highlight ring in the highlight colour', () => {
    for (const name of THEME_NAMES) expect(THEMES[name]!.look('#123456').ring, name).toContain('#123456')
  })
})

describe('readability, which no theme may give up', () => {
  it('keeps caption text strongly apart from its box, wherever both are solid colours', () => {
    let measured = 0
    for (const [name, look] of looks()) {
      const box = solid(look.caption, 'background'), text = solid(look.caption, 'color')
      if (!box || !text) continue
      measured++
      expect(contrast(box, text), name).toBeGreaterThanOrEqual(7)
    }
    expect(measured).toBeGreaterThanOrEqual(6)
  })
  it('uses white caption text on every see-through or shaded caption box', () => {
    for (const [name, look] of looks()) {
      if (solid(look.caption, 'background')) continue
      expect(solid(look.caption, 'color'), name).toMatch(/^#F[0-9A-F]F[0-9A-F]{3}$/i)
    }
  })
  it('keeps captions on the band readable', () => {
    for (const [name, t] of Object.entries(THEMES)) expect(contrast(t.band, t.bandText), name).toBeGreaterThanOrEqual(7)
  })
  it('keeps text strongly apart from a solid ground, dark or light', () => {
    for (const [name, look] of looks()) {
      if (HEX.test(look.canvas) && HEX.test(look.fg)) expect(contrast(look.canvas, look.fg), `${name} canvas`).toBeGreaterThanOrEqual(7)
      if (HEX.test(look.paper) && HEX.test(look.paperFg)) expect(contrast(look.paper, look.paperFg), `${name} paper`).toBeGreaterThanOrEqual(7)
    }
  })
  it('keeps the highlight visible on a solid ground', () => {
    for (const [name, t] of Object.entries(THEMES)) {
      const look = t.look(t.accent)
      if (HEX.test(look.canvas)) expect(contrast(look.canvas, t.accent), name).toBeGreaterThanOrEqual(3)
    }
  })
  it('keeps text on a solid panel readable', () => {
    // white on the coral clay panel was once 2.3 to 1
    for (const [name, look] of looks()) {
      const box = solid(look.panel, 'background')
      if (box && HEX.test(look.panelFg)) expect(contrast(box, look.panelFg), name).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('keeps label text apart from a solid label', () => {
    for (const [name, look] of looks()) {
      const box = solid(look.label, 'background'), text = solid(look.label, 'color')
      if (box && text) expect(contrast(box, text), name).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('themeNamed', () => {
  it('finds a theme by its name', () => {
    expect(themeNamed('glass')!.name).toBe('glass')
  })
  it('accepts the design terms people know', () => {
    expect(themeNamed('glassmorphism')!.name).toBe('glass')
    expect(themeNamed('Neumorphism')!.name).toBe('soft')
    expect(themeNamed('neomorphism')!.name).toBe('soft')
    expect(themeNamed('skeumorphism')!.name).toBe('real')
    expect(themeNamed('liquid glass')!.name).toBe('liquid')
    expect(themeNamed('bento_grid')!.name).toBe('bento')
    expect(themeNamed('spatial UI')!.name).toBe('spatial')
  })
  it('reads classic and default as the kit\'s own look', () => {
    expect(themeNamed('classic')).toBeNull()
    expect(themeNamed('default')).toBeNull()
  })
  it('lists the themes when it does not know one', () => {
    expect(() => themeNamed('vaporwave')).toThrow(/unknown theme "vaporwave"\. Themes: classic, minimal, glass/)
    expect(isTheme('vaporwave')).toBe(false)
    expect(isTheme('clay')).toBe(true)
    expect(isTheme(7)).toBe(false)
  })
  it('gives every other name to one theme only', () => {
    const all = Object.values(THEMES).flatMap((t) => t.aliases)
    expect(new Set(all).size).toBe(all.length)
    for (const a of all) expect(THEME_NAMES).not.toContain(a)
  })
})

describe('a theme in a config', () => {
  it('is checked, with the list of themes in the error', () => {
    expect(() => validateBrief({ url: 'http://localhost', theme: 'glass' })).not.toThrow()
    expect(() => validateBrief({ url: 'http://localhost', theme: 'glassmorphism' })).not.toThrow()
    expect(() => validateBrief({ url: 'http://localhost', theme: 'shiny' })).toThrow(/unknown theme "shiny"\. Themes: classic, minimal/)
  })
  it('sets the look, colours, fonts, movement and band together', () => {
    const t = themed('glass')
    expect(t.name).toBe('glass')
    expect(t.look.enter).toBe('float')
    expect(t.accent).toBe(THEMES.glass!.accent)
    expect(t.type.display).toContain("'Sora'")
    expect(t.band).toBe('#1E1B4B')
    expect(t.fontsCss).toContain('family=Sora')
  })
  it('leaves the kit\'s own look alone when no theme is named', () => {
    const t = resolveTheme(themeFor({}))
    expect(t.name).toBe('classic')
    expect(t.look).toEqual(classicLook(defaultTheme))
    expect(t.band).toBe(defaultTheme.ink)
  })
  it('lets the person\'s highlight colour win, and draws the ring in it', () => {
    const t = resolveTheme(themeFor({ theme: 'bento', style: { accent: '#00FFAA' } }))
    expect(t.accent).toBe('#00FFAA')
    expect(t.look.ring).toContain('#00FFAA')
    expect(t.look.label).toContain('#00FFAA')
  })
  it('lets the person\'s fonts and movement win', () => {
    const t = resolveTheme(themeFor({ theme: 'clay', style: { fontPreset: 'minimal' }, motion: { feel: 'calm' } }))
    expect(t.type.display).toContain("'Geist'")
    expect(t.speed).toBe(1.15)
  })
  it('puts the theme before the product\'s own look', () => {
    const t = resolveTheme(themeFor({ theme: 'brutal' }, { font: 'Roboto', accent: '#2fa8e0', fontOnGoogle: true }))
    expect(t.accent).toBe(THEMES.brutal!.accent)
    expect(t.type.text).not.toContain('Roboto')
  })
  it('sets titles in mono for the terminal, at a weight that face has', () => {
    const t = themed('terminal')
    expect(t.type.display).toContain("'JetBrains Mono'")
    expect(t.displayWeight).toBe(700)
    expect(t.fontsCss).toContain('family=JetBrains+Mono:wght@500;700')
  })
  it('moves each theme its own way', () => {
    expect(themed('brutal').look.enter).toBe('cut')
    expect(themed('clay').look.enter).toBe('pop')
    expect(themed('spatial').look.enter).toBe('depth')
    expect(themed('terminal').look.enter).toBe('type')
  })
})

describe('the backdrop and corner a theme brings', () => {
  const dir = os.tmpdir()
  it('come with the theme', () => {
    expect(borderFor({ theme: 'glass' }, dir, '#fff')).toEqual({ ...THEMES.glass!.backdrop, radius: THEMES.glass!.radius })
  })
  it('give brutalism and the editorial look square corners', () => {
    expect(borderFor({ theme: 'brutal' }, dir, '#fff')).toMatchObject({ radius: 0 })
    expect(borderFor({ theme: 'editorial' }, dir, '#fff')).toMatchObject({ radius: 0 })
  })
  it('let the person choose another backdrop and keep the theme\'s corner', () => {
    expect(borderFor({ theme: 'clay', style: { backdrop: 'ocean' } }, dir, '#fff')).toMatchObject({ colors: ['#06324F', '#0E7490', '#7DD3FC'], pattern: 'waves', radius: THEMES.clay!.radius })
  })
  it('can still be turned off', () => {
    expect(borderFor({ theme: 'glass', style: { border: 'none' } }, dir, '#fff')).toBe(false)
  })
})

describe('cards in a theme', () => {
  it('are unchanged in the kit\'s own look', () => {
    const html = hookCard(defaultTheme, { title: 'Hi' }, 3000)
    expect(html).toContain('background:#0B1D35')
    expect(html).toContain('animation:showcaserise')
    expect(html).toContain('showcasedrift')
  })
  it('open on the theme\'s ground, without the drifting wall', () => {
    const html = hookCard(themed('glass'), { title: 'Hi' }, 3000)
    expect(html).toContain('background:linear-gradient(135deg,#4C1D95')
    expect(html).not.toContain('animation:showcasedrift')
  })
  it('set brutal titles in capitals and cut them in at once', () => {
    const html = titleCard(themed('brutal'), 'Hello')
    expect(html).toContain('text-transform:uppercase')
    expect(html).toMatch(/animation:showcasecut 1ms steps\(1,end\) 200ms both/)
  })
  it('type terminal text on in steps', () => {
    expect(arrive(themed('terminal'))(500)).toMatch(/^opacity:0;animation:showcasetype \d+ms steps\(18,end\) 500ms both$/)
  })
  it('take longer to float in than to rise', () => {
    const ms = (s: string) => Number(s.match(/ (\d+)ms /)![1])
    expect(ms(arrive(themed('glass'))(0))).toBeGreaterThan(ms(arrive(defaultTheme)(0)))
  })
  it('draw steps on the theme\'s panels, as a grid of tiles for bento', () => {
    const card = { title: 'How', steps: [{ title: 'A', body: 'a' }, { title: 'B', body: 'b' }] }
    expect(stepsCard(themed('bento'), card, 4000)).toContain('display:grid;grid-template-columns:1fr 1fr')
    expect(stepsCard(themed('clay'), card, 4000)).toContain('background:#FF8F6B;border-radius:34px')
    expect(stepsCard(defaultTheme, card, 4000)).toContain('display:flex;gap:20px')
  })
  it('use a grid of two on a narrow frame in any theme', () => {
    const card = { title: 'How', steps: [{ title: 'A', body: 'a' }] }
    expect(stepsCard(resolveTheme({ scale: 1.35 }), card, 4000)).toContain('display:grid')
  })
  it('draw chips the theme\'s way', () => {
    expect(endCard(themed('brutal'), { title: 'X', chips: ['One'] }, 3000)).toContain('background:#000000;color:#FFE500;border-radius:0')
  })
  it('keep every style attribute whole in every theme', () => {
    for (const name of THEME_NAMES) {
      const t = themed(name)
      const html = hookCard(t, { title: 'A', sub: 'B', questions: ['C?'], overline: 'D' }, 3000)
        + stepsCard(t, { title: 'A', overline: 'B', steps: [{ title: 'C', body: 'D' }] }, 3000) + endCard(t, { title: 'A', chips: ['B'], cta: 'C', ctaSub: 'D', note: 'E' }, 3000)
      for (const m of html.matchAll(/style="([^"]*)"/g)) expect(m[1]!.trim(), name).toMatch(/[;)%a-z0-9]$/i)
      expect(html, name).not.toMatch(/undefined|NaN/)
    }
  })
})

describe('scaleCss', () => {
  it('multiplies every px length and nothing else', () => {
    expect(scaleCss('border:2px solid #000;border-radius:8px;opacity:.5', 2)).toBe('border:4px solid #000;border-radius:16px;opacity:.5')
    expect(scaleCss('border-radius:8px', 1)).toBe('border-radius:8px')
  })
})

describe('the skill for each theme', () => {
  const file = (name: string) => path.resolve('skills', `showcase-theme-${name}`, 'SKILL.md')
  it('exists, is named for its theme, and says when to use it', () => {
    for (const name of THEME_NAMES) {
      const text = fs.readFileSync(file(name), 'utf8')
      expect(text, name).toMatch(new RegExp(`^---\\nname: showcase-theme-${name}\\ndescription: .*"theme" set to "${name}"`))
      for (const part of ['## Use it for', '## Do not use it for', '## Rules of this style', '## Movement', '## On video', '## Before you call it done']) expect(text, `${name}: ${part}`).toContain(part)
    }
  })
  it('tells the author to build from theme.look, not from typed colours', () => {
    for (const name of THEME_NAMES) expect(fs.readFileSync(file(name), 'utf8'), name).toContain('Take every surface from `theme.look`')
  })
  it('names the design style the theme follows', () => {
    for (const name of THEME_NAMES) expect(fs.readFileSync(file(name), 'utf8'), name).toContain(THEMES[name]!.style)
  })
  it('is pointed at by the work order', () => {
    const text = workOrder({ url: 'http://localhost', theme: 'clay' }, os.tmpdir())
    expect(text).toContain('## Theme: clay (Claymorphism)')
    expect(text).toMatch(/read .*showcase-theme-clay.SKILL\.md/)
    expect(workOrder({ url: 'http://localhost' }, os.tmpdir())).not.toContain('## Theme')
  })
})

describe('themes on the command line', () => {
  const CLI = path.resolve('src/cli/index.ts')
  let dir: string
  const run = (args: string[]) => spawnSync('bun', [CLI, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, SHOWCASE_HOME: path.join(dir, 'home') } })
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-themes-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('lists every theme with what it suits', () => {
    const r = run(['themes'])
    expect(r.status).toBe(0)
    for (const name of ['classic', ...THEME_NAMES]) expect(r.stdout).toMatch(new RegExp(`^${name}\\s`, 'm'))
    expect(r.stdout).toContain('Glassmorphism')
  })
  it('starts a video in a theme, with the skill for it', () => {
    const r = run(['init', '--config', '--theme', 'glassmorphism'])
    expect(r.status).toBe(0)
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'showcase.config.json'), 'utf8')).theme).toBe('glass')
    expect(fs.existsSync(path.join(dir, '.claude', 'skills', 'showcase-theme-glass', 'SKILL.md'))).toBe(true)
    expect(fs.existsSync(path.join(dir, '.claude', 'skills', 'kwartz-showcase', 'SKILL.md'))).toBe(true)
  })
  it('refuses a theme it does not know', () => {
    const r = run(['init', '--config', '--theme', 'shiny'])
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/unknown theme "shiny"/)
  })
})
