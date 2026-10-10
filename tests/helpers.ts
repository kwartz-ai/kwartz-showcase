// A stand-in for the Playwright page: it records the overlays the stage draws and
// the scripts it evaluates, and hands out locators with whatever box a test wants.
import { vi } from 'vitest'
import type { Locator, Page } from 'playwright'

export interface FakeOverlay { html: string; disposed: boolean }
export type Box = { x: number; y: number; width: number; height: number } | null

export function fakeLocator(box: Box = { x: 100, y: 200, width: 50, height: 20 }, count = 1) {
  const calls: string[] = []
  const locator = {
    calls,
    scrollIntoViewIfNeeded: vi.fn(async () => { calls.push('scroll') }),
    boundingBox: vi.fn(async () => box),
    click: vi.fn(async () => { calls.push('click') }),
    count: vi.fn(async () => count),
    first() { return locator },
  }
  return locator as typeof locator & Locator
}

export function fakePage(opts: { roots?: Record<string, Box>; onStart?: (o: unknown) => void } = {}) {
  const overlays: FakeOverlay[] = []
  const evaluations: { fn: (...a: never[]) => unknown; arg: unknown }[] = []
  const roots = opts.roots ?? { '#root': { x: 0, y: 0, width: 1920, height: 1080 } }
  let frameSink: ((f: { data: Buffer; timestamp: number }) => void) | null = null
  const page = {
    screencast: {
      showOverlay: vi.fn(async (html: string) => {
        const o = { html, disposed: false }
        overlays.push(o)
        return { dispose: vi.fn(async () => { o.disposed = true }) }
      }),
      start: vi.fn(async (o: { onFrame: typeof frameSink }) => { frameSink = o.onFrame; opts.onStart?.(o) }),
      stop: vi.fn(async () => {}),
    },
    evaluate: vi.fn(async (fn: (...a: never[]) => unknown, arg?: unknown) => { evaluations.push({ fn, arg }) }),
    addInitScript: vi.fn(async () => {}),
    locator: vi.fn((sel: string) => fakeLocator(roots[sel] ?? null, sel in roots ? 1 : 0)),
  }
  return {
    page: page as unknown as Page,
    raw: page,
    overlays,
    evaluations,
    /** Overlays still on screen. */
    live: () => overlays.filter((o) => !o.disposed),
    /** Deliver a frame as the browser would. */
    frame: (timestamp: number, data = 'jpg') => frameSink!({ data: Buffer.from(data), timestamp }),
  }
}

/** Run a stage call to its end under fake timers. */
export async function settle<T>(p: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync()
  return p
}
