import type { Locator, Page } from 'playwright'
import { EASE_IN_OUT, EASE_OUT, type Theme } from '../core/theme.ts'
import type { Dissolve, EventKind, Layout, StageEvent } from '../core/types.ts'
import { esc, sleep } from '../core/util.ts'

type Disposable = { dispose: () => Promise<void> }
export type Side = 'below' | 'above' | 'right' | 'left'

const PTR_SHAPE = 'polygon(0 0,0 78%,24% 60%,42% 100%,60% 92%,42% 54%,76% 54%)'
const ROOT_GUESSES = ['#root', '#app', '#__next', '#__nuxt', 'main']

/** Everything the video draws over the app: pointer, captions, spotlight, camera,
 *  cards. Overlays are drawn inside the page by Playwright. Every click, callout
 *  and dissolve is logged with its time so the encoder can place a sound on it. */
export class Stage {
  /** Sounds to place, in video time. */
  readonly events: StageEvent[] = []
  /** Screen changes the encoder will blend. */
  readonly dissolves: Dissolve[] = []
  /** What the stage drew that does not sit well: a highlight or a label that leaves
   *  the screen, or sits under the caption. The runner reads this per scene. */
  readonly problems: string[] = []
  private caption: Disposable | null = null
  private captionText: string | null = null
  private spot: Disposable | null = null
  private full: Disposable | null = null
  private ptr: Disposable | null = null
  private zoomed = false
  private root: string | null
  private at: { x: number; y: number }
  /** Size multiplier for everything drawn, from the layout. */
  private u: number

  constructor(
    private page: Page,
    private layout: Layout,
    private theme: Theme,
    /** The video's clock, ms since recording started. */
    private clock: () => number,
    appRoot: string | null = null,
  ) {
    this.root = appRoot
    this.u = layout.ui
    this.at = { x: layout.width / layout.zoom / 2, y: layout.height / layout.zoom / 2 }
  }

  private mark(kind: EventKind, inMs = 0): void {
    this.events.push({ t: this.clock() + inMs, kind })
  }
  private overlay(html: string): Promise<Disposable> {
    return this.page.screencast.showOverlay(html)
  }
  /** An element's box in layout px. Playwright reports window px, and overlays sit
   *  inside the zoomed page, so every box is divided by the zoom. */
  private async box(locator: Locator, what: string) {
    await locator.scrollIntoViewIfNeeded()
    const b = await locator.boundingBox()
    if (!b) throw new Error(`${what}: the element has no box (is it visible?)`)
    const z = this.layout.zoom
    return { x: b.x / z, y: b.y / z, w: b.width / z, h: b.height / z }
  }

  // ── Pointer ────────────────────────────────────────────────────────────────

  /** Glide the pointer to the element. The pointer decoration built into Playwright
   *  is not used: it is placed in window px inside the zoomed page. */
  async moveTo(locator: Locator, { ms = 550, ripple = false } = {}): Promise<void> {
    const b = await this.box(locator, 'pointer')
    const to = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
    const from = this.at
    const { ink, accent } = this.theme
    const u = this.u
    const old = this.ptr
    this.ptr = await this.overlay(
      `<style>@keyframes showcaseptr{from{left:${from.x}px;top:${from.y}px}to{left:${to.x}px;top:${to.y}px}}
        @keyframes showcaseclk{0%{transform:scale(.3);opacity:.9}100%{transform:scale(1.6);opacity:0}}</style>
       <div style="position:fixed;left:${to.x}px;top:${to.y}px;z-index:9;pointer-events:none;
         animation:showcaseptr ${ms}ms ${EASE_IN_OUT} both">
         ${ripple ? `<div style="position:absolute;left:${-14 * u}px;top:${-14 * u}px;width:${28 * u}px;height:${28 * u}px;border-radius:50%;
           background:${accent};opacity:0;animation:showcaseclk 420ms ease-out ${ms}ms forwards"></div>` : ''}
         <div style="position:absolute;left:${-2 * u}px;top:${-2 * u}px;width:${24 * u}px;height:${31 * u}px;background:#fff;clip-path:${PTR_SHAPE}"></div>
         <div style="position:absolute;left:${u}px;top:${2.5 * u}px;width:${17 * u}px;height:${22 * u}px;background:${ink};clip-path:${PTR_SHAPE}"></div>
       </div>`)
    await old?.dispose()
    this.at = to
    if (ripple) this.mark('click', ms)
    await sleep(ms + 80)
  }

  /** Glide the pointer to the element, then click it. */
  async click(locator: Locator, opts: { ms?: number } = {}): Promise<void> {
    await this.moveTo(locator, { ...opts, ripple: true })
    await locator.click()
  }

  // ── Changes of screen ──────────────────────────────────────────────────────

  /** Change the screen with a cross-dissolve and no blank frame. `fn` changes the
   *  screen however long it takes; the encoder holds the picture from before `fn`
   *  and blends it into the picture after, so nothing in between (a loading state,
   *  an empty page) is ever shown. */
  async dissolve(fn: () => Promise<void>, { ms = 380 } = {}): Promise<void> {
    const t1 = this.clock()
    await fn()
    await sleep(Math.max(160, t1 + ms - this.clock()))
    const t2 = this.clock()
    this.dissolves.push({ t1, t2, ms })
    this.events.push({ t: t2 - ms, kind: 'whoosh' })
  }

  /** Record a dissolve whose two ends are already known (a motion scene meeting
   *  the scenes around it). */
  markDissolve(t1: number, t2: number, ms: number): void {
    this.dissolves.push({ t1, t2, ms })
    this.events.push({ t: Math.max(0, t2 - ms), kind: 'whoosh' })
  }

  /** Make the page paint, so the recorder gets a fresh frame of it. */
  async nudge(): Promise<void> {
    const dot = await this.overlay('<i style="position:fixed;left:0;top:0;width:1px;height:1px"></i>')
    await sleep(70)
    await dot.dispose()
    await sleep(70)
  }

  /** A click that changes the whole screen: the pointer arrives, and the old screen
   *  dissolves into the new one once `ready` says it has loaded. */
  async cut(locator: Locator, ready: () => Promise<void>, opts?: { ms?: number }): Promise<void> {
    await this.moveTo(locator)
    this.mark('click')
    await this.dissolve(async () => {
      await locator.click()
      await ready()
    }, opts)
  }

  /** A chapter card that also covers a slow load: the screen dissolves to the card,
   *  `fn` runs behind it, and the card dissolves to the loaded screen. */
  async chapter(overline: string, title: string, fn: () => Promise<void> = async () => {}, { hold = 1900 } = {}): Promise<void> {
    const t = this.clock()
    const { ink, accent, type, scale: k } = this.theme
    await this.showFull(
      `<style>@keyframes showcasechap{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}</style>
       <div style="position:absolute;inset:0;background:${ink}"></div>
       <div style="position:absolute;left:0;right:0;top:40%;text-align:center;color:#fff">
         <div style="font:600 ${17 * k}px/1 ${type.mono};letter-spacing:.18em;color:${accent};animation:showcasechap 480ms ${EASE_OUT} 250ms both">${esc(overline)}</div>
         <div style="margin-top:${20 * k}px;font:${this.theme.displayWeight} ${60 * k}px/1.08 ${type.display};letter-spacing:${+(-0.03 * this.theme.tracking).toFixed(4)}em;animation:showcasechap 520ms ${EASE_OUT} 380ms both">${esc(title)}</div>
       </div>`)
    await fn()
    await sleep(Math.max(0, t + hold - this.clock()))
    await this.clearFull()
  }

  // ── Captions, spotlight, callouts ──────────────────────────────────────────

  /** Used by the runner. Scenes do not call this: captions follow the narration.
   *  When the layout draws captions on the canvas, nothing is drawn in the page. */
  async setCaption(text: string | null): Promise<void> {
    this.captionText = text
    if (this.layout.captions === 'composite') return
    const { ink, type, captionScale } = this.theme
    const u = this.u * captionScale
    const vw = this.layout.width / this.layout.zoom
    const old = this.caption
    this.caption = text ? await this.overlay(
      `<div style="position:fixed;left:50%;bottom:${30 * this.u + this.layout.safe.bottom / this.layout.zoom}px;transform:translateX(-50%);
        width:max-content;max-width:${Math.min(580 * u, vw - 40 * this.u)}px;
        background:${ink};opacity:.94;color:#fff;padding:${11 * u}px ${22 * u}px ${12 * u}px;border-radius:${11 * u}px;text-align:center;
        font:500 ${19.5 * u}px/1.34 ${type.text};letter-spacing:.003em;text-wrap:balance;
        box-shadow:0 8px 28px rgba(0,0,0,.28)">${esc(text)}</div>`) : null
    await old?.dispose()
  }

  /** A ring around the element whose huge shadow dims everything else, with an
   *  optional callout label that says why the element matters. */
  async spotlight(locator: Locator, { pad = 6, label, side = 'below' as Side }: { pad?: number; label?: string; side?: Side } = {}): Promise<void> {
    const b = await this.box(locator, 'spotlight')
    const u = this.u
    const x = b.x - pad, y = b.y - pad, w = b.w + pad * 2, h = b.h + pad * 2
    const vw = this.layout.width / this.layout.zoom, vh = this.layout.height / this.layout.zoom
    const place = {
      below: `left:${x}px;top:${y + h + 12 * u}px`,
      above: `left:${x}px;bottom:${vh - y + 12 * u}px`,
      right: `left:${x + w + 14 * u}px;top:${y}px`,
      left: `right:${vw - x + 14 * u}px;top:${y}px`,
    }[side]
    this.checkSpot({ x, y, w, h }, label, side, vw, vh)
    const { ink, accent, type } = this.theme
    const old = this.spot
    this.spot = await this.overlay(
      `<style>@keyframes showcasering{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:none}}
        @keyframes showcaselabel{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}</style>
       <div style="position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${8 * u}px;
        border:${2.5 * u}px solid ${accent};box-shadow:0 0 0 9999px rgba(8,16,30,.5);pointer-events:none;
        animation:showcasering 260ms ${EASE_OUT} both"></div>
       ${label ? `<div style="position:fixed;${place};max-width:${340 * u}px;background:${accent};color:${ink};
        font:700 ${16 * u}px/1.3 ${type.text};letter-spacing:.005em;padding:${8 * u}px ${14 * u}px ${9 * u}px;border-radius:${8 * u}px;pointer-events:none;
        box-shadow:0 8px 24px rgba(0,0,0,.28);animation:showcaselabel 280ms ${EASE_OUT} 180ms both">${esc(label)}</div>` : ''}`)
    await old?.dispose()
    // overlays stack in the order they were made, and the spotlight dims everything
    // under it: the caption is drawn again so that it stays on top and fully lit
    await this.setCaption(this.captionText)
    if (label) this.mark('callout', 180)
  }

/** Measure a spotlight before it is drawn: the ring must be on screen, and the
   *  label, whose size is worked out from its text, must be too. */
  private checkSpot(b: { x: number; y: number; w: number; h: number }, label: string | undefined, side: Side, vw: number, vh: number): void {
    const u = this.u
    const what = label ? `the highlight "${label}"` : 'a highlight'
    if (b.x < 0 || b.y < 0 || b.x + b.w > vw || b.y + b.h > vh) this.problems.push(`${what} is partly off screen: scroll or zoom so the whole element shows`)
    // page captions sit at the bottom: a highlight under them cannot be read
    if (this.layout.captions === 'page' && this.captionText) {
      const capTop = vh - (30 * u + this.layout.safe.bottom / this.layout.zoom) - 78 * u * this.theme.captionScale
      const capHalf = Math.min(580 * u * this.theme.captionScale, vw - 40 * u) / 2
      if (b.y + b.h > capTop && b.x < vw / 2 + capHalf && b.x + b.w > vw / 2 - capHalf) this.problems.push(`the caption covers ${what}: zoom in, or highlight it earlier in the line`)
    }
    if (!label) return
    // 16u type at about 0.56 em a character, in a box at most 340u wide
    const textW = label.length * 16 * u * 0.56
    const lw = Math.min(340 * u, textW + 28 * u)
    const lh = Math.ceil(textW / (340 * u - 28 * u)) * 21 * u + 17 * u
    const lx = side === 'right' ? b.x + b.w + 14 * u : side === 'left' ? b.x - 14 * u - lw : b.x
    const ly = side === 'below' ? b.y + b.h + 12 * u : side === 'above' ? b.y - 12 * u - lh : b.y
    if (lx < 0 || ly < 0 || lx + lw > vw || ly + lh > vh) {
      this.problems.push(`the label "${label}" would be drawn partly off screen on the ${side} side: choose another "side", or a shorter label`)
    }
  }

  async clearSpot(): Promise<void> {
    await this.spot?.dispose()
    this.spot = null
  }

  // ── Camera ─────────────────────────────────────────────────────────────────

  private async appRoot(): Promise<string> {
    if (this.root) return this.root
    for (const sel of ROOT_GUESSES) {
      if (await this.page.locator(sel).count()) return (this.root = sel)
    }
    throw new Error(`camera: could not find the app's root element. Set "appRoot" in the video config (tried ${ROOT_GUESSES.join(', ')}).`)
  }

  /** Camera: scale the app toward the element, which stays where it is on screen.
   *  Overlays are outside the app root, so they keep their size. */
  async zoomTo(locator: Locator, { scale = 1.45, ms = 650 } = {}): Promise<void> {
    const sel = await this.appRoot()
    const b = await this.box(locator, 'zoom')
    const r = await this.box(this.page.locator(sel).first(), 'zoom root')
    await this.page.evaluate(({ sel, ox, oy, scale, ms, ease }) => {
      const root = document.querySelector<HTMLElement>(sel)!
      document.documentElement.style.overflow = 'hidden'
      root.style.transformOrigin = `${ox}px ${oy}px`
      root.style.transition = `transform ${ms}ms ${ease}`
      root.getBoundingClientRect()      // commit the start state, so the move animates
      root.style.transform = `scale(${scale})`
    }, { sel, ox: b.x + b.w / 2 - r.x, oy: b.y + b.h / 2 - r.y, scale, ms, ease: EASE_IN_OUT })
    this.zoomed = true
    await sleep(ms + 60)
  }

  async zoomOut({ ms = 550 } = {}): Promise<void> {
    if (!this.zoomed) return
    const sel = await this.appRoot()
    await this.page.evaluate((sel) => { document.querySelector<HTMLElement>(sel)!.style.transform = 'scale(1)' }, sel)
    await sleep(ms + 60)
    // a transformed root would re-anchor the app's fixed drawers, so it is removed at rest
    await this.page.evaluate((sel) => {
      const root = document.querySelector<HTMLElement>(sel)!
      root.style.transition = root.style.transform = root.style.transformOrigin = ''
      document.documentElement.style.overflow = ''
    }, sel)
    this.zoomed = false
  }

  /** Zoom to the element and spotlight it in one move. Undo with `release()`. */
  async focus(locator: Locator, { scale = 1.4, ...spot }: { scale?: number; pad?: number; label?: string; side?: Side } = {}): Promise<void> {
    await this.zoomTo(locator, { scale })
    await this.spotlight(locator, spot)
  }

  async release(): Promise<void> {
    await this.clearSpot()
    await this.zoomOut()
  }

  // ── Full-screen layers ─────────────────────────────────────────────────────

  /** A full-screen layer (a card from cards.ts, or your own HTML). It dissolves in
   *  over the app; pass { dissolve: false } for the very first frame of the video. */
  async showFull(html: string, { dissolve = true } = {}): Promise<void> {
    const swap = async () => {
      // the pointer has no business on a card; it reappears at its next move
      await this.ptr?.dispose()
      this.ptr = null
      const old = this.full
      this.full = await this.overlay(`<div style="position:fixed;inset:0;font-family:${this.theme.type.text}">${html}</div>`)
      await old?.dispose()
    }
    if (dissolve) await this.dissolve(swap)
    else await swap()
  }

  /** Remove the full-screen layer; the app dissolves back in. */
  async clearFull({ dissolve = true } = {}): Promise<void> {
    if (!this.full) return
    const swap = async () => {
      await this.full?.dispose()
      this.full = null
    }
    if (dissolve) await this.dissolve(swap)
    else await swap()
  }
}
