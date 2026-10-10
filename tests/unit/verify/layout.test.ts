// The layout check: after a render, is anything cut off, off screen or covered?
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Take } from '../../../src/core/types.ts'
import { fakeLocator, fakePage, settle } from '../../helpers.ts'

const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>()
vi.mock('../../../src/core/util.ts', async (original) => ({ ...(await original<typeof import('../../../src/core/util.ts')>()), run }))

const { layoutFor } = await import('../../../src/brief/presets.ts')
const { Stage } = await import('../../../src/capture/stage.ts')
const { defaultTheme } = await import('../../../src/core/theme.ts')
const { LAYOUT_MARGIN, graphicsArea, inspectInPage } = await import('../../../src/graphics/motion.ts')
const { verify } = await import('../../../src/verify/verify.ts')
const { resolveVideo } = await import('../../../src/video/define.ts')

const LANDSCAPE = layoutFor('landscape')
const VERTICAL = layoutFor('vertical')

describe('graphicsArea', () => {
  it('is the whole frame when captions are drawn in the page', () => {
    expect(graphicsArea(LANDSCAPE)).toEqual({ top: 0, bottom: 1 })
  })
  it('ends above the caption band, and starts below what a phone app covers, on a tall frame', () => {
    const a = graphicsArea(VERTICAL)
    expect(a.top).toBeCloseTo(230 / 1920)
    expect(a.bottom).toBeCloseTo(1286 / 1920)
  })
  it('keeps a small margin, so nothing may touch the edge of its area', () => {
    expect(LAYOUT_MARGIN).toBeGreaterThan(0)
    expect(LAYOUT_MARGIN).toBeLessThan(0.03)
  })
})

// A document just big enough for the inspector: boxes with a place, a style and text.
interface Fake { tag?: string; text?: string; rect: [number, number, number, number]; style?: Record<string, string>; kids?: Fake[] }
function page(kids: Fake[], caption: [number, number, number, number] | null = null) {
  const styles = new Map<object, Record<string, string>>()
  const box = ([x, y, w, h]: number[]) => ({ left: x!, top: y!, width: w!, height: h!, right: x! + w!, bottom: y! + h! })
  const build = (f: Fake, parent: object | null): Record<string, unknown> => {
    const el: Record<string, unknown> = {
      tagName: (f.tag ?? 'div').toUpperCase(), parentElement: parent, innerText: f.text ?? '', textContent: f.text ?? '',
      childNodes: f.text ? [{ nodeType: 3, textContent: f.text }] : [],
      getBoundingClientRect: () => box(f.rect),
    }
    styles.set(el, { display: 'block', visibility: 'visible', opacity: '1', borderTopWidth: '0px', boxShadow: 'none', ...f.style })
    el.all = (f.kids ?? []).flatMap((k) => { const c = build(k, el); return [c, ...(c.all as object[])] })
    return el
  }
  const scene = build({ rect: [0, 0, 1080, 1920], kids }, null)
  scene.querySelectorAll = () => scene.all
  const cap = caption ? { getBoundingClientRect: () => box(caption) } : null
  if (cap) styles.set(cap, { display: 'block' })
  vi.stubGlobal('document', { getElementById: (id: string) => (id === 'showcase-scene' ? scene : id === 'showcase-caption' ? cap : null) })
  vi.stubGlobal('getComputedStyle', (el: object) => styles.get(el))
}
const AREA = { top: 230 / 1920, bottom: 1286 / 1920, margin: LAYOUT_MARGIN, canvasH: 1920, canvasW: 1080 }
const inspect = (area = AREA) => inspectInPage(area)

describe('inspectInPage: a motion scene', () => {
  it('finds nothing wrong with text inside its area', () => {
    page([{ text: 'From a script to a video', rect: [140, 400, 800, 90] }])
    expect(inspect()).toEqual([])
  })
  it('finds a box that reaches into the caption band', () => {
    // the case that reached a person: the last card of a column ended on the band
    page([{ rect: [140, 1150, 800, 140], style: { borderTopWidth: '2px' }, kids: [{ text: 'Video', rect: [400, 1180, 280, 44] }] }])
    expect(inspect()).toEqual(['the box around "Video" is cut off or too close at the bottom, by 27 px'])
  })
  it('finds text that sits under the part a phone app covers', () => {
    page([{ text: 'HOW IT WORKS', rect: [400, 200, 280, 24] }])
    expect(inspect()[0]).toMatch(/"HOW IT WORKS" is cut off or too close at the top, by \d+ px/)
  })
  it('finds text that runs off either side', () => {
    page([{ text: 'A very long title', rect: [900, 600, 300, 60] }, { text: 'Left', rect: [-40, 700, 200, 60] }])
    const found = inspect().join(' | ')
    expect(found).toMatch(/"A very long title" runs off the right side, by \d+ px/)
    expect(found).toMatch(/"Left" runs off the left side, by \d+ px/)
  })
  it('counts something that only touches the edge of its area as too close', () => {
    page([{ text: 'Edge', rect: [400, 1240, 280, 46] }])        // ends exactly on the band
    expect(inspect()).toHaveLength(1)
  })
  it('ignores what the viewer cannot see', () => {
    page([
      { text: 'Hidden', rect: [400, 1500, 200, 60], style: { opacity: '0' } },
      { text: 'Gone', rect: [400, 1500, 200, 60], style: { display: 'none' } },
      { rect: [0, 1500, 500, 60], style: { opacity: '0.05' }, kids: [{ text: 'Faded parent', rect: [0, 1500, 200, 60] }] },
    ])
    expect(inspect()).toEqual([])
  })
  it('ignores a background that fills the frame, and decoration with no text', () => {
    page([{ rect: [0, 0, 1080, 1920], style: { boxShadow: '0 0 4px #000' }, kids: [{ text: 'Fine', rect: [400, 600, 200, 60] }] }, { rect: [0, 1800, 300, 20] }])
    expect(inspect()).toEqual([])
  })
  it('measures a drawing as well as text', () => {
    page([{ tag: 'svg', rect: [500, 1260, 60, 60] }])
    expect(inspect()[0]).toMatch(/a drawing is cut off or too close at the bottom/)
  })
  it('finds text the caption covers, where captions are drawn in the page', () => {
    page([{ text: 'Pitch centre in hertz', rect: [300, 950, 500, 30] }], [240, 940, 600, 80])
    expect(inspect({ ...AREA, top: 0, bottom: 1 })).toEqual(['the caption covers "Pitch centre in hertz"'])
  })
  it('does not mind a caption that is clear of everything', () => {
    page([{ text: 'Chart', rect: [300, 400, 500, 300] }], [240, 940, 600, 80])
    expect(inspect({ ...AREA, top: 0, bottom: 1 })).toEqual([])
  })
})

describe('Stage: a highlight that would not sit well', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  // the landscape page is 1536 x 864 after its zoom of 1.25; boxes are given in screen px
  const stage = (layout = LANDSCAPE) => new Stage(fakePage().page, layout, defaultTheme, () => 0)
  const at = (x: number, y: number, w = 250, h = 100) => fakeLocator({ x: x * 1.25, y: y * 1.25, width: w * 1.25, height: h * 1.25 })

  it('says nothing when the ring and its label are on screen', async () => {
    const s = stage()
    await settle(s.spotlight(at(400, 200), { label: 'Old date kept', side: 'below' }))
    expect(s.problems).toEqual([])
  })
  it('notices a ring that is partly off screen', async () => {
    const s = stage()
    await settle(s.spotlight(at(400, 800, 250, 200), { label: 'Totals' }))
    expect(s.problems[0]).toMatch(/the highlight "Totals" is partly off screen/)
  })
  it('notices a label that would be drawn off the side it was put on', async () => {
    const s = stage()
    await settle(s.spotlight(at(1300, 200, 200, 60), { label: 'A label that is quite long', side: 'right' }))
    expect(s.problems.join(' ')).toMatch(/the label "A label that is quite long" would be drawn partly off screen on the right side/)
  })
  it('notices a label above an element at the top of the page', async () => {
    const s = stage()
    await settle(s.spotlight(at(400, 10, 200, 40), { label: 'Above', side: 'above' }))
    expect(s.problems.join(' ')).toMatch(/"Above" would be drawn partly off screen on the above side/)
  })
  it('notices a highlight that the caption covers', async () => {
    const s = stage()
    await s.setCaption('A line of narration.')
    await settle(s.spotlight(at(600, 780, 300, 60)))
    expect(s.problems.join(' ')).toMatch(/the caption covers a highlight/)
  })
  it('does not look for the caption where captions are drawn below the product', async () => {
    const s = stage(VERTICAL)
    await s.setCaption('A line of narration.')
    await settle(s.spotlight(fakeLocator({ x: 300, y: 950, width: 300, height: 60 })))
    expect(s.problems.join(' ')).not.toMatch(/the caption covers/)
  })
})

describe('verify: the layout check', () => {
  let dir: string
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-layout-'))
    run.mockReset()
    run.mockImplementation(async (cmd) => (cmd === 'ffprobe'
      ? JSON.stringify({ format: { duration: '30' }, streams: [{ codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, r_frame_rate: '30/1' }, { codec_type: 'audio', codec_name: 'aac' }] })
      : '{\n"input_i" : "-16.1",\n"input_tp" : "-1.2"\n}'))
  })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))
  const check = async (layout?: Take['layout']) => {
    const video = resolveVideo({ name: 'v', baseUrl: 'http://h', scenes: [{ id: 's1', say: 'Hello.', run: async () => {} }] }, dir)
    const take: Take = {
      draft: false, frames: [], endMs: 30000, audio: [{ file: 'a.wav', at: 350 }], cues: [{ text: 'Hello.', start: 350, end: 1500 }],
      events: [], dissolves: [], seen: [{ id: 's1', text: 'ok' }], missingFonts: [], layout,
    }
    fs.mkdirSync(path.join(dir, 'out'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'out', 'v.mp4'), 'mp4')
    fs.writeFileSync(path.join(dir, 'out', 'v.take.json'), JSON.stringify(take))
    return (await verify(video)).find((c) => c.name === 'layout')
  }

  it('passes when everything was measured and nothing was found', async () => {
    expect(await check([])).toEqual({ name: 'layout', ok: true, detail: 'every graphic, label and caption sits inside its area' })
  })
  it('fails, naming the scene and the thing, when something is cut', async () => {
    const c = (await check([{ scene: 'pipeline', problem: 'the box around "Video" is cut off or too close at the bottom, by 24 px' }]))!
    expect(c.ok).toBe(false)
    expect(c.detail).toBe('1 thing(s) cut off, off screen or covered: in "pipeline", the box around "Video" is cut off or too close at the bottom, by 24 px')
  })
  it('lists the first three and counts the rest', async () => {
    const c = (await check(Array.from({ length: 5 }, (_, i) => ({ scene: `s${i}`, problem: `p${i}` }))))!
    expect(c.detail).toMatch(/^5 thing\(s\)/)
    expect(c.detail).toContain('in "s2", p2')
    expect(c.detail).not.toContain('p3')
    expect(c.detail).toMatch(/and 2 more \(see the render log\)$/)
  })
  it('is left out for a take made before the check existed', async () => {
    expect(await check(undefined)).toBeUndefined()
  })
})
