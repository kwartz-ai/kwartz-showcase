// The command line, run as a user would run it. These start a real `bun` process,
// so they cover argument parsing, exit codes and messages; nothing here renders.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const CLI = path.resolve('src/cli/index.ts')
const FIXTURE = path.resolve('tests/fixtures/good.video.ts')
let dir: string

function showcase(args: string[], cwd = process.cwd()) {
  const r = spawnSync('bun', [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, SHOWCASE_HOME: path.join(dir, 'home') } })
  return { code: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr }
}

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-cli-')) })
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.rmSync(path.resolve('tests/fixtures/out'), { recursive: true, force: true })
})

describe('showcase: help', () => {
  it('prints the commands and exits 0 with no arguments', () => {
    const r = showcase([])
    expect(r.code).toBe(0)
    for (const cmd of ['showcase render', 'showcase remix', 'showcase verify', 'showcase init', 'showcase setup', 'showcase doctor']) expect(r.out).toContain(cmd)
  })
  it.each(['help', '--help', '-h'])('prints help and exits 0 for %s', (arg) => {
    const r = showcase([arg])
    expect(r.code).toBe(0)
    expect(r.out).toContain('showcase render <video.ts>')
  })
  it('lists the render options', () => {
    const { out } = showcase([])
    for (const flag of ['--draft', '--headed', '--base <url>', '--music <file>', '--no-music', '--no-sfx']) expect(out).toContain(flag)
  })
  it('prints help and exits 1 for a command it does not know', () => {
    const r = showcase(['frobnicate'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('showcase render <video.ts>')
  })
})

describe('showcase: a missing or bad video file', () => {
  it.each(['render', 'remix', 'verify'])('%s without a file says which video is needed, and exits 1', (cmd) => {
    const r = showcase([cmd])
    expect(r.code).toBe(1)
    expect(r.err).toContain(`which video? For example: showcase ${cmd} video.ts`)
  })
  it('does not mistake the value of an option for the video file', () => {
    const r = showcase(['render', '--base', 'http://x', '--music', 'track.mp3'])
    expect(r.code).toBe(1)
    expect(r.err).toContain('which video?')
  })
  it('exits 1 for a file that does not exist', () => {
    expect(showcase(['verify', path.join(dir, 'nope.ts')]).code).toBe(1)
  })
  it('explains a file with no default export', () => {
    const r = showcase(['verify', path.resolve('tests/fixtures/no-default.video.ts')])
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/no default export/)
  })
  it('reports a mistake in the video file itself', () => {
    const file = path.join(dir, 'bad.video.ts')
    fs.writeFileSync(file, `export default { name: 'x', baseUrl: 'http://h', scenes: [] }`)
    const r = showcase(['verify', file])
    expect(r.code).toBe(1)
    expect(r.err).toContain('video has no scenes')
  })
})

describe('showcase verify', () => {
  it('fails, and says so, when nothing has been rendered', () => {
    const r = showcase(['verify', FIXTURE])
    expect(r.code).toBe(1)
    expect(r.out).toMatch(/FAIL\s+render exists\s+nothing rendered yet for "fixture"/)
  })
  it('always reminds the user to listen', () => {
    expect(showcase(['verify', FIXTURE]).out).toMatch(/not checked: how the voice, music and effects sound/)
  })
})

describe('showcase remix', () => {
  it('says to render first when there is no take', () => {
    const r = showcase(['remix', FIXTURE])
    expect(r.code).toBe(1)
    expect(r.err).toContain('no take to remix: render "fixture" once first')
  })
})

describe('showcase init', () => {
  const made = () => ({
    video: path.join(dir, 'video.ts'),
    skill: path.join(dir, '.claude', 'skills', 'kwartz-showcase', 'SKILL.md'),
  })

  it('adds the starter video and the editor skill to the current folder', () => {
    const r = showcase(['init'], dir)
    expect(r.code).toBe(0)
    expect(fs.existsSync(made().video)).toBe(true)
    expect(fs.existsSync(made().skill)).toBe(true)
    expect(r.out).toMatch(/created\s+video\.ts/)
  })
  it('adds them to a named folder, creating it', () => {
    const target = path.join(dir, 'new', 'project')
    expect(showcase(['init', target]).code).toBe(0)
    expect(fs.existsSync(path.join(target, 'video.ts'))).toBe(true)
    expect(fs.existsSync(path.join(target, '.claude', 'skills', 'kwartz-showcase', 'SKILL.md'))).toBe(true)
  })
  it('copies the starter and the skill exactly as they ship', () => {
    showcase(['init'], dir)
    expect(fs.readFileSync(made().video, 'utf8')).toBe(fs.readFileSync(path.resolve('templates/starter/video.ts'), 'utf8'))
    expect(fs.readFileSync(made().skill, 'utf8')).toBe(fs.readFileSync(path.resolve('skills/kwartz-showcase/SKILL.md'), 'utf8'))
  })
  it('never overwrites a video the user has already written', () => {
    fs.writeFileSync(made().video, '// my work')
    const r = showcase(['init'], dir)
    expect(r.code).toBe(0)
    expect(fs.readFileSync(made().video, 'utf8')).toBe('// my work')
    expect(r.out).toMatch(/kept\s+video\.ts \(already there\)/)
    expect(fs.existsSync(made().skill)).toBe(true)
  })
  it('tells the user what to do next', () => {
    const { out } = showcase(['init'], dir)
    expect(out).toContain('showcase render video.ts --draft')
    expect(out).toContain('.gitignore')
  })
})

describe('showcase doctor', () => {
  it('lists every tool it checks, and exits 1 on a machine with no voice', () => {
    // SHOWCASE_HOME points at an empty folder, so the voice is never found here
    const r = showcase(['doctor'])
    for (const tool of ['ffmpeg', 'ffprobe', 'chromium', 'python', 'voice']) expect(r.out).toMatch(new RegExp(`(ok|MISSING)\\s+${tool}`))
    expect(r.out).toMatch(/MISSING\s+voice/)
    expect(r.code).toBe(1)
  })
})
