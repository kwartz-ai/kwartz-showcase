import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Frame, Layout } from '../src/types.ts'

// FFmpeg is replaced by a recorder of its command lines, so these tests check what
// the encoder asks for, not what FFmpeg does with it.
const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>()
vi.mock('../src/util.ts', async (original) => ({ ...(await original<typeof import('../src/util.ts')>()), run }))

const { blendDissolves, encode, loudness, planDissolve } = await import('../src/encode.ts')

const LAYOUT: Layout = { width: 1920, height: 1080, zoom: 1.25, fps: 30 }
const LOUDNORM = (i: number, tp: number) => `[Parsed_loudnorm_0 @ 0x1]\n{\n\t"input_i" : "${i}",\n\t"input_tp" : "${tp}",\n\t"input_lra" : "3.0"\n}\n`
const frames = (...ts: number[]): Frame[] => ts.map((t) => ({ file: `f${t}.jpg`, t }))

let dir: string
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kav-enc-'))
  run.mockReset()
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

/** Stand in for FFmpeg: write the blend frames a dissolve call asks for, and
 *  answer a loudness measurement. */
function fakeFfmpeg(lufs = -22, peak = -6) {
  run.mockImplementation(async (_cmd, args) => {
    const out = args.at(-1)!
    if (out.includes('%02d')) {
      const n = Number(args[args.indexOf('-frames:v') + 1])
      for (let k = 1; k <= n; k++) fs.writeFileSync(out.replace('%02d', String(k).padStart(2, '0')), 'jpg')
    }
    return args.includes('loudnorm=print_format=json') ? LOUDNORM(lufs, peak) : ''
  })
}
const call = (i: number) => run.mock.calls[i]![1]
const filterOf = (args: string[]) => args[args.indexOf('-filter_complex') + 1]!

describe('planDissolve', () => {
  const fs6 = frames(0, 100, 200, 300, 900, 1000)

  it('holds the last picture from before the change', () => {
    expect(planDissolve(fs6, { t1: 250, t2: 950, ms: 300 }, 30)!.a.file).toBe('f200.jpg')
  })
  it('blends into the last picture from before the end mark', () => {
    expect(planDissolve(fs6, { t1: 250, t2: 950, ms: 300 }, 30)!.b.file).toBe('f900.jpg')
  })
  it('uses a frame that lands exactly on a mark', () => {
    const plan = planDissolve(fs6, { t1: 200, t2: 900, ms: 300 }, 30)!
    expect(plan.a.file).toBe('f200.jpg')
    expect(plan.b.file).toBe('f900.jpg')
  })
  it('makes one blended frame per frame of the dissolve', () => {
    expect(planDissolve(fs6, { t1: 250, t2: 950, ms: 300 }, 30)!.n).toBe(9)
    expect(planDissolve(fs6, { t1: 250, t2: 950, ms: 500 }, 30)!.n).toBe(15)
    expect(planDissolve(fs6, { t1: 250, t2: 950, ms: 300 }, 60)!.n).toBe(18)
  })
  it('never plans fewer than two blended frames', () => {
    expect(planDissolve(fs6, { t1: 250, t2: 950, ms: 10 }, 30)!.n).toBe(2)
  })
  it('places the blend in the last stretch before the end mark', () => {
    const plan = planDissolve(fs6, { t1: 250, t2: 950, ms: 300 }, 30)!
    expect(plan.times[0]).toBe(650)
    expect(plan.times.at(-1)!).toBeLessThan(950)
    for (let i = 1; i < plan.times.length; i++) expect(plan.times[i]! - plan.times[i - 1]!).toBeCloseTo(1000 / 30, 5)
  })
  it('drops blend times that would fall before the held picture', () => {
    // the dissolve is longer than the gap, so its start would be before frame A
    const plan = planDissolve(frames(0, 500, 600), { t1: 510, t2: 610, ms: 400 }, 30)!
    expect(plan.times.every((t) => t > plan.a.t)).toBe(true)
    expect(plan.times.length).toBeLessThan(plan.n)
  })
  it('has nothing to blend when the screen did not change', () => {
    expect(planDissolve(fs6, { t1: 320, t2: 700, ms: 300 }, 30)).toBeNull()
  })
  it('falls back to the first frame when the change starts before any frame', () => {
    const plan = planDissolve(frames(100, 800), { t1: 50, t2: 900, ms: 300 }, 30)!
    expect(plan.a.file).toBe('f100.jpg')
    expect(plan.b.file).toBe('f800.jpg')
  })
  it('has nothing to blend when no frame exists before the end mark', () => {
    expect(planDissolve(frames(500), { t1: 10, t2: 20, ms: 300 }, 30)).toBeNull()
  })
  it('has nothing to blend with no frames at all', () => {
    expect(planDissolve([], { t1: 0, t2: 100, ms: 300 }, 30)).toBeNull()
  })
})

describe('blendDissolves', () => {
  it('returns the same frames, and starts nothing, when there are no dissolves', async () => {
    const input = frames(0, 100)
    expect(await blendDissolves(input, [], dir, 30)).toBe(input)
    expect(run).not.toHaveBeenCalled()
  })

  it('drops what was filmed during the change and puts the blend there', async () => {
    fakeFfmpeg()
    const input = frames(0, 100, 200, 300, 400, 900, 1000)       // 300 and 400 are the loading state
    const out = await blendDissolves(input, [{ t1: 250, t2: 950, ms: 300 }], dir, 30)
    const files = out.map((f) => path.basename(f.file))
    expect(files).not.toContain('f300.jpg')
    expect(files).not.toContain('f400.jpg')
    expect(files.filter((f) => f.startsWith('d0_'))).toHaveLength(9)
    expect(files.slice(0, 3)).toEqual(['f0.jpg', 'f100.jpg', 'f200.jpg'])
    expect(files.at(-1)).toBe('f1000.jpg')
  })

  it('shows the new screen from the end mark on', async () => {
    fakeFfmpeg()
    const out = await blendDissolves(frames(0, 200, 900, 1000), [{ t1: 250, t2: 950, ms: 300 }], dir, 30)
    expect(out.find((f) => f.t === 950)!.file).toBe('f900.jpg')
  })

  it('keeps the frames in time order', async () => {
    fakeFfmpeg()
    const out = await blendDissolves(frames(0, 200, 900, 1000), [{ t1: 250, t2: 950, ms: 300 }], dir, 30)
    for (let i = 1; i < out.length; i++) expect(out[i]!.t).toBeGreaterThanOrEqual(out[i - 1]!.t)
  })

  it('does not change the recorded frame list', async () => {
    fakeFfmpeg()
    const input = frames(0, 200, 900, 1000)
    const copy = structuredClone(input)
    await blendDissolves(input, [{ t1: 250, t2: 950, ms: 300 }], dir, 30)
    expect(input).toEqual(copy)
  })

  it('asks FFmpeg for a fade between the two pictures', async () => {
    fakeFfmpeg()
    await blendDissolves(frames(0, 200, 900), [{ t1: 250, t2: 950, ms: 300 }], dir, 30)
    const args = call(0)
    expect(args.filter((a) => a === '-i').length).toBe(2)
    expect(args).toContain('f200.jpg')
    expect(args).toContain('f900.jpg')
    expect(filterOf(args)).toMatch(/xfade=transition=fade:duration=0\.300:offset=0/)
    expect(args[args.indexOf('-frames:v') + 1]).toBe('9')
  })

  it('handles several dissolves, each from the result of the last', async () => {
    fakeFfmpeg()
    const out = await blendDissolves(frames(0, 200, 900, 1500, 2400, 2600),
      [{ t1: 250, t2: 950, ms: 300 }, { t1: 1600, t2: 2450, ms: 300 }], dir, 30)
    const files = out.map((f) => path.basename(f.file))
    expect(files.some((f) => f.startsWith('d0_'))).toBe(true)
    expect(files.some((f) => f.startsWith('d1_'))).toBe(true)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('skips a dissolve where nothing changed, without starting FFmpeg', async () => {
    fakeFfmpeg()
    const input = frames(0, 100, 1000)
    const out = await blendDissolves(input, [{ t1: 300, t2: 700, ms: 300 }], dir, 30)
    expect(out).toEqual(input)
    expect(run).not.toHaveBeenCalled()
  })

  it('clears blends left over from an earlier render', async () => {
    fakeFfmpeg()
    fs.mkdirSync(path.join(dir, 'blends'))
    fs.writeFileSync(path.join(dir, 'blends', 'stale.jpg'), 'x')
    await blendDissolves(frames(0, 200, 900), [{ t1: 250, t2: 950, ms: 300 }], dir, 30)
    expect(fs.existsSync(path.join(dir, 'blends', 'stale.jpg'))).toBe(false)
  })
})

describe('loudness', () => {
  it('reads integrated loudness and true peak from FFmpeg', async () => {
    run.mockResolvedValue(LOUDNORM(-21.2, -1.58))
    expect(await loudness('a.wav')).toEqual({ lufs: -21.2, peak: -1.58 })
  })
  it('reads the report from stderr, where FFmpeg writes it', async () => {
    run.mockResolvedValue(LOUDNORM(-16, -1))
    await loudness('a.wav')
    expect(run.mock.calls[0]![2]).toEqual({ stderr: true })
  })
  it('ignores what FFmpeg prints after the report', async () => {
    run.mockResolvedValue(LOUDNORM(-18.5, -2) + '[out#0/null @ 0x2] video:0KiB audio:1KiB\n')
    expect((await loudness('a.wav')).lufs).toBe(-18.5)
  })
})

describe('encode', () => {
  const two = () => frames(0, 500)
  const input = (over: object = {}) => ({ frames: two(), endMs: 2000, clips: [], layout: LAYOUT, outFile: path.join(dir, 'o.mp4'), workDir: dir, ...over })

  it('refuses a recording with no frames, and says what to do', async () => {
    await expect(encode(input({ frames: [] }))).rejects.toThrow(/no frames were captured[\s\S]*render again/)
  })

  it('writes each frame with how long it lasts', async () => {
    fakeFfmpeg()
    await encode(input({ frames: frames(0, 500, 1250) }))
    const list = fs.readFileSync(path.join(dir, 'frames.ffconcat'), 'utf8').split('\n')
    expect(list[0]).toBe('ffconcat version 1.0')
    expect(list.filter((l) => l.startsWith('duration'))).toEqual(['duration 0.5000', 'duration 0.7500', 'duration 0.7500'])
  })

  it('lets the first frame also cover the time before it arrived', async () => {
    fakeFfmpeg()
    await encode(input({ frames: frames(300, 800) }))
    const list = fs.readFileSync(path.join(dir, 'frames.ffconcat'), 'utf8')
    expect(list).toContain('duration 0.8000')
  })

  it('repeats the last frame, as the concat format needs', async () => {
    fakeFfmpeg()
    await encode(input())
    const files = fs.readFileSync(path.join(dir, 'frames.ffconcat'), 'utf8').split('\n').filter((l) => l.startsWith('file'))
    expect(files).toHaveLength(3)
    expect(files.at(-1)).toBe(files.at(-2))
  })

  it('writes forward slashes in frame paths, which FFmpeg needs on Windows', async () => {
    fakeFfmpeg()
    await encode(input({ frames: [{ file: 'C:\\out\\f0.jpg', t: 0 }] }))
    expect(fs.readFileSync(path.join(dir, 'frames.ffconcat'), 'utf8')).toContain("file 'C:/out/f0.jpg'")
  })

  it('encodes picture only, in one run, when there is no sound', async () => {
    fakeFfmpeg()
    await encode(input())
    expect(run).toHaveBeenCalledTimes(1)
    const args = call(0)
    expect(args).not.toContain('-c:a')
    expect(args[args.indexOf('-vf') + 1]).toBe('fps=30,scale=1920:1080,format=yuv420p')
    expect(args).toEqual(expect.arrayContaining(['-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart', '-t', '2.000']))
  })

  it('follows the layout for size and frame rate', async () => {
    fakeFfmpeg()
    await encode(input({ layout: { width: 1280, height: 720, zoom: 1, fps: 60 } }))
    expect(call(0)[call(0).indexOf('-vf') + 1]).toBe('fps=60,scale=1280:720,format=yuv420p')
  })

  it('places each narration clip at its scene start', async () => {
    fakeFfmpeg()
    await encode(input({ clips: [{ file: 'a.wav', at: 350 }, { file: 'b.wav', at: 9123.6 }] }))
    const f = filterOf(call(0))
    expect(f).toContain('[0:a]aresample=48000,volume=1,adelay=350:all=1[vo0]')
    expect(f).toContain('[1:a]aresample=48000,volume=1,adelay=9124:all=1[vo1]')
    expect(f).toContain('[vo0][vo1]amix=inputs=2:normalize=0[vo]')
  })

  it('places each effect at its event time, at its own level', async () => {
    fakeFfmpeg()
    await encode(input({ clips: [{ file: 'a.wav', at: 0 }], sfx: [{ file: 'click.mp3', at: 1500, gain: 0.4 }] }))
    const f = filterOf(call(0))
    expect(f).toContain('[1:a]aresample=48000,volume=0.4,adelay=1500:all=1[fx1]')
    expect(f).toMatch(/\[vo\]\[fx\]amix=inputs=2:normalize=0,apad\[a\]/)
  })

  it('never delays a sound by a negative time', async () => {
    fakeFfmpeg()
    await encode(input({ clips: [{ file: 'a.wav', at: -40 }] }))
    expect(filterOf(call(0))).toContain('adelay=0:all=1')
  })

  it('loops the music, fades it in and out, and ducks it under the voice', async () => {
    fakeFfmpeg()
    await encode(input({ endMs: 20000, clips: [{ file: 'a.wav', at: 0 }], music: 'pad.wav', musicGain: 0.4 }))
    const args = call(0)
    expect(args.slice(args.indexOf('pad.wav') - 3, args.indexOf('pad.wav'))).toEqual(['-stream_loop', '-1', '-i'])
    const f = filterOf(args)
    expect(f).toContain('atrim=0:20.000,volume=0.4,afade=t=in:d=2,afade=t=out:st=17.00:d=3[bed]')
    expect(f).toContain('[vo]asplit=2[vo1][vokey]')
    expect(f).toMatch(/\[bed\]\[vokey\]sidechaincompress=[^[]*\[duck\]/)
    expect(f).toMatch(/\[vo1\]\[duck\]amix=inputs=2/)
  })

  it('plays music with no ducking when there is no voice', async () => {
    fakeFfmpeg()
    await encode(input({ music: 'pad.wav' }))
    const f = filterOf(call(0))
    expect(f).not.toContain('sidechaincompress')
    expect(f).toMatch(/\[bed\]amix=inputs=1/)
  })

  it('does not start the music fade-out before zero on a very short video', async () => {
    fakeFfmpeg()
    await encode(input({ endMs: 1500, music: 'pad.wav' }))
    expect(filterOf(call(0))).toContain('afade=t=out:st=0.00:d=3')
  })

  it('mixes, measures, then encodes: three runs when there is sound', async () => {
    fakeFfmpeg()
    await encode(input({ clips: [{ file: 'a.wav', at: 0 }] }))
    expect(run).toHaveBeenCalledTimes(3)
    expect(call(0).at(-1)).toBe(path.join(dir, 'mix.wav'))
    expect(call(1)).toContain('loudnorm=print_format=json')
    expect(call(2).at(-1)).toBe(path.join(dir, 'o.mp4'))
  })

  it('applies one fixed gain that brings the mix to the target', async () => {
    fakeFfmpeg(-22, -6)
    await encode(input({ clips: [{ file: 'a.wav', at: 0 }] }))
    expect(filterOf(call(2))).toContain('volume=6.00dB,alimiter=limit=0.84:level=false')
  })

  it('turns a loud mix down', async () => {
    fakeFfmpeg(-11.5, -0.5)
    await encode(input({ clips: [{ file: 'a.wav', at: 0 }] }))
    expect(filterOf(call(2))).toContain('volume=-4.50dB')
  })

  it('follows a custom loudness target', async () => {
    fakeFfmpeg(-22, -6)
    await encode(input({ clips: [{ file: 'a.wav', at: 0 }], lufs: -14 }))
    expect(filterOf(call(2))).toContain('volume=8.00dB')
  })

  it('never uses an automatic leveller on the final mix', async () => {
    fakeFfmpeg()
    await encode(input({ clips: [{ file: 'a.wav', at: 0 }], music: 'pad.wav' }))
    expect(filterOf(call(2))).not.toContain('loudnorm')
    expect(filterOf(call(0))).not.toContain('loudnorm')
  })

  it('writes AAC at 48 kHz with the picture', async () => {
    fakeFfmpeg()
    await encode(input({ clips: [{ file: 'a.wav', at: 0 }] }))
    expect(call(2)).toEqual(expect.arrayContaining(['-c:a', 'aac', '-ar', '48000', '-c:v', 'libx264']))
  })

  it('removes the temporary mix when it is done', async () => {
    fakeFfmpeg()
    run.mockImplementation(async (_c, args) => {
      if (args.at(-1)!.endsWith('mix.wav')) fs.writeFileSync(args.at(-1)!, 'wav')
      return args.includes('loudnorm=print_format=json') ? LOUDNORM(-20, -3) : ''
    })
    await encode(input({ clips: [{ file: 'a.wav', at: 0 }] }))
    expect(fs.existsSync(path.join(dir, 'mix.wav'))).toBe(false)
  })

  it('blends dissolves before building the frame list', async () => {
    fakeFfmpeg()
    await encode(input({ frames: frames(0, 200, 900, 1000), dissolves: [{ t1: 250, t2: 950, ms: 300 }] }))
    expect(fs.readFileSync(path.join(dir, 'frames.ffconcat'), 'utf8')).toContain('d0_01.jpg')
  })

  it('passes an FFmpeg failure on', async () => {
    run.mockRejectedValue(new Error('ffmpeg exited 1'))
    await expect(encode(input())).rejects.toThrow('ffmpeg exited 1')
  })
})
