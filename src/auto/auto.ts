// showcase auto: from a config to a finished video with no agent in the loop.
//
// The kit explores the product, writes the work order, and asks Claude (through
// the API, with the person's own key) to write the scenes file. It then renders a
// draft. If the draft stops, the error goes back to Claude for a fix, a limited
// number of times. Only then is the full video rendered.
//
// Everything else in the kit works without this module and without any key.
import fs from 'node:fs'
import path from 'node:path'
import { loadBrief, type Brief } from '../brief/brief.ts'
import { workOrder } from '../brief/workorder.ts'
import { explore } from '../capture/explore.ts'
import { asset } from '../core/paths.ts'
import { make, workDir, type MakeResult } from '../render/make.ts'
import type { RenderOptions } from '../render/render.ts'

export const DEFAULT_MODEL = 'claude-opus-5-5'
export const API_URL = 'https://api.anthropic.com/v1/messages'

export interface Message { role: 'user' | 'assistant'; content: string }

export interface AutoOptions extends RenderOptions {
  configFile?: string
  /** Default: the SHOWCASE_MODEL variable, then DEFAULT_MODEL. */
  model?: string
  /** Default: the ANTHROPIC_API_KEY variable. */
  apiKey?: string
  /** How many times a failed draft may be sent back for a fix. Default 3. */
  tries?: number
  /** Replace a scenes file that already exists (a copy is kept beside it). */
  force?: boolean
  /** Stop after the draft: no voice, music or effects. */
  draftOnly?: boolean
}

/** What the model is told about its job and its limits. */
export function systemPrompt(reference: { skill: string; template: string }): string {
  return [
    'You write the scenes file for a product demo video made with Kwartz Showcase.',
    'You are the senior video editor: one promise per video, open on the viewer\'s problem, show only what proves the promise.',
    '',
    'Reply with ONE TypeScript file in a single ```ts code block, and nothing else of substance.',
    'Rules for the file:',
    '- Its only import is from \'kwartz-showcase\'. It ends with `export default defineScenes({ prepare, scenes })`.',
    '- It uses only: page (Playwright locators and waits), stage, untilSaid, sayMs, theme, layout, cta, baseUrl, and the card functions.',
    '- No other modules, no file system, no network calls, no process, no eval, no timers. The file is checked and refused otherwise.',
    '- Use only selectors that appear in the product map. Prefer the ones with a test id.',
    '- Scenes only look and click. Never create, edit or delete anything.',
    '- Wait for real page states (locator.waitFor), never for a fixed time.',
    '- Follow the work order: the number of scenes, the words for each, and the safety rules.',
    '- The hook and the end card are motion scenes (`motion:`); each proof is an app scene (`run:`).',
    '- In narration, avoid exact counts and dates: the product\'s data changes.',
    '- In HTML you write yourself, use single quotes inside style attributes.',
    '',
    '## How the kit works, and its craft standard',
    reference.skill,
    '',
    '## A scenes file to start from',
    '```ts', reference.template, '```',
  ].join('\n')
}

/** The first request: the work order and the product map. */
export function firstRequest(order: string, map: string | null): string {
  return [order, '', '## Product map', map ?? 'No map: the product was not explored. Use only selectors you can be sure of from the address and common roles.',
    '', 'Write the scenes file now.'].join('\n')
}

/** The TypeScript in a reply: the last ```ts block, or the whole reply when it has
 *  no code fence but is clearly a file. */
export function extractCode(reply: string): string {
  const blocks = [...reply.matchAll(/```(?:ts|typescript|tsx)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]!.trim())
  const code = blocks.filter((b) => b.includes('defineScenes')).at(-1) ?? (reply.includes('defineScenes') && !reply.includes('```') ? reply.trim() : '')
  if (!code) throw new Error('the model did not return a scenes file (no code with defineScenes in its reply)')
  return code + '\n'
}

/** Reasons a generated file may not be run. The file is code that will run on this
 *  machine, so it is held to what a scenes file needs and nothing more. This is a
 *  guard against mistakes and stray instructions, not a sandbox. */
export function unsafeReasons(code: string): string[] {
  const reasons: string[] = []
  const imports = [...code.matchAll(/(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)]
    .map((m) => m[1] ?? m[2] ?? m[3]!)
  for (const from of new Set(imports)) if (from !== 'kwartz-showcase') reasons.push(`it imports "${from}"; only "kwartz-showcase" is allowed`)
  const banned: [RegExp, string][] = [
    [/\brequire\s*\(/, 'it calls require()'],
    [/\bimport\s*\(/, 'it uses a dynamic import'],
    [/\bprocess\s*\./, 'it touches the process'],
    [/\b(eval|Function)\s*\(/, 'it evaluates code from text'],
    [/\bfetch\s*\(|XMLHttpRequest|WebSocket/, 'it makes its own network calls'],
    [/\b(child_process|execSync|spawn)\b/, 'it starts programs'],
    [/\bBun\s*\.|\bDeno\s*\./, 'it uses the runtime directly'],
    [/\b(setTimeout|setInterval)\s*\(/, 'it uses timers; scenes wait for page states or untilSaid'],
    [/\.(setInputFiles|route|addInitScript|exposeFunction)\s*\(/, 'it changes how the page loads or uploads files'],
  ]
  for (const [pattern, why] of banned) if (pattern.test(code)) reasons.push(why)
  if (!/export\s+default\s+defineScenes\s*\(/.test(code)) reasons.push('it does not end with: export default defineScenes({ ... })')
  return reasons
}

/** One call to the Messages API. */
export async function askClaude(input: { apiKey: string; model: string; system: string; messages: Message[] }): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': input.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: input.model, max_tokens: 8000, system: input.system, messages: input.messages }),
  })
  const body = await res.text()
  if (!res.ok) {
    let detail = body.slice(0, 300)
    try {
      detail = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? detail
    } catch { /* not JSON: keep the text */ }
    throw new Error(`the Claude API answered ${res.status}: ${detail}`)
  }
  const json = JSON.parse(body) as { content?: { type: string; text?: string }[] }
  const text = (json.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
  if (!text) throw new Error('the Claude API returned no text')
  return text
}

export interface AutoResult { scenesFile: string; tries: number; result: MakeResult; model: string }

const scenesPath = (brief: Brief, dir: string) => path.resolve(dir, brief.scenes ?? 'video.ts')

/** Explore, ask for the scenes, draft until it runs, then render. */
export async function auto(opts: AutoOptions = {}): Promise<AutoResult> {
  const log = opts.log ?? console.log
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('"showcase auto" writes the scenes with Claude through the API, and needs a key.\n'
      + 'Set the ANTHROPIC_API_KEY variable, then run it again. (Every other command works without a key; '
      + 'in Claude Code, use the /kwartz-showcase skill instead and no key is needed.)')
  }
  const model = opts.model || process.env.SHOWCASE_MODEL || DEFAULT_MODEL
  const maxTries = Math.max(1, opts.tries ?? 3)
  const { brief, dir, file: configFile } = loadBrief(opts.configFile)
  const scenesFile = scenesPath(brief, dir)
  if (fs.existsSync(scenesFile)) {
    if (!opts.force) throw new Error(`${scenesFile} already exists. "showcase auto" writes that file: pass --force to replace it (a copy is kept), or use "showcase make" to render what is there.`)
    fs.copyFileSync(scenesFile, `${scenesFile}.before-auto`)
    log(`kept a copy of the old scenes: ${scenesFile}.before-auto`)
  }

  // 1. the product map
  const mapFile = path.join(workDir(dir), 'explore', 'map.md')
  if (!fs.existsSync(mapFile) && brief.url) {
    log('exploring the product')
    await explore({
      url: brief.url, outDir: path.dirname(mapFile), log,
      session: brief.auth?.session ? path.resolve(dir, brief.auth.session) : undefined, allow: brief.safety?.allow,
    })
  }
  const map = fs.existsSync(mapFile) ? fs.readFileSync(mapFile, 'utf8') : null

  // 2. the scenes, written by the model and checked before anything runs
  const system = systemPrompt({
    skill: fs.readFileSync(asset('skills', 'kwartz-showcase', 'SKILL.md'), 'utf8'),
    template: fs.readFileSync(asset('templates', 'brief', 'video.ts'), 'utf8'),
  })
  const messages: Message[] = [{ role: 'user', content: firstRequest(workOrder(brief, dir), map) }]
  const write = async (): Promise<void> => {
    for (let n = 0; n < 2; n++) {
      const reply = await askClaude({ apiKey, model, system, messages })
      messages.push({ role: 'assistant', content: reply })
      const code = extractCode(reply)
      const reasons = unsafeReasons(code)
      if (!reasons.length) return fs.writeFileSync(scenesFile, code)
      messages.push({ role: 'user', content: `That file was refused and not run, because ${reasons.join('; ')}. Send the whole file again without that.` })
    }
    throw new Error('the model twice returned a scenes file that may not be run; nothing was written')
  }

  // 3. draft until every scene runs
  let tries = 0
  let draft: MakeResult | null = null
  while (!draft) {
    tries += 1
    log(`asking ${model} for the scenes (attempt ${tries} of ${maxTries})`)
    await write()
    try {
      draft = await make(configFile, { ...opts, draft: true, log })
    } catch (e) {
      const reason = (e as Error).message
      log(`the draft stopped: ${reason.split('\n')[0]}`)
      if (tries >= maxTries) throw new Error(`the draft still fails after ${tries} attempt(s). The last scenes file is at ${scenesFile}; fix it by hand, then run "showcase make".\nLast error: ${reason}`)
      messages.push({ role: 'user', content: `The draft render stopped with this error:\n\n${reason}\n\nFix the cause and send the whole file again. If a selector was not found, choose another from the product map.` })
    }
  }

  // 4. one pass on what the checks found: things cut off or covered, and the length
  const cut = draft.made.flatMap((m) => m.checks.filter((c) => c.name === 'layout' && !c.ok).map((c) => `in the ${m.format} video, ${c.detail}`))
  const advice = [...cut, draft.made.find((m) => m.advice)?.advice].filter(Boolean).join('. ') || undefined
  if (advice && tries < maxTries) {
    tries += 1
    log(`fixing what the checks found: ${advice}`)
    messages.push({ role: 'user', content: `Every scene runs, but the checks found this: ${advice}. Fix exactly that (for a length problem change only the narration; for something cut off or covered, make it smaller, move it, or choose another side), keep everything else, and send the whole file again.` })
    const before = fs.readFileSync(scenesFile, 'utf8')
    try {
      await write()
      draft = await make(configFile, { ...opts, draft: true, log })
    } catch (e) {
      // a worse file is never kept: the one that ran is put back
      log(`the length fix did not run (${(e as Error).message.split('\n')[0]}); keeping the file that did`)
      fs.writeFileSync(scenesFile, before)
    }
  }
  if (opts.draftOnly) return { scenesFile, tries, result: draft, model }

  // 5. the real thing
  const result = await make(configFile, { ...opts, draft: false, log })
  return { scenesFile, tries, result, model }
}
