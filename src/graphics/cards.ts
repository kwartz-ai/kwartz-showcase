// Full-screen motion cards: plain HTML and CSS keyframes, used as motion scenes or
// handed to `stage.showFull()`. Each element appears at its share of the narration
// (`ms`), so the picture follows the voice.
//
// Type: titles in the display face, heavy and tightly tracked; supporting lines in
// the text face at a clearly smaller size; small labels in mono, spaced out. Three
// sizes on a card at most, so the hierarchy is obvious at a glance.
//
// Surfaces come from the theme's look: the same card is glass in one theme and
// clay in another, and arrives the way that look moves.
import type { Theme } from '../core/theme.ts'
import { esc } from '../core/html.ts'

/** The keyframes every card uses. A scene of your own that uses `arrive` needs them too. */
export const CARD_KEYS = `<style>
  @keyframes showcaserise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
  @keyframes showcasepop{0%{opacity:0;transform:scale(.84)}70%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:none}}
  @keyframes showcasecut{from{opacity:0}to{opacity:1}}
  @keyframes showcasefloat{from{opacity:0;transform:translateY(46px);filter:blur(10px)}to{opacity:1;transform:none;filter:blur(0)}}
  @keyframes showcasetype{from{opacity:1;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}
  @keyframes showcasedepth{from{opacity:0;transform:scale(.86);filter:blur(12px)}to{opacity:1;transform:none;filter:blur(0)}}
  @keyframes showcasedrift{from{transform:translateY(0)}to{transform:translateY(-340px)}}
  @keyframes showcasechip{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
</style>`

/** How each way of arriving is timed: its keyframes, how long it takes compared
 *  with a plain rise, and an easing of its own where the theme's would be wrong. */
const ENTER: Record<Theme['look']['enter'], { keys: string; time: number; ease?: string }> = {
  rise: { keys: 'showcaserise', time: 1 },
  pop: { keys: 'showcasepop', time: 1.1 },
  cut: { keys: 'showcasecut', time: 0, ease: 'steps(1,end)' },
  float: { keys: 'showcasefloat', time: 1.6 },
  type: { keys: 'showcasetype', time: 1.2, ease: 'steps(18,end)' },
  depth: { keys: 'showcasedepth', time: 1.5 },
}

/** An element that arrives at `at` ms, the way the theme's look moves. */
export const arrive = (theme: Theme) => (at: number, ms = 520) => {
  const e = ENTER[theme.look.enter]
  return `opacity:0;animation:${e.keys} ${Math.max(1, Math.round(ms * theme.speed * e.time))}ms ${e.ease ?? theme.ease} ${Math.round(at)}ms both`
}
/** Title weight and tracking come from the theme, so a serif or a condensed face
 *  is not set like a grotesque. */
const heavy = (theme: Theme) => theme.displayWeight
const big = (theme: Theme, px: number) => +(px * theme.titleScale).toFixed(1)
const tight = (theme: Theme, em: number) => String(+(em * theme.tracking).toFixed(4)).replace(/^(-?)0\./, '$1.')
const caps = (theme: Theme) => (theme.look.upper ? ';text-transform:uppercase' : '')

/** Scale every px length in a block of HTML by the theme's card scale. */
const sized = (theme: Theme, html: string) => theme.scale === 1 ? html
  : html.replace(/(-?\d+(?:\.\d+)?)px/g, (_, n: string) => `${+(Number(n) * theme.scale).toFixed(2)}px`)

/** A plain title card: a name and one line under it. */
export function titleCard(theme: Theme, title: string, sub = ''): string {
  const rise = arrive(theme)
  const { look } = theme
  return sized(theme, `${CARD_KEYS}
    <div style="position:absolute;inset:0;background:${look.canvas}"></div>
    <div style="position:absolute;left:0;right:0;top:38%;padding:0 7%;text-align:center;text-wrap:balance;color:${look.fg}">
      <div style="${rise(200)};font:${heavy(theme)} ${big(theme, 76)}px/1.05 ${theme.type.display};letter-spacing:${tight(theme, -.035)}em${caps(theme)}">${esc(title)}</div>
      ${sub ? `<div style="${rise(340)};margin-top:14px;font:500 23px/1.3 ${theme.type.text};color:${look.muted}">${esc(sub)}</div>` : ''}
    </div>`)
}

// A wall of anonymous table rows drifting past: the data nobody can read by eye.
function wall(theme: Theme): string {
  const widths = [9, 14, 6, 11, 11, 7, 18]
  const rows = Array.from({ length: 26 }, (_, r) => `
    <div style="display:flex;gap:18px;margin-bottom:17px">
      ${widths.map((w, c) => `<div style="width:${w}%;height:13px;border-radius:4px;
        background:${(r * 7 + c * 3) % 11 === 0 ? theme.accent : theme.look.fg};opacity:${(r * 7 + c * 3) % 11 === 0 ? 0.5 : 0.11}"></div>`).join('')}
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
  const rise = arrive(theme)
  const { type, ink, accent, look } = theme
  const questions = (card.questions ?? []).map((q, i) => `
    <div style="${rise(ms * (0.56 + i * 0.14))};margin-top:${i ? 6 : 54}px;font:${Math.min(700, heavy(theme))} 44px/1.15 ${type.display};letter-spacing:${tight(theme, -.025)}em;color:${accent}${caps(theme)}">${esc(q)}</div>`).join('')
  // the drifting wall belongs to the kit's own dark look; other looks open on their canvas
  const behind = look.wall && card.wall !== false
    ? `${wall(theme)}
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 0%,${ink} 78%);opacity:.9"></div>
      <div style="position:absolute;inset:0;background:${ink};opacity:.72"></div>` : ''
  return sized(theme, `${CARD_KEYS}
    <div style="position:absolute;inset:0;background:${look.canvas};overflow:hidden">
      ${behind}
    </div>
    <div style="position:absolute;left:0;right:0;top:24%;padding:0 7%;text-align:center;text-wrap:balance;color:${look.fg}">
      ${card.overline ? `<div style="${rise(ms * 0.02)};font:600 16px/1 ${type.mono};letter-spacing:.2em;color:${accent}">${esc(card.overline)}</div>` : ''}
      <div style="${rise(ms * 0.05)};margin-top:26px;font:${heavy(theme)} ${big(theme, 82)}px/1.02 ${type.display};letter-spacing:${tight(theme, -.04)}em${caps(theme)}">${esc(card.title)}</div>
      ${card.sub ? `<div style="${rise(ms * 0.27)};margin-top:22px;font:500 28px/1.3 ${type.text};color:${look.muted}">${esc(card.sub)}</div>` : ''}
      ${questions}
    </div>`)
}

export interface StepsCard {
  overline?: string
  title: string
  /** Up to four steps, each appearing as the voice reaches it. */
  steps: { title: string; body: string }[]
}

/** A "how it works" card on the light ground: numbered steps, each on a panel. On a
 *  narrow frame, or in a look that asks for tiles, they sit in a grid of two. */
export function stepsCard(theme: Theme, card: StepsCard, ms: number): string {
  const rise = arrive(theme)
  const { type, look } = theme
  const grid = look.steps === 'grid' || theme.scale > 1.2
  const steps = card.steps.map((s, i) => `
    <div style="flex:1;min-width:0;${look.panel};padding:26px 24px 28px;box-sizing:border-box;
      ${rise(ms * (0.1 + i * (0.72 / Math.max(1, card.steps.length - 1 || 1))), 550)}">
      <div style="font:700 15px/1 ${type.mono};letter-spacing:.14em;color:${look.panelFg};opacity:.55">${String(i + 1).padStart(2, '0')}</div>
      <div style="margin-top:16px;font:${heavy(theme)} 25px/1.15 ${type.display};letter-spacing:${tight(theme, -.02)}em;color:${look.panelFg}${caps(theme)}">${esc(s.title)}</div>
      <div style="margin-top:10px;font:400 16.5px/1.5 ${type.text};color:${look.panelFg};opacity:.78">${esc(s.body)}</div>
    </div>`).join('')
  return sized(theme, `${CARD_KEYS}
    <div style="position:absolute;inset:0;background:${look.paper}"></div>
    <div style="position:absolute;left:0;right:0;top:${grid ? 90 : 110}px;padding:0 ${grid ? 60 : 100}px">
      ${card.overline ? `<div style="text-align:center;font:600 15px/1 ${type.mono};letter-spacing:.2em;color:${look.paperFg};opacity:.6">${esc(card.overline)}</div>` : ''}
      <div style="margin-top:16px;text-align:center;text-wrap:balance;font:${heavy(theme)} 52px/1.05 ${type.display};letter-spacing:${tight(theme, -.035)}em;color:${look.paperFg}${caps(theme)}">${esc(card.title)}</div>
      <div style="margin-top:46px;display:${grid ? 'grid;grid-template-columns:1fr 1fr' : 'flex'};gap:20px">${steps}</div>
    </div>`)
}

export interface EndCard {
  title: string
  overline?: string
  /** Two or three words that sum the video up, shown as chips. */
  chips?: string[]
  /** The one next step for the viewer. */
  cta?: string
  ctaSub?: string
  /** Small print, for example that the data shown is fictional. */
  note?: string
}

/** The closing card: the name, the summary, and one next step. */
export function endCard(theme: Theme, card: EndCard, ms: number): string {
  const rise = arrive(theme)
  const { type, accent, look } = theme
  const chips = (card.chips ?? []).map((c, i) => `
    <div style="opacity:0;animation:showcasechip ${Math.round(420 * theme.speed)}ms ${theme.ease} ${Math.round(ms * (0.1 + i * 0.1))}ms both;${look.chip};
      font:${Math.min(700, heavy(theme))} 24px/1 ${type.display};letter-spacing:${tight(theme, -.01)}em;padding:13px 30px${caps(theme)}">${esc(c)}</div>`).join('')
  // with no next step the card is shorter: sit it lower, so it does not hang in the top third
  const top = card.cta || card.ctaSub ? 19 : chips ? 30 : 36
  return sized(theme, `${CARD_KEYS}
    <div style="position:absolute;inset:0;background:${look.canvas}"></div>
    <div style="position:absolute;left:0;right:0;top:${top}%;padding:0 7%;text-align:center;text-wrap:balance;color:${look.fg}">
      <div style="${rise(0)};font:${heavy(theme)} ${big(theme, 86)}px/1.02 ${type.display};letter-spacing:${tight(theme, -.04)}em${caps(theme)}">${esc(card.title)}</div>
      ${card.overline ? `<div style="${rise(120)};margin-top:12px;font:600 16px/1 ${type.mono};letter-spacing:.2em;color:${look.muted}">${esc(card.overline)}</div>` : ''}
      ${chips ? `<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-top:50px">${chips}</div>` : ''}
      ${card.cta ? `<div style="${rise(ms * 0.42)};margin-top:58px;font:${Math.min(700, heavy(theme))} 36px/1.2 ${type.display};letter-spacing:${tight(theme, -.02)}em">${esc(card.cta)}</div>` : ''}
      ${card.ctaSub ? `<div style="${rise(ms * 0.52)};margin-top:12px;font:600 24px/1.2 ${type.text};color:${accent}">${esc(card.ctaSub)}</div>` : ''}
      ${card.note ? `<div style="${rise(ms * 0.72)};margin-top:76px;font:400 18px/1.4 ${type.text};color:${look.muted}">${esc(card.note)}</div>` : ''}
    </div>`)
}
