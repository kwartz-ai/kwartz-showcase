import { describe, expect, it } from 'vitest'
import { endCard, hookCard, stepsCard, titleCard } from '../../../src/graphics/cards.ts'
import { defaultTheme, resolveTheme } from '../../../src/core/theme.ts'

const theme = defaultTheme
const delays = (html: string) => [...html.matchAll(/animation:showcase\w+ \d+ms [^;"]*? (\d+)ms both/g)].map((m) => Number(m[1]))

/** Every style="..." attribute must run to its closing quote with all its
 *  declarations. A double quote inside one (from a font stack, say) cuts it short
 *  and silently drops the rest: the bug that once cost a render its caption styling. */
function expectIntactStyles(html: string) {
  const attrs = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]!)
  expect(attrs.length).toBeGreaterThan(0)
  for (const a of attrs) {
    // a cut-short attribute ends in the middle of a font shorthand
    expect(a.trim()).not.toMatch(/font:[^;]*$/)
    expect(a).not.toMatch(/font:[^;]*\d+px\/[\d.]+\s*$/)
  }
  // after removing every complete attribute, no style= may be left dangling
  expect(html.replace(/style="[^"]*"/g, '')).not.toContain('style=')
  // every font declaration carries a whole font stack
  for (const f of html.matchAll(/font:[^;"]+/g)) expect(f[0]).toMatch(/sans-serif|monospace/)
}

describe('titleCard', () => {
  it('shows the title and the line under it', () => {
    const html = titleCard(theme, 'Kwartz OWL', 'Order Watch & Ledger')
    expect(html).toContain('Kwartz OWL')
    expect(html).toContain('Order Watch &amp; Ledger')
  })
  it('leaves the second line out when there is none', () => {
    expect(titleCard(theme, 'Name').match(/showcaserise \d+ms/g)).toHaveLength(1)
  })
  it('uses the display face for the title and the theme colours', () => {
    const html = titleCard(theme, 'Name', 'Sub')
    expect(html).toContain(`font:800 76px/1.05 ${theme.type.display}`)
    expect(html).toContain(`background:${theme.ink}`)
    expect(html).toContain(`color:${theme.mist}`)
  })
  it('escapes markup in its text', () => {
    const html = titleCard(theme, '<script>x</script>', '"quoted"')
    expect(html).not.toContain('<script>x')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;quoted&quot;')
  })
  it('keeps every style attribute intact', () => expectIntactStyles(titleCard(theme, 'A', 'B')))
})

describe('hookCard', () => {
  const card = { overline: 'EVERY MORNING', title: 'The file. Again.', sub: 'No list of changes.', questions: ['Which dates moved?', 'Which quantities?'] }

  it('shows every part it is given', () => {
    const html = hookCard(theme, card, 10000)
    for (const text of ['EVERY MORNING', 'The file. Again.', 'No list of changes.', 'Which dates moved?', 'Which quantities?']) expect(html).toContain(text)
  })
  it('needs only a title', () => {
    const html = hookCard(theme, { title: 'Only this' }, 5000)
    expect(html).toContain('Only this')
    expect(delays(html)).toHaveLength(1)
  })
  it('brings each part in at its share of the narration, in reading order', () => {
    const d = delays(hookCard(theme, card, 10000))
    expect(d).toEqual([200, 500, 2700, 5600, 7000])
  })
  it('scales those times with the length of the narration', () => {
    const short = delays(hookCard(theme, card, 5000)), long = delays(hookCard(theme, card, 10000))
    expect(long).toEqual(short.map((ms) => ms * 2))
  })
  it('finishes every entrance before the narration ends', () => {
    for (const ms of delays(hookCard(theme, card, 8000))) expect(ms).toBeLessThan(8000)
  })
  it('puts the questions in the accent colour', () => {
    const html = hookCard(theme, card, 10000)
    expect(html).toMatch(new RegExp(`color:${theme.accent}">Which dates moved\\?`))
  })
  it('draws the drifting wall of rows unless told not to', () => {
    expect(hookCard(theme, card, 1000)).toContain('animation:showcasedrift')
    expect(hookCard(theme, { ...card, wall: false }, 1000)).not.toContain('animation:showcasedrift')
  })
  it('escapes markup in every part', () => {
    const html = hookCard(theme, { overline: '<i>', title: '<b>', sub: '<u>', questions: ['<s>'] }, 1000)
    for (const tag of ['<i>', '<b>', '<u>', '<s>']) expect(html).not.toContain(tag)
  })
  it('follows a custom theme', () => {
    const html = hookCard(resolveTheme({ ink: '#101010', accent: '#00ff88' }), card, 1000)
    expect(html).toContain('background:#101010')
    expect(html).toContain('color:#00ff88')
    expect(html).not.toContain(theme.accent)
  })
  it('keeps every style attribute intact', () => expectIntactStyles(hookCard(theme, card, 10000)))
})

describe('stepsCard', () => {
  const steps = [1, 2, 3, 4].map((n) => ({ title: `Step ${n}`, body: `Body ${n}` }))
  const card = { overline: 'HOW IT WORKS', title: 'How it finds a change', steps }

  it('shows the title and every step', () => {
    const html = stepsCard(theme, card, 12000)
    expect(html).toContain('How it finds a change')
    for (const s of steps) { expect(html).toContain(s.title); expect(html).toContain(s.body) }
  })
  it('numbers the steps with two digits', () => {
    const html = stepsCard(theme, card, 12000)
    for (const n of ['01', '02', '03', '04']) expect(html).toContain(`>${n}<`)
  })
  it('brings the steps in one after another, the first early and the last before the end', () => {
    const d = delays(stepsCard(theme, card, 10000))
    expect(d).toHaveLength(4)
    expect([...d].sort((a, b) => a - b)).toEqual(d)
    expect(new Set(d).size).toBe(4)
    expect(d[0]).toBe(1000)
    expect(d[3]!).toBeLessThan(10000)
  })
  it('works with a single step', () => {
    const d = delays(stepsCard(theme, { title: 'T', steps: [steps[0]!] }, 10000))
    expect(d).toEqual([1000])
  })
  it('works with no steps', () => {
    expect(() => stepsCard(theme, { title: 'T', steps: [] }, 1000)).not.toThrow()
  })
  it('leaves the overline out when there is none', () => {
    expect(stepsCard(theme, { title: 'T', steps }, 1000)).not.toContain('letter-spacing:.2em')
  })
  it('sits on the light page colour', () => {
    expect(stepsCard(theme, card, 1000)).toContain(`background:${theme.paper}`)
  })
  it('escapes markup in titles and bodies', () => {
    const html = stepsCard(theme, { title: '<a>', steps: [{ title: '<b>', body: 'x & y' }] }, 1000)
    expect(html).not.toContain('<a>')
    expect(html).not.toContain('<b>')
    expect(html).toContain('x &amp; y')
  })
  it('keeps every style attribute intact', () => expectIntactStyles(stepsCard(theme, card, 12000)))
})

describe('endCard', () => {
  const card = { title: 'Tideline', overline: 'ORDER WATCH', chips: ['Found', 'Dated', 'Kept'], cta: 'See it on your own data.', ctaSub: 'Talk to us', note: 'All data shown is fictional.' }

  it('shows every part it is given', () => {
    const html = endCard(theme, card, 9000)
    for (const text of ['Tideline', 'ORDER WATCH', 'Found', 'Dated', 'Kept', 'See it on your own data.', 'Talk to us', 'All data shown is fictional.']) expect(html).toContain(text)
  })
  it('needs only a title', () => {
    const html = endCard(theme, { title: 'Name' }, 5000)
    expect(html).toContain('Name')
    expect(html).not.toContain('showcasechip 420ms')
    expect(delays(html)).toEqual([0])
  })
  it('brings the chips in one after another', () => {
    const chipDelays = [...endCard(theme, card, 10000).matchAll(/showcasechip 420ms [^;"]*? (\d+)ms both/g)].map((m) => Number(m[1]))
    expect(chipDelays).toEqual([1000, 2000, 3000])
  })
  it('shows the next step after the chips and the small print last', () => {
    const html = endCard(theme, card, 10000)
    const at = (text: string) => Number(html.slice(0, html.indexOf(text)).match(/(\d+)ms both[^>]*>\s*$/)?.[1])
    expect(at('See it on your own data.')).toBe(4200)
    expect(at('Talk to us')).toBe(5200)
    expect(at('All data shown is fictional.')).toBe(7200)
  })
  it('puts the call to action sub-line in the accent colour', () => {
    expect(endCard(theme, card, 1000)).toMatch(new RegExp(`color:${theme.accent}">\\s*Talk to us`))
  })
  it('escapes markup in every part', () => {
    const html = endCard(theme, { title: '<a>', overline: '<b>', chips: ['<c>'], cta: '<d>', ctaSub: '<e>', note: '<f>' }, 1000)
    for (const tag of ['<a>', '<b>', '<c>', '<d>', '<e>', '<f>']) expect(html).not.toContain(tag)
  })
  it('keeps every style attribute intact', () => expectIntactStyles(endCard(theme, card, 9000)))
})

describe('all cards, with a theme whose font stack is wrongly double-quoted', () => {
  // The kit cannot stop a user writing this, but the test documents the damage:
  // the attribute is cut at the first double quote.
  it('shows why font stacks must use single quotes', () => {
    const bad = resolveTheme({ type: { display: `"Bad Font", sans-serif` } })
    const html = titleCard(bad, 'A', 'B')
    const cut = html.match(/style="([^"]*)"[^>]*>A</)![1]!
    expect(cut.endsWith('font:800 76px/1.05 ')).toBe(true)     // ends inside the font shorthand
    expect(cut).not.toContain('letter-spacing')                // everything after it is lost
  })
})
