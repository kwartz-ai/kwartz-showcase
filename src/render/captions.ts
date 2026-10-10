import fs from 'node:fs'
import type { Cue } from '../core/types.ts'

/** Characters in one caption: two balanced lines at the caption size. */
export const CAPTION_MAX = 92

/** Break one sentence into pieces of at most CAPTION_MAX characters, at a comma
 *  where there is one, otherwise between words. */
export function captionChunks(sentence: string, max = CAPTION_MAX): string[] {
  if (sentence.length <= max) return [sentence]
  const out: string[] = []
  let rest = sentence
  while (rest.length > max) {
    const head = rest.slice(0, max + 1)
    // aim for even pieces, so the last one is not a stray word
    const want = Math.min(max, Math.ceil(rest.length / Math.ceil(rest.length / max)))
    let cut = -1
    for (const m of head.matchAll(/[,;:] /g)) {
      if (cut < 0 || Math.abs(m.index - want) < Math.abs(cut - want)) cut = m.index + 1
    }
    if (cut < max * 0.35) cut = head.lastIndexOf(' ', want + 8)
    if (cut <= 0) cut = max      // one unbroken word longer than a caption
    out.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) out.push(rest)
  return out
}

/** Split a narration line into captions of at most two lines, each timed by its
 *  share of the text. The timing inside a line is an estimate: the voice model does
 *  not report word times. */
export function captionCues(text: string, startMs: number, durMs: number): Cue[] {
  const raw = (text.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean)
  // a very short sentence ("OWL.") would flash by, so it joins the next one
  const sentences: string[] = []
  for (const p of raw) {
    const last = sentences.length - 1
    if (last >= 0 && sentences[last]!.length < 16) sentences[last] += ' ' + p
    else sentences.push(p)
  }
  const parts = sentences.flatMap((s) => captionChunks(s))
  const total = parts.reduce((n, p) => n + p.length, 0) || 1
  let t = startMs
  return parts.map((p) => {
    const d = durMs * p.length / total
    const cue = { text: p, start: t, end: t + d }
    t += d
    return cue
  })
}

export function vttTime(ms: number): string {
  const s = Math.max(0, ms) / 1000
  const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0')
  return `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}.${pad((s * 1000) % 1000, 3)}`
}

export function vtt(cues: Cue[]): string {
  return 'WEBVTT\n\n' + cues.map((c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}\n`).join('\n')
}

export function writeVtt(file: string, cues: Cue[]): void {
  fs.writeFileSync(file, vtt(cues))
}
