// The rounded border: the picture set smaller on a backdrop, added at encode time.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Border, Frame } from '../../../src/core/types.ts'

const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>()
vi.mock('../../../src/core/util.ts', async (original) => ({ ...(await original<typeof import('../../../src/core/util.ts')>()), run }))

const { validateBrief } = await import('../../../src/brief/brief.ts')
const { layoutFor } = await import('../../../src/brief/presets.ts')
const { defineScenes, resolveBrief } = await import('../../../src/brief/resolve.ts')
const { DEFAULT_BORDER } = await import('../../../src/core/theme.ts')
const { backdropFilter, borderBox, borderFilter, buildBorder, maskFilter } = await import('../../../src/render/border.ts')
const { encode } = await import('../../../src/render/encode.ts')
const { resolveBorder, resolveVideo } = await import('../../../src/video/define.ts')

const LANDSCAPE = layoutFor('landscape')
const VERTICAL = layoutFor('vertical')
const BORDER: Border = { ...DEFAULT_BORDER }
const frames = (...ts: number[]): Frame[] => ts.map((t) => ({ file: `f${t}.jpg`, t }))
const filterOf = (args: string[]) => args[args.indexOf('-filter_complex') + 1]!
const inputsOf = (args: string[]) => args.flatMap((a, i) => (a === '-i' ? [args[i + 1]!] : []))

let dir: string
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-border-'))
  run.mockReset()
  run.mockImplementation(async (_cmd, args) => (args.includes('loudnorm=print_format=json') ? '{\n"input_i" : "-22",\n"input_tp" : "-6"\n}' : ''))
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('the default border', () => {
  it('is on, with a small inset, a soft corner and three backdrop colours', () => {
    expect(DEFAULT_BORDER.on).toBe(true)
    expect(DEFAULT_BORDER.inset).toBeGreaterThan(0)
    expect(DEFAULT_BORDER.inset).toBeLessThan(0.05)
    expect(DEFAULT_BORDER.colors).toHaveLength(3)
  })
})

describe('borderBox', () => {
  it('keeps the shape of the frame and centres the picture', () => {
    const b = borderBox(LANDSCAPE.canvas, BORDER)
    expect(b.width / b.height).toBeCloseTo(16 / 9, 1)
    expect(b.x * 2 + b.width).toBe(1920)
    expect(Math.abs(b.y * 2 + b.height - 1080)).toBeLessThanOrEqual(1)
  })
  it('gives sizes the encoder accepts: even numbers', () => {
    for (const layout of [LANDSCAPE, VERTICAL, layoutFor('square'), layoutFor('portrait'), layoutFor({ width: 802, height: 1002 })]) {
      const b = borderBox(layout.canvas, BORDER)
      expect(b.width % 2).toBe(0)
      expect(b.height % 2).toBe(0)
    }
  })
  it('makes the picture smaller by the inset on every side', () => {
    const b = borderBox(LANDSCAPE.canvas, { ...BORDER, inset: 0.05 })
    expect(b).toMatchObject({ x: 96, y: 54, width: 1728, height: 972 })
  })
  it('gives every shape the same corner', () => {
    const corner = (name: string) => borderBox(layoutFor(name).canvas, BORDER).radius
    expect(corner('landscape')).toBe(corner('vertical'))
    expect(corner('landscape')).toBe(corner('square'))
    expect(corner('landscape')).toBe(Math.round(1080 * BORDER.radius))
  })
  it('fills the frame when the inset is zero', () => {
    expect(borderBox(LANDSCAPE.canvas, { ...BORDER, inset: 0 })).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080 })
  })
})

describe('the pictures the border is made from', () => {
  const box = borderBox(LANDSCAPE.canvas, BORDER)
  it('draws the mask at the size of the picture, with its corner radius', () => {
    const f = maskFilter(box)
    expect(f).toContain(`nullsrc=s=${box.width}x${box.height},format=gray`)
    expect(f).toContain(`255*clip(${box.radius}+0.5-hypot(`)
  })
  it('keeps the mask expression inside quotes, so its commas are not read as filters', () => {
    expect(maskFilter(box)).toMatch(/geq=lum='[^']+'$/)
  })
  it('draws the backdrop small and scales it to the frame', () => {
    const f = backdropFilter(LANDSCAPE.canvas, BORDER.colors)
    expect(f).toContain('nullsrc=s=240x135,format=rgb24')
    expect(f).toContain('scale=1920:1080:flags=bicubic')
  })
  it('uses the three colours of the border', () => {
    // #1B2A8F is 27, 42, 143
    const f = backdropFilter(LANDSCAPE.canvas, ['#1B2A8F', '#000000', '#FFFFFF'])
    expect(f).toContain("r='(27+(0-27)*")
    expect(f).toContain("b='(143+(0-143)*")
    expect(f).toMatch(/\+255\*min\(1,/)
  })
  it('reads a three digit colour', () => {
    expect(backdropFilter(LANDSCAPE.canvas, ['#fff', '#000', '#000'])).toContain("r='(255+(0-255)*")
  })
  it('follows the shape of a tall frame', () => {
    expect(backdropFilter(VERTICAL.canvas, BORDER.colors)).toContain('nullsrc=s=135x240')
  })
})

describe('buildBorder', () => {
  it('draws the mask, then the backdrop with the shadow on it', async () => {
    const assets = await buildBorder(LANDSCAPE, BORDER, dir)
    expect(run).toHaveBeenCalledTimes(2)
    expect(assets).toMatchObject({ mask: path.join(dir, 'border-mask.png'), backdrop: path.join(dir, 'border-backdrop.png') })
    expect(run.mock.calls[0]![1].at(-1)).toBe(assets.mask)
    const second = run.mock.calls[1]![1]
    expect(second.at(-1)).toBe(assets.backdrop)
    expect(inputsOf(second)[1]).toBe(assets.mask)
  })
  it('puts the shadow under the picture, a little lower, at the strength asked for', async () => {
    const { box } = await buildBorder(LANDSCAPE, { ...BORDER, shadow: 0.3 }, dir)
    const f = filterOf(run.mock.calls[1]![1])
    expect(f).toContain(`pad=1920:1080:${box.x}:${box.y + 12}:black`)
    expect(f).toContain('lut=y=val*0.3')
    expect(f).toContain('alphamerge[shadow]')
  })
})

describe('borderFilter', () => {
  it('scales the picture, rounds it with the mask, and lays it on the backdrop', () => {
    const box = { x: 42, y: 24, width: 1836, height: 1032, radius: 37 }
    expect(borderFilter('flat', box, 1, 2)).toBe(
      '[flat]scale=1836:1032:flags=lanczos,format=rgba[inner];[inner][2:v]alphamerge[rounded];'
      + '[1:v][rounded]overlay=42:24:format=auto,format=yuv420p[v]')
  })
})

describe('encode with a border', () => {
  const input = (over: object = {}) => ({ frames: frames(0, 500), endMs: 2000, clips: [], layout: LANDSCAPE, outFile: path.join(dir, 'o.mp4'), workDir: dir, ...over })
  const last = () => run.mock.calls.at(-1)![1]

  it('leaves the picture filling the frame when there is no border', async () => {
    await encode(input())
    expect(filterOf(last())).toBe('[0:v]fps=30,scale=1920:1080,format=yuv420p[v]')
    expect(inputsOf(last())).toHaveLength(1)
  })
  it('leaves it filling the frame when the border is off', async () => {
    await encode(input({ border: { ...BORDER, on: false } }))
    expect(inputsOf(last())).toHaveLength(1)
  })
  it('adds the backdrop and the mask as looped still pictures', async () => {
    await encode(input({ border: BORDER }))
    const args = last()
    expect(inputsOf(args)).toEqual([path.join(dir, 'frames.ffconcat'), path.join(dir, 'border-backdrop.png'), path.join(dir, 'border-mask.png')])
    expect(args.filter((a) => a === '-loop')).toHaveLength(2)
  })
  it('ends the picture on the backdrop, still at the size of the frame', async () => {
    await encode(input({ border: BORDER }))
    const f = filterOf(last())
    expect(f).toMatch(/^\[0:v\]fps=30,scale=1920:1080,null\[flat\];\[flat\]scale=\d+:\d+/)
    expect(f).toMatch(/\[1:v\]\[rounded\]overlay=\d+:\d+:format=auto,format=yuv420p\[v\]$/)
    expect(f.match(/format=yuv420p/g)).toHaveLength(1)
  })
  it('keeps the length of the video: the still pictures never end on their own', async () => {
    await encode(input({ border: BORDER }))
    const args = last()
    expect(args[args.indexOf('-t') + 1]).toBe('2.000')
  })
  it('takes the sound from the input after the border pictures', async () => {
    await encode(input({ border: BORDER, clips: [{ file: 'a.wav', at: 350 }] }))
    expect(inputsOf(last())).toHaveLength(4)
    expect(filterOf(last())).toContain('[3:a]volume=')
  })
  it('works with captions drawn on the canvas: frames, captions, backdrop, mask, sound', async () => {
    await encode(input({ layout: VERTICAL, border: BORDER, captionImages: [{ file: 'c.png', start: 0, end: 1000 }], clips: [{ file: 'a.wav', at: 350 }] }))
    const f = filterOf(last())
    expect(inputsOf(last())).toHaveLength(5)
    expect(f).toContain('[base][cap]overlay=0:1286:eof_action=pass,null[flat]')
    expect(f).toContain('[inner][3:v]alphamerge[rounded]')
    expect(f).toContain('[2:v][rounded]overlay=')
    expect(f).toContain('[4:a]volume=')
  })
})

describe('the border in a video and in a config', () => {
  const scene = { id: 's1', say: 'Hello.', run: async () => {} }
  const video = (border?: unknown) => resolveVideo({ name: 'v', baseUrl: 'http://h', scenes: [scene], border } as never, dir)

  it('is on for every video unless turned off', () => {
    expect(video().border).toEqual(DEFAULT_BORDER)
    expect(video(true).border.on).toBe(true)
    expect(video(false).border.on).toBe(false)
  })
  it('lets a video change parts of it', () => {
    expect(video({ inset: 0.04 }).border).toEqual({ ...DEFAULT_BORDER, inset: 0.04 })
  })
  it('refuses sizes and colours that would not draw', () => {
    expect(() => resolveBorder({ inset: 0.6 })).toThrow(/"inset" must be between 0 and 0.2/)
    expect(() => resolveBorder({ radius: -1 })).toThrow(/"radius" must be between 0 and 0.2/)
    expect(() => resolveBorder({ colors: ['red', '#000', '#fff'] as never })).toThrow(/three hex colours/)
  })
  it('is rounded by default in a config, and can be turned off there', () => {
    const module = defineScenes({ scenes: [scene] })
    const of = (style?: object) => resolveBrief({ url: 'http://localhost', style }, dir, module).videos[0]!.video.border
    expect(of()).toEqual(DEFAULT_BORDER)
    expect(of({ border: 'rounded' }).on).toBe(true)
    expect(of({ border: 'none' }).on).toBe(false)
    expect(of({ backdrop: ['#111111', '#222222', '#333333'] })).toMatchObject({ on: true, colors: ['#111111', '#222222', '#333333'] })
  })
  it('checks the config settings', () => {
    expect(() => validateBrief({ url: 'http://localhost', style: { border: 'rounded', backdrop: ['#111', '#222', '#333'] } })).not.toThrow()
    expect(() => validateBrief({ url: 'http://localhost', style: { border: 'square' } })).toThrow(/"style.border" must be rounded or none/)
    expect(() => validateBrief({ url: 'http://localhost', style: { backdrop: ['#111', '#222'] } })).toThrow(/"style.backdrop" must be one of brand/)
    expect(() => validateBrief({ url: 'http://localhost', style: { backdrop: ['blue', '#222', '#333'] } })).toThrow(/"style.backdrop"/)
  })
})
