import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, isHosted, loadBrief, validateBrief } from '../../../src/brief/brief.ts'

const problems = (input: unknown): string => {
  try {
    validateBrief(input)
    return ''
  } catch (e) {
    return (e as Error).message
  }
}

describe('isHosted', () => {
  it.each([
    'http://localhost:3000', 'http://127.0.0.1:8080', 'http://0.0.0.0', 'http://[::1]:5173',
    'http://192.168.1.4', 'http://10.0.0.7', 'http://172.16.0.1', 'http://172.31.9.9', 'http://nas.local', 'http://app.localhost',
  ])('treats %s as local', (url) => {
    expect(isHosted(url)).toBe(false)
  })
  it.each(['https://app.example.com', 'http://172.32.0.1', 'https://example.com/login', 'http://8.8.8.8'])('treats %s as hosted', (url) => {
    expect(isHosted(url)).toBe(true)
  })
  it('is false when there is no address', () => {
    expect(isHosted(undefined)).toBe(false)
  })
})

describe('validateBrief: what passes', () => {
  it('needs only a local address', () => {
    expect(validateBrief({ url: 'http://localhost:3000' })).toEqual({ url: 'http://localhost:3000' })
  })
  it('takes a static folder in place of an address', () => {
    expect(validateBrief({ serve: 'site' })).toEqual({ serve: 'site' })
  })
  it('takes a hosted address once the banned names are listed, even as none', () => {
    expect(() => validateBrief({ url: 'https://app.example.com', safety: { banned: [] } })).not.toThrow()
  })
  it('allows the $schema line editors add', () => {
    expect(() => validateBrief({ $schema: './schema.json', url: 'http://localhost' })).not.toThrow()
  })
  it('takes a full brief', () => {
    expect(() => validateBrief({
      name: 'my-video', url: 'http://localhost:3000', length: 60, platforms: ['youtube', 'instagram-reel'],
      formats: ['square', { width: 800, height: 1000 }], layout: 'framed', cta: { text: 'Book a walkthrough' },
      style: { ink: '#0B1D35', accent: '#f90', fonts: { text: 'Roboto' }, captions: 'large' },
      motion: { feel: 'lively', blur: false, fps: 60 }, sound: { effects: { click: 'click-soft' }, mood: 'calm' },
    })).not.toThrow()
  })
})

describe('validateBrief: what is refused', () => {
  it('refuses anything that is not an object', () => {
    expect(problems(null)).toMatch(/must be a JSON object/)
    expect(problems([])).toMatch(/must be a JSON object/)
    expect(problems('x')).toMatch(/must be a JSON object/)
  })
  it('asks for an address when there is none', () => {
    expect(problems({})).toMatch(/"url" is required/)
  })
  it('refuses an address that is not http', () => {
    expect(problems({ url: 'ftp://example.com' })).toMatch(/must start with http/)
    expect(problems({ url: 'not an address' })).toMatch(/not a valid address/)
  })
  it('names a setting it does not know, and lists the ones it does', () => {
    const m = problems({ url: 'http://localhost', lenght: 30 })
    expect(m).toMatch(/"lenght" is not a setting/)
    expect(m).toMatch(/length/)
  })
  it('refuses a length outside 10 to 600 seconds', () => {
    expect(problems({ url: 'http://localhost', length: 5 })).toMatch(/between 10 and 600/)
    expect(problems({ url: 'http://localhost', length: 601 })).toMatch(/between 10 and 600/)
    expect(problems({ url: 'http://localhost', length: '30' })).toMatch(/between 10 and 600/)
  })
  it('refuses an unknown platform or shape, and lists the known ones', () => {
    expect(problems({ url: 'http://localhost', platforms: ['myspace'] })).toMatch(/unknown platform "myspace".*youtube/)
    expect(problems({ url: 'http://localhost', formats: ['round'] })).toMatch(/unknown shape "round".*landscape/)
  })
  it('refuses a custom shape that is too small, too large or odd', () => {
    expect(problems({ url: 'http://localhost', formats: [{ width: 100, height: 1000 }] })).toMatch(/between 240 and 4096/)
    expect(problems({ url: 'http://localhost', formats: [{ width: 5000, height: 1000 }] })).toMatch(/between 240 and 4096/)
    expect(problems({ url: 'http://localhost', formats: [{ width: 801, height: 1000 }] })).toMatch(/even/)
  })
  it('refuses a bad name, layout, call to action, colour, caption size, feel, frame rate and effects word', () => {
    const base = { url: 'http://localhost' }
    expect(problems({ ...base, name: 'my video' })).toMatch(/"name" must be/)
    expect(problems({ ...base, layout: 'stretch' })).toMatch(/"layout" must be/)
    expect(problems({ ...base, cta: { text: ' ' } })).toMatch(/"cta" needs a "text"/)
    expect(problems({ ...base, style: { accent: 'orange' } })).toMatch(/hex value/)
    expect(problems({ ...base, style: { captions: 'huge' } })).toMatch(/small, medium or large/)
    expect(problems({ ...base, motion: { feel: 'wild' } })).toMatch(/"motion.feel"/)
    expect(problems({ ...base, motion: { fps: 24 } })).toMatch(/30 or 60/)
    expect(problems({ ...base, sound: { effects: 'loud' } })).toMatch(/"sound.effects"/)
  })
  it('refuses a font name that could break out of a style attribute', () => {
    expect(problems({ url: 'http://localhost', style: { fonts: { text: 'Inter"; color:red' } } })).toMatch(/plain family name/)
    expect(problems({ url: 'http://localhost', style: { fonts: { display: "O'Neil" } } })).toMatch(/plain family name/)
  })
  it('requires the banned names for a hosted address', () => {
    const m = problems({ url: 'https://app.example.com' })
    expect(m).toMatch(/app\.example\.com/)
    expect(m).toMatch(/"safety.banned" is required/)
  })
  it('does not ask a local address for banned names', () => {
    expect(problems({ url: 'http://localhost:3000' })).toBe('')
  })
  it('reports every problem at once, with a count', () => {
    const m = problems({ url: 'http://localhost', length: 1, layout: 'x', nope: true })
    expect(m).toMatch(/has 3 problems/)
    expect(m.split('\n- ')).toHaveLength(4)
  })
  it('says "a problem" when there is one', () => {
    expect(problems({ url: 'http://localhost', length: 1 })).toMatch(/has a problem:/)
  })
})

describe('loadBrief', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-brief-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('is named showcase.config.json by default', () => {
    expect(DEFAULT_CONFIG).toBe('showcase.config.json')
  })
  it('reads the file and says which folder it is in', () => {
    const file = path.join(dir, 'showcase.config.json')
    fs.writeFileSync(file, JSON.stringify({ url: 'http://localhost:3000', length: 60 }))
    expect(loadBrief(file)).toEqual({ brief: { url: 'http://localhost:3000', length: 60 }, dir, file })
  })
  it('says how to create a config when there is none', () => {
    expect(() => loadBrief(path.join(dir, 'missing.json'))).toThrow(/showcase init --config/)
  })
  it('names the file when the JSON is broken', () => {
    const file = path.join(dir, 'showcase.config.json')
    fs.writeFileSync(file, '{ "url": ')
    expect(() => loadBrief(file)).toThrow(/showcase\.config\.json is not valid JSON/)
  })
  it('checks what it reads', () => {
    const file = path.join(dir, 'showcase.config.json')
    fs.writeFileSync(file, '{}')
    expect(() => loadBrief(file)).toThrow(/"url" is required/)
  })
})
