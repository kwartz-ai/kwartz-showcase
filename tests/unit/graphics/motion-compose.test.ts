import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Frame } from '../../../src/core/types.ts'

const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>(async () => '')
vi.mock('../../../src/core/util.ts', async (original) => ({ ...(await original<typeof import('../../../src/core/util.ts')>()), run }))

const { layoutFor } = await import('../../../src/brief/presets.ts')
const { defaultTheme, resolveTheme } = await import('../../../src/core/theme.ts')
const { BLUR_SAMPLES, frameTimes, motionDocument, textOf } = await import('../../../src/graphics/motion.ts')
const { captionDocument, captionTrack, composeFrames, windowFilter } = await import('../../../src/render/compose.ts')

const LANDSCAPE = layoutFor('landscape')
const VERTICAL = layoutFor('vertical')
const cue = (start: number, end: number, text = 'x') => ({ start, end, text })

beforeEach(() => run.mockClear())

describe('frameTimes', () => {
  it('photographs every frame while something moves', () => {
    expect(frameTimes(1000, 300, 10, null)).toEqual([0, 100, 200, 300])
  })
  it('photographs a still scene once', () => {
    expect(frameTimes(5000, 0, 10, null)).toEqual([0])
  })
  it('stops at the end of the scene when the movement outlasts it', () => {
    expect(frameTimes(300, 9999, 10, null)).toEqual([0, 100, 200])
  })
  it('adds a frame where a caption appears and where it goes', () => {
    expect(frameTimes(1000, 100, 10, [cue(500, 800)])).toEqual([0, 100, 500, 800])
  })
  it('puts a caption change on the next whole frame', () => {
    expect(frameTimes(1000, 0, 10, [cue(420, 760)])).toEqual([0, 500, 800])
  })
  it('adds nothing for a caption change inside the moving part or at the very end', () => {
    expect(frameTimes(1000, 600, 10, [cue(200, 1000)])).toEqual([0, 100, 200, 300, 400, 500, 600])
  })
  it('never repeats a time, and keeps them in order', () => {
    const times = frameTimes(2000, 200, 10, [cue(500, 900), cue(900, 1500)])
    expect(times).toEqual([...new Set(times)].sort((a, b) => a - b))
    expect(times).toEqual([0, 100, 200, 500, 900, 1500])
  })
  it('follows the frame rate', () => {
    expect(frameTimes(1000, 1000, 30, null)).toHaveLength(30)
    expect(frameTimes(1000, 1000, 60, null)).toHaveLength(60)
  })
})

describe('motionDocument', () => {
  it('is the size of the canvas, on the theme\'s dark colour', () => {
    const doc = motionDocument('<b>Hi</b>', VERTICAL, defaultTheme)
    expect(doc).toContain('width:1080px;height:1920px')
    expect(doc).toContain(`background:${defaultTheme.ink}`)
    expect(doc).toContain('<b>Hi</b>')
  })
  it('zooms a wide canvas as the app is zoomed, so cards match', () => {
    const doc = motionDocument('', LANDSCAPE, defaultTheme)
    expect(doc).toContain('html{zoom:1.25}')
    expect(doc).toContain('width:1536px;height:864px')
  })
  it('does not zoom a framed canvas', () => {
    expect(motionDocument('', VERTICAL, defaultTheme)).toContain('html{zoom:1}')
  })
  it('links the fonts, or nothing when there are none to link', () => {
    expect(motionDocument('', LANDSCAPE, defaultTheme)).toContain('<link rel="stylesheet"')
    expect(motionDocument('', LANDSCAPE, resolveTheme({ fontsCss: null }))).not.toContain('<link')
  })
  it('holds a caption that starts hidden', () => {
    expect(motionDocument('', LANDSCAPE, defaultTheme)).toMatch(/id="showcase-caption"[^>]*display:none/)
  })
  it('keeps every style attribute whole', () => {
    const doc = motionDocument('', LANDSCAPE, defaultTheme)
    for (const m of doc.matchAll(/style="([^"]*)"/g)) expect(m[1]).toMatch(/[;)a-z0-9]$/i)
    expect(doc.match(/style="/g)).toHaveLength(2)
  })
  it('blends four pictures into each blurred frame', () => {
    expect(BLUR_SAMPLES).toBe(4)
  })
})

describe('textOf', () => {
  it('gives the words a card shows', () => {
    expect(textOf('<div class="a"><h1>The file.</h1>\n<p>Again &amp; again</p></div>')).toBe('The file. Again & again')
  })
  it('leaves out style sheets', () => {
    expect(textOf('<style>.a{color:red}</style><p>Acme</p>')).toBe('Acme')
  })
  it('reads escaped characters as the viewer sees them', () => {
    expect(textOf('<p>&lt;b&gt; &quot;x&quot;</p>')).toBe('<b> "x"')
  })
})

describe('windowFilter', () => {
  it('scales a frame to its window and pads it out to the canvas in the dark colour', () => {
    expect(windowFilter(VERTICAL, '#0B1D35')).toBe('scale=1080:1056,pad=1080:1920:0:230:color=0x0B1D35')
  })
})

describe('composeFrames', () => {
  const frames: Frame[] = [{ file: '/app/f000000.jpg', t: 0 }, { file: '/motion/m00000.jpg', t: 500 }]
  it('leaves a fill layout alone', async () => {
    expect(await composeFrames(frames, LANDSCAPE, defaultTheme, '/app', '/out')).toBe(frames)
    expect(run).not.toHaveBeenCalled()
  })
  it('leaves a video with no filmed frames alone', async () => {
    const only = [frames[1]!]
    expect(await composeFrames(only, VERTICAL, defaultTheme, '/app', '/out')).toBe(only)
    expect(run).not.toHaveBeenCalled()
  })
})

describe('captionTrack', () => {
  const lines = (...a: Parameters<typeof captionTrack>) => captionTrack(...a).split('\n')
  it('shows each caption for its own time and nothing in between', () => {
    expect(lines([{ file: 'a.png', start: 1000, end: 2000 }], 3000, 'blank.png')).toEqual([
      'ffconcat version 1.0',
      "file 'blank.png'", 'duration 1.0000',
      "file 'a.png'", 'duration 1.0000',
      "file 'blank.png'", 'duration 1.0000',
      "file 'blank.png'",
    ])
  })
  it('puts no gap between captions that touch', () => {
    const out = lines([{ file: 'a.png', start: 0, end: 1000 }, { file: 'b.png', start: 1000, end: 2500 }], 2500, 'blank.png')
    expect(out).toEqual(['ffconcat version 1.0', "file 'a.png'", 'duration 1.0000', "file 'b.png'", 'duration 1.5000', "file 'blank.png'"])
  })
  it('sorts the captions by time', () => {
    const out = captionTrack([{ file: 'b.png', start: 2000, end: 3000 }, { file: 'a.png', start: 0, end: 1000 }], 3000, 'blank.png')
    expect(out.indexOf('a.png')).toBeLessThan(out.indexOf('b.png'))
  })
  it('cuts a caption that starts before the last one ended', () => {
    const out = lines([{ file: 'a.png', start: 0, end: 1000 }, { file: 'b.png', start: 600, end: 1600 }], 1600, 'blank.png')
    expect(out).toEqual(['ffconcat version 1.0', "file 'a.png'", 'duration 1.0000', "file 'b.png'", 'duration 0.6000', "file 'blank.png'"])
  })
  it('adds up to the length of the video', () => {
    const out = captionTrack([{ file: 'a.png', start: 352, end: 5019 }, { file: 'b.png', start: 6171, end: 8283 }], 25000, 'blank.png')
    const total = [...out.matchAll(/duration ([\d.]+)/g)].reduce((n, m) => n + Number(m[1]), 0)
    expect(total).toBeCloseTo(25, 3)
  })
  it('writes forward slashes, which FFmpeg needs on Windows', () => {
    expect(captionTrack([{ file: 'C:\\out\\a.png', start: 0, end: 1000 }], 1000, 'C:\\out\\blank.png')).not.toContain('\\')
  })
  it('is one blank picture when there are no captions', () => {
    expect(lines([], 2000, 'blank.png')).toEqual(['ffconcat version 1.0', "file 'blank.png'", 'duration 2.0000', "file 'blank.png'"])
  })
})

describe('captionDocument', () => {
  it('is the size of the caption band, with a clear background', () => {
    const doc = captionDocument('Hello', VERTICAL, defaultTheme)
    expect(doc).toContain('width:1080px;height:250px')
    expect(doc).toContain('background:transparent')
    expect(doc).toContain('>Hello<')
  })
  it('sizes the type for a phone, and follows the caption size setting', () => {
    expect(captionDocument('x', VERTICAL, defaultTheme)).toContain('font:600 44px/')
    expect(captionDocument('x', VERTICAL, resolveTheme({ captionScale: 1.2 }))).toContain('font:600 53px/')
  })
  it('escapes markup in the words', () => {
    expect(captionDocument('<script>x</script> & more', VERTICAL, defaultTheme)).toContain('&lt;script&gt;x&lt;/script&gt; &amp; more')
  })
})
