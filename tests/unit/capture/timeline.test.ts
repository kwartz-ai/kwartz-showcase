// The parts of the recorder and the stage that let one timeline hold both filmed
// scenes and scenes rendered off screen, in any shape of video.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layoutFor } from '../../../src/brief/presets.ts'
import { Recorder } from '../../../src/capture/recorder.ts'
import { Stage } from '../../../src/capture/stage.ts'
import { defaultTheme } from '../../../src/core/theme.ts'
import { fakePage, settle } from '../../helpers.ts'

const START = 1_700_000_000_000
let dir: string
beforeEach(() => {
  dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-timeline-')), 'frames')
  vi.useFakeTimers()
  vi.setSystemTime(START)
})
afterEach(() => {
  vi.useRealTimers()
  fs.rmSync(path.dirname(dir), { recursive: true, force: true })
})

describe('Recorder: pausing for a motion scene', () => {
  const started = async () => {
    const fake = fakePage()
    const rec = new Recorder(fake.page, dir, layoutFor('landscape'))
    await rec.start()
    return { ...fake, rec }
  }

  it('stops the clock while paused', async () => {
    const { rec } = await started()
    vi.advanceTimersByTime(500)
    rec.pause()
    vi.advanceTimersByTime(60_000)
    expect(rec.now()).toBe(500)
  })
  it('ignores the frames the browser sends while paused', async () => {
    const { rec, frame } = await started()
    rec.pause()
    frame(START + 100)
    expect(rec.frames).toEqual([])
    expect(fs.readdirSync(dir)).toEqual([])
  })
  it('starts again as much later as the motion scene lasts, whatever the wait was', async () => {
    const { rec, frame } = await started()
    vi.advanceTimersByTime(500)
    rec.pause()
    vi.advanceTimersByTime(90_000)          // rendering took a minute and a half
    rec.resume(3000)                        // the scene is three seconds of video
    expect(rec.now()).toBe(3500)
    vi.advanceTimersByTime(250)
    frame(Date.now())
    expect(rec.frames[0]!.t).toBe(3750)
  })
  it('adds up over several motion scenes', async () => {
    const { rec } = await started()
    for (const ms of [1000, 2000]) {
      vi.advanceTimersByTime(100)
      rec.pause()
      vi.advanceTimersByTime(5000)
      rec.resume(ms)
    }
    expect(rec.now()).toBe(3200)
  })
  it('does nothing when paused twice or resumed while running', async () => {
    const { rec } = await started()
    vi.advanceTimersByTime(100)
    rec.resume(5000)
    expect(rec.now()).toBe(100)
    rec.pause()
    vi.advanceTimersByTime(100)
    rec.pause()
    vi.advanceTimersByTime(100)
    rec.resume()
    expect(rec.now()).toBe(100)
  })
  it('puts frames made elsewhere on the timeline, in time order', async () => {
    const { rec, frame } = await started()
    frame(START + 100)
    frame(START + 900)
    rec.insert([{ file: 'm1.jpg', t: 500 }, { file: 'm0.jpg', t: 300 }])
    expect(rec.frames.map((f) => f.t)).toEqual([100, 300, 500, 900])
  })
  it('numbers filmed frames without gaps, whatever else is on the timeline', async () => {
    const { rec, frame } = await started()
    frame(START + 100)
    rec.insert([{ file: 'm0.jpg', t: 200 }, { file: 'm1.jpg', t: 300 }])
    frame(START + 400)
    const filmed = rec.frames.filter((f) => path.dirname(f.file) === dir).map((f) => path.basename(f.file))
    expect(filmed).toEqual(['f000000.jpg', 'f000001.jpg'])
    expect(fs.readdirSync(dir).sort()).toEqual(['f000000.jpg', 'f000001.jpg'])
  })
  it('films the window of the layout, not the canvas', async () => {
    let asked: { size?: { width: number; height: number } } = {}
    const fake = fakePage({ onStart: (o) => { asked = o as typeof asked } })
    await new Recorder(fake.page, dir, layoutFor('vertical')).start()
    expect(asked.size).toEqual({ width: 1080, height: 1056 })
  })
})

describe('Stage: other shapes', () => {
  let t0: number
  const clock = () => Date.now() - t0
  const make = (format: string) => {
    t0 = Date.now()
    const fake = fakePage()
    return { ...fake, stage: new Stage(fake.page, layoutFor(format), defaultTheme, clock) }
  }
  const px = (html: string, prop: string) => Number(html.match(new RegExp(`${prop}:\\s*([\\d.]+)px`))![1])

  it('draws nothing in the page when captions go on the canvas', async () => {
    const { stage, overlays } = make('vertical')
    await stage.setCaption('Hello there.')
    expect(overlays).toEqual([])
  })
  it('draws larger captions on a narrow page than on a wide one', async () => {
    const wide = make('landscape')
    await wide.stage.setCaption('Hello.')
    const narrow = make('square')
    await narrow.stage.setCaption('Hello.')
    const size = (html: string) => Number(html.match(/font:500 ([\d.]+)px/)![1])
    expect(size(narrow.live()[0]!.html)).toBeCloseTo(size(wide.live()[0]!.html) * 1.7)
  })
  it('keeps a caption inside a narrow page', async () => {
    const { stage, live } = make('square')
    await stage.setCaption('A long line of narration that would be wider than the page.')
    expect(px(live()[0]!.html, 'max-width')).toBeLessThanOrEqual(1080)
  })
  it('lifts the caption above the part a phone app covers', async () => {
    const l = layoutFor('vertical', 'fill')
    const fake = fakePage()
    const stage = new Stage(fake.page, l, defaultTheme, clock)
    await stage.setCaption('Hello.')
    expect(px(fake.live()[0]!.html, 'bottom')).toBeGreaterThanOrEqual(l.safe.bottom)
  })
})

describe('Stage: dissolves marked by the runner', () => {
  const make = () => {
    const fake = fakePage()
    const t0 = Date.now()
    return { ...fake, stage: new Stage(fake.page, layoutFor('landscape'), defaultTheme, () => Date.now() - t0) }
  }
  it('records the dissolve and its sound, placed where the blend starts', () => {
    const { stage } = make()
    stage.markDissolve(4000, 5000, 380)
    expect(stage.dissolves).toEqual([{ t1: 4000, t2: 5000, ms: 380 }])
    expect(stage.events).toEqual([{ t: 4620, kind: 'whoosh' }])
  })
  it('never places the sound before the video starts', () => {
    const { stage } = make()
    stage.markDissolve(0, 100, 380)
    expect(stage.events[0]!.t).toBe(0)
  })
  it('makes the page paint with a dot that is gone again afterwards', async () => {
    const { stage, overlays, live } = make()
    await settle(stage.nudge())
    expect(overlays).toHaveLength(1)
    expect(overlays[0]!.html).toContain('width:1px;height:1px')
    expect(live()).toEqual([])
  })
})
