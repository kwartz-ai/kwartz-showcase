import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineVideo, loadVideo, resolveVideo } from '../src/config.ts'
import { defaultTheme } from '../src/theme.ts'
import type { VideoConfig } from '../src/types.ts'

const scene = { id: 'a', say: 'Hello.', run: async () => {} }
const base = (over: Partial<VideoConfig> = {}): VideoConfig => ({ name: 'x', baseUrl: 'http://h', scenes: [scene], ...over })
const DIR = path.resolve('/proj')

describe('defineVideo', () => {
  it('returns its argument untouched', () => {
    const config = base()
    expect(defineVideo(config)).toBe(config)
  })
})

describe('resolveVideo: defaults', () => {
  const v = resolveVideo(base(), DIR)

  it('uses a 1080p frame zoomed 1.25 at 30 fps', () => {
    expect(v.layout).toEqual({ width: 1920, height: 1080, zoom: 1.25, fps: 30 })
  })
  it('uses the af_heart voice at normal speed', () => {
    expect(v.voice).toEqual({ voice: 'af_heart', speed: 1 })
  })
  it('uses generated music, effects on, and -16 LUFS', () => {
    expect(v.sound).toEqual({ music: 'generated', musicGain: 0.4, effects: true, lufs: -16 })
  })
  it('paces scenes with a 350 ms lead and an 800 ms tail', () => {
    expect(v.pace).toEqual({ leadMs: 350, tailMs: 800 })
  })
  it('uses the default theme', () => {
    expect(v.theme).toEqual(defaultTheme)
  })
  it('has no banned terms, no target, no app root, no served folder', () => {
    expect(v.banned).toEqual([])
    expect(v.target).toEqual({})
    expect(v.appRoot).toBeNull()
    expect(v.serve).toBeNull()
  })
  it('remembers the folder of the video file', () => {
    expect(v.dir).toBe(DIR)
  })
})

describe('resolveVideo: overrides', () => {
  it('merges a partial layout', () => {
    expect(resolveVideo(base({ layout: { zoom: 1.5 } }), DIR).layout).toEqual({ width: 1920, height: 1080, zoom: 1.5, fps: 30 })
  })
  it('merges a partial voice', () => {
    expect(resolveVideo(base({ voice: { speed: 1.1 } }), DIR).voice).toEqual({ voice: 'af_heart', speed: 1.1 })
  })
  it('merges partial sound settings', () => {
    const s = resolveVideo(base({ sound: { music: false, lufs: -14 } }), DIR).sound
    expect(s).toEqual({ music: false, musicGain: 0.4, effects: true, lufs: -14 })
  })
  it('merges partial pace', () => {
    expect(resolveVideo(base({ pace: { tailMs: 1100 } }), DIR).pace).toEqual({ leadMs: 350, tailMs: 1100 })
  })
  it('merges a partial theme and keeps the other font stacks', () => {
    const t = resolveVideo(base({ theme: { accent: '#f00', type: { text: `'Arial'` } } }), DIR).theme
    expect(t.accent).toBe('#f00')
    expect(t.ink).toBe(defaultTheme.ink)
    expect(t.type.text).toBe(`'Arial'`)
    expect(t.type.display).toBe(defaultTheme.type.display)
  })
  it('keeps banned terms, target, app root and prepare', () => {
    const prepare = async () => {}
    const v = resolveVideo(base({ banned: ['Acme', /x/], target: { minSec: 30 }, appRoot: '#app', prepare }), DIR)
    expect(v.banned).toEqual(['Acme', /x/])
    expect(v.target).toEqual({ minSec: 30 })
    expect(v.appRoot).toBe('#app')
    expect(v.prepare).toBe(prepare)
  })
})

describe('resolveVideo: the address', () => {
  it('drops one trailing slash from baseUrl', () => {
    expect(resolveVideo(base({ baseUrl: 'http://h:3000/' }), DIR).baseUrl).toBe('http://h:3000')
  })
  it('keeps a path in baseUrl', () => {
    expect(resolveVideo(base({ baseUrl: 'http://h/app' }), DIR).baseUrl).toBe('http://h/app')
  })
  it('resolves "serve" against the folder of the video file', () => {
    expect(resolveVideo(base({ baseUrl: undefined, serve: './site' }), DIR).serve).toBe(path.join(DIR, 'site'))
  })
  it('accepts "serve" with no baseUrl, leaving baseUrl empty', () => {
    expect(resolveVideo(base({ baseUrl: undefined, serve: 'dist' }), DIR).baseUrl).toBe('')
  })
})

describe('resolveVideo: mistakes are refused at once', () => {
  it('needs an address or a folder', () => {
    expect(() => resolveVideo({ name: 'x', scenes: [scene] }, DIR)).toThrow(/baseUrl.*serve/)
  })
  it('needs at least one scene', () => {
    expect(() => resolveVideo(base({ scenes: [] }), DIR)).toThrow(/no scenes/)
  })
  it.each(['', 'bad name', 'a/b', 'a\\b', 'na:me', 'x?'])('refuses the name %j', (name) => {
    expect(() => resolveVideo(base({ name }), DIR)).toThrow(/name/)
  })
  it.each(['demo', 'demo-2', 'demo_3', 'v1.2', 'ABC123'])('accepts the name %j', (name) => {
    expect(resolveVideo(base({ name }), DIR).name).toBe(name)
  })
  it('refuses two scenes with one id, and says which', () => {
    expect(() => resolveVideo(base({ scenes: [scene, { ...scene }] }), DIR)).toThrow(/unique.*"a"/)
  })
  it('refuses a scene with an empty id', () => {
    expect(() => resolveVideo(base({ scenes: [{ ...scene, id: '' }] }), DIR)).toThrow(/unique and non-empty/)
  })
  it('refuses a scene with no spoken line, and names it', () => {
    expect(() => resolveVideo(base({ scenes: [{ ...scene, say: '   ' }] }), DIR)).toThrow(/scene "a" has no "say"/)
  })
})

describe('loadVideo', () => {
  it('imports a video file and resolves it', async () => {
    const v = await loadVideo('tests/fixtures/good.video.ts')
    expect(v.name).toBe('fixture')
    expect(v.baseUrl).toBe('http://localhost:9')
    expect(v.scenes.map((s) => s.id)).toEqual(['one'])
  })
  it('sets dir to the folder of the file', async () => {
    const v = await loadVideo('tests/fixtures/good.video.ts')
    expect(v.dir).toBe(path.resolve('tests/fixtures'))
  })
  it('explains a file with no default export', async () => {
    await expect(loadVideo('tests/fixtures/no-default.video.ts')).rejects.toThrow(/no default export.*defineVideo/s)
  })
  it('fails on a file that does not exist', async () => {
    await expect(loadVideo('tests/fixtures/nope.video.ts')).rejects.toThrow()
  })
})
