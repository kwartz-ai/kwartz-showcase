// A set of sound effects chosen for one project, from soundcn
// (https://github.com/kapishdima/soundcn).
//
// Nothing here can hear. A sound is first filtered by what the registry says about
// it (licence, category, length, tags), then downloaded and measured, and only a
// sound that passes the measurements is used. The measurements stand in for an
// ear: a highlight sound chosen by its description alone was once heard by
// reviewers as a squeak, with its energy near 4.7 kHz.
import fs from 'node:fs'
import path from 'node:path'
import type { EventKind } from '../core/types.ts'
import { showcaseHome, run } from '../core/util.ts'

export type Role = 'click' | 'callout' | 'transition'
export const ROLE_OF: Record<EventKind, Role> = { click: 'click', callout: 'callout', whoosh: 'transition' }

export interface RegistryItem {
  name: string
  title?: string
  description?: string
  author?: string
  categories?: string[]
  meta?: { duration?: number; license?: string; tags?: string[]; keywords?: string[] }
}

interface RoleRule {
  minSec: number
  maxSec: number
  /** A sound must be in one of these categories. */
  categories: string[]
  /** Highest centre of pitch allowed, Hz. A sound that plays many times must sit low. */
  maxCentroidHz: number
  /** The peak the sound is brought to in the mix, dB below full scale. */
  peakDb: number
}

export const ROLES: Record<Role, RoleRule> = {
  click: { minSec: 0.01, maxSec: 0.15, categories: ['click', 'select', 'toggle', 'tick'], maxCentroidHz: 3000, peakDb: -10 },
  callout: { minSec: 0.03, maxSec: 0.35, categories: ['toggle', 'select', 'drop', 'pluck', 'hover', 'open', 'tick', 'switch'], maxCentroidHz: 1500, peakDb: -13 },
  transition: { minSec: 0.25, maxSec: 0.9, categories: ['card', 'cards', 'scroll', 'cloth', 'book', 'maximize', 'minimize', 'close', 'back', 'draw'], maxCentroidHz: 1500, peakDb: -17 },
}

/** Never used, whatever the registry says. The game-derived set is marked CC0 in
 *  the registry, but its own project says those sounds belong to the game's
 *  publisher. Voices and jingles are not interface sounds. */
export const BLOCKED_CATEGORIES = ['warcraft', 'voice', 'voiceover', 'jingles', 'combat', 'war', 'kill']

const REGISTRY_URL = 'https://www.soundcn.xyz/r/registry.json'
const registryFile = () => path.join(showcaseHome(), 'soundcn-registry.json')
const WEEK_MS = 7 * 24 * 3600 * 1000

/** The soundcn registry, kept for a week so most renders need no network. */
export async function loadRegistry(): Promise<RegistryItem[]> {
  const file = registryFile()
  const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < WEEK_MS
  if (!fresh) {
    try {
      const res = await fetch(REGISTRY_URL)
      if (!res.ok) throw new Error(`status ${res.status}`)
      fs.mkdirSync(showcaseHome(), { recursive: true })
      fs.writeFileSync(file, await res.text())
    } catch (e) {
      if (!fs.existsSync(file)) throw new Error(`could not reach the soundcn registry (${(e as Error).message})`)
    }
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8')) as { items?: RegistryItem[] }
  return json.items ?? []
}

/** Whether the registry's own description of a sound allows it in a role. */
export function eligible(item: RegistryItem, role: Role): boolean {
  const rule = ROLES[role]
  const cats = item.categories ?? []
  const d = item.meta?.duration
  return item.meta?.license === 'CC0'
    && !cats.some((c) => BLOCKED_CATEGORIES.includes(c))
    && cats.some((c) => rule.categories.includes(c))
    && typeof d === 'number' && d >= rule.minSec && d <= rule.maxSec
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)

/** How well a sound's tags and description match a mood, as a count of shared words. */
export function moodScore(item: RegistryItem, mood: string): number {
  const have = new Set([...(item.meta?.tags ?? []), ...(item.meta?.keywords ?? []), ...words(item.description ?? ''), ...words(item.title ?? '')].map((w) => w.toLowerCase()))
  return words(mood).filter((w) => have.has(w)).length
}

/** The sounds worth downloading for a role, best match for the mood first. */
export function candidates(items: RegistryItem[], role: Role, mood = '', limit = 6): RegistryItem[] {
  return items.filter((i) => eligible(i, role))
    .map((i) => ({ i, score: moodScore(i, mood) }))
    .sort((a, b) => b.score - a.score || a.i.name.localeCompare(b.i.name))
    .slice(0, limit).map((x) => x.i)
}

export interface Measured { centroidHz: number; peakDb: number; seconds: number }

/** Measure a sound file: where its pitch is centred, how loud its peak is, how long it is. */
export async function measure(file: string): Promise<Measured> {
  const stats = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-af', 'aspectralstats=measure=centroid,ametadata=print:key=lavfi.aspectralstats.1.centroid:file=-,volumedetect', '-f', 'null', '-'], { stderr: false })
  const peak = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { stderr: true })
  const values = [...stats.matchAll(/centroid=([\d.]+)/g)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n) && n > 0)
  const seconds = parseFloat(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]))
  return {
    centroidHz: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
    peakDb: Number(peak.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1] ?? 0),
    seconds,
  }
}

/** Why a measured sound may not be used in a role. Empty when it may. */
export function gate(role: Role, m: Measured): string[] {
  const rule = ROLES[role]
  const reasons: string[] = []
  if (!m.centroidHz) reasons.push('its pitch could not be measured')
  else if (m.centroidHz > rule.maxCentroidHz) reasons.push(`its pitch is centred at ${m.centroidHz} Hz, above the ${rule.maxCentroidHz} Hz limit for a ${role} sound`)
  if (m.seconds > rule.maxSec * 1.25) reasons.push(`it is ${m.seconds.toFixed(2)} s long, over the ${rule.maxSec} s limit`)
  if (m.peakDb < -40) reasons.push('it is nearly silent')
  return reasons
}

/** The gain that brings a sound's peak to the level its role sits at in the mix. */
export function gainFor(role: Role, m: Measured): number {
  return +Math.min(2, 10 ** ((ROLES[role].peakDb - m.peakDb) / 20)).toFixed(3)
}

const soundDir = () => path.join(showcaseHome(), 'sfx')

/** Download one sound by name. Refuses anything not CC0 or in a blocked set. */
export async function fetchSound(name: string): Promise<string> {
  const file = path.join(soundDir(), `${name}.mp3`)
  if (fs.existsSync(file)) return file
  fs.mkdirSync(soundDir(), { recursive: true })
  const res = await fetch(`https://www.soundcn.xyz/r/${name}.json`)
  if (!res.ok) throw new Error(`soundcn: ${name} not found (${res.status})`)
  const item = await res.json() as RegistryItem & { files: { content: string }[] }
  if (item.meta?.license !== 'CC0') throw new Error(`soundcn: ${name} is ${item.meta?.license}; only CC0 sounds are allowed`)
  if ((item.categories ?? []).some((c) => BLOCKED_CATEGORIES.includes(c))) throw new Error(`soundcn: ${name} is from a set that may not be used (${item.categories!.join(', ')})`)
  const b64 = item.files.map((f) => f.content).join('\n').match(/data:audio\/[a-z0-9]+;base64,([A-Za-z0-9+/=]+)/)?.[1]
  if (!b64) throw new Error(`soundcn: no audio found in ${name}`)
  fs.writeFileSync(file, Buffer.from(b64, 'base64'))
  return file
}

export interface Chosen {
  /** A soundcn name, or "generated" for the kit's own soft sound. */
  name: string
  file: string | null
  gain: number | null
  centroidHz: number | null
  /** Why this one: what was tried and what was refused. */
  why: string
}
export type Palette = Record<Role, Chosen>
export const GENERATED: Chosen = { name: 'generated', file: null, gain: null, centroidHz: null, why: 'the kit\'s own soft sound' }

/** Pick one sound for a role: the best match for the mood that passes the
 *  measurements. Falls back to the kit's own sound, and says why. */
export async function choose(role: Role, items: RegistryItem[], mood: string): Promise<Chosen> {
  const refused: string[] = []
  for (const item of candidates(items, role, mood)) {
    try {
      const file = await fetchSound(item.name)
      const m = await measure(file)
      const reasons = gate(role, m)
      if (!reasons.length) {
        return { name: item.name, file, gain: gainFor(role, m), centroidHz: m.centroidHz, why: refused.length ? `passed after ${refused.length} refused (${refused.join('; ')})` : 'first candidate, passed' }
      }
      refused.push(`${item.name}: ${reasons[0]}`)
    } catch (e) {
      refused.push(`${item.name}: ${(e as Error).message}`)
    }
  }
  return { ...GENERATED, why: refused.length ? `no soundcn sound passed (${refused.join('; ')})` : 'no soundcn sound fits this role' }
}

/** A sound the person named. It is used as asked, with a note if it fails a measurement. */
async function named(role: Role, name: string): Promise<Chosen> {
  if (name === 'generated') return GENERATED
  const file = await fetchSound(name)
  const m = await measure(file)
  const reasons = gate(role, m)
  return { name, file, gain: gainFor(role, m), centroidHz: m.centroidHz, why: reasons.length ? `named in the config. Note: ${reasons.join('; ')}` : 'named in the config' }
}

export type EffectsChoice = 'auto' | 'generated' | 'none' | { click?: string; callout?: string; transition?: string }

/** The sound set for a project. The choice is saved beside the config, so every
 *  later render sounds the same and needs no network. */
export async function resolvePalette(choice: EffectsChoice, mood: string, lockFile: string): Promise<Palette> {
  const key = JSON.stringify({ choice, mood })
  if (fs.existsSync(lockFile)) {
    const saved = JSON.parse(fs.readFileSync(lockFile, 'utf8')) as { key: string; palette: Palette }
    const usable = saved.key === key && (Object.values(saved.palette) as Chosen[]).every((c) => !c.file || fs.existsSync(c.file))
    if (usable) return saved.palette
  }
  let palette: Palette = { click: GENERATED, callout: GENERATED, transition: GENERATED }
  if (choice === 'auto') {
    try {
      const items = await loadRegistry()
      palette = { click: await choose('click', items, mood), callout: await choose('callout', items, mood), transition: await choose('transition', items, mood) }
    } catch (e) {
      const why = `soundcn could not be used (${(e as Error).message})`
      palette = { click: { ...GENERATED, why }, callout: { ...GENERATED, why }, transition: { ...GENERATED, why } }
    }
  } else if (typeof choice === 'object') {
    for (const role of ['click', 'callout', 'transition'] as const) palette[role] = await named(role, choice[role] ?? 'generated')
  }
  fs.mkdirSync(path.dirname(lockFile), { recursive: true })
  fs.writeFileSync(lockFile, JSON.stringify({ key, palette }, null, 2))
  return palette
}

/** Where each sound in a video came from, for the record beside the video. */
export function credits(palette: Palette): string {
  const lines = ['Sound effects in this video', '']
  for (const role of ['click', 'callout', 'transition'] as const) {
    const c = palette[role]
    lines.push(c.file
      ? `${role}: "${c.name}" from soundcn (https://www.soundcn.xyz), CC0. Pitch centre ${c.centroidHz} Hz. ${c.why}.`
      : `${role}: generated by Kwartz Showcase with FFmpeg. ${c.why}.`)
  }
  return lines.join('\n') + '\n'
}
