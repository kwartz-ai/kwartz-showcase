// Sound effects and the music bed.
//
// The click is from soundcn (https://github.com/kapishdima/soundcn), which ships
// each sound as base64 inside a small module; only sounds its registry marks CC0
// are accepted. The callout and dissolve sounds are made here with FFmpeg, low and
// soft on purpose: an early version used a bright interface sound on every
// highlight, and reviewers heard it as a squeak. Any sound that repeats many times
// should sit below about 1 kHz. The music bed is generated too (slow sine chords),
// so it carries no licence at all.
import fs from 'node:fs'
import path from 'node:path'
import type { Clip, EventKind, StageEvent } from './types.ts'
import { kavHome, run } from './util.ts'

type Spec = { gain: number } & ({ soundcn: string } | { make: string[] })

/** Event kind -> where its sound comes from and how loud it sits (the voice is 1). */
export const SFX: Record<EventKind, Spec> = {
  click: { soundcn: 'click-001', gain: 0.4 },
  // a low, round "tok" that dies away in a tenth of a second
  callout: {
    gain: 0.35,
    make: ['-f', 'lavfi', '-i', "aevalsrc='0.55*sin(2*PI*210*t)*exp(-26*t)+0.2*sin(2*PI*420*t)*exp(-40*t)':d=0.2:s=48000",
      '-af', 'afade=t=in:d=0.004,lowpass=f=1100'],
  },
  // a short breath of filtered noise that swells and fades
  whoosh: {
    gain: 0.9,
    make: ['-f', 'lavfi', '-i', 'anoisesrc=d=0.55:c=pink:a=0.5:r=48000',
      '-af', 'highpass=f=140,lowpass=f=650,afade=t=in:d=0.24,afade=t=out:st=0.24:d=0.31'],
  },
}

const soundDir = () => path.join(kavHome(), 'sfx')

async function soundFile(kind: EventKind): Promise<string> {
  const spec = SFX[kind]
  fs.mkdirSync(soundDir(), { recursive: true })
  if ('make' in spec) {
    const file = path.join(soundDir(), `made-${kind}.wav`)
    if (!fs.existsSync(file)) await run('ffmpeg', ['-y', '-v', 'error', ...spec.make, file])
    return file
  }
  const name = spec.soundcn
  const file = path.join(soundDir(), `${name}.mp3`)
  if (fs.existsSync(file)) return file
  const res = await fetch(`https://www.soundcn.xyz/r/${name}.json`)
  if (!res.ok) throw new Error(`soundcn: ${name} not found (${res.status})`)
  const item = await res.json() as { meta?: { license?: string }; files: { content: string }[] }
  if (item.meta?.license !== 'CC0') throw new Error(`soundcn: ${name} is ${item.meta?.license}; only CC0 sounds are allowed`)
  const b64 = item.files.map((f) => f.content).join('\n').match(/data:audio\/[a-z0-9]+;base64,([A-Za-z0-9+/=]+)/)?.[1]
  if (!b64) throw new Error(`soundcn: no audio found in ${name}`)
  fs.writeFileSync(file, Buffer.from(b64, 'base64'))
  return file
}

/** Stage events -> clips for the encoder. */
export async function effects(events: StageEvent[]): Promise<Clip[]> {
  const out: Clip[] = []
  for (const e of events) out.push({ file: await soundFile(e.kind), at: Math.max(0, e.t), gain: SFX[e.kind].gain })
  return out
}

// Four slow chords (Fmaj7, C/E, Dm9, Gsus), each note two sines a hair apart so the
// pad moves instead of droning. 8 s per chord, 6 s apart, in a 24 s loop.
const CHORDS = [
  [87.31, 174.61, 220.0, 261.63, 329.63],
  [82.41, 164.81, 196.0, 261.63, 329.63],
  [73.42, 146.83, 174.61, 220.0, 329.63],
  [98.0, 196.0, 261.63, 293.66, 392.0],
]

/** The built-in music bed: generated once, then reused by every render. */
export async function musicBed(): Promise<string> {
  const file = path.join(kavHome(), 'music-pad.wav')
  if (fs.existsSync(file)) return file
  fs.mkdirSync(kavHome(), { recursive: true })
  const args = ['-y', '-v', 'error']
  const filters: string[] = []
  let n = 0
  const chordLabels = CHORDS.map((notes, c) => {
    const voices = notes.flatMap((hz, k) => [hz - 0.35, hz + 0.35].map((f) => {
      args.push('-f', 'lavfi', '-t', '8', '-i', `sine=frequency=${f.toFixed(2)}:sample_rate=48000`)
      // the bass note is quieter so small speakers do not rattle
      filters.push(`[${n}:a]volume=${k === 0 ? 0.05 : 0.09}[s${n}]`)
      return `[s${n++}]`
    }))
    filters.push(`${voices.join('')}amix=inputs=${voices.length}:normalize=0,afade=t=in:d=2.5,afade=t=out:st=5.5:d=2.5,adelay=${c * 6000}:all=1[c${c}]`)
    return `[c${c}]`
  })
  // the last chord's tail (24-26 s) is folded onto the start, so the loop has no seam
  filters.push(`${chordLabels.join('')}amix=inputs=${CHORDS.length}:normalize=0,asplit=2[m1][m2]`,
    '[m1]atrim=0:24[head]', '[m2]atrim=24:26,asetpts=PTS-STARTPTS[tail]',
    '[head][tail]amix=inputs=2:normalize=0,lowpass=f=1400,volume=1.4[out]')
  args.push('-filter_complex', filters.join(';'), '-map', '[out]', file)
  await run('ffmpeg', args)
  return file
}
