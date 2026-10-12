// Bundles the kit's own theme rules and card drawing code for the browser, so the
// theme studio checks and draws a theme exactly as a render would. Runs before `dev`
// and `build`. The kit keeps these files free of disk and process code (a test in the
// kit fails if that changes), so the bundle needs no stand-ins.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '../lib/generated/engine.js')
const result = await build({
  entryPoints: [join(here, 'engine-entry.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  legalComments: 'none',
  metafile: true,
})
const kb = Math.round(Object.values(result.metafile.outputs)[0].bytes / 1024)
console.log(`engine.js: the kit's theme rules and cards, ${kb} kB`)
