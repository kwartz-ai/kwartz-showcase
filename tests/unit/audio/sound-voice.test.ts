import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const run = vi.fn<(cmd: string, args: string[], opts?: { input?: string }) => Promise<string>>()
vi.mock('../../../src/core/util.ts', async (original) => ({ ...(await original<typeof import('../../../src/core/util.ts')>()), run }))

const { SFX, effects, musicBed } = await import('../../../src/audio/sound.ts')
const { KOKORO_FILES, estimateMs, narrate, voicePaths, voiceReady } = await import('../../../src/audio/tts.ts')

let home: string
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-home-'))
  vi.stubEnv('SHOWCASE_HOME', home)
  run.mockReset()
})
afterEach(() => fs.rmSync(home, { recursive: true, force: true }))

/** Stand in for FFmpeg and Python: create whatever output file is asked for. */
const makesFiles = () => run.mockImplementation(async (cmd, args, opts) => {
  if (cmd === 'ffprobe') return '2.500000\n'
  if (opts?.input) for (const job of JSON.parse(opts.input) as { out: string }[]) fs.writeFileSync(job.out, 'wav')
  else fs.writeFileSync(args.at(-1)!, 'audio')
  return ''
})
const soundcn = (body: object, ok = true, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status, json: async () => body })))
const CC0_CLICK = { meta: { license: 'CC0' }, files: [{ content: `export const s = { dataUri: "data:audio/mpeg;base64,${Buffer.from('MP3DATA').toString('base64')}" }` }] }

describe('SFX', () => {
  it('has a sound for every kind of event', () => {
    expect(Object.keys(SFX).sort()).toEqual(['callout', 'click', 'whoosh'])
  })
  it('keeps every effect quieter than the voice', () => {
    for (const s of Object.values(SFX)) {
      expect(s.gain).toBeGreaterThan(0)
      expect(s.gain).toBeLessThan(1)
    }
  })
  // A bright highlight sound was heard by reviewers as a squeak. Sounds that
  // repeat are generated low, with a low-pass, so that cannot come back unnoticed.
  it('low-passes both generated sounds below about 1 kHz', () => {
    for (const kind of ['callout', 'whoosh'] as const) {
      const spec = SFX[kind] as { make: string[] }
      const cutoff = Number(spec.make.join(' ').match(/lowpass=f=(\d+)/)![1])
      expect(cutoff).toBeLessThanOrEqual(1100)
    }
  })
  it('builds the callout from tones well under 1 kHz', () => {
    const tones = [...(SFX.callout as { make: string[] }).make.join(' ').matchAll(/2\*PI\*(\d+)\*t/g)].map((m) => Number(m[1]))
    expect(tones.length).toBeGreaterThan(0)
    for (const hz of tones) expect(hz).toBeLessThan(1000)
  })
})

describe('effects', () => {
  it('returns nothing for no events, and starts nothing', async () => {
    expect(await effects([])).toEqual([])
    expect(run).not.toHaveBeenCalled()
  })

  it('makes a clip per event, at its time and at the level of its kind', async () => {
    makesFiles()
    const clips = await effects([{ t: 1200, kind: 'callout' }, { t: 3400, kind: 'whoosh' }])
    expect(clips.map((c) => [path.basename(c.file), c.at, c.gain])).toEqual([
      ['made-callout.wav', 1200, SFX.callout.gain],
      ['made-whoosh.wav', 3400, SFX.whoosh.gain],
    ])
  })

  it('generates each sound once and reuses it', async () => {
    makesFiles()
    await effects([{ t: 1, kind: 'callout' }, { t: 2, kind: 'callout' }, { t: 3, kind: 'callout' }])
    expect(run).toHaveBeenCalledTimes(1)
    await effects([{ t: 4, kind: 'callout' }])
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('keeps the sounds in the shared cache folder', async () => {
    makesFiles()
    const [clip] = await effects([{ t: 0, kind: 'whoosh' }])
    expect(clip!.file).toBe(path.join(home, 'sfx', 'made-whoosh.wav'))
  })

  it('never places a sound before the start of the video', async () => {
    makesFiles()
    expect((await effects([{ t: -50, kind: 'callout' }]))[0]!.at).toBe(0)
  })

  it('downloads the click from soundcn and decodes it', async () => {
    soundcn(CC0_CLICK)
    const [clip] = await effects([{ t: 10, kind: 'click' }])
    expect(fs.readFileSync(clip!.file, 'utf8')).toBe('MP3DATA')
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('https://www.soundcn.xyz/r/click-001.json')
  })

  it('downloads the click once', async () => {
    soundcn(CC0_CLICK)
    await effects([{ t: 10, kind: 'click' }, { t: 20, kind: 'click' }])
    await effects([{ t: 30, kind: 'click' }])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each(['OGA-BY', 'MIT', undefined])('refuses a sound whose licence is %s', async (license) => {
    soundcn({ ...CC0_CLICK, meta: { license } })
    await expect(effects([{ t: 0, kind: 'click' }])).rejects.toThrow(/only CC0 sounds are allowed/)
    expect(fs.existsSync(path.join(home, 'sfx', 'click-001.mp3'))).toBe(false)
  })

  it('refuses a sound with no licence information at all', async () => {
    soundcn({ files: CC0_CLICK.files })
    await expect(effects([{ t: 0, kind: 'click' }])).rejects.toThrow(/only CC0/)
  })

  it('says so when the sound is not in the registry', async () => {
    soundcn({}, false, 404)
    await expect(effects([{ t: 0, kind: 'click' }])).rejects.toThrow(/click-001 not found \(404\)/)
  })

  it('says so when the registry entry holds no audio', async () => {
    soundcn({ meta: { license: 'CC0' }, files: [{ content: 'export const nothing = 1' }] })
    await expect(effects([{ t: 0, kind: 'click' }])).rejects.toThrow(/no audio found/)
  })
})

describe('musicBed', () => {
  it('generates the pad into the cache and returns its path', async () => {
    makesFiles()
    expect(await musicBed()).toBe(path.join(home, 'music-pad.wav'))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('reuses the pad on later renders', async () => {
    makesFiles()
    await musicBed()
    await musicBed()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('builds four chords of five notes, each note as two detuned sines', async () => {
    makesFiles()
    await musicBed()
    const args = run.mock.calls[0]![1]
    expect(args.filter((a) => a.startsWith('sine=frequency=')).length).toBe(4 * 5 * 2)
  })

  it('loops without a seam: the tail is folded onto the start, 24 seconds long', async () => {
    makesFiles()
    await musicBed()
    const graph = run.mock.calls[0]![1][run.mock.calls[0]![1].indexOf('-filter_complex') + 1]!
    expect(graph).toContain('atrim=0:24[head]')
    expect(graph).toContain('atrim=24:26,asetpts=PTS-STARTPTS[tail]')
    expect(graph).toContain('[head][tail]amix=inputs=2')
  })

  it('keeps the bass note quieter than the rest', async () => {
    makesFiles()
    await musicBed()
    const graph = run.mock.calls[0]![1][run.mock.calls[0]![1].indexOf('-filter_complex') + 1]!
    expect(graph).toContain('[0:a]volume=0.05')
    expect(graph).toContain('[2:a]volume=0.09')
  })
})

describe('estimateMs', () => {
  it('reads at about 3 words a second', () => {
    expect(estimateMs(Array(30).fill('word').join(' '))).toBeCloseTo(10000, 5)
  })
  it('never estimates under two and a half seconds', () => {
    expect(estimateMs('Hi.')).toBe(2500)
    expect(estimateMs('')).toBe(2500)
  })
  it('ignores extra spaces around and between words', () => {
    expect(estimateMs('  one   two\nthree  ')).toBe(estimateMs('one two three'))
  })
  it('grows with the length of the line', () => {
    const short = Array(20).fill('w').join(' '), long = Array(40).fill('w').join(' ')
    expect(estimateMs(long)).toBeCloseTo(estimateMs(short) * 2, 5)
  })
})

describe('voicePaths and voiceReady', () => {
  it('keeps the model, the environment and the audio under the cache folder', () => {
    const p = voicePaths()
    expect(p.venv).toBe(path.join(home, 'kokoro-venv'))
    expect(p.model).toBe(path.join(home, 'kokoro', KOKORO_FILES[0]))
    expect(p.voices).toBe(path.join(home, 'kokoro', KOKORO_FILES[1]))
    expect(p.audio).toBe(path.join(home, 'audio'))
  })
  it('points at the Python of the environment for this platform', () => {
    const expected = process.platform === 'win32' ? path.join('Scripts', 'python.exe') : path.join('bin', 'python')
    expect(voicePaths().python.endsWith(expected)).toBe(true)
  })
  it('points at the Kokoro script that ships with the kit', () => {
    expect(fs.existsSync(voicePaths().script)).toBe(true)
  })
  it('is not ready on a machine with an empty cache', () => {
    expect(voiceReady()).toBe(false)
  })
  it('is not ready while one model file is missing', () => {
    const p = voicePaths()
    fs.mkdirSync(path.dirname(p.python), { recursive: true }); fs.writeFileSync(p.python, '')
    fs.mkdirSync(path.dirname(p.model), { recursive: true }); fs.writeFileSync(p.model, '')
    expect(voiceReady()).toBe(false)
  })
  it('is ready once Python and both model files exist', () => {
    const p = voicePaths()
    fs.mkdirSync(path.dirname(p.python), { recursive: true }); fs.writeFileSync(p.python, '')
    fs.mkdirSync(path.dirname(p.model), { recursive: true }); fs.writeFileSync(p.model, ''); fs.writeFileSync(p.voices, '')
    expect(voiceReady()).toBe(true)
  })
})

describe('narrate', () => {
  const VOICE = { voice: 'af_heart', speed: 1 }
  const installVoice = () => {
    const p = voicePaths()
    fs.mkdirSync(path.dirname(p.python), { recursive: true }); fs.writeFileSync(p.python, '')
    fs.mkdirSync(path.dirname(p.model), { recursive: true }); fs.writeFileSync(p.model, ''); fs.writeFileSync(p.voices, '')
  }
  const kokoroCalls = () => run.mock.calls.filter((c) => c[0] !== 'ffprobe')
  const jobsOf = (i: number) => JSON.parse(kokoroCalls()[i]![2]!.input!) as { text: string; out: string }[]

  it('in a draft, generates nothing and estimates each length', async () => {
    const out = await narrate(['Hi.', Array(30).fill('w').join(' ')], { ...VOICE, draft: true })
    expect(out).toEqual([{ file: null, ms: 2500 }, { file: null, ms: 10000 }])
    expect(run).not.toHaveBeenCalled()
  })

  it('a draft works on a machine with no voice installed', async () => {
    await expect(narrate(['Hi.'], { ...VOICE, draft: true })).resolves.toHaveLength(1)
  })

  it('without the voice, says how to set it up or work around it', async () => {
    await expect(narrate(['Hi.'], VOICE)).rejects.toThrow(/showcase setup.*--draft/)
  })

  it('returns one clip per line, in order, with its measured length', async () => {
    installVoice(); makesFiles()
    const out = await narrate(['First.', 'Second.'], VOICE)
    expect(out).toHaveLength(2)
    expect(out.every((c) => c.ms === 2500)).toBe(true)
    expect(out[0]!.file).not.toBe(out[1]!.file)
  })

  it('sends every new line to Kokoro in one run', async () => {
    installVoice(); makesFiles()
    await narrate(['First.', 'Second.', 'Third.'], VOICE)
    expect(kokoroCalls()).toHaveLength(1)
    expect(jobsOf(0).map((j) => j.text)).toEqual(['First.', 'Second.', 'Third.'])
  })

  it('passes the model, the voices, the voice name and the speed', async () => {
    installVoice(); makesFiles()
    await narrate(['Hi.'], { voice: 'bf_emma', speed: 1.1 })
    const p = voicePaths()
    expect(kokoroCalls()[0]![0]).toBe(p.python)
    expect(kokoroCalls()[0]![1]).toEqual([p.script, p.model, p.voices, 'bf_emma', '1.1'])
  })

  it('voices only the lines that changed since the last render', async () => {
    installVoice(); makesFiles()
    await narrate(['First.', 'Second.'], VOICE)
    await narrate(['First.', 'Second, reworded.'], VOICE)
    expect(kokoroCalls()).toHaveLength(2)
    expect(jobsOf(1).map((j) => j.text)).toEqual(['Second, reworded.'])
  })

  it('does not start Kokoro at all when nothing changed', async () => {
    installVoice(); makesFiles()
    await narrate(['First.'], VOICE)
    await narrate(['First.'], VOICE)
    expect(kokoroCalls()).toHaveLength(1)
  })

  it('gives the same line the same file, and a different voice or speed another', async () => {
    installVoice(); makesFiles()
    const [a] = await narrate(['Same line.'], VOICE)
    const [b] = await narrate(['Same line.'], VOICE)
    const [c] = await narrate(['Same line.'], { voice: 'bf_emma', speed: 1 })
    const [d] = await narrate(['Same line.'], { voice: 'af_heart', speed: 1.2 })
    expect(b!.file).toBe(a!.file)
    expect(c!.file).not.toBe(a!.file)
    expect(d!.file).not.toBe(a!.file)
  })

  it('keeps the clips in the shared cache folder', async () => {
    installVoice(); makesFiles()
    const [a] = await narrate(['Hi.'], VOICE)
    expect(path.dirname(a!.file!)).toBe(path.join(home, 'audio'))
  })

  it('measures clips in milliseconds', async () => {
    installVoice()
    run.mockImplementation(async (cmd, _a, opts) => {
      if (cmd === 'ffprobe') return '7.312000\n'
      for (const job of JSON.parse(opts!.input!) as { out: string }[]) fs.writeFileSync(job.out, 'wav')
      return ''
    })
    expect((await narrate(['Hi.'], VOICE))[0]!.ms).toBeCloseTo(7312, 5)
  })
})
