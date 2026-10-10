// Prove the repo works from exactly what git holds, with nothing left over from
// this machine: copy the files git tracks or would add (ignored files excluded) to
// an empty folder, install, run the checks, draft-render the example, then build
// for Node and draft-render the config example with the built package.
//   bun run test:clean
// Run it before a commit that adds or moves files, and before a release.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { run } from '../src/core/util.ts'

const root = path.resolve(import.meta.dirname, '..')
const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-clean-'))
const git = async (...args: string[]) => (await run('git', ['-C', root, ...args])).split('\0').filter(Boolean)
const step = async (label: string, fn: () => Promise<unknown>) => {
  process.stdout.write(`${label} ... `)
  await fn()
  console.log('ok')
}
const inDest = (cmd: string, args: string[]) => new Promise<void>((resolve, reject) => {
  const p = Bun.spawn([cmd, ...args], { cwd: dest, stdout: 'pipe', stderr: 'pipe' })
  p.exited.then(async (code) => code === 0
    ? resolve()
    : reject(new Error(`${cmd} ${args.join(' ')} failed:\n${(await new Response(p.stdout).text()).slice(-1500)}${(await new Response(p.stderr).text()).slice(-1500)}`)))
})

try {
  const files = [...new Set([
    ...await git('ls-files', '-z'),
    ...await git('ls-files', '--others', '--exclude-standard', '-z'),
  ])].filter((f) => fs.existsSync(path.join(root, f)))
  await step(`copy the ${files.length} files git holds to ${dest}`, async () => {
    for (const f of files) {
      fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true })
      fs.copyFileSync(path.join(root, f), path.join(dest, f))
    }
  })
  await step('bun install --frozen-lockfile', () => inDest('bun', ['install', '--frozen-lockfile']))
  await step('type-check and tests', () => inDest('bun', ['run', 'check']))
  await step('draft-render the example', () => inDest('bun', ['run', 'example:draft']))
  if (!fs.existsSync(path.join(dest, 'examples', 'hello', 'out', 'hello.mp4'))) throw new Error('the example wrote no video')
  await step('build for Node, and draft-render the config example with it', async () => {
    await inDest('bun', ['run', 'build'])
    await inDest('node', ['bin/showcase.js', 'make', 'examples/tour/showcase.config.json', '--draft'])
  })
  if (!fs.existsSync(path.join(dest, 'examples', 'tour', 'out', 'tour.vertical.mp4'))) throw new Error('the config example wrote no vertical video')
  console.log('\nclean copy works: what git holds is enough to install, pass the checks and render.')
} catch (e) {
  console.error(`\nFAILED: ${(e as Error).message}`)
  process.exitCode = 1
} finally {
  fs.rmSync(dest, { recursive: true, force: true })
}
