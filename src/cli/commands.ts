// What each showcase command does. Each returns true when it succeeded with every
// check passing; the entry point turns false into exit code 1.
import fs from 'node:fs'
import path from 'node:path'
import { auto } from '../auto/auto.ts'
import { candidates, loadRegistry, type Role } from '../audio/palette.ts'
import { DEFAULT_CONFIG, isHosted, loadBrief } from '../brief/brief.ts'
import { THEMES, themeNamed } from '../brief/themes.ts'
import { workOrder } from '../brief/workorder.ts'
import { explore } from '../capture/explore.ts'
import { DEFAULT_SESSION, login } from '../capture/session.ts'
import { asset } from '../core/paths.ts'
import { make, workDir } from '../render/make.ts'
import { remix, render, type RenderOptions } from '../render/render.ts'
import { doctor, setup } from '../setup/setup.ts'
import { printChecks, verify } from '../verify/verify.ts'
import { loadVideo } from '../video/define.ts'
import type { Args } from './args.ts'

const log = console.log
const renderOptions = (a: Args): RenderOptions => ({
  draft: a.flag('draft'),
  headed: a.flag('headed'),
  baseUrl: a.opt('base'),
  music: a.flag('no-music') ? false : a.opt('music'),
  effects: a.flag('no-sfx') ? false : undefined,
  border: a.flag('no-border') ? false : undefined,
})
const videoArg = (a: Args, cmd: string) => {
  if (!a.rest[0]) throw new Error(`which video? For example: showcase ${cmd} video.ts`)
  return loadVideo(a.rest[0])
}
/** A config path given on the command line, or the default beside the terminal. */
const configArg = (a: Args) => a.rest[0] ?? DEFAULT_CONFIG

// ── A video written by hand ──────────────────────────────────────────────────

export async function cmdRender(a: Args): Promise<boolean> {
  const video = await videoArg(a, 'render')
  const { file } = await render(video, renderOptions(a))
  log(`done: ${file}\n`)
  // the file is written either way; the result says whether it passed its checks
  return printChecks(await verify(video))
}

export async function cmdRemix(a: Args): Promise<boolean> {
  const video = await videoArg(a, 'remix')
  log(`done: ${await remix(video, renderOptions(a))}\n`)
  return printChecks(await verify(video))
}

export async function cmdVerify(a: Args): Promise<boolean> {
  return printChecks(await verify(await videoArg(a, 'verify')))
}

// ── A video described by a config ────────────────────────────────────────────

export async function cmdMake(a: Args): Promise<boolean> {
  return report(await make(configArg(a), { ...renderOptions(a), remix: a.flag('remix'), theme: a.opt('theme') }))
}

/** Print what was made, shape by shape, with its checks. */
function report(result: Awaited<ReturnType<typeof make>>): boolean {
  let ok = true
  for (const m of result.made) {
    log(`\n${m.format}: ${m.file}`)
    for (const c of m.copies) log(`  copy: ${c}`)
    ok = printChecks(m.checks) && ok
    if (m.advice) log(`to fit the length: ${m.advice}`)
  }
  if (result.creditsFile) log(`\nsound credits: ${result.creditsFile}`)
  return ok
}

export async function cmdAuto(a: Args): Promise<boolean> {
  const done = await auto({
    ...renderOptions(a), configFile: configArg(a), model: a.opt('model'),
    tries: a.opt('tries') ? Number(a.opt('tries')) : undefined,
    force: a.flag('force'), draftOnly: a.flag('draft'), draft: undefined,
  })
  log(`\nscenes written by ${done.model} in ${done.tries} attempt(s): ${done.scenesFile}`)
  log('Read that file before you share the video: it is the script, and it was not written by a person.')
  return report(done.result)
}

export async function cmdPlan(a: Args): Promise<boolean> {
  const { brief, dir } = loadBrief(configArg(a))
  const text = workOrder(brief, dir)
  const file = path.join(workDir(dir), 'plan.md')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
  log(text)
  log(`saved: ${file}`)
  return true
}

/** The themes, with what each suits. */
export function cmdThemes(): boolean {
  log('classic      The kit\'s own look: dark navy cards, an amber highlight. The default.')
  for (const [name, t] of Object.entries(THEMES)) log(`${name.padEnd(12)} ${t.style}: ${t.use}`)
  log('\nSet one in the config:  "theme": "glass"')
  log('Try one for a single run, beside the others:  showcase make --theme glass --draft')
  return true
}

export async function cmdExplore(a: Args): Promise<boolean> {
  // a config, or just an address
  const target = a.rest[0] ?? DEFAULT_CONFIG
  const direct = /^https?:\/\//.test(target)
  const { brief, dir } = direct ? { brief: { url: target }, dir: process.cwd() } : loadBrief(target)
  if (!brief.url) throw new Error('"showcase explore" needs an address. This config films a static folder; open its files instead.')
  const outDir = path.join(workDir(dir), 'explore')
  const session = 'auth' in brief && brief.auth?.session ? path.resolve(dir, brief.auth.session) : undefined
  const map = await explore({
    url: brief.url, outDir, session,
    maxPages: Number(a.opt('max-pages') ?? 8),
    allow: 'safety' in brief ? brief.safety?.allow : undefined,
  })
  log(`\n${map.screens.length} screen(s) mapped. Read ${path.join(outDir, 'map.md')} and the screenshots beside it.`)
  if (map.skipped.length) log(`${map.skipped.length} more page(s) were found but not visited. Raise --max-pages to include them.`)
  log(`the product's own font: ${map.style.font ?? 'not found'}; main button colour: ${map.style.accent ?? 'not found'}`)
  return true
}

export async function cmdLogin(a: Args): Promise<boolean> {
  const target = a.rest[0] ?? DEFAULT_CONFIG
  const direct = /^https?:\/\//.test(target)
  const { brief, dir } = direct ? { brief: { url: target, auth: undefined }, dir: process.cwd() } : loadBrief(target)
  if (!brief.url) throw new Error('"showcase login" needs an address in the config')
  const file = path.resolve(dir, brief.auth?.session ?? DEFAULT_SESSION)
  const saved = await login({ url: brief.url, file })
  log(`saved the session to ${saved.file} (${saved.cookies} cookies).`)
  log(`It is a set of keys to the product: it is kept out of git, and you should not share it.`)
  if (!brief.auth?.session) log(`To use it, add to the config:  "auth": { "session": "${DEFAULT_SESSION}" }`)
  return true
}

export async function cmdSounds(a: Args): Promise<boolean> {
  const mood = a.opt('mood') ?? ''
  const roles = (a.opt('role') ? [a.opt('role')] : ['click', 'callout', 'transition']) as Role[]
  const items = await loadRegistry()
  for (const role of roles) {
    log(`\n${role}${mood ? `, mood "${mood}"` : ''}:`)
    for (const c of candidates(items, role, mood, 8)) {
      log(`  ${c.name.padEnd(22)} ${String(c.meta?.duration ?? '').padEnd(6)} s  ${(c.meta?.tags ?? []).slice(0, 5).join(', ')}`)
    }
  }
  log('\nListen to any of them at https://www.soundcn.xyz (search for its name).')
  log('These are candidates by description only. "showcase make" measures each one and uses the first that passes.')
  return true
}

// ── Setting up ───────────────────────────────────────────────────────────────

const STARTER_CONFIG = (url: string, theme?: string) => JSON.stringify({
  $schema: './node_modules/kwartz-showcase/schema/showcase.config.schema.json',
  name: 'demo',
  url,
  length: 30,
  formats: ['landscape'],
  ...(theme ? { theme } : {}),
  ...(isHosted(url) ? { safety: { banned: [] } } : {}),
}, null, 2) + '\n'

export function cmdInit(a: Args): boolean {
  const dir = a.rest[0] ?? '.'
  const withConfig = a.flag('config')
  const put = (to: string, write: () => void) => {
    const rel = path.relative(process.cwd(), to)
    if (fs.existsSync(to)) { log(`kept     ${rel} (already there)`); return }
    fs.mkdirSync(path.dirname(to), { recursive: true })
    write()
    log(`created  ${rel}`)
  }
  const copy = (from: string, to: string) => put(to, () => fs.copyFileSync(from, to))
  if (withConfig) {
    const url = a.opt('base') ?? 'http://localhost:3000'
    const theme = a.opt('theme') ? themeNamed(a.opt('theme')!)?.name : undefined
    put(path.resolve(dir, DEFAULT_CONFIG), () => fs.writeFileSync(path.resolve(dir, DEFAULT_CONFIG), STARTER_CONFIG(url, theme)))
    // the skill that teaches an agent how this theme is used well
    if (theme) copy(asset('skills', `showcase-theme-${theme}`, 'SKILL.md'), path.resolve(dir, '.claude', 'skills', `showcase-theme-${theme}`, 'SKILL.md'))
    copy(asset('templates', 'brief', 'video.ts'), path.resolve(dir, 'video.ts'))
  } else {
    copy(asset('templates', 'starter', 'video.ts'), path.resolve(dir, 'video.ts'))
  }
  copy(asset('skills', 'kwartz-showcase', 'SKILL.md'), path.resolve(dir, '.claude', 'skills', 'kwartz-showcase', 'SKILL.md'))
  log(withConfig
    ? '\nnext: set "url" in showcase.config.json, then "showcase explore", "showcase plan" and "showcase make --draft". Add "out/" and ".showcase/" to .gitignore.'
    : '\nnext: edit video.ts, then "showcase render video.ts --draft". Add "out/" to .gitignore.')
  return true
}

export async function cmdSetup(): Promise<boolean> {
  await setup()
  return true
}

export const cmdDoctor = (): Promise<boolean> => doctor()
