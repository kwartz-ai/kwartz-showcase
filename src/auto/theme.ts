// A theme from a description: "showcase theme new acme --prompt '...'".
//
// The person says what their brand looks like. Claude, through the API, answers
// with a theme file. The file is checked exactly as a hand-written one is: its
// shape, that its CSS is safe, and that captions and text can be read. What fails
// goes back for a fix. Only a theme that passes is written.
import fs from 'node:fs'
import path from 'node:path'
import { THEMES_DIR, checkReadable, checkThemeFile, presetFrom, type ThemeFile } from '../brief/custom-theme.ts'
import { FONT_PRESETS } from '../brief/fonts.ts'
import { BACKDROPS } from '../brief/presets.ts'
import { exploredStyle } from '../brief/resolve.ts'
import { THEMES } from '../brief/themes.ts'
import { DEFAULT_MODEL, askClaude, type Message } from './auto.ts'

/** What the model is told a theme file is, and the rules it must keep. */
export function themeSystemPrompt(): string {
  const bases = Object.entries(THEMES).map(([n, t]) => `- ${n} (${t.style}): ${t.use}`).join('\n')
  const fonts = Object.entries(FONT_PRESETS).map(([n, f]) => `- ${n}: ${f.display} with ${f.text}. ${f.use}`).join('\n')
  return [
    'You design the look of product demo videos made with Kwartz Showcase. You answer with one theme file.',
    '',
    'Reply with ONE JSON object in a single ```json code block, and one short sentence before it saying which base you chose and why.',
    '',
    '## The file',
    'A theme starts from a built-in theme ("extends") and changes only what the brand needs. Prefer changing little: colours, the font pairing, the backdrop. Write "look" surfaces only when the base cannot give the look that was asked for.',
    '```json',
    JSON.stringify({
      description: 'one line: what this theme is for',
      extends: 'a base from the list below, or classic',
      colors: { ink: '#hex, the dark colour', accent: '#hex, the ONE highlight colour', band: '#hex behind captions on a tall frame', bandText: '#hex of those captions' },
      fontPreset: 'a pairing from the list below',
      feel: 'calm | crisp | lively',
      backdrop: ['#from', '#to', '#glow'],
      backdropPattern: 'glow | waves | plain',
      radius: 0.034,
      mood: 'a few words for the sounds',
      look: { canvas: 'CSS background of a dark card', fg: '#text on it', muted: '#quieter text', paper: 'CSS background of a light card', paperFg: '#text on it',
        panel: 'CSS of a card within a card', panelFg: '#text on it', chip: 'CSS of a small tag, with color:', label: 'CSS of the callout label, with color:',
        ring: 'border:2.5px solid {accent};border-radius:8px', caption: 'CSS of the caption box, with color:', enter: 'rise | pop | cut | float | type | depth', upper: false, steps: 'row | grid' },
    }, null, 1),
    '```',
    'Every key is optional except that you should set "extends". Leave out what the base already does well.',
    '',
    '## Bases',
    '- classic: dark navy cards, an amber highlight. The safe default for most products.',
    bases,
    '',
    '## Font pairings',
    fonts,
    '',
    `## Backdrops by name\n${Object.keys(BACKDROPS).join(', ')}. Or three hex colours: two close shades of the brand colour, and a light tint of it for the glow.`,
    '',
    '## Rules. A file that breaks one is refused.',
    '- Colours are hex. Font names are plain family names from Google Fonts.',
    '- CSS in "look" describes a surface only: background, border, border-radius, box-shadow, color, backdrop-filter, opacity. No position, size, display, transform, animation, url(...), quotes of any kind other than single quotes, or the characters " < > \\ { } @. The only braces allowed are the placeholders {accent} and {ink}.',
    '- "chip", "label" and "caption" must each include their own text colour (color:#...).',
    '- Caption text on its box: contrast of at least 7 to 1. "bandText" on "band": at least 7 to 1.',
    '- "fg" on a solid "canvas", and "paperFg" on a solid "paper": at least 7 to 1.',
    '- "accent" on a solid "canvas": at least 3 to 1. Label text on its box: at least 4.5 to 1.',
    '- One highlight colour only. The brand\'s main colour is usually the accent, unless it is too dark to show on the ground: then use it for the ground and pick a light accent.',
    '- This is for video, watched once and often on a phone: no hairlines under 1.5px, no faint shadows that compression would erase, no thin light type.',
    '- Match the brand\'s character, not only its colours: a bank is not clay, a toy is not editorial.',
  ].join('\n')
}

/** The request: the description, and what is already known about the brand. */
export function themeRequest(prompt: string, name: string, brand: { font?: string | null; accent?: string | null; url?: string } = {}): string {
  const known = [
    brand.url ? `The product is at ${brand.url}.` : '',
    brand.accent ? `Its own main button colour, read from the product: ${brand.accent}.` : '',
    brand.font ? `Its own font, read from the product: ${brand.font}.` : '',
  ].filter(Boolean)
  return [`Make a theme named "${name}".`, '', 'What the person asked for:', prompt.trim(),
    ...(known.length ? ['', 'What is known about the brand:', ...known] : []), '', 'Send the theme file now.'].join('\n')
}

/** The JSON object in a reply: the last ```json block, or the reply itself. */
export function extractJson(reply: string): unknown {
  const blocks = [...reply.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]!.trim())
  const text = blocks.filter((b) => b.startsWith('{')).at(-1) ?? (reply.trim().startsWith('{') ? reply.trim() : '')
  if (!text) throw new Error('the model did not return a theme file (no JSON object in its reply)')
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`the model returned JSON that cannot be read: ${(e as Error).message}`)
  }
}

/** Everything wrong with a theme, as a model or a person should hear it. */
export function themeProblems(json: unknown): { errors: string[]; warnings: string[] } {
  const shape = checkThemeFile(json)
  if (shape.length) return { errors: shape, warnings: [] }
  return checkReadable(presetFrom(json as ThemeFile))
}

export interface ThemeFromPrompt {
  prompt: string
  name: string
  /** The folder of the config: the theme goes in its `themes` folder. */
  dir: string
  apiKey?: string
  model?: string
  /** How many times a refused theme may go back for a fix. Default 3. */
  tries?: number
  url?: string
  log?: (line: string) => void
}

/** Ask for a theme, check it, send back what fails, and write the one that passes. */
export async function themeFromPrompt(opts: ThemeFromPrompt): Promise<{ file: string; tries: number; warnings: string[]; base: string; model: string }> {
  const log = opts.log ?? console.log
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Making a theme from a description uses Claude through the API, and needs a key.\n'
      + 'Set the ANTHROPIC_API_KEY variable, then run it again. Without a key there are two other ways:\n'
      + `- by hand:  showcase theme new ${opts.name} --from glass   (then edit ${THEMES_DIR}/${opts.name}.json)\n`
      + '- in Claude Code, with no key:  /showcase-theme-new  and describe the brand')
  }
  const model = opts.model || process.env.SHOWCASE_MODEL || DEFAULT_MODEL
  const maxTries = Math.max(1, opts.tries ?? 3)
  const brand = exploredStyle(opts.dir)
  const messages: Message[] = [{ role: 'user', content: themeRequest(opts.prompt, opts.name, { font: brand?.fontOnGoogle ? brand.font : null, accent: brand?.accent, url: opts.url }) }]
  const system = themeSystemPrompt()
  for (let n = 1; n <= maxTries; n++) {
    log(`asking ${model} for the theme (attempt ${n} of ${maxTries})`)
    const reply = await askClaude({ apiKey, model, system, messages })
    messages.push({ role: 'assistant', content: reply })
    let json: unknown
    let problems: { errors: string[]; warnings: string[] }
    try {
      json = extractJson(reply)
      problems = themeProblems(json)
    } catch (e) {
      problems = { errors: [(e as Error).message], warnings: [] }
    }
    if (!problems.errors.length) {
      const file = path.join(opts.dir, THEMES_DIR, `${opts.name}.json`)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      const out = { $schema: './node_modules/kwartz-showcase/schema/showcase.theme.schema.json', ...(json as object) }
      fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
      return { file, tries: n, warnings: problems.warnings, base: (json as ThemeFile).extends ?? 'classic', model }
    }
    log(`refused: ${problems.errors[0]}${problems.errors.length > 1 ? ` (and ${problems.errors.length - 1} more)` : ''}`)
    messages.push({ role: 'user', content: `That theme was refused and not saved:\n- ${problems.errors.join('\n- ')}\n\nFix exactly these and send the whole file again.` })
  }
  throw new Error(`no theme passed the checks after ${maxTries} attempt(s); nothing was written. Try a simpler description, or start by hand: showcase theme new ${opts.name} --from glass`)
}
