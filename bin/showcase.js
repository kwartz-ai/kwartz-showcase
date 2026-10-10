#!/usr/bin/env node
// showcase: the command line of Kwartz Showcase.
// Under Bun, with the source present (a clone, or a linked copy), the TypeScript
// source runs as it is. Under Node the built JavaScript in dist/ runs. A clone that
// has not been built is handed to Bun when Bun is installed.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'src', 'cli', 'index.ts')
const built = path.join(root, 'dist', 'cli', 'index.js')

if (process.versions.bun && fs.existsSync(source)) {
  await import(pathToFileURL(source).href)
} else if (fs.existsSync(built)) {
  await import(pathToFileURL(built).href)
} else {
  const viaBun = fs.existsSync(source)
    ? spawnSync('bun', [source, ...process.argv.slice(2)], { stdio: 'inherit' })
    : null
  if (viaBun && !viaBun.error && viaBun.status !== null) {
    process.exitCode = viaBun.status
  } else {
    console.error('showcase is not built yet. Run "bun run build" in the kit folder, or run showcase with Bun.')
    process.exitCode = 1
  }
}
