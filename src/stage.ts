import type { Locator, Page } from 'playwright'
import { EASE_IN_OUT, EASE_OUT, type Theme } from './theme.ts'
import type { Dissolve, EventKind, Layout, StageEvent } from './types.ts'
import { esc, sleep } from './util.ts'

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
  private caption: Disposable | null = null
  private captionText: string | null = null
  private spot: Disposable | null = null
  private full: Disposable | null = null
  private ptr: Disposable | null = null
  private zoomed = false
  private root: string | null
  private at: { x: number; y: number }

  constructor(
    private page: Page,
    private layout: Layout,
    private theme: Theme,
    /** The video's clock, ms since recording started. */
    private clock: () => number,
    appRoot: string | null = null,
  ) {
    this.root = appRoot
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
    const old = this.ptr
    this.ptr = await this.overlay(
      `<style>@keyframes kavptr{from{left:${from.x}px;top:${from.y}px}to{left:${to.x}px;top:${to.y}px}}
        @keyframes kavclk{0%{transform:scale(.3);opacity:.9}100%{transform:scale(1.6);opacity:0}}</style>
       <div style="position:fixed;left:${to.x}px;top:${to.y}px;z-index:9;pointer-events:none;
         animation:kavptr ${ms}ms ${EASE_IN_OUT} both">
         ${ripple ? `<div style="position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;
           background:${accent};opacity:0;animation:kavclk 420ms ease-out ${ms}ms forwards"></div>` : ''}
         <div style="position:absolute;left:-2px;top:-2px;width:24px;height:31px;background:#fff;clip-path:${PTR_SHAPE}"></div>
         <div style="position:absolute;left:1px;top:2.5px;width:17px;height:22px;background:${ink};clip-path:${PTR_SHAPE}"></div>
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
    const { ink, accent, type } = this.theme
    await this.showFull(
      `<style>@keyframes kavchap{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}</style>
       <div style="position:absolute;inset:0;background:${ink}"></div>
       <div style="position:absolute;left:0;right:0;top:40%;text-align:center;color:#fff">
         <div style="font:600 17px/1 ${type.mono};letter-spacing:.18em;color:${accent};animation:kavchap 480ms ${EASE_OUT} 250ms both">${esc(overline)}</div>
         <div style="margin-top:20px;font:800 60px/1.08 ${type.display};letter-spacing:-.03em;animation:kavchap 520ms ${EASE_OUT} 380ms both">${esc(title)}</div>
       </div>`)
    await fn()
    await sleep(Math.max(0, t + hold - this.clock()))
    await this.clearFull()
  }

  // ── Captions, spotlight, callouts ──────────────────────────────────────────

  /** Used by the runner. Scenes do not call this: captions follow the narration. */
  async setCaption(text: string | null): Promise<void> {
    const { ink, type } = this.theme
    this.captionText = text
    const old = this.caption
    this.caption = text ? await this.overlay(
      `<div style="position:fixed;left:50%;bottom:30px;transform:translateX(-50%);width:max-content;max-width:580px;
        background:${ink};opacity:.94;color:#fff;padding:11px 22px 12px;border-radius:11px;text-align:center;
        font:500 19.5px/1.34 ${type.text};letter-spacing:.003em;text-wrap:balance;
        box-shadow:0 8px 28px rgba(0,0,0,.28)">${esc(text)}</div>`) : null
    await old?.dispose()
  }

  /** A ring around the element whose huge shadow dims everything else, with an
   *  optional callout label that says why the element matters. */
  async spotlight(locator: Locator, { pad = 6, label, side = 'below' as Side }: { pad?: number; label?: string; side?: Side } = {}): Promise<void> {
    const b = await this.box(locator, 'spotlight')
    const x = b.x - pad, y = b.y - pad, w = b.w + pad * 2, h = b.h + pad * 2
    const vw = this.layout.width / this.layout.zoom, vh = this.layout.height / this.layout.zoom
    const place = {
      below: `left:${x}px;top:${y + h + 12}px`,
      above: `left:${x}px;bottom:${vh - y + 12}px`,
      right: `left:${x + w + 14}px;top:${y}px`,
      left: `right:${vw - x + 14}px;top:${y}px`,
    }[side]
    const { ink, accent, type } = this.theme
    const old = this.spot
    this.spot = await this.overlay(
      `<style>@keyframes kavring{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:none}}
        @keyframes kavlabel{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}</style>
       <div style="position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:8px;
        border:2.5px solid ${accent};box-shadow:0 0 0 9999px rgba(8,16,30,.5);pointer-events:none;
        animation:kavring 260ms ${EASE_OUT} both"></div>
       ${label ? `<div style="position:fixed;${place};max-width:340px;background:${accent};color:${ink};
        font:700 16px/1.3 ${type.text};letter-spacing:.005em;padding:8px 14px 9px;border-radius:8px;pointer-events:none;
        box-shadow:0 8px 24px rgba(0,0,0,.28);animation:kavlabel 280ms ${EASE_OUT} 180ms both">${esc(label)}</div>` : ''}`)
    await old?.dispose()
    // overlays stack in the order they were made, and the spotlight dims everything
    // under it: the caption is drawn again so that it stays on top and fully lit
    await this.setCaption(this.captionText)
    if (label) this.mark('callout', 180)
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
