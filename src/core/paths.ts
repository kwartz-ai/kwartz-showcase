import fs from 'node:fs'
import path from 'node:path'

let cached: string | null = null

/** The folder that holds the kit's package.json, found by walking up from this
 *  file. It is the same whether the code runs from src/ or from a built dist/. */
export function packageRoot(): string {
  if (cached) return cached
  let dir = import.meta.dirname
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return (cached = dir)
    const up = path.dirname(dir)
    if (up === dir) throw new Error('could not find the kit\'s package.json')
    dir = up
  }
}

/** A file that ships with the kit: a template, the skill, the schema. */
export const asset = (...parts: string[]) => path.join(packageRoot(), ...parts)
