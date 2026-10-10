import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { EASE_IN_OUT, EASE_OUT, defaultTheme, resolveTheme } from '../../../src/core/theme.ts'
import { esc, showcaseHome, run, sleep } from '../../../src/core/util.ts'

describe('theme', () => {
  it('resolves to the default with no input', () => {
    expect(resolveTheme()).toEqual(defaultTheme)
    expect(resolveTheme({})).toEqual(defaultTheme)
  })
  it('does not hand out the default object itself', () => {
    const t = resolveTheme()
    t.type.text = 'changed'
    expect(defaultTheme.type.text).not.toBe('changed')
  })
  it('overrides a colour and keeps the rest', () => {
    const t = resolveTheme({ ink: '#000' })
    expect(t.ink).toBe('#000')
    expect(t.accent).toBe(defaultTheme.accent)
  })
  it('overrides one font stack and keeps the others', () => {
    const t = resolveTheme({ type: { mono: `'Fira Code'` } })
    expect(t.type.mono).toBe(`'Fira Code'`)
    expect(t.type.text).toBe(defaultTheme.type.text)
  })
  it('lets fontsCss be turned off', () => {
    expect(resolveTheme({ fontsCss: null }).fontsCss).toBeNull()
  })
  it('replaces the list of fonts to wait for', () => {
    expect(resolveTheme({ fontsToLoad: [] }).fontsToLoad).toEqual([])
  })

  // A double quote in a font stack ends the style="..." attribute it is placed in,
  // and silently drops every declaration after it. This cost a whole render once.
  it('has no double quote in any default font stack', () => {
    for (const stack of Object.values(defaultTheme.type)) expect(stack).not.toContain('"')
  })
  it('has no double quote in any default colour', () => {
    for (const c of [defaultTheme.ink, defaultTheme.accent, defaultTheme.mist, defaultTheme.paper]) expect(c).not.toContain('"')
  })
  it('waits for a face of every default family', () => {
    for (const family of ['Inter', 'Plus Jakarta Sans', 'JetBrains Mono']) {
      expect(defaultTheme.fontsToLoad.some((f) => f.includes(family))).toBe(true)
      expect(defaultTheme.fontsCss).toContain(family.replace(/ /g, '+'))
    }
  })
  it('exports two cubic-bezier easing curves', () => {
    expect(EASE_OUT).toMatch(/^cubic-bezier\(/)
    expect(EASE_IN_OUT).toMatch(/^cubic-bezier\(/)
    expect(EASE_OUT).not.toBe(EASE_IN_OUT)
  })
})

describe('esc', () => {
  it.each([
    ['a & b', 'a &amp; b'],
    ['<b>', '&lt;b&gt;'],
    ['say "hi"', 'say &quot;hi&quot;'],
    ['plain', 'plain'],
    ["it's", "it's"],
    ['', ''],
  ])('%j becomes %j', (input, output) => {
    expect(esc(input)).toBe(output)
  })
  it('escapes every occurrence', () => {
    expect(esc('<<>>&&')).toBe('&lt;&lt;&gt;&gt;&amp;&amp;')
  })
  it('turns other values into text', () => {
    expect(esc(42)).toBe('42')
    expect(esc(null)).toBe('null')
    expect(esc(undefined)).toBe('undefined')
  })
  it('makes markup harmless', () => {
    expect(esc('<img src=x onerror="alert(1)">')).not.toMatch(/[<>"]/)
  })
})

describe('sleep', () => {
  it('resolves after the given time', async () => {
    vi.useFakeTimers()
    let done = false
    const p = sleep(500).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(499)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await p
    expect(done).toBe(true)
    vi.useRealTimers()
  })
})

describe('showcaseHome', () => {
  it('defaults to a folder in the home directory cache', () => {
    vi.stubEnv('SHOWCASE_HOME', undefined as unknown as string)
    delete process.env.SHOWCASE_HOME
    expect(showcaseHome()).toBe(path.join(os.homedir(), '.cache', 'kwartz-showcase'))
  })
  it('follows SHOWCASE_HOME when it is set', () => {
    vi.stubEnv('SHOWCASE_HOME', '/somewhere/else')
    expect(showcaseHome()).toBe('/somewhere/else')
  })
})

describe('run', () => {
  const node = process.execPath

  it('returns what the program wrote to stdout', async () => {
    expect(await run(node, ['-e', 'process.stdout.write("out")'])).toBe('out')
  })
  it('returns stderr instead when asked', async () => {
    expect(await run(node, ['-e', 'process.stderr.write("err"); process.stdout.write("out")'], { stderr: true })).toBe('err')
  })
  it('passes input to the program', async () => {
    const echo = 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(s.toUpperCase()))'
    expect(await run(node, ['-e', echo], { input: 'hello' })).toBe('HELLO')
  })
  it('passes arguments through without a shell', async () => {
    expect(await run(node, ['-e', 'process.stdout.write(process.argv[1])', 'a b; echo c'])).toBe('a b; echo c')
  })
  it('rejects with the exit code and the end of stderr when the program fails', async () => {
    await expect(run(node, ['-e', 'process.stderr.write("boom"); process.exit(3)'])).rejects.toThrow(/exited 3[\s\S]*boom/)
  })
  it('rejects with a clear message when the program does not exist', async () => {
    await expect(run('showcase-no-such-program-xyz', [])).rejects.toThrow(/could not start showcase-no-such-program-xyz/)
  })
  it('keeps only the tail of a very long error', async () => {
    const err = await run(node, ['-e', 'process.stderr.write("x".repeat(5000) + "END"); process.exit(1)']).catch((e: Error) => e)
    expect((err as Error).message.length).toBeLessThan(2200)
    expect((err as Error).message.endsWith('END')).toBe(true)
  })
})
