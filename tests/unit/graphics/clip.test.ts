// Clip scenes: a finished video file placed on the timeline.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>()
vi.mock('../../../src/core/util.ts', async (original) => ({ ...(await original<typeof import('../../../src/core/util.ts')>()), run }))

const { layoutFor } = await import('../../../src/brief/presets.ts')
const { defaultTheme } = await import('../../../src/core/theme.ts')
const { clipFilter, clipGraph, clipSceneMs, clipSound, clipSpec, probeClip, renderClip } = await import('../../../src/graphics/clip.ts')
const { backdropFilter, buildBorder, imageBackdropFilter } = await import('../../../src/render/border.ts')
const { DEFAULT_BORDER } = await import('../../../src/core/theme.ts')
const { resolveBorder, resolveVideo } = await import('../../../src/video/define.ts')

const LANDSCAPE = layoutFor('landscape')
const VERTICAL = layoutFor('vertical')
let dir: string
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-clip-'))
  run.mockReset()
  run.mockResolvedValue('')
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('clipSpec', () => {
  it('reads a path alone as the whole clip, inside the frame, silent', () => {
    expect(clipSpec('intro.mp4')).toEqual({ file: 'intro.mp4', fit: 'contain', sound: false, from: 0, seconds: null })
  })
  it('keeps what an object sets', () => {
    expect(clipSpec({ file: 'a.mp4', fit: 'cover', sound: true, from: 4, seconds: 6 })).toEqual({ file: 'a.mp4', fit: 'cover', sound: true, from: 4, seconds: 6 })
  })
})

describe('clipSceneMs', () => {
  const whole = { from: 0, seconds: null }
  it('lasts as long as the clip when nothing is said', () => {
    expect(clipSceneMs(8, whole, 0)).toBe(8000)
  })
  it('lasts as long as the narration when that is longer: the last frame holds', () => {
    expect(clipSceneMs(3, whole, 5200)).toBe(5200)
  })
  it('counts only the part of the clip that is used', () => {
    expect(clipSceneMs(60, { from: 40, seconds: 5 }, 0)).toBe(5000)
    expect(clipSceneMs(60, { from: 50, seconds: null }, 0)).toBe(10000)
  })
  it('never goes below zero when the start is past the end', () => {
    expect(clipSceneMs(5, { from: 9, seconds: null }, 0)).toBe(0)
  })
})

describe('clipFilter and clipGraph', () => {
  it('fits the whole clip inside the frame on the dark colour', () => {
    expect(clipFilter(LANDSCAPE, '#0B1D35', 'contain')).toBe(
      'fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0B1D35,setsar=1')
  })
  it('fills the frame and cuts the overflow when asked to cover', () => {
    expect(clipFilter(VERTICAL, '#0B1D35', 'cover')).toBe('fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1')
  })
  it('is the picture alone when there are no captions', () => {
    expect(clipGraph(LANDSCAPE, '#000000', 'contain', [])).toMatch(/^\[0:v\]fps=30.*\[c0\]$/)
  })
  it('lays each caption on for its own time', () => {
    const g = clipGraph(LANDSCAPE, '#000000', 'contain', [{ text: 'a', start: 350, end: 2100 }, { text: 'b', start: 2100, end: 4000 }])
    expect(g).toContain("[c0][1:v]overlay=enable='between(t,0.350,2.100)'[c1]")
    expect(g).toContain("[c1][2:v]overlay=enable='between(t,2.100,4.000)'[c2]")
  })
})

describe('probeClip', () => {
  const file = () => {
    const f = path.join(dir, 'a.mp4')
    fs.writeFileSync(f, 'mp4')
    return f
  }
  it('reads the length, the size and whether there is sound', async () => {
    run.mockResolvedValue(JSON.stringify({ format: { duration: '12.5' }, streams: [{ codec_type: 'video', width: 1280, height: 720 }, { codec_type: 'audio' }] }))
    expect(await probeClip(file())).toEqual({ seconds: 12.5, hasSound: true, width: 1280, height: 720 })
  })
  it('knows a silent clip', async () => {
    run.mockResolvedValue(JSON.stringify({ format: { duration: '3' }, streams: [{ codec_type: 'video', width: 640, height: 360 }] }))
    expect((await probeClip(file())).hasSound).toBe(false)
  })
  it('refuses a file with no picture, and a file that is not there', async () => {
    run.mockResolvedValue(JSON.stringify({ format: { duration: '3' }, streams: [{ codec_type: 'audio' }] }))
    await expect(probeClip(file())).rejects.toThrow(/has no picture/)
    await expect(probeClip(path.join(dir, 'missing.mp4'))).rejects.toThrow(/clip not found/)
  })
})

describe('renderClip', () => {
  const input = (over: object = {}) => ({ file: 'a.mp4', fit: 'contain' as const, from: 2, durationMs: 4000, cues: null, layout: LANDSCAPE, theme: defaultTheme, dir: path.join(dir, 'k'), ...over })
  const writesFrames = (n: number) => run.mockImplementation(async (_cmd, args) => {
    const out = args.at(-1)!
    for (let i = 0; i < n; i++) fs.writeFileSync(out.replace('%05d', String(i).padStart(5, '0')), 'jpg')
    return ''
  })
  const context = {} as never

  it('reads the clip from where it should start, for as long as the scene lasts', async () => {
    writesFrames(3)
    await renderClip(context, input())
    const args = run.mock.calls[0]![1]
    expect(args.slice(args.indexOf('-ss'), args.indexOf('-ss') + 4)).toEqual(['-ss', '2', '-i', 'a.mp4'])
    expect(args[args.indexOf('-t') + 1]).toBe('4.000')
    expect(args[args.indexOf('-map') + 1]).toBe('[c0]')
  })
  it('gives each frame its time on the scene, at the frame rate', async () => {
    writesFrames(4)
    const frames = await renderClip(context, input())
    expect(frames.map((f) => f.t)).toEqual([0, 33.333, 66.667, 100])
    expect(path.basename(frames[0]!.file)).toBe('k00000.jpg')
  })
  it('says so when nothing could be read', async () => {
    await expect(renderClip(context, input())).rejects.toThrow(/no frames could be read from a\.mp4/)
  })
  it('takes the clip\'s own sound for the same stretch', async () => {
    const out = await clipSound('a.mp4', 2, 4000, dir)
    expect(out).toBe(path.join(dir, 'sound.wav'))
    const args = run.mock.calls[0]![1]
    expect(args).toEqual(expect.arrayContaining(['-ss', '2', '-vn', '-t', '4.000']))
  })
})

describe('a clip in a video file', () => {
  const run1 = async () => {}
  const video = (scenes: object[]) => resolveVideo({ name: 'v', baseUrl: 'http://h', scenes } as never, dir)
  beforeEach(() => fs.writeFileSync(path.join(dir, 'b.mp4'), 'mp4'))

  it('is a third kind of scene', () => {
    expect(video([{ id: 'a', say: 'Hello.', clip: 'b.mp4' }]).scenes[0]!.clip).toBe('b.mp4')
  })
  it('may have nothing to say', () => {
    expect(() => video([{ id: 'a', say: '', clip: { file: 'b.mp4', sound: true } }])).not.toThrow()
  })
  it('still requires a line from the other kinds of scene', () => {
    expect(() => video([{ id: 'a', say: '', run: run1 }])).toThrow(/has no "say" line/)
  })
  it('refuses a scene that is two kinds at once, or none', () => {
    expect(() => video([{ id: 'a', say: 'x', run: run1, clip: 'b.mp4' }])).toThrow(/exactly one of "run".*"motion".*"clip"/)
    expect(() => video([{ id: 'a', say: 'x' }])).toThrow(/exactly one of/)
  })
  it('says which file is missing before anything is rendered', () => {
    expect(() => video([{ id: 'a', say: 'x', clip: 'nope.mp4' }])).toThrow(/scene "a": the clip .*nope\.mp4 does not exist/)
  })
})

describe('backdrop patterns and pictures', () => {
  const C = DEFAULT_BORDER.colors
  it('draws glows by default, ribbons for waves, and nothing for plain', () => {
    expect(backdropFilter(LANDSCAPE.canvas, C)).toContain('exp(-(pow(X-')
    expect(backdropFilter(LANDSCAPE.canvas, C, 'waves')).toContain('pow(0.5+0.5*sin(Y/')
    const plain = backdropFilter(LANDSCAPE.canvas, C, 'plain')
    expect(plain).not.toContain('sin(')
    expect(plain).not.toContain('exp(')
  })
  it('keeps ribbons sharper than glows', () => {
    const blur = (f: string) => Number(f.match(/gblur=sigma=(\d+)/)![1])
    expect(blur(backdropFilter(LANDSCAPE.canvas, C, 'waves'))).toBeLessThan(blur(backdropFilter(LANDSCAPE.canvas, C, 'glow')))
  })
  it('scales a picture to cover the frame', () => {
    expect(imageBackdropFilter(VERTICAL.canvas)).toBe('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1')
  })
  it('uses the picture in place of the drawn backdrop, with the shadow still on it', async () => {
    await buildBorder(LANDSCAPE, { ...DEFAULT_BORDER, image: '/x/wall.jpg' }, dir)
    const args = run.mock.calls[1]![1]
    expect(args.slice(args.indexOf('-i'), args.indexOf('-i') + 2)).toEqual(['-i', '/x/wall.jpg'])
    expect(args).not.toContain('lavfi')
    const graph = args[args.indexOf('-filter_complex') + 1]!
    expect(graph).toContain('[0:v]scale=1920:1080:force_original_aspect_ratio=increase')
    expect(graph).toContain('[bg][shadow]overlay')
  })
  it('follows the pattern of the border when it draws the backdrop', async () => {
    await buildBorder(LANDSCAPE, { ...DEFAULT_BORDER, pattern: 'waves' }, dir)
    expect(run.mock.calls[1]![1].join(' ')).toContain('pow(0.5+0.5*sin(Y/')
  })
  it('refuses a pattern it does not know', () => {
    expect(() => resolveBorder({ pattern: 'dots' as never })).toThrow(/"pattern" must be glow, waves or plain/)
    expect(resolveBorder({ pattern: 'waves' }).pattern).toBe('waves')
  })
})
