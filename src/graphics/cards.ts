// Full-screen motion cards: plain HTML and CSS keyframes, handed to
// `stage.showFull()`. Each element appears at its share of the narration (`ms`),
// so the picture follows the voice.
//
// Type: titles in the display face, heavy and tightly tracked; supporting lines in
// the text face at a clearly smaller size; small labels in mono, spaced out. Three
// sizes on a card at most, so the hierarchy is obvious at a glance.
import type { Theme } from '../core/theme.ts'
import { esc } from '../core/util.ts'

const KEYS = `<style>
  @keyframes showcaserise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
  @keyframes showcasedrift{from{transform:translateY(0)}to{transform:translateY(-340px)}}
  @keyframes showcasechip{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
</style>`
/** An element that rises into place at `at` ms, in the theme's feel. */
const riser = (theme: Theme) => (at: number, ms = 520) =>
  `opacity:0;animation:showcaserise ${Math.round(ms * theme.speed)}ms ${theme.ease} ${Math.round(at)}ms both`
/** Title weight and tracking come from the theme, so a serif or a condensed face
 *  is not set like a grotesque. */
const heavy = (theme: Theme) => theme.displayWeight
const big = (theme: Theme, px: number) => +(px * theme.titleScale).toFixed(1)
const tight = (theme: Theme, em: number) => String(+(em * theme.tracking).toFixed(4)).replace(/^(-?)0\./, '$1.')

/** Scale every px length in a block of HTML by the theme's card scale. */
const sized = (theme: Theme, html: string) => theme.scale === 1 ? html
  : html.replace(/(-?\d+(?:\.\d+)?)px/g, (_, n: string) => `${+(Number(n) * theme.scale).toFixed(2)}px`)

/** A plain title card: a name and one line under it. */
export function titleCard(theme: Theme, title: string, sub = ''): string {
  const rise = riser(theme)
  return sized(theme, `${KEYS}
    <div style="position:absolute;inset:0;background:${theme.ink}"></div>
    <div style="position:absolute;left:0;right:0;top:38%;padding:0 7%;text-align:center;text-wrap:balance;color:#fff">
      <div style="${rise(200)};font:${heavy(theme)} ${big(theme, 76)}px/1.05 ${theme.type.display};letter-spacing:${tight(theme, -.035)}em">${esc(title)}</div>
      ${sub ? `<div style="${rise(340)};margin-top:14px;font:500 23px/1.3 ${theme.type.text};color:${theme.mist}">${esc(sub)}</div>` : ''}
    </div>`)
}

// A wall of anonymous table rows drifting past: the data nobody can read by eye.
function wall(theme: Theme): string {
  const widths = [9, 14, 6, 11, 11, 7, 18]
  const rows = Array.from({ length: 26 }, (_, r) => `
    <div style="display:flex;gap:18px;margin-bottom:17px">
      ${widths.map((w, c) => `<div style="width:${w}%;height:13px;border-radius:4px;
        background:${(r * 7 + c * 3) % 11 === 0 ? theme.accent : '#fff'};opacity:${(r * 7 + c * 3) % 11 === 0 ? 0.5 : 0.11}"></div>`).join('')}
    </div>`).join('')
  return `<div style="position:absolute;left:8%;right:8%;top:0;animation:showcasedrift 16s linear both">${rows}</div>`
}

export interface HookCard {
  /** Small spaced-out line above the title. */
  overline?: string
  /** The problem, in a few words. */
  title: string
  sub?: string
  /** One or two questions the viewer is left with, in the accent colour. */
  questions?: string[]
  /** Drifting rows of anonymous data behind the text. */
  wall?: boolean
}

/** The opening card: the problem, before the product. */
export function hookCard(theme: Theme, card: HookCard, ms: number): string {
  const rise = riser(theme)
  const { type, ink, accent, mist } = theme
  const questions = (card.questions ?? []).map((q, i) => `
    <div style="${rise(ms * (0.56 + i * 0.14))};margin-top:${i ? 6 : 54}px;font:${Math.min(700, heavy(theme))} 44px/1.15 ${type.display};letter-spacing:${tight(theme, -.025)}em;color:${accent}">${esc(q)}</div>`).join('')
  return sized(theme, `${KEYS}
    <div style="position:absolute;inset:0;background:${ink};overflow:hidden">
      ${card.wall === false ? '' : wall(theme)}
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 0%,${ink} 78%);opacity:.9"></div>
      <div style="position:absolute;inset:0;background:${ink};opacity:.72"></div>
    </div>
    <div style="position:absolute;left:0;right:0;top:24%;padding:0 7%;text-align:center;text-wrap:balance;color:#fff">
      ${card.overline ? `<div style="${rise(ms * 0.02)};font:600 16px/1 ${type.mono};letter-spacing:.2em;color:${accent}">${esc(card.overline)}</div>` : ''}
      <div style="${rise(ms * 0.05)};margin-top:26px;font:${heavy(theme)} ${big(theme, 82)}px/1.02 ${type.display};letter-spacing:${tight(theme, -.04)}em">${esc(card.title)}</div>
      ${card.sub ? `<div style="${rise(ms * 0.27)};margin-top:22px;font:500 28px/1.3 ${type.text};color:${mist}">${esc(card.sub)}</div>` : ''}
      ${questions}
    </div>`)
}

export interface StepsCard {
  overline?: string
  title: string
  /** Up to four steps, each appearing as the voice reaches it. */
  steps: { title: string; body: string }[]
}

/** A "how it works" card on a light background: numbered steps in a row. */
export function stepsCard(theme: Theme, card: StepsCard, ms: number): string {
  const rise = riser(theme)
  const { type, ink, paper } = theme
  const steps = card.steps.map((s, i) => `
    <div style="flex:1;background:#fff;border:1px solid rgba(11,29,53,.14);border-radius:16px;padding:26px 24px 28px;
      box-shadow:0 10px 30px rgba(11,29,53,.07);${rise(ms * (0.1 + i * (0.72 / Math.max(1, card.steps.length - 1 || 1))), 550)}">
      <div style="font:700 15px/1 ${type.mono};letter-spacing:.14em;color:${ink};opacity:.55">${String(i + 1).padStart(2, '0')}</div>
      <div style="margin-top:16px;font:${heavy(theme)} 25px/1.15 ${type.display};letter-spacing:${tight(theme, -.02)}em;color:${ink}">${esc(s.title)}</div>
      <div style="margin-top:10px;font:400 16.5px/1.5 ${type.text};color:${ink};opacity:.72">${esc(s.body)}</div>
    </div>`).join('')
  return sized(theme, `${KEYS}
    <div style="position:absolute;inset:0;background:${paper}"></div>
    <div style="position:absolute;left:0;right:0;top:110px;padding:0 100px">
      ${card.overline ? `<div style="text-align:center;font:600 15px/1 ${type.mono};letter-spacing:.2em;color:${ink};opacity:.55">${esc(card.overline)}</div>` : ''}
      <div style="margin-top:16px;text-align:center;font:${heavy(theme)} 52px/1.05 ${type.display};letter-spacing:${tight(theme, -.035)}em;color:${ink}">${esc(card.title)}</div>
      <div style="margin-top:46px;display:flex;gap:20px">${steps}</div>
    </div>`)
}

export interface EndCard {
  title: string
  overline?: string
  /** Two or three words that sum the video up, shown as outlined chips. */
  chips?: string[]
  /** The one next step for the viewer. */
  cta?: string
  ctaSub?: string
  /** Small print, for example that the data shown is fictional. */
  note?: string
}

/** The closing card: the name, the summary, and one next step. */
export function endCard(theme: Theme, card: EndCard, ms: number): string {
  const rise = riser(theme)
  const { type, ink, accent, mist } = theme
  const chips = (card.chips ?? []).map((c, i) => `
    <div style="opacity:0;animation:showcasechip ${Math.round(420 * theme.speed)}ms ${theme.ease} ${Math.round(ms * (0.1 + i * 0.1))}ms both;border:2px solid ${accent};
      color:#fff;font:${Math.min(700, heavy(theme))} 24px/1 ${type.display};letter-spacing:${tight(theme, -.01)}em;padding:13px 30px;border-radius:999px">${esc(c)}</div>`).join('')
  return sized(theme, `${KEYS}
    <div style="position:absolute;inset:0;background:${ink}"></div>
    <div style="position:absolute;left:0;right:0;top:19%;padding:0 7%;text-align:center;text-wrap:balance;color:#fff">
      <div style="${rise(0)};font:${heavy(theme)} ${big(theme, 86)}px/1.02 ${type.display};letter-spacing:${tight(theme, -.04)}em">${esc(card.title)}</div>
      ${card.overline ? `<div style="${rise(120)};margin-top:12px;font:600 16px/1 ${type.mono};letter-spacing:.2em;color:${mist}">${esc(card.overline)}</div>` : ''}
      ${chips ? `<div style="display:flex;gap:16px;justify-content:center;margin-top:50px">${chips}</div>` : ''}
      ${card.cta ? `<div style="${rise(ms * 0.42)};margin-top:58px;font:${Math.min(700, heavy(theme))} 36px/1.2 ${type.display};letter-spacing:${tight(theme, -.02)}em">${esc(card.cta)}</div>` : ''}
      ${card.ctaSub ? `<div style="${rise(ms * 0.52)};margin-top:12px;font:600 24px/1.2 ${type.text};color:${accent}">${esc(card.ctaSub)}</div>` : ''}
      ${card.note ? `<div style="${rise(ms * 0.72)};margin-top:76px;font:400 15px/1.4 ${type.text};color:${mist};opacity:.8">${esc(card.note)}</div>` : ''}
    </div>`)
}
