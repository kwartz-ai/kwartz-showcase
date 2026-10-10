// A theme of your own: a file in the project, by hand or from a description.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateBrief } from '../../../src/brief/brief.ts'
import {
  checkReadable, checkThemeFile, checkThemeName, customThemes, findTheme, loadThemeFile, presetFrom, starterTheme, themeFile, unsafeCss, type ThemeFile,
} from '../../../src/brief/custom-theme.ts'
import { borderFor, defineScenes, resolveBrief, themeFor } from '../../../src/brief/resolve.ts'
import { THEMES, THEME_NAMES } from '../../../src/brief/themes.ts'
import { workOrder } from '../../../src/brief/workorder.ts'
import { extractJson, themeFromPrompt, themeProblems, themeRequest, themeSystemPrompt } from '../../../src/auto/theme.ts'
import { resolveTheme } from '../../../src/core/theme.ts'
import { overlaySpecimen } from '../../../src/render/preview.ts'
import { layoutFor } from '../../../src/brief/presets.ts'

let dir: string
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-custom-')) })
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))
const save = (name: string, theme: object) => {
  fs.mkdirSync(path.join(dir, 'themes'), { recursive: true })
  const file = path.join(dir, 'themes', `${name}.json`)
  fs.writeFileSync(file, JSON.stringify(theme))
  return file
}
const problems = (theme: unknown) => checkThemeFile(theme).join(' | ')

describe('unsafeCss: what may go in a look', () => {
  it('lets a surface be described', () => {
    for (const css of [
      'background:#FFFFFF;border:2px solid #000000;border-radius:20px',
      'background:linear-gradient(135deg,#4C1D95 0%,#1D4ED8 100%)',
      'background:rgba(255,255,255,.2);backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.5)',
      'border:3px solid {accent};border-radius:12px', 'background:{ink};color:#FFFFFF;opacity:.94',
      'border-width:2px;border-style:solid',
    ]) expect(unsafeCss(css), css).toBeNull()
  })
  it('refuses a character that could break out of a style attribute or a page', () => {
    for (const css of ['background:#fff" onload="x', 'background:#fff;</style><script>', 'color:red\\9', 'background:{evil}', '@import x']) {
      expect(unsafeCss(css), css).toMatch(/character that is not allowed/)
    }
  })
  it('refuses anything that loads or runs something', () => {
    for (const css of ['background:url(https://evil.test/x.png)', 'background:URL (x)', 'width:expression(alert(1))', 'background:javascript:alert(1)']) {
      expect(unsafeCss(css), css).toMatch(/may not load or run anything|only describe a surface/)
    }
  })
  it('refuses anything that moves a box or changes its size', () => {
    for (const css of ['position:fixed;inset:0', 'background:#fff;display:none', 'transform:scale(9)', 'animation:x 1s', 'width:9999px', 'background:#fff; z-index:99', 'content:x']) {
      expect(unsafeCss(css), css).toMatch(/may only describe a surface/)
    }
  })
  it('refuses a stray semicolon at either end, and very long CSS', () => {
    expect(unsafeCss(';background:#fff')).toMatch(/semicolon/)
    expect(unsafeCss('background:#fff;')).toMatch(/semicolon/)
    expect(unsafeCss(`background:#fff;box-shadow:${'0 0 1px #000,'.repeat(90)}0 0 0 #000`)).toMatch(/too long/)
  })
})

describe('checkThemeFile: the shape of a theme', () => {
  it('accepts the smallest theme, and an empty one', () => {
    expect(checkThemeFile({ extends: 'glass' })).toEqual([])
    expect(checkThemeFile({})).toEqual([])
  })
  it('accepts a full theme', () => {
    expect(checkThemeFile({
      $schema: 'x', description: 'Ours', extends: 'clay', colors: { ink: '#0A2540', accent: '#2FA8E0', band: '#0A2540', bandText: '#fff' },
      fontPreset: 'bold', fonts: { text: 'Roboto', displayWeight: 700, tracking: 0.5 }, feel: 'crisp', backdrop: ['#111111', '#222222', '#333333'],
      backdropPattern: 'waves', radius: 0.05, mood: 'warm', look: { panel: 'background:#fff;border-radius:20px', enter: 'pop', upper: true, steps: 'grid', fg: '#ffffff' },
    })).toEqual([])
  })
  it('refuses what is not a JSON object', () => {
    expect(problems(null)).toMatch(/must be a JSON object/)
    expect(problems([])).toMatch(/must be a JSON object/)
  })
  it('names a setting it does not know', () => {
    expect(problems({ colours: {} })).toMatch(/"colours" is not a setting of a theme/)
    expect(problems({ colors: { highlight: '#fff' } })).toMatch(/"colors.highlight" is not a colour/)
    expect(problems({ look: { card: 'background:#fff' } })).toMatch(/"look.card" is not a part of a look/)
    expect(problems({ fonts: { title: 'X' } })).toMatch(/"fonts.title" is not a font setting/)
  })
  it('refuses a base that is not a built-in theme', () => {
    expect(problems({ extends: 'vaporwave' })).toMatch(/"extends" must be a built-in theme: classic, minimal/)
  })
  it('refuses colours, fonts and numbers that would not work', () => {
    expect(problems({ colors: { accent: 'orange' } })).toMatch(/"colors.accent" must be a hex colour/)
    expect(problems({ fontPreset: 'fancy' })).toMatch(/"fontPreset" must be one of/)
    expect(problems({ fonts: { text: 'Inter"; x' } })).toMatch(/plain font family name/)
    expect(problems({ fonts: { displayWeight: 100 } })).toMatch(/from 400 to 900/)
    expect(problems({ feel: 'wild' })).toMatch(/"feel" must be one of/)
    expect(problems({ backdrop: ['#111', '#222'] })).toMatch(/"backdrop" must be three hex colours/)
    expect(problems({ backdrop: 'pic.png' })).toMatch(/"backdrop" must be/)
    expect(problems({ backdropPattern: 'dots' })).toMatch(/glow, waves or plain/)
    expect(problems({ radius: 0.5 })).toMatch(/"radius" must be a number from 0 to 0.2/)
    expect(problems({ look: { enter: 'spin' } })).toMatch(/"look.enter" must be one of/)
    expect(problems({ look: { upper: 'yes' } })).toMatch(/"look.upper" must be true or false/)
  })
  it('checks every piece of CSS in the look', () => {
    expect(problems({ look: { panel: 'background:url(x)' } })).toMatch(/"look.panel" may not load or run anything/)
    expect(problems({ look: { caption: 'position:fixed' } })).toMatch(/"look.caption" may only describe a surface/)
  })
  it('reports everything at once', () => {
    expect(checkThemeFile({ extends: 'x', feel: 'y', radius: 9 })).toHaveLength(3)
  })
})

describe('presetFrom: a theme file as a theme', () => {
  it('is its base when it changes nothing', () => {
    const p = presetFrom({ extends: 'glass' })
    expect(p).toMatchObject({ ink: THEMES.glass!.ink, accent: THEMES.glass!.accent, fontPreset: 'geometric', feel: 'calm', radius: THEMES.glass!.radius })
    expect(p.look(p.accent)).toEqual(THEMES.glass!.look(THEMES.glass!.accent))
  })
  it('puts its own colours, pairing, movement, backdrop and corner over the base', () => {
    const p = presetFrom({ extends: 'glass', colors: { accent: '#FF5A1F', band: '#000000' }, fontPreset: 'bold', feel: 'lively', backdrop: 'ocean', radius: 0.01, mood: 'warm' })
    expect(p).toMatchObject({ accent: '#FF5A1F', band: '#000000', fontPreset: 'bold', feel: 'lively', radius: 0.01, mood: 'warm' })
    expect(p.backdrop).toEqual({ colors: ['#06324F', '#0E7490', '#7DD3FC'], pattern: 'waves' })
  })
  it('changes single surfaces and keeps the rest of the base look', () => {
    const p = presetFrom({ extends: 'clay', look: { panel: 'background:#123456;border-radius:8px', enter: 'cut' } })
    const look = p.look(p.accent)
    expect(look.panel).toBe('background:#123456;border-radius:8px')
    expect(look.enter).toBe('cut')
    expect(look.caption).toBe(THEMES.clay!.look(p.accent).caption)
  })
  it('fills in the theme\'s colours where a surface names them', () => {
    const look = presetFrom({ extends: 'minimal', colors: { accent: '#00AA88', ink: '#101010' }, look: { ring: 'border:3px solid {accent};border-radius:9px', caption: 'background:{ink};color:#FFFFFF' } }).look('#00AA88')
    expect(look.ring).toBe('border:3px solid #00AA88;border-radius:9px')
    expect(look.caption).toBe('background:#101010;color:#FFFFFF')
  })
  it('follows a highlight the person sets later in the config', () => {
    expect(presetFrom({ extends: 'bento', look: { ring: 'border:3px solid {accent}' } }).look('#ABCDEF').ring).toBe('border:3px solid #ABCDEF')
  })
  it('starts from the kit\'s own look, in the theme\'s colours, with no base', () => {
    const p = presetFrom({ colors: { ink: '#0A2540', accent: '#2FA8E0' } })
    const look = p.look(p.accent)
    expect(look.canvas).toBe('#0A2540')
    expect(look.ring).toContain('#2FA8E0')
    expect(p.band).toBe('#0A2540')
  })
  it('uses faces of its own, set by weight and tracking', () => {
    const p = presetFrom({ extends: 'minimal', fonts: { display: 'Fraunces', displayWeight: 600, tracking: 0.3 } })
    expect(p.fonts).toMatchObject({ display: 'Fraunces', text: 'Geist', mono: 'Geist Mono', displayWeight: 600, tracking: 0.3 })
    expect(p.fontPreset).toBeUndefined()
  })
})

describe('checkReadable: the rules a theme must keep', () => {
  const report = (file: ThemeFile) => checkReadable(presetFrom(file))
  it('passes every built-in theme used as a base', () => {
    for (const name of THEME_NAMES) expect(report({ extends: name }).errors, name).toEqual([])
  })
  it('refuses captions that cannot be read', () => {
    const r = report({ extends: 'minimal', look: { caption: 'background:#EEEEEE;color:#FFFFFF;border-radius:8px' } })
    expect(r.errors[0]).toMatch(/caption text on its box: contrast is 1\.\d to 1 .*at least 7 to 1/)
  })
  it('refuses captions that cannot be read on the band of a tall frame', () => {
    expect(report({ extends: 'classic', colors: { band: '#FFFFFF', bandText: '#EEEEEE' } }).errors.join(' ')).toMatch(/captions on the band of a tall frame/)
  })
  it('refuses text too close to the ground of a card', () => {
    expect(report({ extends: 'minimal', look: { canvas: '#FFFFFF', fg: '#BBBBBB' } }).errors.join(' ')).toMatch(/text on the ground of a card/)
  })
  it('refuses a highlight that would not show', () => {
    expect(report({ colors: { ink: '#0A2540', accent: '#0B2A48' } }).errors.join(' ')).toMatch(/the highlight on the ground of a card: contrast is 1\./)
  })
  it('refuses a surface that forgets its own text colour', () => {
    expect(report({ extends: 'minimal', look: { chip: 'border:1px solid #000000' } }).errors.join(' ')).toMatch(/"look.chip" must set its own text colour/)
  })
  it('says once, as a note, what it could not measure', () => {
    const r = report({ extends: 'glass' })
    expect(r.errors).toEqual([])
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toMatch(/could not be measured where a surface is see-through or shaded \(.*caption text on its box.*\)\. Look at these in the preview/)
  })
  it('has nothing to note for a theme of plain colours', () => {
    expect(report({ extends: 'minimal' }).warnings).toEqual([])
  })
})

describe('theme files in a project', () => {
  it('are found by name in the themes folder', () => {
    const file = save('acme', { extends: 'glass', colors: { accent: '#FF5A1F' } })
    expect(themeFile('acme', dir)).toBe(file)
    expect(themeFile('other', dir)).toBeNull()
    expect(customThemes(dir)).toEqual(['acme'])
  })
  it('are listed in order, leaving out what is not a theme name', () => {
    save('zeta', {}); save('alpha', {}); save('Not A Theme', {})
    fs.writeFileSync(path.join(dir, 'themes', 'notes.txt'), 'x')
    expect(customThemes(dir)).toEqual(['alpha', 'zeta'])
    expect(customThemes(path.join(dir, 'nowhere'))).toEqual([])
  })
  it('load as a theme, with the base they came from', () => {
    save('acme', { extends: 'clay', description: 'Ours', colors: { accent: '#B91C1C' } })
    const t = findTheme('acme', dir)!
    expect(t).toMatchObject({ name: 'acme', custom: true, base: 'clay', warnings: [] })
    expect(t.preset.accent).toBe('#B91C1C')
    expect(t.preset.use).toBe('Ours')
  })
  it('say everything that is wrong with a broken file', () => {
    const file = save('bad', { extends: 'nope', radius: 5 })
    expect(() => loadThemeFile(file)).toThrow(/the theme bad\.json has 2 problems:[\s\S]*"extends"[\s\S]*"radius"/)
    fs.writeFileSync(file, '{ "extends": ')
    expect(() => loadThemeFile(file)).toThrow(/bad\.json is not valid JSON/)
  })
  it('refuse a theme that would be hard to read, with the numbers', () => {
    const file = save('faint', { extends: 'minimal', look: { caption: 'background:#F0F0F0;color:#FFFFFF' } })
    expect(() => loadThemeFile(file)).toThrow(/faint\.json would be hard to read on video:[\s\S]*caption text on its box: contrast is 1\.1 to 1/)
  })
  it('come before a built-in theme only by their own names', () => {
    expect(findTheme('glass', dir)).toMatchObject({ name: 'glass', custom: false })
    expect(findTheme('classic', dir)).toBeNull()
  })
  it('are named in the error for a theme nobody made, with how to make one', () => {
    save('acme', {})
    expect(() => findTheme('acmee', dir)).toThrow(/unknown theme "acmee"\. Themes: classic, minimal.*Your own: acme\. To make your own: showcase theme new acmee/)
  })
  it('are not looked for without a folder', () => {
    save('acme', {})
    expect(() => findTheme('acme')).toThrow(/unknown theme "acme"/)
  })
})

describe('names', () => {
  it('are lower case with dashes', () => {
    expect(checkThemeName('acme')).toBeNull()
    expect(checkThemeName('north-bank-2')).toBeNull()
    for (const bad of ['Acme', 'my theme', '9lives', 'a', 'x'.repeat(40), '../evil', 'acme.json']) expect(checkThemeName(bad), bad).toMatch(/lower case letters, digits and dashes/)
  })
  it('may not be the name of a built-in theme, or another word for one', () => {
    for (const taken of ['glass', 'classic', 'glassmorphism', 'neumorphism']) expect(checkThemeName(taken), taken).toMatch(/is the name of a built-in theme/)
  })
})

describe('starterTheme: a file to begin from', () => {
  it('names its base and writes out what people change most', () => {
    const t = starterTheme('glass')
    expect(t).toMatchObject({ extends: 'glass', fontPreset: 'geometric', feel: 'calm', radius: THEMES.glass!.radius, look: {} })
    expect(t.colors!.accent).toBe(THEMES.glass!.accent)
    expect(t.backdrop).toEqual(THEMES.glass!.backdrop.colors)
  })
  it('takes the brand\'s colours', () => {
    expect(starterTheme('classic', { accent: '#2FA8E0', ink: '#0A2540' }).colors).toEqual({ accent: '#2FA8E0', ink: '#0A2540' })
  })
  it('passes its own checks for every base', () => {
    for (const base of ['classic', ...THEME_NAMES]) {
      const t = starterTheme(base)
      expect(checkThemeFile(t), base).toEqual([])
      expect(checkReadable(presetFrom(t)).errors, base).toEqual([])
    }
  })
})

describe('a custom theme in a config', () => {
  const module = defineScenes({ scenes: [{ id: 'a', say: 'A.', run: async () => {} }] })
  const acme = { extends: 'clay', description: 'Ours', colors: { accent: '#B91C1C' }, backdrop: ['#111111', '#222222', '#333333'], radius: 0.01, mood: 'warm bright' }

  it('is accepted by name once the file exists', () => {
    save('acme', acme)
    expect(() => validateBrief({ url: 'http://localhost', theme: 'acme' }, dir)).not.toThrow()
    expect(() => validateBrief({ url: 'http://localhost', theme: 'acme' })).toThrow(/unknown theme "acme"/)
  })
  it('stops the run, in the config\'s own list of problems, when the file is broken', () => {
    save('acme', { extends: 'nope' })
    expect(() => validateBrief({ url: 'http://localhost', theme: 'acme' }, dir)).toThrow(/the config has a problem:[\s\S]*the theme acme\.json has a problem/)
  })
  it('sets the look, the colours, the backdrop and the corner of every video', () => {
    save('acme', acme)
    const { videos } = resolveBrief({ url: 'http://localhost', cta: { text: 'x' }, theme: 'acme' }, dir, module)
    const v = videos[0]!.video
    expect(v.theme.name).toBe('acme')
    expect(v.theme.accent).toBe('#B91C1C')
    expect(v.theme.look.ring).toContain('#B91C1C')
    expect(v.border).toMatchObject({ colors: ['#111111', '#222222', '#333333'], radius: 0.01 })
  })
  it('still lets the config change a part', () => {
    save('acme', acme)
    const t = resolveTheme(themeFor({ theme: 'acme', style: { accent: '#00AA88' } }, null, [], dir))
    expect(t.accent).toBe('#00AA88')
    expect(t.look.ring).toContain('#00AA88')
    expect(borderFor({ theme: 'acme', style: { backdrop: 'ocean' } }, dir, '#fff')).toMatchObject({ pattern: 'waves', radius: 0.01 })
  })
  it('tells the person what could not be measured', () => {
    save('glassy', { extends: 'glass' })
    const notes: string[] = []
    themeFor({ theme: 'glassy' }, null, notes, dir)
    expect(notes[0]).toMatch(/^theme "glassy": contrast could not be measured/)
  })
  it('points the work order at the skill of the theme it started from', () => {
    save('acme', acme)
    const text = workOrder({ url: 'http://localhost', theme: 'acme' }, dir)
    expect(text).toContain('## Theme: acme (your own, from clay)')
    expect(text).toMatch(/It is defined in themes.acme\.json/)
    expect(text).toMatch(/showcase-theme-clay.SKILL\.md/)
  })
})

describe('the preview', () => {
  it('draws the highlight ring and the callout label over a stand-in for a product', () => {
    const theme = resolveTheme(themeFor({ theme: 'brutal' }))
    const html = overlaySpecimen(theme, layoutFor('landscape'))
    expect(html).toContain(theme.look.ring)
    expect(html).toContain('A callout label')
    expect(html).toContain('A product screen')
    for (const m of html.matchAll(/style="([^"]*)"/g)) expect(m[1]!.trim()).toMatch(/[;)%a-z0-9]$/i)
  })
  it('draws them larger on a tall frame', () => {
    const theme = resolveTheme(themeFor({}))
    expect(overlaySpecimen(theme, layoutFor('vertical'))).toContain('font:700 24px/1.3')
    expect(overlaySpecimen(theme, layoutFor('landscape'))).toContain('font:700 16px/1.3')
  })
})

describe('a theme from a description', () => {
  const GOOD = { description: 'A food delivery brand', extends: 'clay', colors: { accent: '#C2410C' }, fontPreset: 'friendly', radius: 0.06 }
  const reply = (json: unknown, lead = 'I chose clay because the brand is friendly.') => `${lead}\n\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n`
  const api = (text: string, ok = true, status = 200) => ({ ok, status, text: async () => JSON.stringify(ok ? { content: [{ type: 'text', text }] } : { error: { message: text } }) }) as Response
  const sent = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body) as { system: string; model: string; messages: { content: string }[] })
  const log = vi.fn()
  const make = (over: object = {}) => themeFromPrompt({ prompt: 'orange, rounded, friendly, a food delivery app', name: 'acme', dir, apiKey: 'sk-test', log, ...over })
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('SHOWCASE_MODEL', '')
    vi.stubGlobal('fetch', vi.fn(async () => api(reply(GOOD))))
  })

  it('tells the model the format, the bases, the pairings and the rules', () => {
    const s = themeSystemPrompt()
    for (const part of ['"extends"', '- glass (Glassmorphism)', '- classic:', '- friendly: Nunito', 'at least 7 to 1', 'One highlight colour only', 'No position, size, display']) expect(s, part).toContain(part)
    for (const name of THEME_NAMES) expect(s).toContain(`- ${name} (`)
  })
  it('sends the description, the name, and what the product itself says about the brand', () => {
    const text = themeRequest('calm and blue', 'owl', { accent: '#2fa8e0', font: 'Inter', url: 'https://app.example.com' })
    expect(text).toContain('Make a theme named "owl".')
    expect(text).toContain('calm and blue')
    expect(text).toContain('main button colour, read from the product: #2fa8e0')
    expect(text).toContain('font, read from the product: Inter')
    expect(themeRequest('x', 'y')).not.toContain('What is known about the brand')
  })
  it('reads the theme out of a reply', () => {
    expect(extractJson(reply(GOOD))).toEqual(GOOD)
    expect(extractJson(JSON.stringify(GOOD))).toEqual(GOOD)
    expect(() => extractJson('I cannot.')).toThrow(/did not return a theme file/)
    expect(() => extractJson('```json\n{ "extends": \n```')).toThrow(/JSON that cannot be read/)
  })
  it('judges a theme by its shape first, then by whether it can be read', () => {
    expect(themeProblems(GOOD).errors).toEqual([])
    expect(themeProblems({ extends: 'nope' }).errors[0]).toMatch(/"extends"/)
    expect(themeProblems({ extends: 'minimal', look: { caption: 'background:#EEEEEE;color:#FFFFFF' } }).errors[0]).toMatch(/caption text on its box/)
  })
  it('needs a key, and names the two ways that need none', async () => {
    await expect(themeFromPrompt({ prompt: 'x', name: 'acme', dir, log })).rejects.toThrow(/ANTHROPIC_API_KEY[\s\S]*showcase theme new acme --from glass[\s\S]*\/showcase-theme-new/)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('writes a theme that passes, as a file a person can edit', async () => {
    const made = await make()
    expect(made).toMatchObject({ file: path.join(dir, 'themes', 'acme.json'), tries: 1, base: 'clay', warnings: [] })
    const saved = JSON.parse(fs.readFileSync(made.file, 'utf8'))
    expect(saved).toMatchObject(GOOD)
    expect(saved.$schema).toContain('showcase.theme.schema.json')
    expect(findTheme('acme', dir)!.preset.accent).toBe('#C2410C')
  })
  it('gives the product\'s own colour and font to the model when it was explored', async () => {
    fs.mkdirSync(path.join(dir, '.showcase', 'explore'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.showcase', 'explore', 'map.json'), JSON.stringify({ style: { font: 'Inter', accent: '#2fa8e0', fontOnGoogle: true } }))
    await make()
    expect(sent()[0]!.messages[0]!.content).toMatch(/#2fa8e0[\s\S]*Inter/)
  })
  it('sends back a theme that cannot be read, with the numbers, and saves only the fixed one', async () => {
    const faint = { extends: 'minimal', look: { caption: 'background:#EEEEEE;color:#FFFFFF' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(api(reply(faint))).mockResolvedValue(api(reply(GOOD))))
    const made = await make()
    expect(made.tries).toBe(2)
    expect(sent()[1]!.messages[2]!.content).toMatch(/refused and not saved:[\s\S]*caption text on its box: contrast is 1\.\d to 1[\s\S]*Fix exactly these/)
    expect(JSON.parse(fs.readFileSync(made.file, 'utf8')).extends).toBe('clay')
  })
  it('never saves CSS that could load or run something', async () => {
    const evil = { extends: 'glass', look: { panel: 'background:url(https://evil.test/track.png)' } }
    vi.stubGlobal('fetch', vi.fn(async () => api(reply(evil))))
    await expect(make({ tries: 2 })).rejects.toThrow(/no theme passed the checks after 2 attempt\(s\); nothing was written/)
    expect(fs.existsSync(path.join(dir, 'themes', 'acme.json'))).toBe(false)
    expect(sent()[1]!.messages[2]!.content).toMatch(/"look.panel" may not load or run anything/)
  })
  it('treats a reply with no theme in it as a refusal, not a crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(api('Here you go!')).mockResolvedValue(api(reply(GOOD))))
    expect((await make()).tries).toBe(2)
  })
  it('uses the model that was asked for', async () => {
    await make({ model: 'claude-test-1' })
    expect(sent()[0]!.model).toBe('claude-test-1')
  })
})

describe('themes of your own on the command line', () => {
  const CLI = path.resolve('src/cli/index.ts')
  const run = (args: string[]) => spawnSync('bun', [CLI, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, SHOWCASE_HOME: path.join(dir, 'home'), ANTHROPIC_API_KEY: '' } })

  it('starts a theme file by hand, from a base, with the brand\'s colours', () => {
    const r = run(['theme', 'new', 'acme', '--from', 'glassmorphism', '--accent', '#FF5A1F', '--no-preview'])
    expect(r.status).toBe(0)
    expect(r.stdout).toMatch(/created\s+themes.acme\.json\s+\(from glass\)/)
    const saved = JSON.parse(fs.readFileSync(path.join(dir, 'themes', 'acme.json'), 'utf8'))
    expect(saved).toMatchObject({ extends: 'glass', colors: { accent: '#FF5A1F' } })
    expect(r.stdout).toContain('"theme": "acme"')
  })
  it('will not replace a theme that is there, unless told to', () => {
    run(['theme', 'new', 'acme', '--no-preview'])
    const r = run(['theme', 'new', 'acme', '--no-preview'])
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/already exists.*--force/)
    expect(run(['theme', 'new', 'acme', '--no-preview', '--force']).status).toBe(0)
  })
  it('refuses a bad name, a taken name, and a colour that is not one', () => {
    expect(run(['theme', 'new', 'My Theme', '--no-preview']).stderr).toMatch(/lower case letters, digits and dashes/)
    expect(run(['theme', 'new', 'glass', '--no-preview']).stderr).toMatch(/name of a built-in theme/)
    const r = run(['theme', 'new', 'acme', '--accent', 'orange', '--no-preview'])
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/"colors.accent" must be a hex colour/)
    expect(fs.existsSync(path.join(dir, 'themes', 'acme.json'))).toBe(false)
  })
  it('checks a theme and says it is safe and readable, or why not', () => {
    run(['theme', 'new', 'acme', '--from', 'minimal', '--no-preview'])
    const ok = run(['theme', 'check', 'acme'])
    expect(ok.status).toBe(0)
    expect(ok.stdout).toMatch(/ok\s+themes.acme\.json: from minimal, safe to place in a page, and readable on video/)
    save('acme', { extends: 'minimal', look: { caption: 'background:#EEEEEE;color:#FFFFFF' } })
    const bad = run(['theme', 'check', 'acme'])
    expect(bad.status).toBe(1)
    expect(bad.stderr).toMatch(/would be hard to read on video/)
  })
  it('says how to make a theme that does not exist yet', () => {
    expect(run(['theme', 'check', 'ghost']).stderr).toMatch(/no theme file at themes.ghost\.json\. Make it with: showcase theme new ghost/)
    expect(run(['theme']).stderr).toMatch(/what should be done with a theme\?/)
    expect(run(['theme', 'new']).stderr).toMatch(/which theme\?/)
  })
  it('needs a key to make a theme from a description, and writes nothing without one', () => {
    const r = run(['theme', 'new', 'acme', '--prompt', 'orange and friendly'])
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/ANTHROPIC_API_KEY/)
    expect(fs.existsSync(path.join(dir, 'themes'))).toBe(false)
  })
  it('lists your own themes beside the built-in ones', () => {
    run(['theme', 'new', 'acme', '--from', 'clay', '--no-preview'])
    const r = run(['themes'])
    expect(r.stdout).toMatch(/Your own, in the themes folder:\nacme\s+from clay:/)
  })
  it('uses a theme of your own in a config', () => {
    run(['theme', 'new', 'acme', '--from', 'bento', '--no-preview'])
    fs.writeFileSync(path.join(dir, 'showcase.config.json'), JSON.stringify({ url: 'http://localhost:3000', theme: 'acme' }))
    const r = run(['plan'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('## Theme: acme (your own, from bento)')
  })
  it('copies the skill for making a theme when a config-driven video is started', () => {
    run(['init', '--config'])
    expect(fs.existsSync(path.join(dir, '.claude', 'skills', 'showcase-theme-new', 'SKILL.md'))).toBe(true)
  })
})

describe('the example theme, and the skill', () => {
  it('ships an example theme that passes its checks', () => {
    const t = loadThemeFile(path.resolve('examples/motion/themes/harbor.json'))
    expect(t.raw.extends).toBe('bento')
    expect(t.warnings).toEqual([])
  })
  it('ships a skill that walks through making a theme and looking at it', () => {
    const text = fs.readFileSync(path.resolve('skills/showcase-theme-new/SKILL.md'), 'utf8')
    expect(text).toMatch(/^---\nname: showcase-theme-new\n/)
    for (const part of ['showcase theme new', 'showcase theme check', 'showcase theme preview', 'showcase make --theme', 'at least 7 to 1', 'You cannot judge a theme from its file']) expect(text).toContain(part)
  })
})
