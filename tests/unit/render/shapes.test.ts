// Encoding and checking videos whose page is a window on a larger canvas.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Frame, Take } from '../../../src/core/types.ts'

const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>()
vi.mock('../../../src/core/util.ts', async (original) => ({ ...(await original<typeof import('../../../src/core/util.ts')>()), run }))

const { layoutFor } = await import('../../../src/brief/presets.ts')
const { encode } = await import('../../../src/render/encode.ts')
const { resolveVideo } = await import('../../../src/video/define.ts')
const { verify } = await import('../../../src/verify/verify.ts')

const VERTICAL = layoutFor('vertical')
const LOUDNORM = '{\n"input_i" : "-22",\n"input_tp" : "-6"\n}'
const frames = (...ts: number[]): Frame[] => ts.map((t) => ({ file: `f${t}.jpg`, t }))
const filterOf = (args: string[]) => args[args.indexOf('-filter_complex') + 1]!
const inputsOf = (args: string[]) => args.flatMap((a, i) => (a === '-i' ? [args[i + 1]!] : []))

let dir: string
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-shapes-'))
  run.mockReset()
  run.mockImplementation(async (_cmd, args) => (args.includes('loudnorm=print_format=json') ? LOUDNORM : ''))
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('encode: the picture input', () => {
  const input = (over: object = {}) => ({ frames: frames(0, 500), endMs: 2000, clips: [], layout: VERTICAL, outFile: path.join(dir, 'o.mp4'), workDir: dir, ...over })
  const last = () => run.mock.calls.at(-1)![1]

  it('writes the video at the size of the canvas, not of the filmed window', async () => {
    await encode(input())
    expect(filterOf(last())).toBe('[0:v]fps=30,scale=1080:1920,format=yuv420p[v]')
  })
  it('keeps one filter graph when filmed and drawn frames meet', async () => {
    // without this the caption track is lost at the first change of frame source
    await encode(input())
    const args = last()
    expect(args.indexOf('-reinit_filter')).toBeGreaterThan(-1)
    expect(args[args.indexOf('-reinit_filter') + 1]).toBe('0')
    expect(args.indexOf('-reinit_filter')).toBeLessThan(args.indexOf('-i'))
  })

  describe('with captions drawn on the canvas', () => {
    const images = [{ file: path.join('caps', 'c0000.png'), start: 300, end: 1500 }]

    it('lays the caption track over the picture, in the caption band', async () => {
      await encode(input({ captionImages: images }))
      expect(filterOf(last())).toBe('[0:v]fps=30,scale=1080:1920[base];[1:v]fps=30,format=rgba[cap];[base][cap]overlay=0:1286:eof_action=pass,format=yuv420p[v]')
    })
    it('reads the caption track as a second timed list', async () => {
      await encode(input({ captionImages: images }))
      expect(inputsOf(last())).toEqual([path.join(dir, 'frames.ffconcat'), path.join(dir, 'captions.ffconcat')])
      const track = fs.readFileSync(path.join(dir, 'captions.ffconcat'), 'utf8')
      expect(track).toContain('c0000.png')
      expect(track).toContain('duration 1.2000')
    })
    it('makes a clear picture of the band for the time between captions', async () => {
      await encode(input({ captionImages: images }))
      const blank = run.mock.calls[0]![1]
      expect(blank.join(' ')).toContain('color=c=black@0.0:s=1080x250,format=rgba')
      expect(blank.at(-1)).toBe(path.join(dir, 'caption-blank.png'))
    })
    it('takes the sound from the input after the caption track', async () => {
      await encode(input({ captionImages: images, clips: [{ file: 'a.wav', at: 350 }] }))
      const args = last()
      expect(inputsOf(args)).toHaveLength(3)
      expect(filterOf(args)).toContain('[2:a]volume=')
      expect(args).toEqual(expect.arrayContaining(['-map', '[v]', '-map', '[a]']))
    })
    it('takes the sound from the second input when there is no caption track', async () => {
      await encode(input({ clips: [{ file: 'a.wav', at: 350 }] }))
      expect(filterOf(last())).toContain('[1:a]volume=')
    })
  })
})

describe('verify: other shapes and read-only mode', () => {
  const scene = { id: 's1', say: 'Hello.', run: async () => {} }
  const video = (over: object = {}) => resolveVideo({ name: 'v', baseUrl: 'http://h', scenes: [scene], ...over }, dir)
  const take = (over: Partial<Take> = {}): Take => ({
    draft: false, frames: [], endMs: 30000, audio: [{ file: 'a.wav', at: 350 }], cues: [{ text: 'Hello.', start: 350, end: 1500 }],
    events: [], dissolves: [], seen: [{ id: 's1', text: 'A harmless screen' }], missingFonts: [], ...over,
  })
  const probe = (width: number, height: number) => JSON.stringify({
    format: { duration: '30' },
    streams: [{ codec_type: 'video', codec_name: 'h264', width, height, r_frame_rate: '30/1' }, { codec_type: 'audio', codec_name: 'aac' }],
  })
  const ready = (t: Take, width = 1920, height = 1080) => {
    fs.mkdirSync(path.join(dir, 'out'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'out', 'v.mp4'), 'mp4')
    fs.writeFileSync(path.join(dir, 'out', 'v.take.json'), JSON.stringify(t))
    run.mockImplementation(async (cmd) => (cmd === 'ffprobe' ? probe(width, height) : '{\n"input_i" : "-16.1",\n"input_tp" : "-1.2"\n}'))
  }
  const check = async (name: string, v = video()) => (await verify(v)).find((c) => c.name === name)

  it('checks the picture against the canvas of a framed video', async () => {
    ready(take(), 1080, 1920)
    expect((await check('picture', video({ layout: VERTICAL })))!.ok).toBe(true)
  })
  it('fails a framed video that came out at the size of its window', async () => {
    ready(take(), 1080, 1056)
    expect((await check('picture', video({ layout: VERTICAL })))!.ok).toBe(false)
  })
  it('does not mention read-only mode when it is off', async () => {
    ready(take())
    expect(await check('read-only')).toBeUndefined()
  })
  it('says nothing tried to change data when nothing did', async () => {
    ready(take())
    expect(await check('read-only', video({ readOnly: true }))).toEqual({ name: 'read-only', ok: true, detail: 'on, and nothing tried to change data' })
  })
  it('lists the requests it refused, and how to allow one', async () => {
    ready(take({ blocked: ['POST https://x.test/a', 'PUT https://x.test/b', 'DELETE https://x.test/c', 'POST https://x.test/d'] }))
    const c = (await check('read-only', video({ readOnly: { allow: [] } })))!
    expect(c.ok).toBe(true)
    expect(c.detail).toMatch(/refused 4 request\(s\) that could change data: POST https:\/\/x\.test\/a, PUT https:\/\/x\.test\/b, DELETE https:\/\/x\.test\/c, \.\.\./)
    expect(c.detail).toContain('"safety.allow"')
  })
})
