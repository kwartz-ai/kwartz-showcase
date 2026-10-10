import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Scene, SceneContext, Take, VideoConfig } from '../src/types.ts'

// The browser, the voice, FFmpeg and the sound library are all replaced, so these
// tests check the order of work and what is handed from one stage to the next.
const encode = vi.fn(async (_input: Record<string, unknown>) => {})
const effects = vi.fn(async (events: unknown[]) => events.map((_, i) => ({ file: `fx${i}.wav`, at: i, gain: 0.4 })))
const musicBed = vi.fn(async () => '/cache/music-pad.wav')
const narrate = vi.fn(async (lines: string[], opts: { draft?: boolean }) =>
  lines.map((_, i) => ({ file: opts.draft ? null : `clip${i}.wav`, ms: 30 })))
const serveStatic = vi.fn(async (_root: string) => ({ url: 'http://127.0.0.1:4999', close: vi.fn(async () => {}) }))
const launch = vi.fn()

vi.mock('../src/encode.ts', () => ({ encode }))
vi.mock('../src/sound.ts', () => ({ effects, musicBed }))
vi.mock('../src/voice/tts.ts', () => ({ narrate }))
vi.mock('../src/serve.ts', () => ({ serveStatic }))
vi.mock('playwright', () => ({ chromium: { launch } }))

const { resolveVideo } = await import('../src/config.ts')
const { finish, outDir, outFiles, remix, render } = await import('../src/render.ts')

let dir: string
let order: string[]
let page: ReturnType<typeof makePage>
let browser: { newContext: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }

function makePage(missingFonts: string[] = []) {
  const overlays: string[] = []
  return {
    overlays,
    addInitScript: vi.fn(async () => { order.push('init') }),
    goto: vi.fn(async (_url: string, _o?: object) => { order.push('goto') }),
    // loadFonts passes the list of faces; the banned-text sample passes nothing
    evaluate: vi.fn(async (_fn: unknown, arg?: unknown) => (Array.isArray(arg) ? missingFonts : 'text on the page')),
    screenshot: vi.fn(async () => {}),
    locator: vi.fn(),
    screencast: {
      start: vi.fn(async () => { order.push('record') }),
      stop: vi.fn(async () => { order.push('stop') }),
      showOverlay: vi.fn(async (html: string) => { overlays.push(html); return { dispose: async () => {} } }),
    },
  }
}

const scene = (id: string, run: Scene['run'] = async () => { order.push(`scene:${id}`) }): Scene => ({ id, say: `Line for ${id}.`, run })
const video = (over: Partial<VideoConfig> = {}) => resolveVideo({
  name: 'v', baseUrl: 'http://app.test', scenes: [scene('one'), scene('two')],
  pace: { leadMs: 0, tailMs: 0 }, ...over,
}, dir)
const quiet = { log: () => {} }
const encoded = () => encode.mock.calls.at(-1)![0]

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kav-render-'))
  order = []
  page = makePage()
  browser = {
    newContext: vi.fn(async () => ({ newPage: async () => page })),
    close: vi.fn(async () => { order.push('close') }),
  }
  launch.mockReset().mockImplementation(async () => browser)
  for (const m of [encode, effects, musicBed, narrate, serveStatic]) m.mockClear()
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('outFiles', () => {
  it('puts everything in out/ beside the video file, named after the video', () => {
    const f = outFiles(video({ name: 'demo3' }))
    expect(outDir(video())).toBe(path.join(dir, 'out'))
    expect(f.mp4).toBe(path.join(dir, 'out', 'demo3.mp4'))
    expect(f.vtt).toBe(path.join(dir, 'out', 'demo3.vtt'))
    expect(f.take).toBe(path.join(dir, 'out', 'demo3.take.json'))
    expect(f.failed).toBe(path.join(dir, 'out', 'failed.png'))
  })
  it('gives each video its own frame folder, so an earlier take can still be remixed', () => {
    expect(outFiles(video({ name: 'a' })).frames).not.toBe(outFiles(video({ name: 'b' })).frames)
  })
})

describe('render: the order of work', () => {
  it('voices the script, then prepares, records each scene, and encodes last', async () => {
    const prepare = vi.fn(async () => { order.push('prepare') })
    narrate.mockImplementationOnce(async (lines) => { order.push('narrate'); return lines.map(() => ({ file: 'c.wav', ms: 30 })) })
    encode.mockImplementationOnce(async () => { order.push('encode') })
    await render(video({ prepare }), quiet)
    expect(order).toEqual(['narrate', 'init', 'goto', 'prepare', 'record', 'scene:one', 'scene:two', 'stop', 'close', 'encode'])
  })

  it('sends every spoken line to the voice, in scene order', async () => {
    await render(video({ voice: { voice: 'bf_emma', speed: 1.1 } }), quiet)
    expect(narrate).toHaveBeenCalledWith(['Line for one.', 'Line for two.'], { voice: 'bf_emma', speed: 1.1, draft: false })
  })

  it('opens the browser at the size of the layout, headless', async () => {
    await render(video({ layout: { width: 1280, height: 720 } }), quiet)
    expect(launch).toHaveBeenCalledWith({ headless: true })
    expect(browser.newContext).toHaveBeenCalledWith({ viewport: { width: 1280, height: 720 } })
  })

  it('shows the browser when asked', async () => {
    await render(video(), { ...quiet, headed: true })
    expect(launch).toHaveBeenCalledWith({ headless: false })
  })

  it('opens the app and waits for it to go quiet', async () => {
    await render(video(), quiet)
    expect(page.goto).toHaveBeenCalledWith('http://app.test', { waitUntil: 'networkidle' })
  })

  it('films another instance when given one', async () => {
    await render(video(), { ...quiet, baseUrl: 'https://staging.test/' })
    expect(page.goto.mock.calls[0]![0]).toBe('https://staging.test')
  })

  it('serves a static folder, films that, and stops the server', async () => {
    const close = vi.fn(async () => {})
    serveStatic.mockResolvedValueOnce({ url: 'http://127.0.0.1:5123', close })
    await render(video({ baseUrl: undefined, serve: './site' }), quiet)
    expect(serveStatic).toHaveBeenCalledWith(path.join(dir, 'site'))
    expect(page.goto.mock.calls[0]![0]).toBe('http://127.0.0.1:5123')
    expect(close).toHaveBeenCalledOnce()
  })

  it('starts no server for a video of a running app', async () => {
    await render(video(), quiet)
    expect(serveStatic).not.toHaveBeenCalled()
  })

  it('closes the browser when it is done', async () => {
    await render(video(), quiet)
    expect(browser.close).toHaveBeenCalledOnce()
  })
})

describe('render: what a scene receives', () => {
  it('gets the page, the stage, the address, the theme and its narration length', async () => {
    let ctx!: SceneContext
    await render(video({ scenes: [scene('one', async (c) => { ctx = c })], theme: { accent: '#0f0' } }), quiet)
    expect(ctx.page).toBe(page)
    expect(ctx.baseUrl).toBe('http://app.test')
    expect(ctx.theme.accent).toBe('#0f0')
    expect(ctx.sayMs).toBe(30)
    expect(typeof ctx.stage.click).toBe('function')
    expect(typeof ctx.sleep).toBe('function')
  })

  it('untilSaid waits for a point in the narration, and no longer once it has passed', async () => {
    narrate.mockResolvedValueOnce([{ file: null, ms: 200 }])
    const waited: number[] = []
    await render(video({
      scenes: [scene('one', async ({ untilSaid }) => {
        const t = Date.now()
        await untilSaid(0.5)
        waited.push(Date.now() - t)
        const t2 = Date.now()
        await untilSaid(0.1)
        waited.push(Date.now() - t2)
      })],
    }), quiet)
    expect(waited[0]!).toBeGreaterThanOrEqual(80)
    expect(waited[0]!).toBeLessThan(400)
    expect(waited[1]!).toBeLessThan(40)
  })

  it('gives prepare the page, the address and the theme', async () => {
    const prepare = vi.fn(async () => {})
    await render(video({ prepare }), quiet)
    expect(prepare).toHaveBeenCalledWith(expect.objectContaining({ page, baseUrl: 'http://app.test' }))
  })

  it('a scene lasts at least as long as its line takes to say', async () => {
    narrate.mockResolvedValueOnce([{ file: null, ms: 150 }])
    const t = Date.now()
    await render(video({ scenes: [scene('one', async () => {})] }), quiet)
    expect(Date.now() - t).toBeGreaterThanOrEqual(140)
  })

  it('a scene lasts as long as its steps take when they outrun the line', async () => {
    const { take } = await render(video({ scenes: [scene('one', async ({ sleep }) => { await sleep(120) })] }), quiet)
    expect(take.endMs).toBeGreaterThanOrEqual(110)
  })

  it('adds the lead-in and the pause to every scene', async () => {
    const { take } = await render(video({ scenes: [scene('one', async () => {})], pace: { leadMs: 60, tailMs: 80 } }), quiet)
    expect(take.endMs).toBeGreaterThanOrEqual(60 + 30 + 80 - 15)
    expect(take.cues[0]!.start).toBeGreaterThanOrEqual(60)
  })
})

describe('render: captions', () => {
  it('shows each line as a caption while its scene runs', async () => {
    await render(video(), quiet)
    expect(page.overlays.some((h) => h.includes('Line for one.'))).toBe(true)
    expect(page.overlays.some((h) => h.includes('Line for two.'))).toBe(true)
  })
  it('captions the override text when a scene has one', async () => {
    await render(video({ scenes: [{ ...scene('one'), say: 'as E.D.I.', caption: 'as EDI' }] }), quiet)
    expect(page.overlays.some((h) => h.includes('as EDI'))).toBe(true)
    expect(page.overlays.some((h) => h.includes('E.D.I.'))).toBe(false)
  })
  it('still voices the spoken text, not the caption', async () => {
    await render(video({ scenes: [{ ...scene('one'), say: 'as E.D.I.', caption: 'as EDI' }] }), quiet)
    expect(narrate.mock.calls[0]![0]).toEqual(['as E.D.I.'])
  })
})

describe('render: the take', () => {
  it('is returned and saved beside the video', async () => {
    const v = video()
    const { take, file } = await render(v, quiet)
    expect(file).toBe(outFiles(v).mp4)
    expect(JSON.parse(fs.readFileSync(outFiles(v).take, 'utf8'))).toEqual(take)
  })
  it('places one narration clip per scene, in order', async () => {
    const { take } = await render(video(), quiet)
    expect(take.audio.map((a) => a.file)).toEqual(['clip0.wav', 'clip1.wav'])
    expect(take.audio[1]!.at).toBeGreaterThan(take.audio[0]!.at)
  })
  it('has cues for every scene, starting where its narration starts', async () => {
    const { take } = await render(video(), quiet)
    expect(take.cues.map((c) => c.text)).toEqual(['Line for one.', 'Line for two.'])
    expect(take.cues[0]!.start).toBe(take.audio[0]!.at)
    expect(take.cues[0]!.end - take.cues[0]!.start).toBeCloseTo(30, 5)
  })
  it('samples the text on screen at the end of each scene', async () => {
    const { take } = await render(video(), quiet)
    expect(take.seen).toEqual([{ id: 'one', text: 'text on the page' }, { id: 'two', text: 'text on the page' }])
  })
  it('carries the sounds and dissolves the stage logged', async () => {
    const { take } = await render(video({ scenes: [scene('one', async ({ stage }) => { await stage.dissolve(async () => {}, { ms: 20 }) })] }), quiet)
    expect(take.dissolves).toHaveLength(1)
    expect(take.events.map((e) => e.kind)).toEqual(['whoosh'])
  })
  it('records which fonts fell back', async () => {
    page = makePage(['800 40px "Plus Jakarta Sans"'])
    const { take } = await render(video(), quiet)
    expect(take.missingFonts).toEqual(['800 40px "Plus Jakarta Sans"'])
  })
  it('notes whether it was a draft', async () => {
    expect((await render(video(), { ...quiet, draft: true })).take.draft).toBe(true)
    expect((await render(video(), quiet)).take.draft).toBe(false)
  })
  it('writes the caption file', async () => {
    const v = video()
    await render(v, quiet)
    expect(fs.readFileSync(outFiles(v).vtt, 'utf8')).toMatch(/^WEBVTT\n\n1\n.*\nLine for one\.\n/)
  })
})

describe('render: a draft', () => {
  it('asks the voice for estimates only', async () => {
    await render(video(), { ...quiet, draft: true })
    expect(narrate.mock.calls[0]![1]).toMatchObject({ draft: true })
  })
  it('has no narration, no effects and no music', async () => {
    const { take } = await render(video(), { ...quiet, draft: true })
    expect(take.audio).toEqual([])
    expect(encoded()).toMatchObject({ clips: [], sfx: [], music: null })
    expect(effects).not.toHaveBeenCalled()
    expect(musicBed).not.toHaveBeenCalled()
  })
})

describe('render: the log', () => {
  const logged = async (v = video(), opts = {}) => {
    const lines: string[] = []
    await render(v, { log: (l) => lines.push(l), ...opts })
    return lines
  }
  it('reports the narration, each scene and the recording', async () => {
    const lines = await logged()
    expect(lines[0]).toBe('narration: 0.1 s over 2 scenes')
    expect(lines).toContainEqual(expect.stringMatching(/^scene 1\/2 one @ /))
    expect(lines).toContainEqual(expect.stringMatching(/^scene 2\/2 two @ /))
    expect(lines).toContainEqual(expect.stringMatching(/^recorded \d+ frames, /))
  })
  it('says when it is a draft', async () => {
    expect((await logged(video(), { draft: true }))[0]).toBe('narration: 0.1 s over 2 scenes (draft, silent)')
  })
  it('names fonts that did not load', async () => {
    page = makePage(['500 20px "Inter"'])
    expect(await logged()).toContain('fonts not loaded, fallback in use: 500 20px "Inter"')
  })
  it('reports how long each dissolve held the old screen', async () => {
    const lines = await logged(video({ scenes: [scene('one', async ({ stage }) => { await stage.dissolve(async () => {}, { ms: 20 }) })] }))
    expect(lines).toContainEqual(expect.stringMatching(/^dissolves held the old screen for \(ms\): \d+$/))
  })
})

describe('render: when something fails', () => {
  const failing = () => video({ scenes: [scene('one'), scene('broken', async () => { throw new Error('no such button') })] })

  it('names the scene and the reason, and points at the screenshot', async () => {
    const v = failing()
    await expect(render(v, quiet)).rejects.toThrow(new RegExp(`render stopped in scene "broken": no such button[\\s\\S]*failed\\.png`))
  })
  it('takes a screenshot of the page at that moment', async () => {
    const v = failing()
    await render(v, quiet).catch(() => {})
    expect(page.screenshot).toHaveBeenCalledWith({ path: outFiles(v).failed })
  })
  it('closes the browser and encodes nothing', async () => {
    await render(failing(), quiet).catch(() => {})
    expect(browser.close).toHaveBeenCalledOnce()
    expect(encode).not.toHaveBeenCalled()
  })
  it('stops the static server too', async () => {
    const close = vi.fn(async () => {})
    serveStatic.mockResolvedValueOnce({ url: 'http://127.0.0.1:5123', close })
    await render(video({ baseUrl: undefined, serve: './site', scenes: [scene('x', async () => { throw new Error('boom') })] }), quiet).catch(() => {})
    expect(close).toHaveBeenCalledOnce()
  })
  it('does not run the scenes after the one that failed', async () => {
    await render(video({ scenes: [scene('a', async () => { throw new Error('x') }), scene('b')] }), quiet).catch(() => {})
    expect(order).not.toContain('scene:b')
  })
  it('strips terminal colour codes from the reason', async () => {
    const v = video({ scenes: [scene('x', async () => { throw new Error('Call log:\n\x1b[2m  - waiting for locator\x1b[22m') })] })
    const err = await render(v, quiet).catch((e: Error) => e) as Error
    expect(err.message).toContain('  - waiting for locator')
    expect(err.message).not.toMatch(/\x1b/)
  })
  it('says "prepare" when it fails before the first scene', async () => {
    await expect(render(video({ prepare: async () => { throw new Error('login failed') } }), quiet))
      .rejects.toThrow(/render stopped in scene "prepare": login failed/)
  })
  it('still reports the failure when even the screenshot fails', async () => {
    page.screenshot.mockRejectedValueOnce(new Error('page crashed'))
    await expect(render(failing(), quiet)).rejects.toThrow(/no such button/)
  })
  it('opens no browser when the voice is not set up', async () => {
    narrate.mockRejectedValueOnce(new Error('The voice is not set up'))
    await expect(render(video(), quiet)).rejects.toThrow('The voice is not set up')
    expect(launch).not.toHaveBeenCalled()
  })
})

describe('finish: the sound that goes into the file', () => {
  const take = (over: Partial<Take> = {}): Take => ({
    draft: false, frames: [{ file: 'f.jpg', t: 0 }], endMs: 1000, audio: [{ file: 'a.wav', at: 0 }],
    cues: [{ text: 'Hi.', start: 0, end: 500 }], events: [{ t: 100, kind: 'click' }, { t: 300, kind: 'callout' }],
    dissolves: [{ t1: 1, t2: 2, ms: 1 }], seen: [], missingFonts: [], ...over,
  })
  const run = async (v = video(), t = take(), opts = {}) => {
    fs.mkdirSync(outDir(v), { recursive: true })
    await finish(v, t, opts)
    return encoded()
  }

  it('hands the encoder the frames, the clips, the dissolves and where to write', async () => {
    const v = video()
    const t = take()
    expect(await run(v, t)).toMatchObject({
      frames: t.frames, endMs: 1000, clips: t.audio, dissolves: t.dissolves,
      outFile: outFiles(v).mp4, workDir: outDir(v), layout: v.layout,
    })
  })
  it('turns every logged event into an effect', async () => {
    expect((await run()).sfx).toHaveLength(2)
    expect(effects).toHaveBeenCalledWith(take().events)
  })
  it('uses the generated music bed by default', async () => {
    expect((await run()).music).toBe('/cache/music-pad.wav')
  })
  it('passes the music level and the loudness target of the video', async () => {
    expect(await run(video({ sound: { musicGain: 0.25, lufs: -14 } }))).toMatchObject({ musicGain: 0.25, lufs: -14 })
  })
  it('has no music when the video turns it off', async () => {
    expect((await run(video({ sound: { music: false } }))).music).toBeNull()
    expect(musicBed).not.toHaveBeenCalled()
  })
  it('uses a track named in the video, found beside the video file', async () => {
    expect((await run(video({ sound: { music: './track.mp3' } }))).music).toBe(path.join(dir, 'track.mp3'))
  })
  it('lets the command line turn the music off', async () => {
    expect((await run(video(), take(), { music: false })).music).toBeNull()
  })
  it('lets the command line name another track', async () => {
    expect((await run(video({ sound: { music: false } }), take(), { music: 'other.mp3' })).music).toBe(path.join(dir, 'other.mp3'))
  })
  it('has no effects when the video turns them off', async () => {
    expect((await run(video({ sound: { effects: false } }))).sfx).toEqual([])
    expect(effects).not.toHaveBeenCalled()
  })
  it('lets the command line turn the effects off', async () => {
    expect((await run(video(), take(), { effects: false })).sfx).toEqual([])
  })
  it('keeps a draft silent whatever the settings say', async () => {
    const e = await run(video({ sound: { music: './track.mp3' } }), take({ draft: true }), { effects: true })
    expect(e).toMatchObject({ sfx: [], music: null })
  })
  it('writes the caption file and returns the path of the video', async () => {
    const v = video()
    fs.mkdirSync(outDir(v), { recursive: true })
    expect(await finish(v, take())).toBe(outFiles(v).mp4)
    expect(fs.readFileSync(outFiles(v).vtt, 'utf8')).toContain('Hi.')
  })
})

describe('remix', () => {
  it('says to render first when there is no take', async () => {
    await expect(remix(video())).rejects.toThrow(/no take to remix: render "v" once first/)
  })
  it('rebuilds from the saved take without opening a browser', async () => {
    const v = video()
    const { take } = await render(v, quiet)
    launch.mockClear(); encode.mockClear(); narrate.mockClear()
    expect(await remix(v)).toBe(outFiles(v).mp4)
    expect(launch).not.toHaveBeenCalled()
    expect(narrate).not.toHaveBeenCalled()
    expect(encoded()).toMatchObject({ frames: take.frames, clips: take.audio })
  })
  it('applies new sound options to the old take', async () => {
    const v = video()
    await render(v, quiet)
    await remix(v, { music: false, effects: false })
    expect(encoded()).toMatchObject({ music: null, sfx: [] })
  })
})
