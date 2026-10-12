// A theme of your own: a small JSON file in the project, in a `themes` folder
// beside the config. It starts from a built-in theme and changes what it needs.
//
// The same file is written by hand, by an AI agent following a skill, or by
// "showcase theme new --prompt". However it was made, it passes the same checks as
// the built-in themes before a video may use it: the CSS must be safe to place in
// a page, and captions and text must stay readable.
import fs from 'node:fs'
import path from 'node:path'
import { themeNamed, type ThemePreset } from './themes.ts'
import { THEME_NAME, checkReadable, checkThemeFile, presetFrom, type ThemeFile } from './theme-rules.ts'

// the rules themselves have no disk code and live apart, so a web page can run them
export * from './theme-rules.ts'

export const THEMES_DIR = 'themes'

/** Where a custom theme's file is: `themes/<name>.json` beside the config, or a path. */
export function themeFile(name: string, dir: string): string | null {
  const file = name.endsWith('.json') ? path.resolve(dir, name) : path.join(dir, THEMES_DIR, `${name}.json`)
  return fs.existsSync(file) ? file : null
}

/** The names of the themes a project has made for itself. */
export function customThemes(dir: string): string[] {
  const folder = path.join(dir, THEMES_DIR)
  if (!fs.existsSync(folder)) return []
  return fs.readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((n) => THEME_NAME.test(n)).sort()
}

/** Read and check a theme file. Throws with everything that is wrong. */
export function loadThemeFile(file: string): { preset: ThemePreset; warnings: string[]; raw: ThemeFile } {
  let json: unknown
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`${path.basename(file)} is not valid JSON: ${(e as Error).message}`)
  }
  const shape = checkThemeFile(json)
  if (shape.length) throw new Error(`the theme ${path.basename(file)} has ${shape.length === 1 ? 'a problem' : `${shape.length} problems`}:\n- ${shape.join('\n- ')}`)
  const preset = presetFrom(json as ThemeFile)
  const { errors, warnings } = checkReadable(preset)
  if (errors.length) throw new Error(`the theme ${path.basename(file)} would be hard to read on video:\n- ${errors.join('\n- ')}`)
  return { preset, warnings, raw: json as ThemeFile }
}

export interface FoundTheme { name: string; preset: ThemePreset; custom: boolean; file?: string; base?: string; warnings: string[] }

/** The theme a word means: a built-in one, or one the project made. With no folder
 *  to look in, only the built-in themes are known. Null means the kit's own look. */
export function findTheme(name: string, dir?: string): FoundTheme | null {
  const key = name.trim()
  if (dir) {
    const file = themeFile(key, dir)
    if (file) {
      const { preset, warnings, raw } = loadThemeFile(file)
      return { name: path.basename(file, '.json'), preset, custom: true, file, base: raw.extends ?? 'classic', warnings }
    }
  }
  try {
    const found = themeNamed(key)
    return found ? { ...found, custom: false, warnings: [] } : null
  } catch (e) {
    const own = dir ? customThemes(dir) : []
    throw new Error((e as Error).message + (own.length ? `. Your own: ${own.join(', ')}` : '')
      + (dir ? `. To make your own: showcase theme new ${THEME_NAME.test(key) ? key : 'my-brand'}` : ''))
  }
}
