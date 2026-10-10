// The config-driven commands, run as a person would run them. Nothing here opens
// a browser: these are the paths that must work, or fail clearly, before one does.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { validateBrief } from '../../../src/brief/brief.ts'
import { parseArgs } from '../../../src/cli/args.ts'

const CLI = path.resolve('src/cli/index.ts')
let dir: string

function showcase(args: string[], cwd = dir) {
  const r = spawnSync('bun', [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, SHOWCASE_HOME: path.join(dir, 'home') } })
  return { code: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr }
}
const config = (brief: object, name = 'showcase.config.json') => fs.writeFileSync(path.join(dir, name), JSON.stringify(brief))

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-config-')) })
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('parseArgs', () => {
  it('separates flags, flags with a value, and plain arguments', () => {
    const a = parseArgs(['video.ts', '--draft', '--base', 'http://localhost:9', 'extra'])
    expect(a.rest).toEqual(['video.ts', 'extra'])
    expect(a.flag('draft')).toBe(true)
    expect(a.opt('base')).toBe('http://localhost:9')
  })
  it('does not take the next word as the value of a flag that has none', () => {
    const a = parseArgs(['--draft', 'showcase.config.json'])
    expect(a.rest).toEqual(['showcase.config.json'])
    expect(a.flag('draft')).toBe(true)
  })
  it('reads a flag that should have a value, but has none, as a plain flag', () => {
    const a = parseArgs(['--music', '--draft'])
    expect(a.opt('music')).toBeUndefined()
    expect(a.flag('music')).toBe(true)
    expect(a.flag('draft')).toBe(true)
  })
  it('answers false and undefined for what was not given', () => {
    const a = parseArgs([])
    expect(a.flag('draft')).toBe(false)
    expect(a.opt('base')).toBeUndefined()
    expect(a.rest).toEqual([])
  })
  it('takes values for the page limit, the role and the mood', () => {
    const a = parseArgs(['--max-pages', '12', '--role', 'click', '--mood', 'calm soft'])
    expect([a.opt('max-pages'), a.opt('role'), a.opt('mood')]).toEqual(['12', 'click', 'calm soft'])
  })
})

describe('showcase: help', () => {
  it('lists the config-driven commands', () => {
    const r = showcase([])
    for (const cmd of ['showcase init --config', 'showcase explore', 'showcase plan', 'showcase make', 'showcase login', 'showcase sounds']) expect(r.out).toContain(cmd)
  })
})

describe('the launcher', () => {
  const LAUNCHER = path.resolve('bin/showcase.js')
  it('runs the source under Bun', () => {
    const r = spawnSync('bun', [LAUNCHER, 'help'], { encoding: 'utf8' })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('showcase make')
  })
  it('starts under Node too: from the build, or by handing an unbuilt clone to Bun', () => {
    const r = spawnSync('node', [LAUNCHER, 'help'], { encoding: 'utf8' })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('showcase make')
    expect(r.stderr).toBe('')
  })
  it('passes the exit code on', () => {
    expect(spawnSync('node', [LAUNCHER, 'no-such-command'], { encoding: 'utf8' }).status).toBe(1)
  })
})

describe('showcase init --config', () => {
  it('adds a config, a scenes file and the skill', () => {
    const r = showcase(['init', '--config'])
    expect(r.code).toBe(0)
    for (const f of ['showcase.config.json', 'video.ts', path.join('.claude', 'skills', 'kwartz-showcase', 'SKILL.md')]) {
      expect(fs.existsSync(path.join(dir, f))).toBe(true)
    }
    expect(r.out).toMatch(/showcase explore/)
  })
  it('writes a config that passes its own checks', () => {
    showcase(['init', '--config'])
    const brief = JSON.parse(fs.readFileSync(path.join(dir, 'showcase.config.json'), 'utf8'))
    expect(() => validateBrief(brief)).not.toThrow()
    expect(brief).toMatchObject({ url: 'http://localhost:3000', length: 30, formats: ['landscape'] })
  })
  it('starts a hosted product with the banned names it must fill in', () => {
    showcase(['init', '--config', '--base', 'https://app.example.com'])
    const brief = JSON.parse(fs.readFileSync(path.join(dir, 'showcase.config.json'), 'utf8'))
    expect(brief.safety).toEqual({ banned: [] })
    expect(() => validateBrief(brief)).not.toThrow()
  })
  it('writes a scenes file that uses defineScenes', () => {
    showcase(['init', '--config'])
    expect(fs.readFileSync(path.join(dir, 'video.ts'), 'utf8')).toContain('defineScenes(')
  })
  it('keeps a config that is already there', () => {
    config({ url: 'http://localhost:1234' })
    const r = showcase(['init', '--config'])
    expect(r.out).toMatch(/kept\s+showcase\.config\.json/)
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'showcase.config.json'), 'utf8')).url).toBe('http://localhost:1234')
  })
})

describe('showcase plan', () => {
  it('prints the work order and saves it in the working folder', () => {
    config({ name: 'tour', url: 'http://localhost:3000', length: 60, platforms: ['youtube-shorts'] })
    const r = showcase(['plan'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('# Work order: tour')
    expect(r.out).toContain('Length: 60 seconds')
    expect(r.out).toContain('YouTube Shorts')
    expect(fs.readFileSync(path.join(dir, '.showcase', 'plan.md'), 'utf8')).toContain('# Work order: tour')
  })
  it('takes the path of a config', () => {
    config({ url: 'http://localhost:3000' }, 'other.json')
    expect(showcase(['plan', 'other.json']).code).toBe(0)
  })
  it('says how to start when there is no config', () => {
    const r = showcase(['plan'])
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/no config at .*showcase\.config\.json.*showcase init --config/)
  })
  it('lists every problem in a bad config', () => {
    config({ url: 'https://app.example.com', length: 3, colour: 'red' })
    const r = showcase(['plan'])
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/"colour" is not a setting/)
    expect(r.err).toMatch(/"length" must be/)
  })
  it('refuses a hosted product until the banned names are listed', () => {
    config({ url: 'https://app.example.com' })
    const r = showcase(['plan'])
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/"safety.banned" is required/)
  })
})

describe('showcase make: before a browser opens', () => {
  it('says the scenes are not written yet, and what to do', () => {
    config({ url: 'http://localhost:3000' })
    const r = showcase(['make', '--draft'])
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/no scenes file at/)
    expect(r.err).toMatch(/showcase plan/)
  })
  it('says so when the saved session is missing', () => {
    config({ url: 'http://localhost:3000', auth: { session: '.showcase/session.json' } })
    fs.writeFileSync(path.join(dir, 'video.mjs'), 'export default { scenes: [{ id: "a", say: "A.", run: async () => {} }] }')
    config({ url: 'http://localhost:3000', scenes: 'video.mjs', auth: { session: '.showcase/session.json' } })
    const r = showcase(['make', '--draft'])
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/Run "showcase login" first/)
  })
})

describe('showcase explore and showcase login', () => {
  it('explore refuses a config that films a static folder', () => {
    config({ serve: 'site' })
    const r = showcase(['explore'])
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/needs an address/)
  })
  it('login refuses a config with no address', () => {
    config({ serve: 'site' })
    const r = showcase(['login'])
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/needs an address/)
  })
})
