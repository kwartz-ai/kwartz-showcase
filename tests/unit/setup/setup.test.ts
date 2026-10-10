import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const run = vi.fn<(cmd: string, args: string[], opts?: object) => Promise<string>>()
const executablePath = vi.fn<() => string>()
vi.mock('../../../src/core/util.ts', async (original) => ({ ...(await original<typeof import('../../../src/core/util.ts')>()), run }))
vi.mock('playwright', () => ({ chromium: { executablePath } }))

const { doctor, playwrightCli, setup } = await import('../../../src/setup/setup.ts')
const { KOKORO_FILES, KOKORO_RELEASE, voicePaths } = await import('../../../src/audio/tts.ts')

let home: string
let lines: string[]
const log = (l: string) => lines.push(l)
const row = (name: string) => lines.find((l) => new RegExp(`^(ok|MISSING)\\s+${name}\\b`).test(l))!

/** A machine where the listed programs exist. `venv` also creates the environment's Python. */
function machine(has: string[]) {
  run.mockImplementation(async (cmd, args) => {
    if (args.join(' ') === '-m venv ' + voicePaths().venv) {
      fs.mkdirSync(path.dirname(voicePaths().python), { recursive: true })
      fs.writeFileSync(voicePaths().python, '')
      return ''
    }
    if (cmd === process.execPath || cmd === voicePaths().python) return ''
    if (!has.includes(cmd)) throw new Error(`could not start ${cmd}`)
    return `${cmd} version 1.2.3\nsecond line`
  })
}
function installVoice() {
  const p = voicePaths()
  fs.mkdirSync(path.dirname(p.python), { recursive: true }); fs.writeFileSync(p.python, '')
  fs.mkdirSync(path.dirname(p.model), { recursive: true }); fs.writeFileSync(p.model, ''); fs.writeFileSync(p.voices, '')
}
function browserInstalled() {
  const exe = path.join(home, 'chrome.exe')
  fs.writeFileSync(exe, '')
  executablePath.mockReturnValue(exe)
}
/** fetch that streams `body` in two chunks. */
const downloads = (body = 'MODELDATA', ok = true, status = 200) => vi.stubGlobal('fetch', vi.fn(async () => ({
  ok, status,
  headers: { get: () => String(body.length) },
  body: ok ? (async function* () { yield Buffer.from(body.slice(0, 4)); yield Buffer.from(body.slice(4)) })() : null,
})))

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-setup-'))
  vi.stubEnv('SHOWCASE_HOME', home)
  lines = []
  run.mockReset()
  executablePath.mockReset()
})
afterEach(() => fs.rmSync(home, { recursive: true, force: true }))

describe('doctor', () => {
  it('passes on a machine with everything, and shows one row per tool', async () => {
    machine(['ffmpeg', 'ffprobe', 'python']); installVoice(); browserInstalled()
    expect(await doctor(log)).toBe(true)
    expect(lines).toHaveLength(5)
    expect(lines.every((l) => l.startsWith('ok'))).toBe(true)
  })
  it('shows the first line of each tool\'s version', async () => {
    machine(['ffmpeg', 'ffprobe', 'python']); installVoice(); browserInstalled()
    await doctor(log)
    expect(row('ffmpeg')).toMatch(/ffmpeg version 1\.2\.3$/)
  })
  it('fails without FFmpeg and says what to do', async () => {
    machine(['ffprobe', 'python']); installVoice(); browserInstalled()
    expect(await doctor(log)).toBe(false)
    expect(row('ffmpeg')).toMatch(/^MISSING\s+ffmpeg\s+install FFmpeg and put it on PATH/)
  })
  it('fails without ffprobe', async () => {
    machine(['ffmpeg', 'python']); installVoice(); browserInstalled()
    expect(await doctor(log)).toBe(false)
    expect(row('ffprobe')).toMatch(/^MISSING/)
  })
  it('fails when Playwright has no browser, and points at setup', async () => {
    machine(['ffmpeg', 'ffprobe', 'python']); installVoice()
    executablePath.mockImplementation(() => { throw new Error('not installed') })
    expect(await doctor(log)).toBe(false)
    expect(row('chromium')).toMatch(/MISSING\s+chromium\s+run "showcase setup"/)
  })
  it('fails when the browser path is known but the file is gone', async () => {
    machine(['ffmpeg', 'ffprobe', 'python']); installVoice()
    executablePath.mockReturnValue(path.join(home, 'gone.exe'))
    expect(await doctor(log)).toBe(false)
  })
  it('fails without the voice, and says drafts still work', async () => {
    machine(['ffmpeg', 'ffprobe', 'python']); browserInstalled()
    expect(await doctor(log)).toBe(false)
    expect(row('voice')).toMatch(/MISSING\s+voice\s+run "showcase setup"; draft renders work without it/)
  })
  it('passes without Python once the voice is installed, since Python only sets it up', async () => {
    machine(['ffmpeg', 'ffprobe']); installVoice(); browserInstalled()
    expect(await doctor(log)).toBe(true)
    expect(row('python')).toMatch(/^MISSING/)
  })
  it('finds Python under the name python3', async () => {
    machine(['ffmpeg', 'ffprobe', 'python3']); installVoice(); browserInstalled()
    await doctor(log)
    expect(row('python')).toMatch(/^ok\s+python\s+python3/)
  })
  it('reports where the voice lives', async () => {
    machine(['ffmpeg', 'ffprobe', 'python']); installVoice(); browserInstalled()
    await doctor(log)
    expect(row('voice')).toContain(home)
  })
})

describe('setup', () => {
  const calls = () => run.mock.calls.map(([cmd, args]) => `${path.basename(cmd)} ${args.join(' ')}`)

  it('installs Chromium through Playwright, using the running runtime', async () => {
    machine(['python']); downloads()
    await setup(log)
    expect(run.mock.calls[0]).toEqual([process.execPath, [playwrightCli(), 'install', 'chromium']])
    expect(fs.existsSync(playwrightCli())).toBe(true)
  })
  it('creates the Python environment for the voice', async () => {
    machine(['python']); downloads()
    await setup(log)
    expect(run).toHaveBeenCalledWith('python', ['-m', 'venv', voicePaths().venv])
  })
  it('uses python3 when that is the name on this machine', async () => {
    machine(['python3']); downloads()
    await setup(log)
    expect(run).toHaveBeenCalledWith('python3', ['-m', 'venv', voicePaths().venv])
  })
  it('keeps an environment that already exists', async () => {
    machine(['python']); downloads()
    fs.mkdirSync(path.dirname(voicePaths().python), { recursive: true }); fs.writeFileSync(voicePaths().python, '')
    await setup(log)
    expect(calls().some((c) => c.includes('-m venv'))).toBe(false)
  })
  it('installs the voice packages into that environment', async () => {
    machine(['python']); downloads()
    await setup(log)
    expect(run).toHaveBeenCalledWith(voicePaths().python, ['-m', 'pip', 'install', '-q', '-U', 'kokoro-onnx', 'soundfile'])
  })
  it('explains what is needed when the machine has no Python', async () => {
    machine([]); downloads()
    await expect(setup(log)).rejects.toThrow(/Python 3\.10 to 3\.13 is needed for the voice[\s\S]*Draft renders work without it/)
  })
  it('downloads both model files from the Kokoro release', async () => {
    machine(['python']); downloads('MODELDATA')
    await setup(log)
    expect(vi.mocked(fetch).mock.calls.map((c) => c[0])).toEqual(KOKORO_FILES.map((f) => `${KOKORO_RELEASE}/${f}`))
    expect(fs.readFileSync(voicePaths().model, 'utf8')).toBe('MODELDATA')
    expect(fs.readFileSync(voicePaths().voices, 'utf8')).toBe('MODELDATA')
  })
  it('downloads only what is missing', async () => {
    machine(['python']); downloads()
    fs.mkdirSync(path.dirname(voicePaths().model), { recursive: true }); fs.writeFileSync(voicePaths().model, 'already here')
    await setup(log)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fs.readFileSync(voicePaths().model, 'utf8')).toBe('already here')
  })
  it('downloads nothing the second time', async () => {
    machine(['python']); downloads()
    await setup(log)
    vi.mocked(fetch).mockClear()
    await setup(log)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('leaves no half-written model behind', async () => {
    machine(['python']); downloads()
    await setup(log)
    expect(fs.readdirSync(path.dirname(voicePaths().model)).filter((f) => f.endsWith('.part'))).toEqual([])
  })
  it('fails clearly when a download is refused, and writes no model file', async () => {
    machine(['python']); downloads('', false, 503)
    await expect(setup(log)).rejects.toThrow(/download failed \(503\)/)
    expect(fs.existsSync(voicePaths().model)).toBe(false)
  })
  it('reports download progress and each of its three steps', async () => {
    machine(['python']); downloads('x'.repeat(40))
    await setup(log)
    expect(lines.filter((l) => /^[123]\/3 /.test(l))).toHaveLength(3)
    expect(lines.some((l) => /kokoro-v1\.0\.onnx 100%/.test(l))).toBe(true)
    expect(lines.at(-1)).toBe('setup done')
  })
  it('stops at once when the browser install fails', async () => {
    run.mockRejectedValueOnce(new Error('playwright install failed'))
    await expect(setup(log)).rejects.toThrow('playwright install failed')
    expect(run).toHaveBeenCalledTimes(1)
  })
})
