import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Stage } from '../src/stage.ts'
import { defaultTheme } from '../src/theme.ts'
import type { Layout } from '../src/types.ts'
import { fakeLocator, fakePage, settle } from './helpers.ts'

const LAYOUT: Layout = { width: 1920, height: 1080, zoom: 1.25, fps: 30 }
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

let t0: number
const clock = () => Date.now() - t0
const make = (opts: Parameters<typeof fakePage>[0] = {}, appRoot: string | null = null, layout = LAYOUT) => {
  const fake = fakePage(opts)
  return { ...fake, stage: new Stage(fake.page, layout, defaultTheme, clock, appRoot) }
}
/** left/top (or another pair) of the first element with a fixed position in an overlay. */
const pos = (html: string, a = 'left', b = 'top') => {
  const style = html.match(/position:fixed;([^"]*)/)![1]!
  const num = (k: string) => Number(style.match(new RegExp(`(?:^|;)${k}:(-?[\\d.]+)px`))?.[1])
  return [num(a), num(b)]
}

beforeEach(() => {
  vi.useFakeTimers()
  t0 = Date.now()
})
afterEach(() => vi.useRealTimers())

describe('pointer', () => {
  it('scrolls the element into view before measuring it', async () => {
    const { stage } = make()
    const el = fakeLocator()
    await settle(stage.moveTo(el))
    expect(el.scrollIntoViewIfNeeded).toHaveBeenCalledBefore(el.boundingBox)
  })

  it('lands on the centre of the element, in layout pixels', async () => {
    const { stage, overlays } = make()
    await settle(stage.moveTo(fakeLocator({ x: 1000, y: 500, width: 200, height: 100 })))
    // window (1100, 550) divided by the 1.25 zoom
    expect(pos(overlays[0]!.html)).toEqual([880, 440])
  })

  it('starts its first glide from the middle of the screen', async () => {
    const { stage, overlays } = make()
    await settle(stage.moveTo(fakeLocator()))
    expect(overlays[0]!.html).toContain('from{left:768px;top:432px}')
  })

  it('starts each later glide where the last one ended', async () => {
    const { stage, overlays } = make()
    await settle(stage.moveTo(fakeLocator({ x: 1000, y: 500, width: 200, height: 100 })))
    await settle(stage.moveTo(fakeLocator({ x: 0, y: 0, width: 100, height: 100 })))
    expect(overlays[1]!.html).toContain('from{left:880px;top:440px}to{left:40px;top:40px}')
  })

  it('follows the zoom of the layout', async () => {
    const { stage, overlays } = make({}, null, { ...LAYOUT, zoom: 2 })
    await settle(stage.moveTo(fakeLocator({ x: 1000, y: 500, width: 200, height: 100 })))
    expect(pos(overlays[0]!.html)).toEqual([550, 275])
    expect(overlays[0]!.html).toContain('from{left:480px;top:270px}')
  })

  it('leaves only one pointer on screen', async () => {
    const { stage, live } = make()
    await settle(stage.moveTo(fakeLocator()))
    await settle(stage.moveTo(fakeLocator()))
    expect(live()).toHaveLength(1)
  })

  it('takes as long as its glide, plus a beat', async () => {
    const { stage } = make()
    await settle(stage.moveTo(fakeLocator(), { ms: 400 }))
    expect(clock()).toBe(480)
  })

  it('shows no click and makes no sound when it only moves', async () => {
    const { stage, overlays } = make()
    await settle(stage.moveTo(fakeLocator()))
    expect(overlays[0]!.html).not.toContain('animation:kavclk')
    expect(stage.events).toEqual([])
  })

  it('draws the pointer in the theme colours', async () => {
    const { stage, overlays } = make()
    await settle(stage.click(fakeLocator()))
    expect(overlays[0]!.html).toContain(`background:${defaultTheme.ink}`)
    expect(overlays[0]!.html).toContain(`background:${defaultTheme.accent}`)
  })

  it('says what is wrong when the element has no box', async () => {
    const { stage } = make()
    await expect(stage.moveTo(fakeLocator(null))).rejects.toThrow(/pointer: the element has no box/)
  })
})

describe('click', () => {
  it('glides first, then clicks', async () => {
    const { stage } = make()
    const el = fakeLocator()
    const p = stage.click(el)
    await vi.advanceTimersByTimeAsync(600)
    expect(el.click).not.toHaveBeenCalled()
    await settle(p)
    expect(el.click).toHaveBeenCalledOnce()
  })

  it('shows a ripple timed to the end of the glide', async () => {
    const { stage, overlays } = make()
    await settle(stage.click(fakeLocator(), { ms: 300 }))
    expect(overlays[0]!.html).toContain('animation:kavclk 420ms ease-out 300ms forwards')
  })

  it('logs a click sound for the moment the pointer arrives', async () => {
    const { stage } = make()
    await vi.advanceTimersByTimeAsync(1000)
    await settle(stage.click(fakeLocator()))
    expect(stage.events).toEqual([{ t: 1550, kind: 'click' }])
  })
})

describe('dissolve', () => {
  it('marks the moment before the change and the moment after', async () => {
    const { stage } = make()
    await vi.advanceTimersByTimeAsync(2000)
    await settle(stage.dissolve(() => sleep(1000)))
    expect(stage.dissolves).toEqual([{ t1: 2000, t2: 3160, ms: 380 }])
  })

  it('lasts at least as long as its own blend when the change is instant', async () => {
    const { stage } = make()
    await settle(stage.dissolve(async () => {}))
    expect(stage.dissolves[0]).toEqual({ t1: 0, t2: 380, ms: 380 })
  })

  it('always waits a moment after the change, so the new screen has painted', async () => {
    const { stage } = make()
    await settle(stage.dissolve(() => sleep(5000)))
    expect(stage.dissolves[0]!.t2).toBe(5160)
  })

  it('takes a custom blend length', async () => {
    const { stage } = make()
    await settle(stage.dissolve(async () => {}, { ms: 800 }))
    expect(stage.dissolves[0]).toEqual({ t1: 0, t2: 800, ms: 800 })
  })

  it('logs its sound for the start of the blend, not the start of the wait', async () => {
    const { stage } = make()
    await settle(stage.dissolve(() => sleep(3000)))
    expect(stage.events).toEqual([{ t: 3160 - 380, kind: 'whoosh' }])
  })

  it('records each dissolve in order', async () => {
    const { stage } = make()
    await settle(stage.dissolve(async () => {}))
    await settle(stage.dissolve(async () => {}))
    expect(stage.dissolves.map((d) => d.t1)).toEqual([0, 380])
  })

  it('records nothing when the change fails', async () => {
    const { stage } = make()
    await expect(stage.dissolve(async () => { throw new Error('nav failed') })).rejects.toThrow('nav failed')
    expect(stage.dissolves).toEqual([])
    expect(stage.events).toEqual([])
  })
})

describe('cut', () => {
  it('moves the pointer, clicks, and waits for the new screen, in that order', async () => {
    const { stage } = make()
    const el = fakeLocator()
    const order: string[] = []
    el.click.mockImplementation(async () => { order.push('click') })
    await settle(stage.cut(el, async () => { order.push('ready') }))
    expect(order).toEqual(['click', 'ready'])
  })

  it('starts the dissolve only once the pointer has arrived', async () => {
    const { stage } = make()
    await settle(stage.cut(fakeLocator(), async () => {}))
    expect(stage.dissolves[0]!.t1).toBe(630)
  })

  it('holds the old screen for as long as the new one takes to load', async () => {
    const { stage } = make()
    await settle(stage.cut(fakeLocator(), () => sleep(2000)))
    const d = stage.dissolves[0]!
    expect(d.t2 - d.t1).toBe(2160)
  })

  it('logs a click and then a dissolve sound', async () => {
    const { stage } = make()
    await settle(stage.cut(fakeLocator(), async () => {}))
    expect(stage.events.map((e) => e.kind)).toEqual(['click', 'whoosh'])
  })

  it('shows no ripple, because the frozen frame would hold it still', async () => {
    const { stage, overlays } = make()
    await settle(stage.cut(fakeLocator(), async () => {}))
    expect(overlays[0]!.html).not.toContain('animation:kavclk')
  })
})

describe('captions', () => {
  it('shows the text', async () => {
    const { stage, live } = make()
    await stage.setCaption('Hello there.')
    expect(live()[0]!.html).toContain('>Hello there.</div>')
  })
  it('escapes markup in the text', async () => {
    const { stage, live } = make()
    await stage.setCaption('a < b & "c"')
    expect(live()[0]!.html).toContain('a &lt; b &amp; &quot;c&quot;')
  })
  it('replaces the caption before it', async () => {
    const { stage, live } = make()
    await stage.setCaption('One')
    await stage.setCaption('Two')
    expect(live().map((o) => o.html.match(/>(\w+)<\/div>/)![1])).toEqual(['Two'])
  })
  it('clears on null', async () => {
    const { stage, live } = make()
    await stage.setCaption('One')
    await stage.setCaption(null)
    expect(live()).toEqual([])
  })
  it('balances its lines and uses the text face', async () => {
    const { stage, live } = make()
    await stage.setCaption('x')
    expect(live()[0]!.html).toContain('text-wrap:balance')
    expect(live()[0]!.html).toContain(defaultTheme.type.text)
  })
  it('keeps its style attribute intact', async () => {
    const { stage, live } = make()
    await stage.setCaption('x')
    expect(live()[0]!.html.match(/style="[^"]*box-shadow[^"]*"/)).not.toBeNull()
  })
})

describe('spotlight', () => {
  const el = () => fakeLocator({ x: 500, y: 250, width: 250, height: 125 })   // layout: 400,200 200x100
  const ring = (html: string) => {
    const s = html.match(/<div style="position:fixed;([^"]*)"/)![1]!
    const n = (k: string) => Number(s.match(new RegExp(`${k}:(-?[\\d.]+)px`))![1])
    return { left: n('left'), top: n('top'), width: n('width'), height: n('height') }
  }
  const label = (html: string) => html.match(/<div style="position:fixed;([^"]*?);max-width:340px/)?.[1]

  it('rings the element with padding around it', async () => {
    const { stage, overlays } = make()
    await stage.spotlight(el(), { pad: 10 })
    expect(ring(overlays[0]!.html)).toEqual({ left: 390, top: 190, width: 220, height: 120 })
  })
  it('pads by 6 pixels unless told otherwise', async () => {
    const { stage, overlays } = make()
    await stage.spotlight(el())
    expect(ring(overlays[0]!.html)).toEqual({ left: 394, top: 194, width: 212, height: 112 })
  })
  it('dims everything else with a huge shadow', async () => {
    const { stage, overlays } = make()
    await stage.spotlight(el())
    expect(overlays[0]!.html).toContain('box-shadow:0 0 0 9999px')
  })
  it('draws the ring in the accent colour', async () => {
    const { stage, overlays } = make()
    await stage.spotlight(el())
    expect(overlays[0]!.html).toContain(`border:2.5px solid ${defaultTheme.accent}`)
  })

  it.each([
    ['below', 'left:394px;top:318px'],
    ['above', `left:394px;bottom:${864 - 194 + 12}px`],
    ['right', 'left:620px;top:194px'],
    ['left', `right:${1536 - 394 + 14}px;top:194px`],
  ] as const)('places the label %s the element', async (side, where) => {
    const { stage, overlays } = make()
    await stage.spotlight(el(), { label: 'Why it matters', side })
    expect(label(overlays[0]!.html)).toBe(where)
  })
  it('puts the label below by default', async () => {
    const { stage, overlays } = make()
    await stage.spotlight(el(), { label: 'L' })
    expect(label(overlays[0]!.html)).toBe('left:394px;top:318px')
  })
  it('escapes markup in the label', async () => {
    const { stage, overlays } = make()
    await stage.spotlight(el(), { label: '<b>bold</b>' })
    expect(overlays[0]!.html).toContain('&lt;b&gt;bold&lt;/b&gt;')
  })
  it('has no label, and makes no sound, without one', async () => {
    const { stage, overlays } = make()
    await stage.spotlight(el())
    expect(label(overlays[0]!.html)).toBeUndefined()
    expect(stage.events).toEqual([])
  })
  it('logs a callout sound for when the label appears', async () => {
    const { stage } = make()
    await vi.advanceTimersByTimeAsync(4000)
    await stage.spotlight(el(), { label: 'L' })
    expect(stage.events).toEqual([{ t: 4180, kind: 'callout' }])
  })
  it('replaces the spotlight before it', async () => {
    const { stage, live } = make()
    await stage.spotlight(el())
    await stage.spotlight(el(), { label: 'second' })
    expect(live()).toHaveLength(1)
    expect(live()[0]!.html).toContain('second')
  })

  // overlays stack in the order they are made, and the spotlight dims what is under it
  it('draws the caption again so it stays on top and fully lit', async () => {
    const { stage, live } = make()
    await stage.setCaption('Still readable')
    await stage.spotlight(el())
    expect(live()).toHaveLength(2)
    expect(live()[1]!.html).toContain('Still readable')
    expect(live()[0]!.html).toContain('9999px')
  })
  it('makes no caption when there was none', async () => {
    const { stage, live } = make()
    await stage.spotlight(el())
    expect(live()).toHaveLength(1)
  })
  it('clearSpot removes it and is safe to call twice', async () => {
    const { stage, live } = make()
    await stage.spotlight(el())
    await stage.clearSpot()
    await stage.clearSpot()
    expect(live()).toEqual([])
  })
  it('says what is wrong when the element has no box', async () => {
    const { stage } = make()
    await expect(stage.spotlight(fakeLocator(null))).rejects.toThrow(/spotlight: the element has no box/)
  })
})

describe('camera', () => {
  const el = () => fakeLocator({ x: 1000, y: 500, width: 200, height: 100 })   // centre in layout px: 880, 440

  it('scales the app root toward the centre of the element', async () => {
    const { stage, evaluations } = make()
    await settle(stage.zoomTo(el(), { scale: 1.5, ms: 600 }))
    expect(evaluations[0]!.arg).toMatchObject({ sel: '#root', ox: 880, oy: 440, scale: 1.5, ms: 600 })
  })
  it('measures the origin from the root, wherever the root sits', async () => {
    const { stage, evaluations } = make({ roots: { '#root': { x: 250, y: 125, width: 1000, height: 800 } } })
    await settle(stage.zoomTo(el()))
    expect(evaluations[0]!.arg).toMatchObject({ ox: 880 - 200, oy: 440 - 100 })
  })
  it('zooms by 1.45 over 650 ms unless told otherwise', async () => {
    const { stage, evaluations } = make()
    await settle(stage.zoomTo(el()))
    expect(evaluations[0]!.arg).toMatchObject({ scale: 1.45, ms: 650 })
    expect(clock()).toBe(710)
  })
  it.each(['#root', '#app', '#__next', '#__nuxt', 'main'])('finds the app root %s by itself', async (sel) => {
    const { stage, evaluations } = make({ roots: { [sel]: { x: 0, y: 0, width: 1920, height: 1080 } } })
    await settle(stage.zoomTo(el()))
    expect(evaluations[0]!.arg).toMatchObject({ sel })
  })
  it('prefers the configured root over a guess', async () => {
    const { stage, evaluations } = make({ roots: { '#root': { x: 0, y: 0, width: 1, height: 1 }, '.shell': { x: 0, y: 0, width: 1920, height: 1080 } } }, '.shell')
    await settle(stage.zoomTo(el()))
    expect(evaluations[0]!.arg).toMatchObject({ sel: '.shell' })
  })
  it('explains how to fix it when no root can be found', async () => {
    const { stage } = make({ roots: {} })
    await expect(stage.zoomTo(el())).rejects.toThrow(/could not find the app's root element.*appRoot/s)
  })
  it('zoomOut does nothing when the camera has not moved', async () => {
    const { stage, evaluations } = make()
    await settle(stage.zoomOut())
    expect(evaluations).toEqual([])
    expect(clock()).toBe(0)
  })
  it('zoomOut returns, then removes the transform so fixed drawers anchor normally again', async () => {
    const { stage, evaluations } = make()
    await settle(stage.zoomTo(el()))
    await settle(stage.zoomOut({ ms: 500 }))
    expect(evaluations).toHaveLength(3)
    expect(clock()).toBe(710 + 560)
  })
  it('applies the transform in the page, and takes every trace of it away afterwards', async () => {
    // run the three scripts the stage sends to the page against a stand-in document
    const root = { style: {} as Record<string, string>, getBoundingClientRect: vi.fn() }
    const html = { style: {} as Record<string, string> }
    vi.stubGlobal('document', { querySelector: (sel: string) => (sel === '#root' ? root : null), documentElement: html })
    const { stage, evaluations } = make()
    const inPage = (i: number) => (evaluations[i]!.fn as (arg: unknown) => void)(evaluations[i]!.arg)

    await settle(stage.zoomTo(el(), { scale: 1.5, ms: 600 }))
    inPage(0)
    expect(root.style).toMatchObject({ transformOrigin: '880px 440px', transform: 'scale(1.5)' })
    expect(root.style.transition).toMatch(/^transform 600ms cubic-bezier/)
    expect(root.getBoundingClientRect).toHaveBeenCalled()       // commits the start state so the move animates
    expect(html.style.overflow).toBe('hidden')

    await settle(stage.zoomOut())
    inPage(1)
    expect(root.style.transform).toBe('scale(1)')
    inPage(2)
    expect(root.style).toEqual({ transformOrigin: '', transform: '', transition: '' })
    expect(html.style.overflow).toBe('')
  })
  it('zoomOut is a no-op the second time', async () => {
    const { stage, evaluations } = make()
    await settle(stage.zoomTo(el()))
    await settle(stage.zoomOut())
    await settle(stage.zoomOut())
    expect(evaluations).toHaveLength(3)
  })
  it('focus zooms and then spotlights with its label', async () => {
    const { stage, evaluations, live } = make()
    await settle(stage.focus(el(), { scale: 1.3, label: 'Look here', side: 'right' }))
    expect(evaluations[0]!.arg).toMatchObject({ scale: 1.3 })
    expect(live()[0]!.html).toContain('Look here')
  })
  it('release clears the spotlight and returns the camera', async () => {
    const { stage, evaluations, live } = make()
    await settle(stage.focus(el()))
    await settle(stage.release())
    expect(live()).toEqual([])
    expect(evaluations).toHaveLength(3)
  })
})

describe('full-screen layers', () => {
  it('covers the screen with the given HTML in the text face', async () => {
    const { stage, live } = make()
    await settle(stage.showFull('<b>card</b>'))
    expect(live()[0]!.html).toBe(`<div style="position:fixed;inset:0;font-family:${defaultTheme.type.text}"><b>card</b></div>`)
  })
  it('dissolves in by default', async () => {
    const { stage } = make()
    await settle(stage.showFull('x'))
    expect(stage.dissolves).toHaveLength(1)
  })
  it('appears at once for the first frame of the video', async () => {
    const { stage } = make()
    await settle(stage.showFull('x', { dissolve: false }))
    expect(stage.dissolves).toEqual([])
    expect(stage.events).toEqual([])
    expect(clock()).toBe(0)
  })
  it('takes the pointer off the screen', async () => {
    const { stage, live } = make()
    await settle(stage.moveTo(fakeLocator()))
    await settle(stage.showFull('card'))
    expect(live()).toHaveLength(1)
    expect(live()[0]!.html).toContain('card')
  })
  it('replaces the layer before it', async () => {
    const { stage, live } = make()
    await settle(stage.showFull('one'))
    await settle(stage.showFull('two'))
    expect(live().map((o) => o.html.includes('two'))).toEqual([true])
  })
  it('clearFull removes it with a dissolve', async () => {
    const { stage, live } = make()
    await settle(stage.showFull('x', { dissolve: false }))
    await settle(stage.clearFull())
    expect(live()).toEqual([])
    expect(stage.dissolves).toHaveLength(1)
  })
  it('clearFull can cut instead', async () => {
    const { stage } = make()
    await settle(stage.showFull('x', { dissolve: false }))
    await settle(stage.clearFull({ dissolve: false }))
    expect(stage.dissolves).toEqual([])
  })
  it('clearFull does nothing, and records nothing, with no layer', async () => {
    const { stage } = make()
    await settle(stage.clearFull())
    expect(stage.dissolves).toEqual([])
  })
  it('starts the next glide from where the pointer last was', async () => {
    const { stage, overlays } = make()
    await settle(stage.moveTo(fakeLocator({ x: 1000, y: 500, width: 200, height: 100 })))
    await settle(stage.showFull('card', { dissolve: false }))
    await settle(stage.moveTo(fakeLocator()))
    expect(overlays.at(-1)!.html).toContain('from{left:880px;top:440px}')
  })
})

describe('chapter', () => {
  it('shows the overline and the title', async () => {
    const { stage, overlays } = make()
    await settle(stage.chapter('PART TWO', 'At any size'))
    expect(overlays[0]!.html).toContain('>PART TWO</div>')
    expect(overlays[0]!.html).toContain('>At any size</div>')
  })
  it('escapes markup in both', async () => {
    const { stage, overlays } = make()
    await settle(stage.chapter('<i>', 'A & B'))
    expect(overlays[0]!.html).toContain('&lt;i&gt;')
    expect(overlays[0]!.html).toContain('A &amp; B')
  })
  it('uses the mono face for the overline and the display face for the title', async () => {
    const { stage, overlays } = make()
    await settle(stage.chapter('PART', 'Title'))
    expect(overlays[0]!.html).toContain(`font:600 17px/1 ${defaultTheme.type.mono}`)
    expect(overlays[0]!.html).toContain(`font:800 60px/1.08 ${defaultTheme.type.display}`)
  })
  it('runs the navigation while the card is up', async () => {
    const { stage, live } = make()
    let cardUp = false
    await settle(stage.chapter('P', 'T', async () => { cardUp = live().some((o) => o.html.includes('>T</div>')) }))
    expect(cardUp).toBe(true)
  })
  it('stays up for its hold even when the navigation is instant', async () => {
    const { stage } = make()
    await settle(stage.chapter('P', 'T', async () => {}, { hold: 1900 }))
    // the card left at 1900, then the dissolve back took its own 380
    expect(stage.dissolves[1]!.t1).toBe(1900)
    expect(clock()).toBe(2280)
  })
  it('stays up for as long as a slow navigation needs', async () => {
    const { stage } = make()
    await settle(stage.chapter('P', 'T', () => sleep(5000)))
    expect(stage.dissolves[1]!.t1).toBe(380 + 5000)
  })
  it('dissolves in and out, and leaves the screen clear', async () => {
    const { stage, live } = make()
    await settle(stage.chapter('P', 'T'))
    expect(stage.dissolves).toHaveLength(2)
    expect(live()).toEqual([])
  })
})
