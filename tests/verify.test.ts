import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Take } from '../src/types.ts'

const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>()
vi.mock('../src/util.ts', async (original) => ({ ...(await original<typeof import('../src/util.ts')>()), run }))

const { resolveVideo } = await import('../src/config.ts')
const { bannedHits, lateHolds, printChecks, verify } = await import('../src/verify.ts')

describe('lateHolds', () => {
  const audio = [{ file: 'a', at: 1000 }, { file: 'b', at: 9000 }, { file: 'c', at: 20000 }]
  const hold = (t1: number, t2: number) => ({ audio, dissolves: [{ t1, t2, ms: 380 }] })

  it('accepts a long hold that ends before the next line', () => {
    expect(lateHolds(hold(6500, 8600))).toEqual([])
  })
  it('accepts a long hold that runs a little into the next line', () => {
    expect(lateHolds(hold(7000, 9300))).toEqual([])
  })
  it('flags a long hold still on screen well into the next line', () => {
    expect(lateHolds(hold(8000, 10000))).toEqual([{ at: 8000, overrunMs: 1000 }])
  })
  it('never flags a short hold, wherever it falls', () => {
    expect(lateHolds(hold(8900, 9800))).toEqual([])
  })
  it('measures against the first line that starts after the hold began', () => {
    expect(lateHolds(hold(9500, 21000))).toEqual([{ at: 9500, overrunMs: 1000 }])
  })
  it('accepts a long hold after the last line', () => {
    expect(lateHolds(hold(21000, 26000))).toEqual([])
  })
  it('accepts anything in a silent video', () => {
    expect(lateHolds({ audio: [], dissolves: [{ t1: 0, t2: 9000, ms: 380 }] })).toEqual([])
  })
  it('reports each late hold', () => {
    const r = lateHolds({ audio, dissolves: [{ t1: 8000, t2: 10000, ms: 380 }, { t1: 1500, t2: 1900, ms: 380 }, { t1: 18000, t2: 21500, ms: 380 }] })
    expect(r.map((h) => h.at)).toEqual([8000, 18000])
  })
  it('does not depend on the order of the narration clips', () => {
    expect(lateHolds({ audio: [...audio].reverse(), dissolves: [{ t1: 8000, t2: 10000, ms: 380 }] })).toHaveLength(1)
  })
  it('has nothing to say with no dissolves', () => {
    expect(lateHolds({ audio, dissolves: [] })).toEqual([])
  })
})

describe('bannedHits', () => {
  const take = { seen: [{ id: 'one', text: 'Orders for ACME Ltd\nPart 7' }, { id: 'two', text: 'All clear' }] }

  it('finds a word whatever its case', () => {
    expect(bannedHits(take, ['acme'])).toEqual(['one: acme'])
    expect(bannedHits(take, ['AcMe LTD'])).toEqual(['one: AcMe LTD'])
  })
  it('finds a pattern', () => {
    expect(bannedHits(take, [/clear$/])).toEqual(['two: /clear$/'])
  })
  it('names every scene a term appears in', () => {
    expect(bannedHits({ seen: [{ id: 'a', text: 'Acme' }, { id: 'b', text: 'acme again' }] }, ['acme'])).toEqual(['a: acme', 'b: acme'])
  })
  it('reports each term found in one scene', () => {
    expect(bannedHits(take, ['acme', 'part 7'])).toEqual(['one: acme', 'one: part 7'])
  })
  it('finds nothing when nothing is banned', () => {
    expect(bannedHits(take, [])).toEqual([])
  })
  it('finds nothing when the terms are absent', () => {
    expect(bannedHits(take, ['globex', /zzz/])).toEqual([])
  })
  it('finds nothing when no scene was sampled', () => {
    expect(bannedHits({ seen: [] }, ['acme'])).toEqual([])
  })
})

describe('printChecks', () => {
  it('prints a line per check and says whether all passed', () => {
    const lines: string[] = []
    const ok = printChecks([{ name: 'picture', ok: true, detail: 'fine' }, { name: 'length', ok: true, detail: '30 s' }], (l) => lines.push(l))
    expect(ok).toBe(true)
    expect(lines[0]).toMatch(/^ok\s+picture\s+fine$/)
    expect(lines[1]).toMatch(/^ok\s+length\s+30 s$/)
  })
  it('marks a failed check and returns false', () => {
    const lines: string[] = []
    expect(printChecks([{ name: 'a', ok: true, detail: '' }, { name: 'loudness', ok: false, detail: 'too quiet' }], (l) => lines.push(l))).toBe(false)
    expect(lines[1]).toMatch(/^FAIL\s+loudness\s+too quiet$/)
  })
  it('always ends by saying that the sound was not listened to', () => {
    const lines: string[] = []
    printChecks([], (l) => lines.push(l))
    expect(lines.at(-1)).toMatch(/not checked.*sound.*Listen once/i)
  })
})

describe('verify', () => {
  let dir: string
  const scene = { id: 's1', say: 'Hello.', run: async () => {} }
  const video = (over: object = {}) => resolveVideo({ name: 'v', baseUrl: 'http://h', scenes: [scene], ...over }, dir)
  const goodTake = (over: Partial<Take> = {}): Take => ({
    draft: false, frames: [], endMs: 30000,
    audio: [{ file: 'a.wav', at: 350 }],
    cues: [{ text: 'Hello.', start: 350, end: 1500 }],
    events: [], dissolves: [{ t1: 5000, t2: 5400, ms: 380 }],
    seen: [{ id: 's1', text: 'A harmless screen' }], missingFonts: [], ...over,
  })
  const probe = (over: { duration?: number; v?: object; audio?: boolean } = {}) => JSON.stringify({
    format: { duration: String(over.duration ?? 30) },
    streams: [
      { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, r_frame_rate: '30/1', ...over.v },
      ...(over.audio === false ? [] : [{ codec_type: 'audio', codec_name: 'aac' }]),
    ],
  })
  const tools = (probeJson = probe(), lufs = -16.1, peak = -1.2) => run.mockImplementation(async (cmd) =>
    cmd === 'ffprobe' ? probeJson : `{\n"input_i" : "${lufs}",\n"input_tp" : "${peak}"\n}`)
  const write = (take: Take | null, mp4 = true) => {
    fs.mkdirSync(path.join(dir, 'out'), { recursive: true })
    if (mp4) fs.writeFileSync(path.join(dir, 'out', 'v.mp4'), 'mp4')
    if (take) fs.writeFileSync(path.join(dir, 'out', 'v.take.json'), JSON.stringify(take))
  }
  const check = async (name: string, v = video()) => (await verify(v)).find((c) => c.name === name)!

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kav-verify-'))
    run.mockReset()
  })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('says so when nothing has been rendered', async () => {
    expect(await verify(video())).toEqual([{ name: 'render exists', ok: false, detail: 'nothing rendered yet for "v"' }])
    expect(run).not.toHaveBeenCalled()
  })
  it('says so when the video is there but its take is not', async () => {
    write(null)
    expect((await verify(video()))[0]!.name).toBe('render exists')
  })
  it('says so when the take is there but the video is not', async () => {
    write(goodTake(), false)
    expect((await verify(video()))[0]!.ok).toBe(false)
  })

  it('passes every check on a good render', async () => {
    write(goodTake()); tools()
    const checks = await verify(video())
    expect(checks.map((c) => c.name)).toEqual(['picture', 'length', 'loudness', 'captions', 'holds', 'banned text', 'fonts'])
    expect(checks.every((c) => c.ok)).toBe(true)
  })

  describe('picture', () => {
    it('reports codec, size and frame rate', async () => {
      write(goodTake()); tools()
      expect((await check('picture')).detail).toBe('h264 1920x1080 at 30/1 fps')
    })
    it.each([
      ['the wrong codec', { codec_name: 'vp9' }],
      ['the wrong width', { width: 1280 }],
      ['the wrong height', { height: 720 }],
      ['the wrong frame rate', { r_frame_rate: '25/1' }],
    ])('fails on %s', async (_what, v) => {
      write(goodTake()); tools(probe({ v }))
      expect((await check('picture')).ok).toBe(false)
    })
    it('checks against the layout of the video, not a fixed size', async () => {
      write(goodTake()); tools(probe({ v: { width: 1280, height: 720, r_frame_rate: '60/1' } }))
      expect((await check('picture', video({ layout: { width: 1280, height: 720, fps: 60 } }))).ok).toBe(true)
    })
  })

  describe('length', () => {
    it('passes with no target, and just reports the length', async () => {
      write(goodTake()); tools(probe({ duration: 176.7 }))
      expect(await check('length')).toEqual({ name: 'length', ok: true, detail: '176.7 s' })
    })
    it('passes inside the target', async () => {
      write(goodTake()); tools(probe({ duration: 90 }))
      const c = await check('length', video({ target: { minSec: 60, maxSec: 120 } }))
      expect(c.ok).toBe(true)
      expect(c.detail).toBe('90.0 s (target 60 to 120 s)')
    })
    it('passes exactly on either limit', async () => {
      write(goodTake()); tools(probe({ duration: 60 }))
      expect((await check('length', video({ target: { minSec: 60, maxSec: 60 } }))).ok).toBe(true)
    })
    it('fails when too short', async () => {
      write(goodTake()); tools(probe({ duration: 45 }))
      expect((await check('length', video({ target: { minSec: 60 } }))).ok).toBe(false)
    })
    it('fails when too long', async () => {
      write(goodTake()); tools(probe({ duration: 200 }))
      expect((await check('length', video({ target: { maxSec: 180 } }))).ok).toBe(false)
    })
    it('accepts a target with only one limit', async () => {
      write(goodTake()); tools(probe({ duration: 200 }))
      expect((await check('length', video({ target: { minSec: 60 } }))).ok).toBe(true)
    })
  })

  describe('loudness', () => {
    it('passes close to the target and reports the numbers', async () => {
      write(goodTake()); tools(probe(), -16.2, -1.4)
      const c = await check('loudness')
      expect(c.ok).toBe(true)
      expect(c.detail).toBe('-16.2 LUFS, peak -1.4 dBTP (target -16)')
    })
    it.each([[-17.5, true], [-14.5, true], [-17.6, false], [-14.4, false], [-23, false]])('%f LUFS against -16: ok is %s', async (lufs, ok) => {
      write(goodTake()); tools(probe(), lufs)
      expect((await check('loudness')).ok).toBe(ok)
    })
    it('measures against the target of the video', async () => {
      write(goodTake()); tools(probe(), -14)
      expect((await check('loudness', video({ sound: { lufs: -14 } }))).ok).toBe(true)
    })
    it('fails a voiced render that has no audio stream', async () => {
      write(goodTake()); tools(probe({ audio: false }))
      expect(await check('loudness')).toEqual({ name: 'loudness', ok: false, detail: 'no audio stream' })
    })
    it('is replaced by a note on a draft, which is silent by design', async () => {
      write(goodTake({ draft: true })); tools(probe({ audio: false }))
      const checks = await verify(video())
      expect(checks.find((c) => c.name === 'loudness')).toBeUndefined()
      expect(checks.find((c) => c.name === 'sound')).toEqual({ name: 'sound', ok: true, detail: 'draft render: no voice, music or effects' })
    })
  })

  describe('captions', () => {
    it('reports how many cues there are and the longest', async () => {
      write(goodTake({ cues: [{ text: 'abc', start: 0, end: 1 }, { text: 'abcdefgh', start: 1, end: 2 }] })); tools()
      expect((await check('captions')).detail).toBe('2 cues, longest 8 characters')
    })
    it('passes at exactly the two-line limit', async () => {
      write(goodTake({ cues: [{ text: 'x'.repeat(92), start: 0, end: 1 }] })); tools()
      expect((await check('captions')).ok).toBe(true)
    })
    it('fails a caption longer than two lines', async () => {
      write(goodTake({ cues: [{ text: 'x'.repeat(93), start: 0, end: 1 }] })); tools()
      expect((await check('captions')).ok).toBe(false)
    })
    it('passes a video with no captions', async () => {
      write(goodTake({ cues: [] })); tools()
      expect(await check('captions')).toEqual({ name: 'captions', ok: true, detail: '0 cues, longest 0 characters' })
    })
  })

  describe('holds', () => {
    it('passes and counts the dissolves', async () => {
      write(goodTake()); tools()
      expect((await check('holds')).detail).toBe('1 dissolves, none still holding when the next line starts')
    })
    it('fails, and says where and by how much, when a hold runs into the next line', async () => {
      write(goodTake({ audio: [{ file: 'a', at: 350 }, { file: 'b', at: 9000 }], dissolves: [{ t1: 8000, t2: 10250, ms: 380 }] })); tools()
      const c = await check('holds')
      expect(c.ok).toBe(false)
      expect(c.detail).toBe('the hold at 8.0 s runs 1250 ms into the next line')
    })
  })

  describe('banned text', () => {
    it('says when nothing is configured', async () => {
      write(goodTake()); tools()
      expect((await check('banned text')).detail).toBe('no banned terms configured')
    })
    it('passes when no banned term was on screen', async () => {
      write(goodTake()); tools()
      const c = await check('banned text', video({ banned: ['Acme', 'Globex'] }))
      expect(c).toEqual({ name: 'banned text', ok: true, detail: 'none of 2 banned terms on any screen' })
    })
    it('fails and names the scene and the term', async () => {
      write(goodTake({ seen: [{ id: 's1', text: 'Orders for Acme Ltd' }] })); tools()
      expect(await check('banned text', video({ banned: ['acme'] }))).toEqual({ name: 'banned text', ok: false, detail: 's1: acme' })
    })
  })

  describe('fonts', () => {
    it('passes when all loaded', async () => {
      write(goodTake()); tools()
      expect(await check('fonts')).toEqual({ name: 'fonts', ok: true, detail: 'all loaded' })
    })
    it('fails and names the faces that fell back', async () => {
      write(goodTake({ missingFonts: ['800 40px "Plus Jakarta Sans"'] })); tools()
      const c = await check('fonts')
      expect(c.ok).toBe(false)
      expect(c.detail).toContain('Plus Jakarta Sans')
    })
  })
})
