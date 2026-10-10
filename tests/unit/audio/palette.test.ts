import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// FFmpeg and the network are replaced, so these tests check the choosing, not the tools.
const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>()
let home: string
vi.mock('../../../src/core/util.ts', async (original) => ({
  ...(await original<typeof import('../../../src/core/util.ts')>()), run, showcaseHome: () => home,
}))

const palette = await import('../../../src/audio/palette.ts')
const { BLOCKED_CATEGORIES, GENERATED, ROLES, ROLE_OF, candidates, choose, credits, eligible, fetchSound, gainFor, gate, loadRegistry, measure, moodScore, resolvePalette } = palette
type RegistryItem = import('../../../src/audio/palette.ts').RegistryItem

const item = (name: string, over: Partial<RegistryItem> = {}): RegistryItem => ({
  name, categories: ['click'], meta: { duration: 0.08, license: 'CC0', tags: [] }, ...over,
})
const AUDIO = `data:audio/mpeg;base64,${Buffer.from('mp3 bytes').toString('base64')}`
const reply = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response
/** What the measuring commands print for a sound centred at `hz`. */
const measured = (hz: number, peakDb = -6, seconds = 0.08) => {
  run.mockImplementation(async (cmd, args) => {
    if (cmd === 'ffprobe') return `${seconds}\n`
    return args.join(' ').includes('aspectralstats') ? `lavfi.aspectralstats.1.centroid=${hz}\nlavfi.aspectralstats.1.centroid=${hz}\n` : `[volumedetect] max_volume: ${peakDb} dB\n`
  })
}

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-pal-'))
  run.mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
  fs.rmSync(home, { recursive: true, force: true })
})

describe('roles', () => {
  it('maps every stage event to a role', () => {
    expect(ROLE_OF).toEqual({ click: 'click', callout: 'callout', whoosh: 'transition' })
  })
  it('keeps the sounds that repeat low in pitch', () => {
    expect(ROLES.callout.maxCentroidHz).toBeLessThanOrEqual(1500)
    expect(ROLES.transition.maxCentroidHz).toBeLessThanOrEqual(1500)
    expect(ROLES.click.maxCentroidHz).toBeLessThanOrEqual(3000)
  })
  it('blocks the game-derived set and voices', () => {
    expect(BLOCKED_CATEGORIES).toEqual(expect.arrayContaining(['warcraft', 'voice', 'jingles']))
  })
})

describe('eligible', () => {
  it('takes a short CC0 sound in a category the role uses', () => {
    expect(eligible(item('a'), 'click')).toBe(true)
  })
  it('refuses any licence but CC0', () => {
    expect(eligible(item('a', { meta: { duration: 0.08, license: 'CC-BY' } }), 'click')).toBe(false)
    expect(eligible(item('a', { meta: { duration: 0.08 } }), 'click')).toBe(false)
  })
  it('refuses a blocked set even when the registry calls it CC0', () => {
    expect(eligible(item('a', { categories: ['click', 'warcraft'] }), 'click')).toBe(false)
  })
  it('refuses a sound from a category the role does not use', () => {
    expect(eligible(item('a', { categories: ['explosion'] }), 'click')).toBe(false)
    expect(eligible(item('a', { categories: [] }), 'click')).toBe(false)
  })
  it('refuses a sound that is too long, too short, or of unknown length', () => {
    expect(eligible(item('a', { meta: { duration: 0.5, license: 'CC0' } }), 'click')).toBe(false)
    expect(eligible(item('a', { meta: { duration: 0.001, license: 'CC0' } }), 'click')).toBe(false)
    expect(eligible(item('a', { meta: { license: 'CC0' } }), 'click')).toBe(false)
  })
  it('judges each role by its own length', () => {
    const whoosh = item('a', { categories: ['card'], meta: { duration: 0.5, license: 'CC0' } })
    expect(eligible(whoosh, 'transition')).toBe(true)
    expect(eligible(whoosh, 'click')).toBe(false)
  })
})

describe('moodScore and candidates', () => {
  it('counts the words a sound shares with the mood', () => {
    const i = item('a', { title: 'Soft Tap', description: 'A calm, gentle tap', meta: { duration: 0.08, license: 'CC0', tags: ['minimal'] } })
    expect(moodScore(i, 'calm, minimal and professional')).toBe(2)
    expect(moodScore(i, '')).toBe(0)
  })
  it('ignores case and very short words', () => {
    expect(moodScore(item('a', { description: 'CALM ui' }), 'Calm UI')).toBe(1)
  })
  it('puts the best match for the mood first, then orders by name', () => {
    const items = [item('zeta'), item('beta'), item('calm-one', { description: 'calm' }), item('alpha')]
    expect(candidates(items, 'click', 'calm').map((i) => i.name)).toEqual(['calm-one', 'alpha', 'beta', 'zeta'])
  })
  it('leaves out what is not eligible, and stops at the limit', () => {
    const items = [item('a'), item('bad', { categories: ['warcraft', 'click'] }), item('b'), item('c')]
    expect(candidates(items, 'click', '', 2).map((i) => i.name)).toEqual(['a', 'b'])
  })
})

describe('gate', () => {
  const m = (over = {}) => ({ centroidHz: 900, peakDb: -6, seconds: 0.1, ...over })
  it('passes a low, short, audible sound', () => {
    expect(gate('callout', m())).toEqual([])
  })
  it('refuses a highlight sound centred where the squeak was', () => {
    expect(gate('callout', m({ centroidHz: 4700 }))[0]).toMatch(/4700 Hz, above the 1500 Hz limit for a callout sound/)
  })
  it('allows a click to sit higher than a highlight', () => {
    expect(gate('click', m({ centroidHz: 2500 }))).toEqual([])
    expect(gate('callout', m({ centroidHz: 2500 }))).toHaveLength(1)
  })
  it('refuses a sound whose pitch could not be measured', () => {
    expect(gate('click', m({ centroidHz: 0 }))[0]).toMatch(/could not be measured/)
  })
  it('refuses a sound much longer than the registry said', () => {
    expect(gate('click', m({ seconds: 0.5 }))[0]).toMatch(/0\.50 s long, over the 0\.15 s limit/)
    expect(gate('click', m({ seconds: 0.18 }))).toEqual([])
  })
  it('refuses a nearly silent sound', () => {
    expect(gate('click', m({ peakDb: -50 }))).toContain('it is nearly silent')
  })
  it('gives every reason at once', () => {
    expect(gate('callout', m({ centroidHz: 5000, seconds: 2, peakDb: -60 }))).toHaveLength(3)
  })
})

describe('gainFor', () => {
  it('brings the peak to the level of the role', () => {
    expect(gainFor('click', { centroidHz: 900, peakDb: -10, seconds: 0.1 })).toBe(1)
    expect(gainFor('click', { centroidHz: 900, peakDb: -4, seconds: 0.1 })).toBe(0.501)
  })
  it('sets a transition lower than a click', () => {
    const m = { centroidHz: 900, peakDb: -6, seconds: 0.4 }
    expect(gainFor('transition', m)).toBeLessThan(gainFor('click', m))
  })
  it('never more than doubles a quiet sound', () => {
    expect(gainFor('click', { centroidHz: 900, peakDb: -38, seconds: 0.1 })).toBe(2)
  })
})

describe('measure', () => {
  it('averages the pitch centre and reads the peak and the length', async () => {
    run.mockImplementation(async (cmd, args) => {
      if (cmd === 'ffprobe') return '0.212\n'
      return args.join(' ').includes('aspectralstats') ? 'centroid=1000.5\ncentroid=2000.5\ncentroid=0\n' : 'max_volume: -7.5 dB'
    })
    expect(await measure('a.mp3')).toEqual({ centroidHz: 1501, peakDb: -7.5, seconds: 0.212 })
  })
  it('reports zero when no pitch was found', async () => {
    run.mockImplementation(async (cmd) => (cmd === 'ffprobe' ? '0.1' : ''))
    expect((await measure('a.mp3')).centroidHz).toBe(0)
  })
})

describe('fetchSound', () => {
  const body = (over = {}) => ({ name: 'tap', categories: ['click'], meta: { license: 'CC0' }, files: [{ content: `export const tap = "${AUDIO}"` }], ...over })

  it('downloads a sound once and keeps it', async () => {
    const fetchMock = vi.fn(async () => reply(body()))
    vi.stubGlobal('fetch', fetchMock)
    const file = await fetchSound('tap')
    expect(file).toBe(path.join(home, 'sfx', 'tap.mp3'))
    expect(fs.readFileSync(file, 'utf8')).toBe('mp3 bytes')
    await fetchSound('tap')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
  it('refuses a sound that is not CC0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(body({ meta: { license: 'CC-BY-NC' } }))))
    await expect(fetchSound('tap')).rejects.toThrow(/tap is CC-BY-NC; only CC0 sounds are allowed/)
  })
  it('refuses a sound from a blocked set', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(body({ categories: ['warcraft'] }))))
    await expect(fetchSound('tap')).rejects.toThrow(/may not be used \(warcraft\)/)
  })
  it('says when the sound does not exist or holds no audio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({}, false, 404)))
    await expect(fetchSound('nope')).rejects.toThrow(/nope not found \(404\)/)
    vi.stubGlobal('fetch', vi.fn(async () => reply(body({ files: [{ content: 'export {}' }] }))))
    await expect(fetchSound('tap')).rejects.toThrow(/no audio found in tap/)
  })
})

describe('loadRegistry', () => {
  it('downloads the list and keeps it', async () => {
    const fetchMock = vi.fn(async () => reply({ items: [item('a')] }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await loadRegistry()).toEqual([item('a')])
    expect(await loadRegistry()).toEqual([item('a')])
    expect(fetchMock).toHaveBeenCalledOnce()
  })
  it('uses the kept copy when the network fails', async () => {
    fs.writeFileSync(path.join(home, 'soundcn-registry.json'), JSON.stringify({ items: [item('old')] }))
    const old = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    fs.utimesSync(path.join(home, 'soundcn-registry.json'), old, old)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect((await loadRegistry())[0]!.name).toBe('old')
  })
  it('says so when there is no copy and no network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await expect(loadRegistry()).rejects.toThrow(/could not reach the soundcn registry \(offline\)/)
  })
})

describe('choose', () => {
  const stubSounds = () => vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const name = url.split('/').pop()!.replace('.json', '')
    return reply({ name, categories: ['click'], meta: { license: 'CC0' }, files: [{ content: AUDIO }] })
  }))

  it('takes the first candidate that passes the measurements', async () => {
    stubSounds()
    measured(900)
    expect(await choose('click', [item('a'), item('b')], '')).toMatchObject({ name: 'a', centroidHz: 900, gain: 0.631, why: 'first candidate, passed' })
  })
  it('moves on from a sound that fails, and records why', async () => {
    stubSounds()
    let n = 0
    run.mockImplementation(async (cmd, args) => {
      if (cmd === 'ffprobe') return '0.08'
      if (args.join(' ').includes('aspectralstats')) return `centroid=${n++ === 0 ? 5000 : 900}`
      return 'max_volume: -6 dB'
    })
    const c = await choose('click', [item('a'), item('b')], '')
    expect(c.name).toBe('b')
    expect(c.why).toMatch(/passed after 1 refused \(a: its pitch is centred at 5000 Hz/)
  })
  it('falls back to the generated sound when nothing passes', async () => {
    stubSounds()
    measured(6000)
    const c = await choose('click', [item('a')], '')
    expect(c).toMatchObject({ name: 'generated', file: null })
    expect(c.why).toMatch(/no soundcn sound passed/)
  })
  it('falls back when nothing in the registry fits the role', async () => {
    expect((await choose('click', [], '')).why).toBe('no soundcn sound fits this role')
  })
  it('treats a failed download as a refusal, not a crash', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({}, false, 500)))
    expect((await choose('click', [item('a')], '')).why).toMatch(/a: soundcn: a not found \(500\)/)
  })
})

describe('resolvePalette', () => {
  const lock = () => path.join(home, 'project', '.showcase', 'sounds.json')

  it('uses the kit\'s own sounds when asked, and saves the choice', async () => {
    const p = await resolvePalette('generated', '', lock())
    expect(p).toEqual({ click: GENERATED, callout: GENERATED, transition: GENERATED })
    expect(JSON.parse(fs.readFileSync(lock(), 'utf8')).palette).toEqual(p)
  })
  it('reuses a saved choice without the network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const first = await resolvePalette('auto', 'calm', lock())
    expect(first.click.why).toMatch(/soundcn could not be used/)
    vi.stubGlobal('fetch', vi.fn(async () => reply({ items: [] })))
    expect(await resolvePalette('auto', 'calm', lock())).toEqual(first)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('chooses again when the mood or the choice changes', async () => {
    await resolvePalette('generated', '', lock())
    vi.stubGlobal('fetch', vi.fn(async () => reply({ items: [] })))
    const p = await resolvePalette('auto', 'bright', lock())
    expect(fetch).toHaveBeenCalled()
    expect(p.click.why).toBe('no soundcn sound fits this role')
  })
  it('chooses again when a saved sound file is gone', async () => {
    fs.mkdirSync(path.dirname(lock()), { recursive: true })
    const gone = { name: 'tap', file: path.join(home, 'gone.mp3'), gain: 1, centroidHz: 900, why: 'x' }
    fs.writeFileSync(lock(), JSON.stringify({ key: JSON.stringify({ choice: 'generated', mood: '' }), palette: { click: gone, callout: GENERATED, transition: GENERATED } }))
    expect((await resolvePalette('generated', '', lock())).click).toEqual(GENERATED)
  })
  it('uses the sounds the person named, with a note when one fails a measurement', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ name: 'ping', categories: ['select'], meta: { license: 'CC0' }, files: [{ content: AUDIO }] })))
    measured(4700)
    const p = await resolvePalette({ callout: 'ping' }, '', lock())
    expect(p.callout).toMatchObject({ name: 'ping', centroidHz: 4700 })
    expect(p.callout.why).toMatch(/named in the config\. Note: its pitch is centred at 4700 Hz/)
    expect(p.click).toEqual(GENERATED)
  })
})

describe('credits', () => {
  it('says where each sound came from', () => {
    const text = credits({
      click: { name: 'tap', file: '/x/tap.mp3', gain: 1, centroidHz: 900, why: 'first candidate, passed' },
      callout: GENERATED,
      transition: GENERATED,
    })
    expect(text).toContain('click: "tap" from soundcn (https://www.soundcn.xyz), CC0. Pitch centre 900 Hz. first candidate, passed.')
    expect(text).toContain('callout: generated by Kwartz Showcase with FFmpeg.')
    expect(text.endsWith('\n')).toBe(true)
  })
})
