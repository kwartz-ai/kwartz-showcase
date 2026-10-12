// A presentation: a video with no product. And the other gaps that fresh agents hit
// while following the theme studio's prompt: explore missing a page's own content,
// the end card hanging in the top third, and the theme skill pointed at inside the kit.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { validateBrief } from '../../../src/brief/brief.ts'
import { workOrder } from '../../../src/brief/workorder.ts'
import { CONTROL_LIMIT, describeControls, mapAsText, sharedControls, type ProductMap, type Screen } from '../../../src/capture/explore.ts'
import { resolveTheme } from '../../../src/core/theme.ts'
import { endCard } from '../../../src/graphics/cards.ts'
import { resolveVideo } from '../../../src/video/define.ts'

const CLI = path.resolve('src/cli/index.ts')
let dir: string
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-talk-')) })
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))
const showcase = (args: string[]) => {
  const r = spawnSync('bun', [CLI, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, SHOWCASE_HOME: path.join(dir, 'home') } })
  return { code: r.status, out: r.stdout, all: r.stdout + r.stderr }
}

describe('the work order for a presentation', () => {
  const talk = () => workOrder({ name: 'talk', motionOnly: true, length: 30 }, dir)

  it('says nothing about a product: no proofs on it, no app scenes, no exploring, no address', () => {
    const text = talk()
    for (const wrong of ['real product', 'app scene', 'run: async', 'showcase explore', 'Product map', 'address is local', 'Read-only', 'Sign-in', 'prepare, scenes']) {
      expect(text, wrong).not.toContain(wrong)
    }
  })
  it('says how a presentation is written', () => {
    const text = talk()
    expect(text).toContain('Every scene is a motion scene')
    expect(text).toContain('export default defineScenes({ scenes })')
    expect(text).toContain('an opening, one scene for each point, and a close')
    expect(text).toContain('examples/motion/')
    expect(text).toContain('one point of the talk, as a motion graphic')
  })
  it('does not ask for a call to action, and uses one that was given', () => {
    expect(talk()).toContain('Next step for the viewer: not given. End on the conclusion or the title alone. Do not ask for one.')
    expect(workOrder({ motionOnly: true, cta: { text: 'Read the plan.' } }, dir)).toContain('Next step for the viewer: Read the plan.')
  })
  it('still gives the length, the word budget and the names that must not appear', () => {
    const text = workOrder({ motionOnly: true, length: 30, safety: { banned: ['Acme'] } }, dir)
    expect(text).toContain('Length: 30 seconds')
    expect(text).toMatch(/Write about \d+ words/)
    expect(text).toContain('Names that must never appear on screen: Acme.')
  })
  it('leaves the work order of a product video as it was', () => {
    const text = workOrder({ url: 'http://localhost:3000' }, dir)
    for (const kept of ['Each proof is an app scene', 'Product map', 'Read-only mode is off', 'the address is local. Ask the person']) expect(text).toContain(kept)
  })
})

describe('where the work order sends you for a theme', () => {
  it('names the copy of the skill in the project, when there is one', () => {
    const local = path.join(dir, '.claude', 'skills', 'showcase-theme-clay', 'SKILL.md')
    fs.mkdirSync(path.dirname(local), { recursive: true })
    fs.writeFileSync(local, '# clay')
    expect(workOrder({ url: 'http://localhost', theme: 'clay' }, dir)).toContain(`read ${path.join('.claude', 'skills', 'showcase-theme-clay', 'SKILL.md')}`)
  })
  it('names the one in the kit when the project has none', () => {
    const text = workOrder({ url: 'http://localhost', theme: 'clay' }, dir)
    expect(text).toMatch(/read .*skills.showcase-theme-clay.SKILL\.md/)
    expect(text).not.toContain(`read ${path.join('.claude', 'skills')}`)
  })
})

describe('showcase init --config --motion', () => {
  it('starts a presentation: a config with no address, and scenes with no product in them', () => {
    const r = showcase(['init', '--config', '--motion'])
    expect(r.code).toBe(0)
    const brief = JSON.parse(fs.readFileSync(path.join(dir, 'showcase.config.json'), 'utf8'))
    expect(brief).toMatchObject({ motionOnly: true, length: 30 })
    expect(brief.url).toBeUndefined()
    expect(() => validateBrief(brief)).not.toThrow()
    const scenes = fs.readFileSync(path.join(dir, 'video.ts'), 'utf8')
    expect(scenes).not.toMatch(/^\s*(prepare|run):/m)
    expect(scenes.match(/motion:/g)!.length).toBe(3)
    expect(r.out).toContain('No product is filmed')
    expect(r.out).not.toContain('set "url"')
  })
  it('takes a theme, and copies its skill', () => {
    showcase(['init', '--config', '--motion', '--theme', 'editorial'])
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'showcase.config.json'), 'utf8')).theme).toBe('editorial')
    expect(fs.existsSync(path.join(dir, '.claude', 'skills', 'showcase-theme-editorial', 'SKILL.md'))).toBe(true)
  })
  it('gives a starter that plans with no word about a product', () => {
    showcase(['init', '--config', '--motion'])
    const r = showcase(['plan'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('Product: none is filmed')
    expect(r.out).not.toContain('showcase explore')
  })
  it('leaves a plain "init --config" as it was', () => {
    const r = showcase(['init', '--config'])
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'showcase.config.json'), 'utf8')).url).toBe('http://localhost:3000')
    expect(r.out).toContain('set "url"')
  })
})

describe('a presentation that still has a scene on a product', () => {
  it('is refused with the scene named and what to remove', () => {
    const video = () => resolveVideo({ name: 'v', scenes: [{ id: 'opening', say: 'A.', motion: () => '<b>x</b>' }, { id: 'first-proof', say: 'B.', run: async () => {} }] } as never, dir)
    expect(video).toThrow(/first-proof/)
    expect(video).toThrow(/"motionOnly"\), remove those scenes and "prepare"/)
  })
})

describe('explore: which controls are listed', () => {
  // a page as the browser gives it: a header with many links, then the page's own controls
  const el = (tag: string, text: string, inMain: boolean) => ({
    tagName: tag.toUpperCase(), innerText: text, inMain, id: '',
    getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 80, height: 30 }),
  })
  const g = globalThis as Record<string, unknown>
  const page = (header: number, own: string[], hasMain = true) => {
    const all = [...Array.from({ length: header }, (_, i) => el('a', `Nav ${i + 1}`, false)), ...own.map((t) => el('button', t, true))]
    g.document = { querySelectorAll: () => all, querySelector: () => (hasMain ? { contains: (e: { inMain: boolean }) => e.inMain } : null) }
    g.getComputedStyle = () => ({ visibility: 'visible', display: 'block' })
  }
  afterEach(() => { delete g.document; delete g.getComputedStyle })

  it("lists the page's own controls first, so a long header cannot crowd them out", () => {
    page(120, ['Next step', 'Play the video'])
    const found = describeControls(CONTROL_LIMIT)
    expect(found.slice(0, 2).map((c) => c.text)).toEqual(['Next step', 'Play the video'])
    expect(found).toHaveLength(CONTROL_LIMIT)
  })
  it('keeps document order on a page with no main area', () => {
    page(3, ['Save'], false)
    expect(describeControls(10).map((c) => c.text)).toEqual(['Nav 1', 'Nav 2', 'Nav 3', 'Save'])
  })
})

describe('explore: navigation that is on every screen', () => {
  const nav = [{ kind: 'link' as const, text: 'Docs', selector: "page.getByRole('link', { name: 'Docs' })" }]
  const screen = (title: string, own: string): Screen => ({
    url: `https://x.test/${title}`, title, headings: [], tables: [], text: '', screenshot: `${title}.jpg`,
    controls: [...nav, { kind: 'button', text: own, selector: `page.getByRole('button', { name: '${own}' })` }],
  })
  const map = (screens: Screen[]): ProductMap => ({ url: 'https://x.test', exploredAt: '2026-10-12T00:00:00.000Z', style: { font: null, accent: null }, skipped: [], screens })

  it('is found by being on all of them', () => {
    expect(sharedControls([screen('a', 'Save'), screen('b', 'Send')]).map((c) => c.text)).toEqual(['Docs'])
    expect(sharedControls([screen('a', 'Save')])).toEqual([])
  })
  it('is written once, and each screen then lists only its own controls', () => {
    const text = mapAsText(map([screen('a', 'Save'), screen('b', 'Send')]))
    expect(text.match(/link "Docs"/g)).toHaveLength(1)
    expect(text.indexOf('## On every screen')).toBeLessThan(text.indexOf('## 1. a'))
    expect(text).toContain('- button "Save"')
    expect(text).toContain('- button "Send"')
  })
  it('is not split off on a product with one screen', () => {
    const text = mapAsText(map([screen('a', 'Save')]))
    expect(text).not.toContain('On every screen')
    expect(text).toContain('- link "Docs"')
  })
})

describe('the end card with no next step', () => {
  const theme = resolveTheme()
  const top = (html: string) => Number(html.match(/left:0;right:0;top:(\d+)%/)![1])

  it('sits lower, so it does not hang in the top third of the frame', () => {
    const withCta = top(endCard(theme, { title: 'Name', chips: ['A'], cta: 'Try it.' }, 5000))
    const noCta = top(endCard(theme, { title: 'Name', chips: ['A'] }, 5000))
    const titleOnly = top(endCard(theme, { title: 'Name' }, 5000))
    expect(withCta).toBe(19)
    expect(noCta).toBeGreaterThan(withCta)
    expect(titleOnly).toBeGreaterThan(noCta)
  })
  it('draws its note large enough to read', () => {
    const size = Number(endCard(theme, { title: 'Name', note: 'All data shown is fictional.' }, 5000).match(/font:400 (\d+)px\/1\.4[^>]*>All data/)![1])
    expect(size).toBeGreaterThanOrEqual(18)
  })
})
