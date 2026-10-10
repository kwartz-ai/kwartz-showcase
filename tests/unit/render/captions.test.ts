import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CAPTION_MAX, captionChunks, captionCues, vtt, vttTime, writeVtt } from '../../../src/render/captions.ts'

const LONG = 'OWL matches each line to the previous download, records what moved, and marks each change as disclosed by the customer, or silent.'

describe('captionChunks', () => {
  it('leaves a sentence that fits alone', () => {
    expect(captionChunks('Short and sweet.')).toEqual(['Short and sweet.'])
  })

  it('leaves a sentence of exactly the limit alone', () => {
    const s = 'a'.repeat(CAPTION_MAX)
    expect(captionChunks(s)).toEqual([s])
  })

  it('breaks a long sentence into pieces that each fit', () => {
    const parts = captionChunks(LONG)
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(CAPTION_MAX)
  })

  it('loses no words and keeps their order', () => {
    expect(captionChunks(LONG).join(' ')).toBe(LONG)
  })

  it('prefers to break after a comma', () => {
    const parts = captionChunks(LONG)
    expect(parts[0]!.endsWith(',')).toBe(true)
  })

  it('breaks between words when there is no comma', () => {
    const s = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ')
    const parts = captionChunks(s)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.join(' ')).toBe(s)
    for (const p of parts) {
      expect(p.length).toBeLessThanOrEqual(CAPTION_MAX)
      expect(p).not.toMatch(/^\s|\s$/)
    }
  })

  it('never leaves a stray short tail when even pieces are possible', () => {
    const s = Array.from({ length: 24 }, () => 'seven77').join(' ')     // 191 characters
    const parts = captionChunks(s)
    expect(Math.min(...parts.map((p) => p.length))).toBeGreaterThan(CAPTION_MAX * 0.4)
  })

  it('still terminates on one unbroken word longer than a caption', () => {
    const s = 'x'.repeat(CAPTION_MAX * 2 + 5)
    const parts = captionChunks(s)
    expect(parts.join('')).toBe(s)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(CAPTION_MAX)
  })

  it('honours a custom limit', () => {
    const parts = captionChunks('one two three four five six seven eight', 12)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(12)
    expect(parts.join(' ')).toBe('one two three four five six seven eight')
  })

  it('returns no empty pieces', () => {
    for (const p of captionChunks(LONG + ' ' + LONG)) expect(p.length).toBeGreaterThan(0)
  })
})

describe('captionCues', () => {
  it('makes one cue per sentence', () => {
    const cues = captionCues('First sentence here. A second sentence follows it.', 0, 4000)
    expect(cues.map((c) => c.text)).toEqual(['First sentence here.', 'A second sentence follows it.'])
  })

  it('starts at the given time and ends when the narration ends', () => {
    const cues = captionCues('First sentence here. A second sentence follows it.', 1000, 6000)
    expect(cues[0]!.start).toBe(1000)
    expect(cues.at(-1)!.end).toBeCloseTo(7000, 5)
  })

  it('leaves no gap and no overlap between cues', () => {
    const cues = captionCues(`${LONG} ${LONG} Then a short one follows here.`, 500, 20000)
    for (let i = 1; i < cues.length; i++) expect(cues[i]!.start).toBeCloseTo(cues[i - 1]!.end, 5)
  })

  it('gives each cue time in proportion to its length', () => {
    const cues = captionCues('Tiny sentence here now. A second, very much longer sentence follows right after it.', 0, 10000)
    const d = cues.map((c) => c.end - c.start)
    expect(d[1]!).toBeGreaterThan(d[0]!)
    expect(d[0]! / d[1]!).toBeCloseTo(cues[0]!.text.length / cues[1]!.text.length, 5)
  })

  it('joins a very short sentence to the next so it does not flash by', () => {
    const cues = captionCues('OWL. Every change found, dated, and kept.', 0, 4000)
    expect(cues.map((c) => c.text)).toEqual(['OWL. Every change found, dated, and kept.'])
  })

  it('keeps a short last sentence as its own cue', () => {
    const cues = captionCues('This is a full sentence of words. Done.', 0, 4000)
    expect(cues.map((c) => c.text)).toEqual(['This is a full sentence of words.', 'Done.'])
  })

  it('splits on question and exclamation marks too', () => {
    const cues = captionCues('Which dates moved here? Nobody could tell you! Until now it was so.', 0, 6000)
    expect(cues).toHaveLength(3)
  })

  it('keeps a closing quote with its sentence', () => {
    const cues = captionCues('He said "it moved again today." Then it moved once more.', 0, 6000)
    expect(cues[0]!.text).toBe('He said "it moved again today."')
  })

  it('handles text with no final punctuation', () => {
    const cues = captionCues('A line that simply stops', 0, 2000)
    expect(cues).toEqual([{ text: 'A line that simply stops', start: 0, end: 2000 }])
  })

  it('breaks an over-long sentence into several cues, each within the limit', () => {
    const cues = captionCues(LONG, 0, 9000)
    expect(cues.length).toBeGreaterThan(1)
    for (const c of cues) expect(c.text.length).toBeLessThanOrEqual(CAPTION_MAX)
  })

  it('does not divide by zero on empty text', () => {
    expect(() => captionCues('', 0, 1000)).not.toThrow()
  })

  it('accepts a zero-length narration', () => {
    const cues = captionCues('One. Two sentences here.', 100, 0)
    for (const c of cues) expect(c.start).toBe(100)
  })
})

describe('vttTime', () => {
  it.each([
    [0, '00:00:00.000'],
    [1, '00:00:00.001'],
    [999, '00:00:00.999'],
    [1000, '00:00:01.000'],
    [61_500, '00:01:01.500'],
    [3_723_456, '01:02:03.456'],
    [36_000_000, '10:00:00.000'],
  ])('%i ms is %s', (ms, text) => {
    expect(vttTime(ms)).toBe(text)
  })

  it('clamps a negative time to zero', () => {
    expect(vttTime(-250)).toBe('00:00:00.000')
  })

  it('drops fractions of a millisecond', () => {
    expect(vttTime(1500.9)).toBe('00:00:01.500')
  })
})

describe('vtt', () => {
  it('writes the header and numbered cues', () => {
    expect(vtt([{ text: 'Hi', start: 0, end: 1500 }, { text: 'There', start: 1500, end: 3000 }])).toBe(
      'WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.500\nHi\n\n2\n00:00:01.500 --> 00:00:03.000\nThere\n')
  })

  it('writes only the header when there are no cues', () => {
    expect(vtt([])).toBe('WEBVTT\n\n')
  })
})

describe('writeVtt', () => {
  it('writes the file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-vtt-'))
    const file = path.join(dir, 'a.vtt')
    writeVtt(file, [{ text: 'Hi', start: 0, end: 1000 }])
    expect(fs.readFileSync(file, 'utf8')).toBe('WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.000\nHi\n')
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
