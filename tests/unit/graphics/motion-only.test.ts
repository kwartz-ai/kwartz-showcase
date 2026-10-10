// A video of motion graphics alone: no product is filmed.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { validateBrief } from '../../../src/brief/brief.ts'
import { layoutFor } from '../../../src/brief/presets.ts'
import { defineScenes, resolveBrief } from '../../../src/brief/resolve.ts'
import { workOrder } from '../../../src/brief/workorder.ts'
import { unsafeReasons } from '../../../src/auto/auto.ts'
import { defaultTheme, resolveTheme } from '../../../src/core/theme.ts'
import type { MotionContext } from '../../../src/core/types.ts'
import { endCard, hookCard, titleCard } from '../../../src/graphics/cards.ts'
import { motionDocument } from '../../../src/graphics/motion.ts'
import { blankPage } from '../../../src/render/render.ts'
import { resolveVideo } from '../../../src/video/define.ts'

let dir: string
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-motion-')) })
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

const motion = () => '<b>Hi</b>'
const run = async () => {}

describe('a config with no product', () => {
  it('needs no address when it says the video is motion only', () => {
    expect(() => validateBrief({ motionOnly: true })).not.toThrow()
  })
  it('still asks for an address otherwise, and mentions the choice', () => {
    expect(() => validateBrief({})).toThrow(/"url" is required[\s\S]*motionOnly/)
    expect(() => validateBrief({ motionOnly: false })).toThrow(/"url" is required/)
  })
  it('checks the setting', () => {
    expect(() => validateBrief({ motionOnly: 'yes' })).toThrow(/"motionOnly" must be true or false/)
  })
  it('resolves to a video with no address, read-only off, and no closing line', () => {
    const { videos, notes } = resolveBrief({ name: 'm', motionOnly: true }, dir, defineScenes({ scenes: [{ id: 'a', say: 'A.', motion }] }))
    expect(videos[0]!.video).toMatchObject({ baseUrl: '', serve: null, readOnly: { on: false } })
    expect(notes.join(' ')).toMatch(/no call to action/)
  })
  it('says in the work order that nothing is filmed', () => {
    expect(workOrder({ motionOnly: true }, dir)).toContain('Product: none is filmed. Every scene is a motion scene or a clip.')
  })
})

describe('a video file with no product', () => {
  const video = (scenes: object[]) => resolveVideo({ name: 'v', scenes } as never, dir)
  it('is accepted when every scene is a motion scene or a clip', () => {
    fs.writeFileSync(path.join(dir, 'b.mp4'), 'mp4')
    expect(() => video([{ id: 'a', say: 'A.', motion }, { id: 'b', say: '', clip: 'b.mp4' }])).not.toThrow()
  })
  it('is refused as soon as one scene runs on a product', () => {
    expect(() => video([{ id: 'a', say: 'A.', motion }, { id: 'b', say: 'B.', run }])).toThrow(/needs "baseUrl"[\s\S]*scenes that run on a product/)
  })
  it('films a blank page in the dark colour behind the graphics', () => {
    const url = blankPage('#0B1D35')
    expect(url.startsWith('data:text/html,')).toBe(true)
    expect(decodeURIComponent(url)).toContain('background:#0B1D35')
  })
})

describe('captions under a motion scene', () => {
  const vertical = layoutFor('vertical')
  it('keeps the caption band dark where captions are drawn on the canvas, whatever the scene', () => {
    const doc = motionDocument('<div style="position:absolute;inset:0;background:#fff"></div>', vertical, defaultTheme)
    expect(doc).toMatch(new RegExp(`id="showcase-band" style="position:fixed;left:0;right:0;top:${vertical.captionBand.y}px;bottom:0;background:${defaultTheme.ink}"`))
    // the band comes after the scene, so it is drawn over it
    expect(doc.indexOf('showcase-band')).toBeGreaterThan(doc.indexOf('showcase-scene'))
  })
  it('adds no band where captions are drawn in the page', () => {
    expect(motionDocument('', layoutFor('landscape'), defaultTheme)).not.toContain('showcase-band')
  })
})

describe('cards on a narrow frame', () => {
  const big = resolveTheme({ scale: 1.35 })
  it.each([
    ['hook', hookCard(big, { title: 'A very long product name here' }, 3000)],
    ['end', endCard(big, { title: 'Kwartz Showcase' }, 3000)],
    ['title', titleCard(big, 'A very long product name here')],
  ])('lets a long title wrap inside the %s card, away from the edges', (_name, html) => {
    expect(html).toMatch(/padding:0 7%;text-align:center;text-wrap:balance/)
  })
})

describe('the motion example', () => {
  const file = path.resolve('examples/motion/video.ts')
  const config = JSON.parse(fs.readFileSync(path.resolve('examples/motion/showcase.config.json'), 'utf8'))

  it('has a config that passes the checks and films no product', () => {
    expect(() => validateBrief(config)).not.toThrow()
    expect(config).toMatchObject({ motionOnly: true })
    expect(config.url).toBeUndefined()
  })
  it('is a scenes file that would pass the check on generated files', () => {
    expect(unsafeReasons(fs.readFileSync(file, 'utf8'))).toEqual([])
  })
  it('returns HTML for every scene in every shape, with style attributes left whole', async () => {
    const module = (await import(file)).default as { scenes: { id: string; say: string; motion: (ctx: MotionContext) => string }[] }
    expect(module.scenes.length).toBeGreaterThanOrEqual(5)
    for (const format of ['landscape', 'vertical', 'square']) {
      const layout = layoutFor(format)
      const theme = resolveTheme({ scale: layout.mode === 'fill' ? 1 : 1.35 })
      for (const scene of module.scenes) {
        const html = scene.motion({ theme, sayMs: 5000, format, layout, cta: { text: 'Go', sub: 'example.com' } })
        expect(html.length, `${scene.id} in ${format}`).toBeGreaterThan(200)
        // a double quote inside a style attribute would cut it short: every style must
        // close on a declaration, a bracket or a unit
        for (const m of html.matchAll(/style="([^"]*)"/g)) expect(m[1]!.trim(), `${scene.id} in ${format}`).toMatch(/[;)%a-z0-9]$/i)
        expect(html, scene.id).not.toMatch(/NaN|undefined/)
      }
    }
  })
  it('keeps its graphics above the caption band on a tall frame', async () => {
    const module = (await import(file)).default as { scenes: { id: string; motion: (ctx: MotionContext) => string }[] }
    const layout = layoutFor('vertical')
    const html = module.scenes[1]!.motion({ theme: resolveTheme({ scale: 1.35 }), sayMs: 5000, format: 'vertical', layout, cta: null })
    expect(html).toContain(`top:${layout.safe.top}px;height:${layout.captionBand.y - layout.safe.top}px`)
  })
  it('animates with CSS only, as a frame-by-frame scene must', () => {
    const source = fs.readFileSync(file, 'utf8')
    expect(source).not.toMatch(/setTimeout|setInterval|requestAnimationFrame|<script/)
    expect(source).toMatch(/@keyframes/)
  })
})
