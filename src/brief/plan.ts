// From a length to a plan: how many scenes, how many words, in what order.
// A video's length comes from its narration, so a target length is really a
// scene count and a word budget.
import { WORDS_PER_SECOND } from '../audio/tts.ts'

/** Lead-in plus pause around every scene's narration, seconds. */
export const SCENE_OVERHEAD_SEC = 1.15
/** How long a chapter card holds, seconds. */
export const CHAPTER_CARD_SEC = 1.9
/** Share of a scene the voice fills: steps sometimes outrun their line. */
export const SPEECH_SHARE = 0.92

export interface Beat { kind: 'hook' | 'intro' | 'proof' | 'how' | 'chapter' | 'end'; words: number; note: string }

export interface Plan {
  lengthSec: number
  scenes: number
  chapters: number
  /** Words of narration for the whole video. */
  words: number
  beats: Beat[]
  /** The finished length may be this far from the target and still pass. */
  minSec: number
  maxSec: number
}

const KNOWN: Record<number, number> = { 30: 4, 60: 7, 90: 9, 180: 18 }

export function scenesFor(lengthSec: number): number {
  return KNOWN[lengthSec] ?? Math.max(3, Math.round(lengthSec / 10))
}

export function wordBudget(lengthSec: number, scenes: number, chapters = 0): number {
  const speech = (lengthSec - SCENE_OVERHEAD_SEC * scenes - CHAPTER_CARD_SEC * chapters) * SPEECH_SHARE
  return Math.max(0, Math.round(speech * WORDS_PER_SECOND))
}

export function planFor(lengthSec: number): Plan {
  if (!(lengthSec >= 10 && lengthSec <= 600)) throw new Error(`"length" must be between 10 and 600 seconds (got ${lengthSec})`)
  const scenes = scenesFor(lengthSec)
  // a long video is cut into chapters of three or four scenes, each opened by a card
  const chapters = lengthSec > 120 ? Math.max(1, Math.round(scenes / 4) - 1) : 0
  const words = wordBudget(lengthSec, scenes, chapters)

  const kinds: Beat['kind'][] = ['hook']
  if (scenes >= 6) kinds.push('intro')
  const proofs = scenes - kinds.length - 1 - (scenes >= 9 ? 1 : 0)
  for (let i = 0; i < proofs; i++) kinds.push('proof')
  if (scenes >= 9) kinds.splice(Math.min(kinds.length, 4), 0, 'how')
  kinds.push('end')

  // the hook and the end are shorter than a proof
  const weight = (k: Beat['kind']) => (k === 'proof' || k === 'how' ? 1.4 : 1)
  const total = kinds.reduce((n, k) => n + weight(k), 0)
  const NOTES: Record<Beat['kind'], string> = {
    hook: 'the viewer\'s problem, on a card, before the product appears',
    intro: 'the product, and the one promise of the video',
    proof: 'one interaction on the real product that proves the promise: a click, a zoom or spotlight, a label that says why it matters',
    how: 'a "how it works" card with three or four steps',
    chapter: 'a chapter card',
    end: 'the name, the next step, and a note if the data shown is fictional',
  }
  const beats = kinds.map((kind) => ({ kind, words: Math.round(words * weight(kind) / total), note: NOTES[kind] }))
  return { lengthSec, scenes, chapters, words, beats, minSec: +(lengthSec * 0.9).toFixed(1), maxSec: +(lengthSec * 1.1).toFixed(1) }
}

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

/** What to change when a render misses its length. Null when it is close enough. */
export function fitAdvice(actualSec: number, plan: Pick<Plan, 'lengthSec' | 'minSec' | 'maxSec'>): string | null {
  if (actualSec >= plan.minSec && actualSec <= plan.maxSec) return null
  const words = Math.max(1, Math.round(Math.abs(actualSec - plan.lengthSec) * SPEECH_SHARE * WORDS_PER_SECOND))
  return actualSec > plan.maxSec
    ? `${(actualSec - plan.lengthSec).toFixed(1)} s too long: cut about ${words} words of narration, or one scene`
    : `${(plan.lengthSec - actualSec).toFixed(1)} s too short: add about ${words} words of narration, or one scene`
}
