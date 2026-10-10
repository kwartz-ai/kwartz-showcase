// One-time machine setup, and the check that tells you what is missing.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { chromium } from 'playwright'
import { showcaseHome, run } from '../core/util.ts'
import { KOKORO_FILES, KOKORO_RELEASE, voicePaths, voiceReady } from '../audio/tts.ts'

type Log = (line: string) => void

async function has(cmd: string, args: string[]): Promise<string | null> {
  try {
    return ((await run(cmd, args, { stderr: false })) || 'found').split('\n')[0]!.trim()
  } catch {
    return null
  }
}

async function findPython(): Promise<string | null> {
  for (const cmd of ['python', 'python3']) if (await has(cmd, ['--version'])) return cmd
  return null
}

async function download(url: string, file: string, log: Log): Promise<void> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status}): ${url}`)
  const total = Number(res.headers.get('content-length') ?? 0)
  const tmp = `${file}.part`
  const out = fs.createWriteStream(tmp)
  let got = 0, next = 0.1
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    out.write(chunk)
    got += chunk.length
    if (total && got / total >= next) { log(`  ${path.basename(file)} ${Math.round(got / total * 100)}%`); next += 0.1 }
  }
  await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => e ? reject(e) : resolve()))
  fs.renameSync(tmp, file)
}

/** Playwright's own command line, run with whatever is running the kit (Bun or
 *  Node), so the browser it installs matches the Playwright the kit uses. */
export function playwrightCli(): string {
  const entry = createRequire(import.meta.url).resolve('playwright')
  return path.join(path.dirname(entry), 'cli.js')
}

/** Install the browser and the voice. Safe to run again: finished steps are skipped. */
export async function setup(log: Log = console.log): Promise<void> {
  log('1/3 browser: installing Chromium for Playwright')
  await run(process.execPath, [playwrightCli(), 'install', 'chromium'])

  const p = voicePaths()
  log(`2/3 voice: Python environment in ${p.venv}`)
  if (!fs.existsSync(p.python)) {
    const python = await findPython()
    if (!python) throw new Error('Python 3.10 to 3.13 is needed for the voice. Install it, then run "showcase setup" again. (Draft renders work without it.)')
    fs.mkdirSync(showcaseHome(), { recursive: true })
    await run(python, ['-m', 'venv', p.venv])
  }
  await run(p.python, ['-m', 'pip', 'install', '-q', '-U', 'kokoro-onnx', 'soundfile'])

  log('3/3 voice: model files (about 350 MB, downloaded once)')
  fs.mkdirSync(path.dirname(p.model), { recursive: true })
  for (const name of KOKORO_FILES) {
    const file = path.join(path.dirname(p.model), name)
    if (!fs.existsSync(file)) await download(`${KOKORO_RELEASE}/${name}`, file, log)
  }
  log('setup done')
}

/** Report what is installed. Returns false when a full render would fail. */
export async function doctor(log: Log = console.log): Promise<boolean> {
  const ffmpeg = await has('ffmpeg', ['-version'])
  const ffprobe = await has('ffprobe', ['-version'])
  const python = await findPython()
  let browser: string | null = null
  try {
    const exe = chromium.executablePath()
    browser = fs.existsSync(exe) ? exe : null
  } catch { /* not installed */ }
  const voice = voiceReady()
  const row = (ok: boolean, name: string, detail: string) => log(`${ok ? 'ok  ' : 'MISSING'}  ${name.padEnd(9)} ${detail}`)
  row(!!ffmpeg, 'ffmpeg', ffmpeg ?? 'install FFmpeg and put it on PATH')
  row(!!ffprobe, 'ffprobe', ffprobe ?? 'comes with FFmpeg')
  row(!!browser, 'chromium', browser ?? 'run "showcase setup"')
  row(!!python, 'python', python ? `${python} (needed only to set the voice up)` : 'needed for the voice; draft renders work without it')
  row(voice, 'voice', voice ? `Kokoro in ${showcaseHome()}` : 'run "showcase setup"; draft renders work without it')
  return !!ffmpeg && !!ffprobe && !!browser && voice
}
