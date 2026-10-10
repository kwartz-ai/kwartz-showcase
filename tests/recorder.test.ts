import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Recorder, loadFonts, preparePage } from '../src/recorder.ts'
import { defaultTheme, resolveTheme } from '../src/theme.ts'
import type { Layout } from '../src/types.ts'
import { fakePage } from './helpers.ts'

const LAYOUT: Layout = { width: 1920, height: 1080, zoom: 1.25, fps: 30 }
let dir: string
beforeEach(() => { dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kav-rec-')), 'frames') })
afterEach(() => {
  vi.useRealTimers()
  fs.rmSync(path.dirname(dir), { recursive: true, force: true })
})

describe('preparePage', () => {
  type Init = (arg: { zoom: number; css: string | null }) => void
  const initOf = (raw: ReturnType<typeof fakePage>['raw']) => raw.addInitScript.mock.calls[0] as unknown as [Init, { zoom: number; css: string | null }]
  /** A document just big enough for the script that runs before the app paints. */
  const fakeDocument = (ready = true) => {
    const added: Record<string, string>[] = []
    const listeners: Record<string, () => void> = {}
    const doc = {
      documentElement: ready ? { appendChild: (el: Record<string, string>) => added.push(el) } : null,
      createElement: (tag: string) => ({ tag } as Record<string, string>),
      addEventListener: (name: string, fn: () => void) => { listeners[name] = fn },
    }
    return { doc, added, listeners }
  }

  it('hands the zoom and the font stylesheet to a script that runs before the app', async () => {
    const { page, raw } = fakePage()
    await preparePage(page, LAYOUT, defaultTheme)
    expect(raw.addInitScript).toHaveBeenCalledOnce()
    expect(initOf(raw)[1]).toEqual({ zoom: 1.25, css: defaultTheme.fontsCss })
  })

  it('that script zooms the page and links the fonts', async () => {
    const { page, raw } = fakePage()
    await preparePage(page, { ...LAYOUT, zoom: 1.5 }, defaultTheme)
    const { doc, added } = fakeDocument()
    vi.stubGlobal('document', doc)
    const [init, arg] = initOf(raw)
    init(arg)
    expect(added).toEqual([
      { tag: 'style', textContent: 'html{zoom:1.5}' },
      { tag: 'link', rel: 'stylesheet', href: defaultTheme.fontsCss },
    ])
  })

  it('links no stylesheet when the theme needs none', async () => {
    const { page, raw } = fakePage()
    await preparePage(page, LAYOUT, resolveTheme({ fontsCss: null }))
    const { doc, added } = fakeDocument()
    vi.stubGlobal('document', doc)
    const [init, arg] = initOf(raw)
    init(arg)
    expect(added.map((e) => e.tag)).toEqual(['style'])
  })

  it('waits for the document when it runs before there is one', async () => {
    const { page, raw } = fakePage()
    await preparePage(page, LAYOUT, defaultTheme)
    const { doc, added, listeners } = fakeDocument(false)
    vi.stubGlobal('document', doc)
    const [init, arg] = initOf(raw)
    init(arg)
    expect(added).toEqual([])
    doc.documentElement = { appendChild: (el: Record<string, string>) => added.push(el) }
    listeners.DOMContentLoaded!()
    expect(added.map((e) => e.tag)).toEqual(['style', 'link'])
  })
})

describe('loadFonts', () => {
  const inPage = async (raw: ReturnType<typeof fakePage>['raw'], fonts: object) => {
    vi.stubGlobal('document', { fonts })
    const [fn, arg] = raw.evaluate.mock.calls[0] as unknown as [(want: string[]) => Promise<string[]>, string[]]
    return fn(arg)
  }

  it('asks the page for the faces the theme needs', async () => {
    const { page, raw } = fakePage()
    await loadFonts(page, defaultTheme)
    expect(raw.evaluate.mock.calls[0]![1]).toEqual(defaultTheme.fontsToLoad)
  })

  it('returns what the page reports', async () => {
    const { page, raw } = fakePage()
    raw.evaluate.mockResolvedValueOnce(['800 40px "X"'] as never)
    expect(await loadFonts(page, defaultTheme)).toEqual(['800 40px "X"'])
  })

  it('in the page: loads every face, waits, and reports none missing', async () => {
    const { page, raw } = fakePage()
    await loadFonts(page, resolveTheme({ fontsToLoad: ['500 20px "A"', '700 16px "B"'] }))
    const load = vi.fn(async () => [])
    expect(await inPage(raw, { load, ready: Promise.resolve(), check: () => true })).toEqual([])
    expect(load.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['500 20px "A"', '700 16px "B"'])
  })

  it('in the page: reports the faces that did not load', async () => {
    const { page, raw } = fakePage()
    await loadFonts(page, resolveTheme({ fontsToLoad: ['500 20px "A"', '700 16px "B"'] }))
    const missing = await inPage(raw, { load: async () => [], ready: Promise.resolve(), check: (f: string) => f.includes('"A"') })
    expect(missing).toEqual(['700 16px "B"'])
  })

  it('in the page: a face that fails to load does not stop the render', async () => {
    const { page, raw } = fakePage()
    await loadFonts(page, resolveTheme({ fontsToLoad: ['500 20px "A"'] }))
    const missing = await inPage(raw, { load: async () => { throw new Error('network') }, ready: Promise.resolve(), check: () => false })
    expect(missing).toEqual(['500 20px "A"'])
  })
})

describe('Recorder', () => {
  it('starts from an empty frame folder, clearing an earlier take', () => {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'old.jpg'), 'x')
    new Recorder(fakePage().page, dir, LAYOUT)
    expect(fs.readdirSync(dir)).toEqual([])
  })

  it('creates the frame folder, parents included', () => {
    const deep = path.join(dir, 'a', 'b')
    new Recorder(fakePage().page, deep, LAYOUT)
    expect(fs.existsSync(deep)).toBe(true)
  })

  it('asks for full-size, high-quality frames', async () => {
    const fake = fakePage()
    await new Recorder(fake.page, dir, LAYOUT).start()
    expect(fake.raw.screencast.start.mock.calls[0]![0]).toMatchObject({ quality: 92, size: { width: 1920, height: 1080 } })
  })

  it('follows the layout for the frame size', async () => {
    const fake = fakePage()
    await new Recorder(fake.page, dir, { ...LAYOUT, width: 1280, height: 720 }).start()
    expect(fake.raw.screencast.start.mock.calls[0]![0]).toMatchObject({ size: { width: 1280, height: 720 } })
  })

  it('writes each frame to disk as it arrives, numbered in order', async () => {
    const fake = fakePage()
    const rec = new Recorder(fake.page, dir, LAYOUT)
    await rec.start()
    fake.frame(Date.now(), 'first')
    fake.frame(Date.now(), 'second')
    expect(fs.readdirSync(dir).sort()).toEqual(['f000000.jpg', 'f000001.jpg'])
    expect(fs.readFileSync(path.join(dir, 'f000001.jpg'), 'utf8')).toBe('second')
    expect(rec.frames.map((f) => path.basename(f.file))).toEqual(['f000000.jpg', 'f000001.jpg'])
  })

  it('times each frame from the start of the recording', async () => {
    vi.useFakeTimers()
    const fake = fakePage()
    const rec = new Recorder(fake.page, dir, LAYOUT)
    await rec.start()
    const t0 = Date.now()
    fake.frame(t0 + 40)
    fake.frame(t0 + 1250)
    expect(rec.frames.map((f) => f.t)).toEqual([40, 1250])
  })

  it('never gives a frame a negative time', async () => {
    const fake = fakePage()
    const rec = new Recorder(fake.page, dir, LAYOUT)
    await rec.start()
    fake.frame(Date.now() - 5000)
    expect(rec.frames[0]!.t).toBe(0)
  })

  it('has no frames until the browser sends one', async () => {
    const rec = new Recorder(fakePage().page, dir, LAYOUT)
    await rec.start()
    expect(rec.frames).toEqual([])
  })

  it('keeps one clock for the whole recording', async () => {
    vi.useFakeTimers()
    const rec = new Recorder(fakePage().page, dir, LAYOUT)
    await rec.start()
    vi.advanceTimersByTime(2500)
    expect(rec.now()).toBe(2500)
  })

  it('stops the capture and returns the length of the recording', async () => {
    vi.useFakeTimers()
    const fake = fakePage()
    const rec = new Recorder(fake.page, dir, LAYOUT)
    await rec.start()
    vi.advanceTimersByTime(7300)
    expect(await rec.stop()).toBe(7300)
    expect(fake.raw.screencast.stop).toHaveBeenCalledOnce()
  })
})
