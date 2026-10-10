// A saved sign-in. `showcase login` opens a visible browser once; the person signs in
// by hand, two-step codes included; the session is saved to a file and reused by
// every render. No password is ever written in a config.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { chromium } from 'playwright'

export const DEFAULT_SESSION = '.showcase/session.json'

export interface LoginOptions {
  url: string
  /** Where to save the session. */
  file: string
  /** Called when the browser is open; resolves when the person has signed in.
   *  The default waits for Enter in the terminal. */
  wait?: () => Promise<void>
  headless?: boolean
  log?: (line: string) => void
}

const pressEnter = () => new Promise<void>((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question('', () => { rl.close(); resolve() })
})

/** Open the product, let the person sign in, and save the session. */
export async function login(opts: LoginOptions): Promise<{ file: string; cookies: number; origins: number }> {
  const log = opts.log ?? console.log
  const browser = await chromium.launch({ headless: opts.headless ?? false })
  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(opts.url)
    log(`A browser is open on ${opts.url}.\nSign in there. When you can see the screen the video should start from, come back here and press Enter.`)
    await (opts.wait ?? pressEnter)()
    fs.mkdirSync(path.dirname(opts.file), { recursive: true })
    const state = await context.storageState({ path: opts.file })
    ensureIgnored(opts.file)
    return { file: opts.file, cookies: state.cookies.length, origins: state.origins.length }
  } finally {
    await browser.close()
  }
}

/** A session file is a set of keys to the product. Make sure git never takes it:
 *  if the folder it is in has no .gitignore of its own, write one that ignores
 *  everything in that folder. */
export function ensureIgnored(file: string): void {
  const ignore = path.join(path.dirname(file), '.gitignore')
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '# sessions and working files: never commit\n*\n')
}

/** The session to start a render from, or undefined when there is none. */
export function sessionFor(file: string | null): string | undefined {
  if (!file) return undefined
  if (!fs.existsSync(file)) throw new Error(`the config names a saved session at ${file}, but it does not exist. Run "showcase login" first.`)
  return file
}
