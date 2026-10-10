// Narration: one WAV per scene from Kokoro (local, free, no account), cached by
// text and voice so only edited lines are generated again.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { asset } from '../core/paths.ts'
import type { VoiceOptions } from '../core/types.ts'
import { showcaseHome, run } from '../core/util.ts'

export const KOKORO_FILES = ['kokoro-v1.0.onnx', 'voices-v1.0.bin'] as const
export const KOKORO_RELEASE = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0'

export const voicePaths = () => {
  const home = showcaseHome()
  const venv = path.join(home, 'kokoro-venv')
  return {
    venv,
    python: process.platform === 'win32' ? path.join(venv, 'Scripts', 'python.exe') : path.join(venv, 'bin', 'python'),
    model: path.join(home, 'kokoro', KOKORO_FILES[0]),
    voices: path.join(home, 'kokoro', KOKORO_FILES[1]),
    audio: path.join(home, 'audio'),
    script: asset('python', 'kokoro_tts.py'),
  }
}

export function voiceReady(): boolean {
  const p = voicePaths()
  return [p.python, p.model, p.voices].every((f) => fs.existsSync(f))
}

/** About 3 spoken words a second: the pace Kokoro reads at, measured over three
 *  real videos (a first guess of 2.6 made drafts about 15% longer than the result). */
export const WORDS_PER_SECOND = 3
export function estimateMs(text: string): number {
  return Math.max(2500, text.trim().split(/\s+/).length / WORDS_PER_SECOND * 1000)
}

async function wavMs(file: string): Promise<number> {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return parseFloat(out) * 1000
}

export interface Narration { file: string | null; ms: number }

/** One clip per line, in order. In draft mode nothing is generated and each line
 *  gets an estimated length, so the picture can be checked before the voice works. */
export async function narrate(lines: string[], opts: VoiceOptions & { draft?: boolean }): Promise<Narration[]> {
  if (opts.draft) return lines.map((t) => ({ file: null, ms: estimateMs(t) }))
  if (!voiceReady()) throw new Error('The voice is not set up. Run "showcase setup" once, or render with --draft.')
  const p = voicePaths()
  fs.mkdirSync(p.audio, { recursive: true })
  const clips = lines.map((text) => {
    const key = crypto.createHash('sha1').update(`${opts.voice}|${opts.speed}|${text}`).digest('hex').slice(0, 16)
    return { text, out: path.join(p.audio, `${key}.wav`) }
  })
  const todo = clips.filter((c) => !fs.existsSync(c.out))
  if (todo.length) {
    console.log(`narration: generating ${todo.length} of ${clips.length} clips with Kokoro (${opts.voice})`)
    await run(p.python, [p.script, p.model, p.voices, opts.voice, String(opts.speed)], { input: JSON.stringify(todo) })
  }
  const out: Narration[] = []
  for (const c of clips) out.push({ file: c.out, ms: await wavMs(c.out) })
  return out
}
