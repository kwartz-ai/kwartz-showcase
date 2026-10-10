import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

/** Run a program and return its stdout (or stderr, for tools like ffmpeg that report there). */
export function run(cmd: string, args: string[], opts: { input?: string; stderr?: boolean } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    p.stdout.on('data', (d) => { out += d })
    p.stderr.on('data', (d) => { err += d })
    p.on('error', (e) => reject(new Error(`could not start ${cmd}: ${e.message}`)))
    p.on('close', (code) => code === 0
      ? resolve(opts.stderr ? err : out)
      : reject(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`)))
    if (opts.input != null) p.stdin.write(opts.input)
    p.stdin.end()
  })
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Escape text for use inside overlay HTML. */
export const esc = (s: unknown) => String(s).replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

/** Where the voice model and its Python environment live, shared by every project
 *  on the machine so the 350 MB model is downloaded once. Override with KAV_HOME. */
export function kavHome(): string {
  return process.env.KAV_HOME ?? path.join(os.homedir(), '.cache', 'kwartz-ai-video')
}
