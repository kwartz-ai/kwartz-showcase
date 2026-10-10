// A video made of motion graphics alone: no product is filmed, every picture is
// drawn by code. It explains the kit itself, and shows what a motion scene can do
// beyond the ready-made cards: words timed to the voice, a diagram that draws
// itself, shapes, and a chart of real measurements.
//   bun run showcase make examples/motion/showcase.config.json --draft
//   bun run showcase make examples/motion/showcase.config.json --theme glass --draft
//
// A motion scene returns HTML. The page is never played: every CSS animation is
// set to an exact time and photographed, so use CSS animations only (no script
// timers), and single quotes inside style attributes.
//
// Everything here is drawn from `theme.look`, so the same scenes are glass in one
// theme, clay in another, and arrive the way that theme moves.
import { CARD_KEYS, arrive, defineScenes, endCard, hookCard, scaleCss, type MotionContext } from 'kwartz-showcase'

/** The voice starts this long after the scene does. */
const LEAD = 350

/** What every scene below needs: sizes that follow the shape, surfaces from the
 *  theme, and animations placed at a point in the narration (0 is its first word,
 *  1 its last). */
function kit({ theme, sayMs, layout }: MotionContext) {
  const { look } = theme
  const tall = layout.canvas.height > layout.canvas.width
  // drawn large: a graphic is read at a glance, and on a tall frame from a phone
  const u = tall ? theme.scale * 1.05 : 1.5
  const px = (n: number) => `${+(n * u).toFixed(1)}px`
  const at = (fraction: number) => Math.round(LEAD + sayMs * fraction)
  /** Arrive the way the theme moves. */
  const enter = (fraction: number, ms = 520) => arrive(theme)(at(fraction), ms)
  /** A movement of this file's own: a line drawn, a bar grown. */
  const anim = (name: string, fraction: number, ms = 520, ease = theme.ease) =>
    `animation:${name} ${Math.round(ms * theme.speed)}ms ${ease} ${at(fraction)}ms both`
  /** A surface from the theme, at this frame's size. */
  const panel = scaleCss(look.panel, u)
  // On a tall frame the graphics stay between the top the phone app covers and the
  // band where captions are drawn. On a wide one the caption sits over the bottom.
  const zoom = layout.mode === 'fill' ? layout.zoom : 1
  const area = layout.captions === 'composite'
    ? `top:${layout.safe.top}px;height:${layout.captionBand.y - layout.safe.top}px`
    : `top:0;height:${Math.round(layout.canvas.height / zoom - 120)}px`
  /** A full-screen scene on the theme's dark ground, or its light one. */
  const stage = (inner: string, ground: 'canvas' | 'paper' = 'canvas') => `${CARD_KEYS}${KEYS}
    <div style="position:absolute;inset:0;background:${ground === 'paper' ? look.paper : look.canvas}"></div>
    <div style="position:absolute;left:0;right:0;${area};display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:0 ${px(tall ? 56 : 90)};box-sizing:border-box;text-align:center;color:${ground === 'paper' ? look.paperFg : look.fg}">${inner}</div>`
  const caps = look.upper ? ';text-transform:uppercase' : ''
  const overline = (text: string, fraction: number, colour = theme.accent) =>
    `<div style="${enter(fraction)};font:600 ${px(15)}/1 ${theme.type.mono};letter-spacing:.2em;color:${colour}">${text}</div>`
  const title = (text: string, fraction: number, size = 54) =>
    `<div style="${enter(fraction)};margin-top:${px(18)};font:${theme.displayWeight} ${px(size)}/1.06 ${theme.type.display};
      letter-spacing:${+(-0.035 * theme.tracking).toFixed(4)}em${caps}">${text}</div>`
  return { look, tall, px, at, enter, anim, panel, stage, overline, title, caps }
}

const KEYS = `<style>
  @property --n { syntax: '<integer>'; initial-value: 0; inherits: false }
  @keyframes mgDim { to { opacity: .32 } }
  @keyframes mgStrike { from { transform: scaleX(0) } to { transform: scaleX(1) } }
  @keyframes mgDraw { to { stroke-dashoffset: 0 } }
  @keyframes mgGrow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
  @keyframes mgLight { to { outline-color: var(--lit) } }
  .mgnum { counter-reset: n var(--n) }
  .mgnum::after { content: counter(n) }
</style>`

// ── 2. Words that arrive with the voice, then are crossed out ────────────────
function rewrite(ctx: MotionContext): string {
  const { theme } = ctx
  const { tall, px, enter, anim, stage, caps } = kit(ctx)
  const word = (text: string, arrives: number, strike: number) => `
    <div style="position:relative;${enter(arrives, 420)}">
      <div style="font:700 ${px(40)}/1.1 ${theme.type.display};${anim('mgDim', strike, 300)}${caps}">${text}</div>
      <div style="position:absolute;left:-6%;right:-6%;top:54%;height:${px(4)};border-radius:2px;background:${theme.accent};
        transform-origin:left center;${anim('mgStrike', strike, 320)}"></div>
    </div>`
  return stage(`
    <div style="display:flex;flex-direction:${tall ? 'column' : 'row'};gap:${px(tall ? 22 : 54)};align-items:center">
      ${word('Record', 0.02, 0.44)}${word('Edit', 0.1, 0.5)}${word('Record again', 0.18, 0.56)}
    </div>
    <div style="${enter(0.7, 560)};margin-top:${px(56)};font:${theme.displayWeight} ${px(tall ? 62 : 76)}/1.04 ${theme.type.display};
      letter-spacing:${+(-0.04 * theme.tracking).toFixed(4)}em;color:${theme.accent}${caps}">Write it once.</div>`)
}

// ── 3. A diagram that draws itself, one step per phrase ──────────────────────
function pipeline(ctx: MotionContext): string {
  const { theme } = ctx
  const { look, tall, px, at, enter, anim, panel, stage, overline, title, caps } = kit(ctx)
  const steps = [
    { name: 'Script', note: 'one line per scene', when: 0.02 },
    { name: 'Browser', note: 'films the real product', when: 0.3 },
    { name: 'Voice', note: 'reads the line', when: 0.56 },
    { name: 'Video', note: 'joined and checked', when: 0.8 },
  ]
  // each step is a panel from the theme; an outline lights it as the voice reaches it
  const node = (s: (typeof steps)[number]) => `
    <div style="--lit:${theme.accent};flex:1;min-width:0;${panel};padding:${px(22)} ${px(18)};box-sizing:border-box;color:${look.panelFg};
      outline:${px(3)} solid transparent;outline-offset:${px(4)};${enter(s.when, 460)},mgLight 300ms ease ${at(s.when) + 260}ms both">
      <div style="font:${theme.displayWeight} ${px(26)}/1.1 ${theme.type.display}${caps}">${s.name}</div>
      <div style="margin-top:${px(8)};font:500 ${px(15.5)}/1.35 ${theme.type.text};opacity:.82">${s.note}</div>
    </div>`
  // the line between two steps draws just before the next step arrives
  const link = (when: number) => `
    <svg viewBox="0 0 60 60" style="flex:none;align-self:center;width:${px(tall ? 30 : 54)};height:${px(tall ? 30 : 54)};${tall ? 'transform:rotate(90deg)' : ''}">
      <path d="M4 30 H50 M38 18 L52 30 L38 42" fill="none" stroke="${look.paperFg}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="90" stroke-dashoffset="90" style="${anim('mgDraw', when - 0.07, 380, 'ease-out')}"/>
    </svg>`
  const row = steps.map((s, i) => (i ? link(s.when) : '') + node(s)).join('')
  return stage(`
    ${overline('HOW IT WORKS', 0, look.paperFg)}
    ${title('From a script to a video', 0.01, tall ? 44 : 50)}
    <div style="margin-top:${px(44)};display:flex;flex-direction:${tall ? 'column' : 'row'};align-items:${tall ? 'stretch' : 'center'};
      gap:${px(tall ? 6 : 10)};width:100%;max-width:${px(tall ? 520 : 1240)};box-sizing:border-box">${row}</div>`, 'paper')
}

// ── 4. One script, every shape ───────────────────────────────────────────────
function shapes(ctx: MotionContext): string {
  const { theme } = ctx
  const { look, tall, px, enter, panel, stage, overline, title } = kit(ctx)
  const side = tall ? 150 : 190
  const shape = (w: number, h: number, ratio: string, where: string, when: number) => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:${px(14)};${enter(when, 520)}">
      <div style="${panel};width:${px(side * w)};height:${px(side * h)};box-sizing:border-box;display:flex;align-items:center;justify-content:center;
        font:600 ${px(20)}/1 ${theme.type.mono};color:${look.panelFg}">${ratio}</div>
      <div style="font:600 ${px(17)}/1.3 ${theme.type.text};color:${look.muted}">${where}</div>
    </div>`
  return stage(`
    ${overline('ONE SCRIPT', 0)}
    ${title('Every shape you need', 0.02, tall ? 46 : 52)}
    <div style="margin-top:${px(48)};display:flex;align-items:flex-end;justify-content:center;gap:${px(tall ? 26 : 64)}">
      ${shape(1, 0.5625, '16:9', 'YouTube', 0.3)}
      ${shape(0.5625, 1, '9:16', 'Shorts, Reels', 0.52)}
      ${shape(0.78, 0.78, '1:1', 'LinkedIn', 0.82)}
    </div>`)
}

// ── 5. A chart of real measurements, growing from zero ───────────────────────
function measured(ctx: MotionContext): string {
  const { theme } = ctx
  const { look, tall, px, at, enter, anim, stage, overline, title } = kit(ctx)
  // pitch centres measured by the kit while choosing sounds for the tour example
  const sounds = [
    { name: 'drop-002', hz: 834 }, { name: 'drop-001', hz: 2567 }, { name: 'book-place-1', hz: 2736 },
    { name: 'card-slide-1', hz: 4483 }, { name: 'card-place-1', hz: 4707 },
  ]
  const LIMIT = 1500, TOP = 5000, H = tall ? 300 : 215
  // pass and fail keep their own colours in every theme, because they carry meaning;
  // only their brightness follows the ground, so they read on a dark one and a light one
  const onDark = !/^#[0-4]/.test(look.fg)
  const good = onDark ? '#4ADE80' : '#15803D', bad = onDark ? '#FB7185' : '#DC2626'
  const counts = sounds.map((s, i) => `@keyframes mgN${i} { to { --n: ${s.hz} } }`).join(' ')
  const bars = sounds.map((s, i) => {
    const when = 0.2 + i * 0.09
    const ok = s.hz <= LIMIT
    return `
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:${px(H)}">
        <div style="${enter(when + 0.05, 300)};font:600 ${px(15)}/1 ${theme.type.mono};margin-bottom:${px(8)}">
          <span class="mgnum" style="animation:mgN${i} 700ms ease-out ${at(when)}ms both"></span></div>
        <div style="width:${px(tall ? 46 : 64)};height:${px(H * s.hz / TOP)};border-radius:${look.upper ? 0 : px(8)} ${look.upper ? 0 : px(8)} 0 0;background:${ok ? good : bad};
          transform-origin:center bottom;${anim('mgGrow', when, 700, 'cubic-bezier(.2,.8,.2,1)')}"></div>
      </div>`
  }).join('')
  const labels = sounds.map((s, i) => `
    <div style="flex:1;min-width:0;${enter(0.2 + i * 0.09, 300)}">
      <div style="font:500 ${px(tall ? 11 : 13.5)}/1.2 ${theme.type.mono};color:${look.muted};overflow-wrap:anywhere">${s.name}</div>
      <div style="margin-top:${px(6)};font:700 ${px(tall ? 13 : 15)}/1 ${theme.type.text};color:${s.hz <= LIMIT ? good : bad};${enter(0.78, 300)}">${s.hz <= LIMIT ? 'used' : 'refused'}</div>
    </div>`).join('')
  return stage(`<style>${counts}</style>
    ${overline('IT CHECKS ITS OWN WORK', 0)}
    ${title('Every sound is measured', 0.02, tall ? 42 : 48)}
    <div style="position:relative;margin-top:${px(40)};width:100%;max-width:${px(tall ? 560 : 760)}">
      <div style="display:flex;gap:${px(tall ? 8 : 18)};align-items:flex-end;border-bottom:2px solid ${look.fg}">${bars}</div>
      <div style="position:absolute;left:0;right:0;bottom:${px(H * LIMIT / TOP + 0)};margin-bottom:${px(tall ? 62 : 66)};height:0;border-top:2px dashed ${look.fg};opacity:.85;
        transform-origin:left center;${anim('mgStrike', 0.1, 500)}"></div>
      <div style="position:absolute;left:0;bottom:${px(H * LIMIT / TOP)};margin-bottom:${px(tall ? 68 : 72)};font:600 ${px(13)}/1 ${theme.type.mono};${enter(0.14, 300)}">limit 1500 Hz</div>
      <div style="display:flex;gap:${px(tall ? 8 : 18)};margin-top:${px(12)}">${labels}</div>
    </div>
    <div style="${enter(0.3, 300)};margin-top:${px(22)};font:500 ${px(13)}/1.3 ${theme.type.text};color:${look.muted}">Pitch centre in hertz, measured while choosing sounds for an example video.</div>`)
}

export default defineScenes({
  scenes: [
    {
      id: 'hook',
      say: 'A product demo video used to mean a week of recording, editing, and recording again.',
      motion: ({ theme, sayMs }) => hookCard(theme, {
        overline: 'THE OLD WAY',
        title: 'One demo video.',
        sub: 'A week of work.',
        questions: ['Then the product changes.'],
      }, sayMs),
    },
    {
      id: 'rewrite',
      say: 'Every time the product changes, the video is out of date. So we stopped recording, and started writing.',
      motion: rewrite,
    },
    {
      id: 'pipeline',
      say: 'You write one line per scene. A real browser films your product, a local voice reads the line, and the kit joins them into a finished video.',
      motion: pipeline,
    },
    {
      id: 'shapes',
      say: 'One script becomes every shape you need: wide for YouTube, tall for Shorts and Reels, square for LinkedIn.',
      motion: shapes,
    },
    {
      id: 'measured',
      say: 'And it checks its own work. Every sound is measured before it is used, and any that would squeak is refused.',
      motion: measured,
    },
    {
      id: 'end',
      say: 'Kwartz Showcase. Write the script, and the video follows. Every picture in this video was drawn by code.',
      motion: ({ theme, sayMs, cta }) => endCard(theme, {
        title: 'Kwartz Showcase',
        overline: 'VIDEO FROM A SCRIPT',
        chips: ['Written', 'Rendered', 'Checked'],
        cta: cta?.text,
        ctaSub: cta?.sub,
        note: 'No screen was recorded for this video.',
      }, sayMs),
    },
  ],
})
