// The brief: what a person wants from the video, written as showcase.config.json.
// Only the address is required. Everything else has a default.
import fs from 'node:fs'
import path from 'node:path'
import { FORMATS, MOTION_FEELS, PLATFORMS, type LayoutMode, type MotionFeel } from './presets.ts'

export type EffectsChoice = 'auto' | 'generated' | 'none' | { click?: string; callout?: string; transition?: string }

export interface Brief {
  /** Names the output files. Default: "video". */
  name?: string
  /** The product to film: a local address or a hosted one. Give this or `serve`. */
  url?: string
  /** A folder of static files to serve and film, beside the config. */
  serve?: string
  /** Seconds. Default 30. */
  length?: number
  /** Where it will be posted, by name. Each maps to a shape. */
  platforms?: string[]
  /** Shapes to render, by name or as a width and height. Default: landscape. */
  formats?: (string | { width: number; height: number })[]
  /** How a desktop product is placed in a tall shape. Default depends on the shape. */
  layout?: LayoutMode
  audience?: string
  /** The one thing the video should prove. */
  promise?: string
  cta?: { text: string; sub?: string }
  /** The person's own narration: a text file, one paragraph per scene. */
  script?: string
  /** The scenes file. Default: "video.ts" beside the config. */
  scenes?: string
  style?: {
    ink?: string
    accent?: string
    fonts?: { display?: string; text?: string; mono?: string }
    /** 'google' links the named families from Google Fonts. 'installed' uses
     *  fonts already on the machine or loaded by the product. */
    fontSource?: 'google' | 'installed'
    captions?: 'small' | 'medium' | 'large'
    /** 'rounded' (the default) sets the picture on a soft backdrop with rounded
     *  corners. 'none' fills the frame. */
    border?: 'rounded' | 'none'
    /** The backdrop's three colours: from, to, and the glow at the sides. */
    backdrop?: string[]
  }
  voice?: string
  /** 'generated', false, or a path to a track. */
  music?: 'generated' | false | (string & {})
  motion?: { feel?: MotionFeel; blur?: boolean; fps?: 30 | 60 }
  sound?: { effects?: EffectsChoice; mood?: string }
  auth?: { session?: string }
  safety?: { readOnly?: boolean; allow?: string[]; banned?: string[] }
}

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|.*\.local|.*\.localhost|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/i

/** A hosted address is anything that is not this machine or a private network. */
export function isHosted(url: string | undefined): boolean {
  return !!url && !LOCAL_HOST.test(new URL(url).hostname)
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const KNOWN = new Set(['$schema', 'name', 'url', 'serve', 'length', 'platforms', 'formats', 'layout', 'audience', 'promise', 'cta',
  'script', 'scenes', 'style', 'voice', 'music', 'motion', 'sound', 'auth', 'safety'])

/** Check a brief and say everything that is wrong with it at once. */
export function validateBrief(input: unknown): Brief {
  const problems: string[] = []
  const bad = (m: string) => { problems.push(m) }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('the config must be a JSON object, for example { "url": "http://localhost:3000" }')
  const b = input as Record<string, unknown> & Brief
  for (const key of Object.keys(b)) if (!KNOWN.has(key)) bad(`"${key}" is not a setting. Known settings: ${[...KNOWN].filter((k) => k !== '$schema').join(', ')}`)

  if (b.serve !== undefined && typeof b.serve !== 'string') bad('"serve" must be the path of a folder')
  if (b.url === undefined && b.serve) { /* a static folder needs no address */ }
  else if (typeof b.url !== 'string' || !b.url) bad('"url" is required: the address of the product to film (or "serve": a folder of static files)')
  else {
    try {
      const u = new URL(b.url)
      if (!/^https?:$/.test(u.protocol)) bad(`"url" must start with http:// or https:// (got ${b.url})`)
    } catch { bad(`"url" is not a valid address: ${b.url}`) }
  }
  if (b.name !== undefined && (typeof b.name !== 'string' || !/^[\w-]+$/.test(b.name))) bad('"name" must be letters, digits, dashes or underscores')
  if (b.length !== undefined && !(typeof b.length === 'number' && b.length >= 10 && b.length <= 600)) bad('"length" must be a number of seconds between 10 and 600')
  for (const p of b.platforms ?? []) if (!PLATFORMS[p]) bad(`unknown platform "${p}". Known: ${Object.keys(PLATFORMS).join(', ')}`)
  for (const f of b.formats ?? []) {
    if (typeof f === 'string') { if (!FORMATS[f]) bad(`unknown shape "${f}". Known: ${Object.keys(FORMATS).join(', ')}, or { "width", "height" }`) }
    else if (!(f && f.width >= 240 && f.height >= 240 && f.width <= 4096 && f.height <= 4096)) bad('a custom shape needs "width" and "height" between 240 and 4096')
    else if (f.width % 2 || f.height % 2) bad('a custom shape needs an even "width" and "height"')
  }
  if (b.layout !== undefined && !['fill', 'framed', 'fit', 'responsive'].includes(b.layout)) bad('"layout" must be fill, framed, fit or responsive')
  if (b.cta !== undefined && (typeof b.cta?.text !== 'string' || !b.cta.text.trim())) bad('"cta" needs a "text", for example { "text": "Book a walkthrough" }')
  for (const c of [b.style?.ink, b.style?.accent]) if (c !== undefined && !HEX.test(c)) bad(`a colour must be a hex value such as #0B1D35 (got ${c})`)
  for (const [role, name] of Object.entries(b.style?.fonts ?? {})) {
    // a quote in a font name would end the style attribute it is placed in
    if (typeof name !== 'string' || /["';<>]/.test(name)) bad(`font "${role}" must be a plain family name, for example "Roboto"`)
  }
  if (b.style?.captions !== undefined && !['small', 'medium', 'large'].includes(b.style.captions)) bad('"style.captions" must be small, medium or large')
  if (b.style?.border !== undefined && !['rounded', 'none'].includes(b.style.border)) bad('"style.border" must be rounded or none')
  if (b.style?.backdrop !== undefined && !(Array.isArray(b.style.backdrop) && b.style.backdrop.length === 3 && b.style.backdrop.every((c) => typeof c === 'string' && HEX.test(c)))) {
    bad('"style.backdrop" must be three hex colours, for example ["#1B2A8F", "#3D5AF1", "#B9A5FF"]')
  }
  if (b.motion?.feel !== undefined && !(b.motion.feel in MOTION_FEELS)) bad(`"motion.feel" must be one of: ${Object.keys(MOTION_FEELS).join(', ')}`)
  if (b.motion?.fps !== undefined && b.motion.fps !== 30 && b.motion.fps !== 60) bad('"motion.fps" must be 30 or 60')
  const fx = b.sound?.effects
  if (fx !== undefined && typeof fx === 'string' && !['auto', 'generated', 'none'].includes(fx)) bad('"sound.effects" must be auto, generated, none, or sound names for click, callout and transition')

  // a hosted product may hold real data: the person must say which names may not show
  if (typeof b.url === 'string' && problems.length === 0 && isHosted(b.url) && !Array.isArray(b.safety?.banned)) {
    bad(`"${new URL(b.url).hostname}" is a hosted address, so "safety.banned" is required: list the real names that must never appear on screen, or [] if there are none`)
  }
  if (problems.length) throw new Error(`the config has ${problems.length === 1 ? 'a problem' : `${problems.length} problems`}:\n- ${problems.join('\n- ')}`)
  return b
}

export const DEFAULT_CONFIG = 'showcase.config.json'

/** Read and check a config file. Returns the brief and the folder it lives in. */
export function loadBrief(file = DEFAULT_CONFIG): { brief: Brief; dir: string; file: string } {
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) throw new Error(`no config at ${abs}. Create it with "showcase init --config", or pass its path.`)
  let json: unknown
  try {
    json = JSON.parse(fs.readFileSync(abs, 'utf8'))
  } catch (e) {
    throw new Error(`${path.basename(abs)} is not valid JSON: ${(e as Error).message}`)
  }
  return { brief: validateBrief(json), dir: path.dirname(abs), file: abs }
}
