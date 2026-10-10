import { describe, expect, it } from 'vitest'
import { countWords, fitAdvice, planFor, scenesFor, wordBudget } from '../../../src/brief/plan.ts'
import { applyScript, parseScript, scriptFit } from '../../../src/brief/script.ts'

const kinds = (sec: number) => planFor(sec).beats.map((b) => b.kind)

describe('planFor', () => {
  it('gives a 30 second video four scenes and about 70 words', () => {
    const p = planFor(30)
    expect(p).toMatchObject({ lengthSec: 30, scenes: 4, chapters: 0, words: 70, minSec: 27, maxSec: 33 })
    expect(kinds(30)).toEqual(['hook', 'proof', 'proof', 'end'])
  })
  it('adds an intro from six scenes up', () => {
    expect(planFor(60)).toMatchObject({ scenes: 7, chapters: 0, words: 143 })
    expect(kinds(60)).toEqual(['hook', 'intro', 'proof', 'proof', 'proof', 'proof', 'end'])
  })
  it('adds a "how it works" card from nine scenes up', () => {
    expect(planFor(90).scenes).toBe(9)
    expect(kinds(90)).toEqual(['hook', 'intro', 'proof', 'proof', 'how', 'proof', 'proof', 'proof', 'end'])
  })
  it('cuts a three minute video into chapters, and budgets for their cards', () => {
    expect(planFor(180)).toMatchObject({ scenes: 18, chapters: 4, words: 419 })
  })
  it('works out a custom length: about one scene per ten seconds, never under three', () => {
    expect(scenesFor(45)).toBe(5)
    expect(scenesFor(10)).toBe(3)
    expect(scenesFor(240)).toBe(24)
  })
  it('has one beat per scene, starting on the hook and ending on the end card', () => {
    for (const sec of [10, 30, 45, 60, 90, 120, 180, 600]) {
      const p = planFor(sec)
      expect(p.beats).toHaveLength(p.scenes)
      expect(p.beats[0]!.kind).toBe('hook')
      expect(p.beats.at(-1)!.kind).toBe('end')
    }
  })
  it('shares the words out so the beats add up to about the budget', () => {
    for (const sec of [30, 60, 90, 180]) {
      const p = planFor(sec)
      const sum = p.beats.reduce((n, b) => n + b.words, 0)
      expect(Math.abs(sum - p.words)).toBeLessThanOrEqual(p.scenes)
    }
  })
  it('gives a proof more words than the hook', () => {
    const p = planFor(30)
    expect(p.beats[1]!.words).toBeGreaterThan(p.beats[0]!.words)
  })
  it('passes a render within a tenth of the length', () => {
    expect(planFor(60)).toMatchObject({ minSec: 54, maxSec: 66 })
  })
  it('refuses a length outside 10 to 600 seconds', () => {
    expect(() => planFor(9)).toThrow(/between 10 and 600/)
    expect(() => planFor(601)).toThrow(/between 10 and 600/)
    expect(() => planFor(NaN)).toThrow(/between 10 and 600/)
  })
})

describe('wordBudget', () => {
  it('takes the pause around every scene off the speaking time', () => {
    expect(wordBudget(30, 4)).toBe(70)
    expect(wordBudget(30, 8)).toBeLessThan(wordBudget(30, 4))
  })
  it('takes chapter cards off too', () => {
    expect(wordBudget(180, 18, 4)).toBeLessThan(wordBudget(180, 18))
  })
  it('never goes below zero', () => {
    expect(wordBudget(10, 30)).toBe(0)
  })
})

describe('countWords', () => {
  it('counts words whatever the spacing', () => {
    expect(countWords('  one two\n three\t four ')).toBe(4)
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })
})

describe('fitAdvice', () => {
  const plan = planFor(30)
  it('says nothing when the length is inside the range', () => {
    expect(fitAdvice(27, plan)).toBeNull()
    expect(fitAdvice(30, plan)).toBeNull()
    expect(fitAdvice(33, plan)).toBeNull()
  })
  it('says how many words to add when the video is short', () => {
    expect(fitAdvice(25, plan)).toBe('5.0 s too short: add about 14 words of narration, or one scene')
  })
  it('says how many words to cut when the video is long', () => {
    expect(fitAdvice(40, plan)).toBe('10.0 s too long: cut about 28 words of narration, or one scene')
  })
})

describe('parseScript', () => {
  it('reads one paragraph per scene', () => {
    expect(parseScript('First line.\n\nSecond line.')).toEqual([{ say: 'First line.' }, { say: 'Second line.' }])
  })
  it('joins the lines of a paragraph', () => {
    expect(parseScript('One\ntwo\n  three  ')).toEqual([{ say: 'One two three' }])
  })
  it('ties a paragraph to the scene named in the heading before it', () => {
    expect(parseScript('## Hook\nThe file. Again.\n\n## The End card\n\nThat is all.')).toEqual([
      { id: 'hook', say: 'The file. Again.' }, { id: 'the-end-card', say: 'That is all.' },
    ])
  })
  it('uses a heading for one paragraph only', () => {
    expect(parseScript('## hook\nA.\n\nB.')).toEqual([{ id: 'hook', say: 'A.' }, { say: 'B.' }])
  })
  it('reads Windows line endings and ignores extra blank lines', () => {
    expect(parseScript('A.\r\n\r\n\r\n\r\nB.\r\n')).toEqual([{ say: 'A.' }, { say: 'B.' }])
  })
  it('returns nothing for an empty file', () => {
    expect(parseScript(' \n\n ')).toEqual([])
  })
})

describe('applyScript', () => {
  const scenes = [{ id: 'hook' }, { id: 'proof' }, { id: 'end' }]
  it('places paragraphs in order', () => {
    expect(applyScript(scenes, [{ say: 'A' }, { say: 'B' }, { say: 'C' }]).map((s) => s.say)).toEqual(['A', 'B', 'C'])
  })
  it('places a named paragraph on its scene, wherever it is in the file', () => {
    const out = applyScript(scenes, [{ id: 'end', say: 'Z' }, { say: 'A' }, { say: 'B' }])
    expect(out.map((s) => s.say)).toEqual(['A', 'B', 'Z'])
  })
  it('keeps a line the scene already has', () => {
    const out = applyScript([{ id: 'hook', say: 'Mine.' }, { id: 'end' }], [{ say: 'Only one.' }])
    expect(out.map((s) => s.say)).toEqual(['Mine.', 'Only one.'])
  })
  it('treats a heading that matches no scene as an ordinary paragraph', () => {
    expect(applyScript([{ id: 'hook' }], [{ id: 'intro', say: 'A' }])[0]!.say).toBe('A')
  })
  it('never changes the words', () => {
    const say = '  Odd   spacing, kept as the person wrote it. '
    expect(applyScript([{ id: 'a' }], [{ say }])[0]!.say).toBe(say)
  })
  it('refuses a script with too few or too many paragraphs, and names the scenes', () => {
    expect(() => applyScript(scenes, [{ say: 'A' }])).toThrow(/1 paragraph\(s\) to place, but 3 scene\(s\).*hook, proof, end/)
    expect(() => applyScript([{ id: 'a', say: 'x' }], [{ say: 'A' }])).toThrow(/but 0 scene\(s\).*none/)
  })
  it('keeps the other fields of a scene', () => {
    expect(applyScript([{ id: 'a', title: 'T' }], [{ say: 'A' }])[0]).toEqual({ id: 'a', title: 'T', say: 'A' })
  })
})

describe('scriptFit', () => {
  const script = (n: number) => [{ say: Array.from({ length: n }, () => 'word').join(' ') }]
  it('counts the words', () => {
    expect(scriptFit([{ say: 'one two' }, { say: 'three' }], 70)).toEqual({ words: 3, over: -67, message: null })
  })
  it('says nothing when the script is up to a tenth over', () => {
    expect(scriptFit(script(77), 70).message).toBeNull()
  })
  it('says how many words to cut when it is more than a tenth over', () => {
    expect(scriptFit(script(100), 70).message).toBe('the script is 100 words; the chosen length fits about 70. Cut about 30 words, or choose a longer video.')
  })
})
