import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Brief } from '../../../src/brief/brief.ts'
import { FORMATS, KIND_ADVICE, LAST_CHECKED, MOTION_FEELS, PLATFORMS, layoutFor } from '../../../src/brief/presets.ts'
import { ctaFor, defineScenes, loadScenes, resolveBrief, targetsFor, themeFor, type ScenesModule } from '../../../src/brief/resolve.ts'
import { workOrder } from '../../../src/brief/workorder.ts'

describe('presets', () => {
  it('gives every shape an even size', () => {
    for (const f of Object.values(FORMATS)) {
      expect(f.width % 2).toBe(0)
      expect(f.height % 2).toBe(0)
    }
  })
  it('knows the common shapes by ratio', () => {
    expect(FORMATS.landscape).toMatchObject({ width: 1920, height: 1080, ratio: '16:9' })
    expect(FORMATS.vertical).toMatchObject({ width: 1080, height: 1920, ratio: '9:16' })
    expect(FORMATS.square).toMatchObject({ width: 1080, height: 1080, ratio: '1:1' })
    expect(FORMATS.portrait).toMatchObject({ width: 1080, height: 1350, ratio: '4:5' })
  })
  it('maps every platform to a shape that exists and a kind with advice', () => {
    for (const p of Object.values(PLATFORMS)) {
      expect(FORMATS[p.format]).toBeDefined()
      expect(KIND_ADVICE[p.kind]).toBeDefined()
      expect(p.label).not.toBe('')
    }
  })
  it('sends the short-video platforms to the vertical shape', () => {
    for (const p of ['youtube-shorts', 'instagram-reel', 'tiktok', 'facebook-reel']) expect(PLATFORMS[p]!.format).toBe('vertical')
    expect(PLATFORMS.youtube!.format).toBe('landscape')
    expect(PLATFORMS.linkedin!.format).toBe('square')
  })
  it('keeps space clear where a phone app draws its own buttons', () => {
    expect(FORMATS.vertical!.safe).toEqual({ top: 0.12, bottom: 0.2 })
  })
  it('records when the platform sizes were last checked', () => {
    expect(LAST_CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('has three motion feels', () => {
    expect(Object.keys(MOTION_FEELS)).toEqual(['calm', 'crisp', 'lively'])
  })
})

describe('layoutFor', () => {
  it('films a landscape page as the whole video, zoomed for reading', () => {
    expect(layoutFor('landscape')).toMatchObject({
      width: 1920, height: 1080, zoom: 1.25, ui: 1, fps: 30, mode: 'fill', captions: 'page',
      canvas: { width: 1920, height: 1080 }, window: { x: 0, y: 0, width: 1920, height: 1080 },
    })
  })
  it('films a narrow page unzoomed, with larger overlays', () => {
    expect(layoutFor('square')).toMatchObject({ width: 1080, height: 1080, zoom: 1, ui: 1.7, mode: 'fill' })
    expect(layoutFor('portrait')).toMatchObject({ width: 1080, height: 1350, zoom: 1, ui: 1.7 })
  })
  it('zooms a 4:3 page a little less than a 16:9 one', () => {
    expect(layoutFor('classic').zoom).toBe(1.125)
    expect(layoutFor('wide').zoom).toBe(1.25)
  })
  it('frames a desktop page in the upper part of a vertical video, captions below', () => {
    const l = layoutFor('vertical')
    expect(l).toMatchObject({
      mode: 'framed', captions: 'composite', width: 1080, height: 1056,
      canvas: { width: 1080, height: 1920 }, window: { x: 0, y: 230, width: 1080, height: 1056 },
      captionBand: { y: 1286, height: 250 }, safe: { top: 230, bottom: 384 },
    })
    expect(l.zoom).toBeGreaterThan(1)
  })
  it('keeps overlays the same size on screen whatever the framed zoom is', () => {
    const l = layoutFor('vertical')
    expect(l.ui * l.zoom).toBeCloseTo(1.7)
  })
  it('keeps the framed window and the captions inside the safe area', () => {
    for (const name of ['vertical', 'tall']) {
      const l = layoutFor(name)
      expect(l.window.y).toBeGreaterThanOrEqual(l.safe.top)
      expect(l.captionBand.y + l.captionBand.height).toBeLessThanOrEqual(l.canvas.height - l.safe.bottom)
      expect(l.captionBand.y).toBe(l.window.y + l.window.height)
    }
  })
  it('fits the whole landscape page on a tall frame when asked', () => {
    expect(layoutFor('vertical', 'fit')).toMatchObject({
      mode: 'fit', captions: 'composite', width: 1920, height: 1080, zoom: 1.25,
      canvas: { width: 1080, height: 1920 }, window: { x: 0, y: 454, width: 1080, height: 608 },
      captionBand: { y: 1062, height: 250 },
    })
  })
  it('films at phone width when asked for the responsive layout', () => {
    expect(layoutFor('vertical', 'responsive')).toMatchObject({ mode: 'fill', width: 1080, height: 1920, zoom: 2.5, ui: 1, captions: 'page' })
  })
  it('lets the brief fill a tall shape with the page', () => {
    expect(layoutFor('vertical', 'fill')).toMatchObject({ mode: 'fill', width: 1080, height: 1920, zoom: 1 })
  })
  it('takes a custom size: wide ones fill, tall ones are framed', () => {
    expect(layoutFor({ width: 1600, height: 900 })).toMatchObject({ mode: 'fill', zoom: 1.25, canvas: { width: 1600, height: 900 } })
    expect(layoutFor({ width: 800, height: 1000 })).toMatchObject({ mode: 'framed', height: 750, canvas: { width: 800, height: 1000 }, captionBand: { y: 750, height: 250 } })
  })
  it('follows the frame rate', () => {
    expect(layoutFor('landscape', undefined, 60).fps).toBe(60)
  })
  it('names the known shapes when it does not know one', () => {
    expect(() => layoutFor('round')).toThrow(/unknown shape "round".*landscape/)
  })
})

describe('targetsFor', () => {
  it('renders landscape when the brief asks for nothing', () => {
    expect(targetsFor({ url: 'http://localhost' })).toEqual([{ format: 'landscape', label: 'landscape', platforms: [] }])
  })
  it('renders one video for platforms that share a shape', () => {
    expect(targetsFor({ platforms: ['instagram-reel', 'youtube-shorts', 'youtube'] })).toEqual([
      { format: 'vertical', label: 'vertical', platforms: ['instagram-reel', 'youtube-shorts'] },
      { format: 'landscape', label: 'landscape', platforms: ['youtube'] },
    ])
  })
  it('adds the shapes named directly, without repeating one a platform already asked for', () => {
    const t = targetsFor({ platforms: ['tiktok'], formats: ['vertical', 'square'] })
    expect(t.map((x) => x.label)).toEqual(['vertical', 'square'])
    expect(t[0]!.platforms).toEqual(['tiktok'])
  })
  it('labels a custom shape by its size', () => {
    expect(targetsFor({ formats: [{ width: 800, height: 1000 }] })[0]).toMatchObject({ label: '800x1000', platforms: [] })
  })
})

describe('ctaFor', () => {
  it('uses the one in the brief', () => {
    expect(ctaFor({ url: 'http://localhost', cta: { text: 'Book a walkthrough', sub: 'kwartz.ai' } })).toEqual({ text: 'Book a walkthrough', sub: 'kwartz.ai' })
  })
  it('points at the product itself when it is hosted', () => {
    expect(ctaFor({ url: 'https://www.example.com/app' })).toEqual({ text: 'See it for yourself.', sub: 'example.com' })
  })
  it('has none for a local address or a static folder', () => {
    expect(ctaFor({ url: 'http://localhost:3000' })).toBeNull()
    expect(ctaFor({ serve: 'site' })).toBeNull()
  })
})

describe('themeFor', () => {
  it('moves calmly by default', () => {
    expect(themeFor({})).toMatchObject({ ease: MOTION_FEELS.calm.ease, speed: MOTION_FEELS.calm.speed, captionScale: 1 })
  })
  it('follows the feel and the caption size', () => {
    expect(themeFor({ motion: { feel: 'lively' }, style: { captions: 'large' } })).toMatchObject({ ease: MOTION_FEELS.lively.ease, captionScale: 1.2 })
    expect(themeFor({ style: { captions: 'small' } }).captionScale).toBe(0.85)
  })
  it('takes the colours', () => {
    expect(themeFor({ style: { ink: '#111111', accent: '#ff9900' } })).toMatchObject({ ink: '#111111', accent: '#ff9900' })
  })
  it('leaves the default fonts alone when none are named', () => {
    const t = themeFor({})
    expect(t.fontsCss).toBeUndefined()
    expect(t.type).toEqual({})
  })
  it('links a named font together with the defaults for the other roles', () => {
    const t = themeFor({ style: { fonts: { text: 'Open Sans' } } })
    expect(t.type!.text).toBe("'Open Sans', 'Segoe UI', system-ui, sans-serif")
    expect(t.fontsCss).toContain('family=Open+Sans:wght@400;500;600;700')
    expect(t.fontsCss).toContain('family=Plus+Jakarta+Sans:wght@')
    expect(t.fontsCss).toContain('family=JetBrains+Mono:wght@')
    expect(t.fontsToLoad).toContain('500 20px "Open Sans"')
  })
  it('writes font stacks with single quotes, which are safe inside a style attribute', () => {
    const t = themeFor({ style: { fonts: { display: 'Sora', text: 'Roboto', mono: 'Fira Code' } } })
    for (const stack of Object.values(t.type!)) expect(stack).not.toContain('"')
  })
  it('links nothing when the fonts are installed on the machine', () => {
    expect(themeFor({ style: { fonts: { text: 'Roboto' }, fontSource: 'installed' } })).toMatchObject({ fontsCss: null, fontsToLoad: [] })
  })
})

describe('resolveBrief', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-resolve-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  const run = async () => {}
  const scenes = (): ScenesModule => defineScenes({ scenes: [{ id: 'hook', say: 'One.', run }, { id: 'end', say: 'Two.', run }] })
  const resolve = (brief: Brief, module = scenes()) => resolveBrief(brief, dir, module)

  it('makes one video, named after the brief, when there is one shape', () => {
    const { videos, plan } = resolve({ name: 'tour', url: 'http://localhost:3000' })
    expect(videos).toHaveLength(1)
    expect(videos[0]!.video).toMatchObject({ name: 'tour', baseUrl: 'http://localhost:3000', format: 'landscape', dir })
    expect(plan.lengthSec).toBe(30)
  })
  it('names each video after its shape when there are several', () => {
    const { videos } = resolve({ name: 'tour', url: 'http://localhost', formats: ['landscape', 'vertical'] })
    expect(videos.map((v) => v.video.name)).toEqual(['tour.landscape', 'tour.vertical'])
    expect(videos[1]!.video.layout.mode).toBe('framed')
  })
  it('sets the length the checks will pass', () => {
    expect(resolve({ url: 'http://localhost', length: 60 }).videos[0]!.video.target).toEqual({ minSec: 54, maxSec: 66 })
  })
  it('leaves a scene out of the shapes it is not for', () => {
    const module = defineScenes({ scenes: [{ id: 'a', say: 'A.', run }, { id: 'wide-only', say: 'B.', run, formats: ['landscape'] }] })
    const { videos } = resolve({ url: 'http://localhost', formats: ['landscape', 'square'] }, module)
    expect(videos[0]!.video.scenes.map((s) => s.id)).toEqual(['a', 'wide-only'])
    expect(videos[1]!.video.scenes.map((s) => s.id)).toEqual(['a'])
  })
  it('keeps a local product writable and a hosted one read-only by default', () => {
    expect(resolve({ url: 'http://localhost' }).videos[0]!.video.readOnly.on).toBe(false)
    expect(resolve({ url: 'https://app.example.com', safety: { banned: [] } }).videos[0]!.video.readOnly).toEqual({ on: true, allow: [] })
  })
  it('lets the brief turn read-only on or off, and allow addresses by name', () => {
    expect(resolve({ url: 'http://localhost', safety: { readOnly: true, allow: ['/api/search'] } }).videos[0]!.video.readOnly).toEqual({ on: true, allow: ['/api/search'] })
    expect(resolve({ url: 'https://app.example.com', safety: { banned: [], readOnly: false } }).videos[0]!.video.readOnly.on).toBe(false)
  })
  it('carries the banned names, the voice, the music and the session', () => {
    const v = resolve({ url: 'http://localhost', voice: 'bm_george', music: false, safety: { banned: ['Acme'] }, auth: { session: '.showcase/session.json' } }).videos[0]!.video
    expect(v.banned).toEqual(['Acme'])
    expect(v.voice.voice).toBe('bm_george')
    expect(v.sound.music).toBe(false)
    expect(v.session).toBe(path.resolve(dir, '.showcase/session.json'))
  })
  it('turns effects off only when the brief says none', () => {
    expect(resolve({ url: 'http://localhost', sound: { effects: 'none' } }).videos[0]!.video.sound.effects).toBe(false)
    expect(resolve({ url: 'http://localhost' }).videos[0]!.video.sound.effects).toBe(true)
  })
  it('blurs motion unless told not to', () => {
    expect(resolve({ url: 'http://localhost' }).videos[0]!.video.motion.blur).toBe(true)
    expect(resolve({ url: 'http://localhost', motion: { blur: false } }).videos[0]!.video.motion.blur).toBe(false)
  })
  it('notes a missing call to action for a local address', () => {
    expect(resolve({ url: 'http://localhost' }).notes.join(' ')).toMatch(/no call to action/)
    expect(resolve({ url: 'http://localhost', cta: { text: 'Try it' } }).notes).toEqual([])
  })
  it('notes a length that is long for a platform', () => {
    expect(resolve({ url: 'http://localhost', cta: { text: 'x' }, length: 180, platforms: ['tiktok'] }).notes[0]).toMatch(/TikTok: 180 s is long/)
  })
  it('takes the narration from a script file, by scene', () => {
    fs.writeFileSync(path.join(dir, 'script.txt'), 'First words.\n\nLast words.')
    const module = defineScenes({ scenes: [{ id: 'hook', run }, { id: 'end', run }] })
    const { videos } = resolve({ url: 'http://localhost', script: 'script.txt' }, module)
    expect(videos[0]!.video.scenes.map((s) => s.say)).toEqual(['First words.', 'Last words.'])
  })
  it('notes a script that is too long for the length, without cutting it', () => {
    fs.writeFileSync(path.join(dir, 'script.txt'), Array.from({ length: 200 }, () => 'word').join(' '))
    const module = defineScenes({ scenes: [{ id: 'hook', run }] })
    const { notes, videos } = resolve({ url: 'http://localhost', cta: { text: 'x' }, script: 'script.txt' }, module)
    expect(notes[0]).toMatch(/the script is 200 words/)
    expect(videos[0]!.video.scenes[0]!.say.split(' ')).toHaveLength(200)
  })
  it('says so when the script file is missing', () => {
    expect(() => resolve({ url: 'http://localhost', script: 'nope.txt' })).toThrow(/"script" points at .*nope\.txt/)
  })
})

describe('loadScenes', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-scenes-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('explains that the kit films scenes and does not write them', async () => {
    await expect(loadScenes({ url: 'http://localhost' }, dir)).rejects.toThrow(/no scenes file at .*video\.ts[\s\S]*showcase plan/)
  })
  it('loads the file the brief names', async () => {
    fs.writeFileSync(path.join(dir, 'mine.mjs'), 'export default { scenes: [{ id: "a", say: "A.", run: async () => {} }] }')
    expect((await loadScenes({ scenes: 'mine.mjs' }, dir)).scenes[0]!.id).toBe('a')
  })
  it('says what the file must end with', async () => {
    fs.writeFileSync(path.join(dir, 'empty.mjs'), 'export default {}')
    await expect(loadScenes({ scenes: 'empty.mjs' }, dir)).rejects.toThrow(/export default defineScenes/)
  })
})

describe('workOrder', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-order-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('states the product, the length and what is not yet decided', () => {
    const text = workOrder({ name: 'tour', url: 'http://localhost:3000' }, dir)
    expect(text).toContain('# Work order: tour')
    expect(text).toContain('Product: http://localhost:3000 (local)')
    expect(text).toContain('Length: 30 seconds (passes between 27 and 33)')
    expect(text).toMatch(/Audience: not given/)
    expect(text).toMatch(/Promise: not given/)
    expect(text).toMatch(/Next step for the viewer: not given/)
  })
  it('lists each shape with its size, layout and platforms', () => {
    const text = workOrder({ url: 'http://localhost', platforms: ['instagram-reel', 'youtube'] }, dir)
    expect(text).toMatch(/- vertical: 1080x1920, framed layout for Instagram Reels\. The product is filmed in a 1080x1056 window/)
    expect(text).toContain('- landscape: 1920x1080, fill layout for YouTube')
    expect(text).toContain('One scenes file serves every shape')
  })
  it('gives the word budget as a table, one row per scene', () => {
    const text = workOrder({ url: 'http://localhost' }, dir)
    expect(text).toContain('Write about 70 words of narration in 4 scenes')
    expect(text.match(/^\| \d+ \|/gm)).toHaveLength(4)
  })
  it('tells the author to keep the words of a script the person wrote', () => {
    expect(workOrder({ url: 'http://localhost', script: 'script.txt' }, dir)).toMatch(/Use their words as they are/)
  })
  it('states the safety rules for a hosted product', () => {
    const text = workOrder({ url: 'https://app.example.com', safety: { banned: ['Acme', 'Globex'] }, auth: { session: '.showcase/session.json' } }, dir)
    expect(text).toContain('(hosted)')
    expect(text).toContain('Names that must never appear on screen: Acme, Globex.')
    expect(text).toContain('Read-only mode is on')
    expect(text).toMatch(/a saved session at \.showcase\/session\.json/)
    expect(text).toContain('Next step for the viewer: See it for yourself. (app.example.com)')
  })
  it('points at the product map once it exists', () => {
    expect(workOrder({ url: 'http://localhost' }, dir)).toMatch(/Not explored yet\. Run "showcase explore"/)
    fs.mkdirSync(path.join(dir, '.showcase', 'explore'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.showcase', 'explore', 'map.md'), '# map')
    expect(workOrder({ url: 'http://localhost' }, dir)).toMatch(/Read \.showcase.explore.map\.md/)
  })
  it('mentions chapter cards for a long video', () => {
    expect(workOrder({ url: 'http://localhost', length: 180 }, dir)).toContain('Use 4 chapter card(s)')
  })
})
