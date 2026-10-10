// Fonts from Google, the product's own look, and the backdrop a config asks for.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateBrief } from '../../../src/brief/brief.ts'
import {
  FONTS_CHECKED, FONT_PRESETS, GOOGLE_FONTS, ROLE_WEIGHTS, facesToLoad, familiesIn, googleFontsUrl, onGoogleFonts, weightsFor, workingFontsUrl,
} from '../../../src/brief/fonts.ts'
import { BACKDROPS } from '../../../src/brief/presets.ts'
import { borderFor, contrast, defineScenes, exploredStyle, mix, resolveBrief, themeFor } from '../../../src/brief/resolve.ts'
import { defaultTheme } from '../../../src/core/theme.ts'

const css = (...families: string[]) => families.map((f) => `@font-face {\n  font-family: '${f}';\n  font-weight: 400;\n}`).join('\n')
const reply = (body: string, ok = true) => ({ ok, text: async () => body }) as Response

describe('the font table', () => {
  it('records when it was checked against Google Fonts', () => {
    expect(FONTS_CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('lists weights in order, between 400 and 800', () => {
    for (const [family, info] of Object.entries(GOOGLE_FONTS)) {
      expect(info.weights, family).toEqual([...info.weights].sort((a, b) => a - b))
      expect(Math.min(...info.weights), family).toBeGreaterThanOrEqual(400)
      expect(Math.max(...info.weights), family).toBeLessThanOrEqual(800)
    }
  })
  it('knows the families with a single weight, which cannot be asked for a heavy one', () => {
    for (const f of ['Bebas Neue', 'Anton', 'DM Serif Display', 'Instrument Serif']) expect(GOOGLE_FONTS[f]!.weights).toEqual([400])
  })
  it('has no name that could break out of a style attribute', () => {
    for (const family of Object.keys(GOOGLE_FONTS)) expect(family).toMatch(/^[A-Za-z0-9 ]+$/)
  })
})

describe('font presets', () => {
  it('uses only families from the table, in the right role', () => {
    for (const [name, p] of Object.entries(FONT_PRESETS)) {
      for (const role of ['display', 'text', 'mono'] as const) expect(GOOGLE_FONTS[p[role]], `${name}.${role}`).toBeDefined()
      expect(GOOGLE_FONTS[p.mono]!.kind, name).toBe('mono')
      expect(GOOGLE_FONTS[p.text]!.kind, name).toBe('sans')
    }
  })
  it('sets titles in a weight the display face has', () => {
    for (const [name, p] of Object.entries(FONT_PRESETS)) expect(GOOGLE_FONTS[p.display]!.weights, name).toContain(p.displayWeight)
  })
  it('gives a text face every weight captions and labels use', () => {
    for (const [name, p] of Object.entries(FONT_PRESETS)) expect(GOOGLE_FONTS[p.text]!.weights, name).toEqual(expect.arrayContaining([400, 500, 600, 700]))
  })
  it('tracks a serif and a condensed face less tightly than a grotesque', () => {
    expect(FONT_PRESETS.editorial!.tracking).toBeLessThan(FONT_PRESETS.modern!.tracking)
    expect(FONT_PRESETS.poster!.tracking).toBe(0)
    expect(FONT_PRESETS.poster!.titleScale).toBeGreaterThan(1)
  })
  it('says what each pairing is for', () => {
    for (const p of Object.values(FONT_PRESETS)) expect(p.use.length).toBeGreaterThan(15)
  })
  it('keeps the default pairing the same as the default theme', () => {
    const p = FONT_PRESETS.modern!
    expect(defaultTheme.type.display).toContain(p.display)
    expect(defaultTheme.type.text).toContain(p.text)
    expect(defaultTheme.type.mono).toContain(p.mono)
  })
})

describe('weightsFor and googleFontsUrl', () => {
  it('asks for the weights a role uses that the family has', () => {
    expect(weightsFor('Inter', 'text')).toEqual([400, 500, 600, 700])
    expect(weightsFor('Space Grotesk', 'display')).toEqual([500, 600, 700])
    expect(weightsFor('Lato', 'text')).toEqual([400, 700])
  })
  it('asks a single-weight family for the weight it has', () => {
    expect(weightsFor('Bebas Neue', 'display')).toEqual([400])
  })
  it('asks an unknown family for what the role uses', () => {
    expect(weightsFor('Some New Font', 'display')).toEqual(ROLE_WEIGHTS.display)
  })
  it('builds one address for the three faces', () => {
    expect(googleFontsUrl({ display: 'Sora', text: 'DM Sans', mono: 'DM Mono' })).toBe(
      'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap')
  })
  it('asks once for a family used in two roles, with the weights of both', () => {
    const url = googleFontsUrl({ display: 'Geist', text: 'Geist', mono: 'Geist Mono' })
    expect(url.match(/family=Geist:/g)).toHaveLength(1)
    expect(url).toContain('family=Geist:wght@400;500;600;700;800')
  })
  it('reads the families back out of an address', () => {
    expect(familiesIn('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&family=Bebas+Neue&display=swap')).toEqual([
      { family: 'Open Sans', weights: [400, 700] }, { family: 'Bebas Neue', weights: null },
    ])
  })
  it('waits for the title in its own weight', () => {
    expect(facesToLoad({ display: 'Fraunces', text: 'Inter', mono: 'DM Mono' }, 600)).toEqual(['600 40px "Fraunces"', '500 20px "Inter"', '500 16px "DM Mono"'])
  })
})

describe('checking fonts with Google', () => {
  const URL = 'https://fonts.googleapis.com/css2?family=Odd+Font:wght@500;800&family=Inter:wght@400;500&display=swap'
  it('knows a family in the table without asking', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await onGoogleFonts('Inter')).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('asks Google about a family it does not know', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(css('Lexend Deca'))))
    expect(await onGoogleFonts('Lexend Deca')).toBe(true)
    vi.stubGlobal('fetch', vi.fn(async () => reply('', false)))
    expect(await onGoogleFonts('Segoe UI')).toBe(false)
  })
  it('cannot say when there is no network, and refuses an unsafe name outright', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await onGoogleFonts('Lexend Deca')).toBeNull()
    expect(await onGoogleFonts('x"; color:red')).toBe(false)
  })
  it('keeps an address that gives every family', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(css('Odd Font', 'Inter'))))
    expect(await workingFontsUrl(URL)).toBe(URL)
    expect(fetch).toHaveBeenCalledOnce()
  })
  it('asks again in the regular weight for a family Google left out', async () => {
    // Google answers 200 and silently drops a family that has none of the weights
    vi.stubGlobal('fetch', vi.fn(async (url: string) => reply(url.includes('Odd+Font&') ? css('Odd Font') : css('Inter'))))
    expect(await workingFontsUrl(URL)).toBe('https://fonts.googleapis.com/css2?family=Odd+Font&family=Inter:wght@400;500&display=swap')
  })
  it('names a family Google does not have at all', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('Inter') ? reply(css('Inter')) : reply('', false))))
    await expect(workingFontsUrl(URL)).rejects.toThrow(/no font named "Odd Font"[\s\S]*fontSource/)
  })
  it('leaves the address alone when Google cannot be reached, or when there is none', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await workingFontsUrl(URL)).toBe(URL)
    expect(await workingFontsUrl(null)).toBeNull()
    expect(await workingFontsUrl('https://example.com/fonts.css')).toBe('https://example.com/fonts.css')
  })
})

describe('themeFor: presets', () => {
  it('sets all three faces, the title weight and its tracking from a preset', () => {
    const t = themeFor({ style: { fontPreset: 'editorial' } })
    expect(t.type!.display).toContain("'Fraunces'")
    expect(t.type!.text).toContain("'Source Sans 3'")
    expect(t).toMatchObject({ displayWeight: 600, tracking: 0.35 })
    expect(t.fontsCss).toContain('family=Fraunces:wght@500;600;700;800')
    expect(t.fontsToLoad![0]).toBe('600 40px "Fraunces"')
  })
  it('lets a named face replace one face of a preset', () => {
    const t = themeFor({ style: { fontPreset: 'technical', fonts: { text: 'Roboto' } } })
    expect(t.type!.display).toContain("'Space Grotesk'")
    expect(t.type!.text).toContain("'Roboto'")
  })
  it('sets a named display face by its kind', () => {
    expect(themeFor({ style: { fonts: { display: 'Playfair Display' } } })).toMatchObject({ displayWeight: 800, tracking: 0.35 })
    expect(themeFor({ style: { fonts: { display: 'Bebas Neue' } } })).toMatchObject({ displayWeight: 400, tracking: 0, titleScale: 1.28 })
    expect(themeFor({ style: { fonts: { display: 'Space Grotesk' } } }).displayWeight).toBe(700)
  })
  it('never asks Google for a weight a named single-weight face lacks', () => {
    expect(themeFor({ style: { fonts: { display: 'Bebas Neue' } } }).fontsCss).toContain('family=Bebas+Neue:wght@400&')
  })
  it('refuses a preset it does not know, and lists the ones it does', () => {
    expect(() => validateBrief({ url: 'http://localhost', style: { fontPreset: 'fancy' } })).toThrow(/"style.fontPreset" must be one of: modern, geometric/)
  })
})

describe('themeFor: the product\'s own look', () => {
  const found = { font: 'Roboto', accent: '#2fa8e0', fontOnGoogle: true }
  it('takes the caption font and the highlight colour from the product, and says so', () => {
    const notes: string[] = []
    const t = themeFor({}, found, notes)
    expect(t.accent).toBe('#2fa8e0')
    expect(t.type!.text).toContain("'Roboto'")
    expect(t.fontsCss).toContain('family=Roboto:')
    expect(notes.join(' ')).toMatch(/accent colour #2fa8e0 taken from the product/)
    expect(notes.join(' ')).toMatch(/caption font "Roboto" taken from the product/)
  })
  it('keeps the kit\'s display face for titles', () => {
    expect(themeFor({}, found).type!.display).toContain("'Plus Jakarta Sans'")
  })
  it('lets the person\'s own choices win', () => {
    const t = themeFor({ style: { accent: '#ff0000', fonts: { text: 'Lato' } } }, found)
    expect(t.accent).toBe('#ff0000')
    expect(t.type!.text).toContain("'Lato'")
    expect(themeFor({ style: { fontPreset: 'minimal' } }, found).type!.text).toContain("'Geist'")
  })
  it('does nothing when matching is turned off', () => {
    const t = themeFor({ style: { match: false } }, found)
    expect(t.accent).toBeUndefined()
    expect(t.fontsCss).toBeUndefined()
  })
  it('does not use a button colour too dark to show on the dark cards', () => {
    const notes: string[] = []
    expect(themeFor({}, { font: null, accent: '#101828' }, notes).accent).toBeUndefined()
    expect(notes[0]).toMatch(/too dark to use as the highlight/)
  })
  it('does not use a font that Google does not have, and says what to do', () => {
    const notes: string[] = []
    const t = themeFor({}, { font: 'Segoe UI', accent: null, fontOnGoogle: false }, notes)
    expect(t.fontsCss).toBeUndefined()
    expect(notes[0]).toMatch(/"Segoe UI" is not on Google Fonts[\s\S]*installed/)
  })
  it('changes nothing, and says nothing, when the product already uses the default face', () => {
    const notes: string[] = []
    const t = themeFor({}, { font: 'Inter', accent: null, fontOnGoogle: true }, notes)
    expect(t.fontsCss).toBeUndefined()
    expect(notes).toEqual([])
  })
})

describe('colour helpers', () => {
  it('measures contrast as WCAG does', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 0)
    expect(contrast('#777777', '#777777')).toBe(1)
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 0)
  })
  it('moves a colour part of the way to another', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mix('#ff0000', '#000000', 0)).toBe('#ff0000')
    expect(mix('#f00', '#000', 1)).toBe('#000000')
  })
})

describe('the backdrop a config asks for', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-style-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))
  const of = (style?: object) => borderFor({ url: 'http://localhost', style }, dir, '#F59E0B')

  it('is the default border when nothing is asked for', () => {
    expect(of()).toBe(true)
  })
  it('is off when the border is none', () => {
    expect(of({ border: 'none', backdrop: 'ocean' })).toBe(false)
  })
  it('takes a preset by name, with its pattern', () => {
    expect(of({ backdrop: 'ocean' })).toEqual(BACKDROPS.ocean)
    expect(of({ backdrop: 'graphite' })).toMatchObject({ pattern: 'plain' })
  })
  it('takes three colours', () => {
    expect(of({ backdrop: ['#111111', '#222222', '#333333'] })).toEqual({ colors: ['#111111', '#222222', '#333333'] })
  })
  it('makes a backdrop from the accent colour: two dark shades and a light glow', () => {
    const b = of({ backdrop: 'brand' }) as { colors: string[] }
    expect(b.colors).toHaveLength(3)
    expect(contrast(b.colors[0]!, '#ffffff')).toBeGreaterThan(contrast(b.colors[1]!, '#ffffff'))
    expect(contrast(b.colors[2]!, '#000000')).toBeGreaterThan(contrast(b.colors[1]!, '#000000'))
  })
  it('lets the pattern be chosen apart from the colours', () => {
    expect(of({ backdrop: 'indigo', backdropPattern: 'waves' })).toMatchObject({ pattern: 'waves' })
    expect(of({ backdropPattern: 'plain' })).toEqual({ pattern: 'plain' })
  })
  it('takes a picture beside the config, and says so when it is missing', () => {
    fs.writeFileSync(path.join(dir, 'wall.png'), 'png')
    expect(of({ backdrop: 'wall.png' })).toEqual({ image: path.join(dir, 'wall.png') })
    expect(() => of({ backdrop: 'missing.jpg' })).toThrow(/"style.backdrop" points at .*missing\.jpg/)
  })
  it('gives every preset three hex colours and a pattern', () => {
    for (const b of Object.values(BACKDROPS)) {
      expect(b.colors).toHaveLength(3)
      for (const c of b.colors) expect(c).toMatch(/^#[0-9A-F]{6}$/i)
      expect(['glow', 'waves', 'plain']).toContain(b.pattern)
    }
  })
  it('checks the settings in a config', () => {
    const ok = (style: object) => expect(() => validateBrief({ url: 'http://localhost', style })).not.toThrow()
    ok({ backdrop: 'brand' }); ok({ backdrop: 'aurora' }); ok({ backdrop: 'img/wall.webp' }); ok({ backdropPattern: 'waves', match: false })
    expect(() => validateBrief({ url: 'http://localhost', style: { backdrop: 'purple' } })).toThrow(/"style.backdrop" must be one of brand, indigo/)
    expect(() => validateBrief({ url: 'http://localhost', style: { backdropPattern: 'dots' } })).toThrow(/glow, waves or plain/)
    expect(() => validateBrief({ url: 'http://localhost', style: { match: 'yes' } })).toThrow(/"style.match" must be true or false/)
  })
})

describe('a config beside an explored product', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-explored-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))
  const map = (style: object) => {
    fs.mkdirSync(path.join(dir, '.showcase', 'explore'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.showcase', 'explore', 'map.json'), JSON.stringify({ style }))
  }
  const module = defineScenes({ scenes: [{ id: 'a', say: 'A.', run: async () => {} }] })

  it('finds nothing before the product is explored', () => {
    expect(exploredStyle(dir)).toBeNull()
  })
  it('reads what explore found', () => {
    map({ font: 'Roboto', accent: '#2fa8e0', fontOnGoogle: true })
    expect(exploredStyle(dir)).toEqual({ font: 'Roboto', accent: '#2fa8e0', fontOnGoogle: true })
  })
  it('survives a broken map', () => {
    fs.mkdirSync(path.join(dir, '.showcase', 'explore'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.showcase', 'explore', 'map.json'), '{')
    expect(exploredStyle(dir)).toBeNull()
  })
  it('uses the product\'s look in every shape, and tells the person once', () => {
    map({ font: 'Roboto', accent: '#2fa8e0', fontOnGoogle: true })
    const { videos, notes } = resolveBrief({ url: 'http://localhost', cta: { text: 'x' }, formats: ['landscape', 'vertical'] }, dir, module)
    for (const v of videos) expect(v.video.theme.accent).toBe('#2fa8e0')
    expect(notes.filter((n) => n.includes('accent colour'))).toHaveLength(1)
  })
  it('makes a brand backdrop from the matched colour', () => {
    map({ font: null, accent: '#2fa8e0' })
    const b = resolveBrief({ url: 'http://localhost', cta: { text: 'x' }, style: { backdrop: 'brand' } }, dir, module).videos[0]!.video.border
    expect(b.colors[1]).toBe(mix('#2fa8e0', '#000000', 0.18))
  })
})
