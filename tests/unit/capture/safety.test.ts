import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserContext } from 'playwright'
import { mapAsText, nextPages, rgbToHex, type ProductMap } from '../../../src/capture/explore.ts'
import { allowTest, guardReadOnly, mayPass } from '../../../src/capture/readonly.ts'
import { DEFAULT_SESSION, ensureIgnored, sessionFor } from '../../../src/capture/session.ts'

describe('read-only: which requests may go out', () => {
  const none = allowTest([])
  it('lets reads through', () => {
    for (const m of ['GET', 'HEAD', 'OPTIONS', 'get']) expect(mayPass(m, 'https://app.example.com/api/orders', none)).toBe(true)
  })
  it('refuses everything that could change data', () => {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'post']) expect(mayPass(m, 'https://app.example.com/api/orders', none)).toBe(false)
  })
  it('lets a named address through, for products that read with POST', () => {
    const allowed = allowTest(['/api/search', 'https://api.example.com/graphql*'])
    expect(mayPass('POST', 'https://app.example.com/api/search?q=1', allowed)).toBe(true)
    expect(mayPass('POST', 'https://api.example.com/graphql', allowed)).toBe(true)
    expect(mayPass('POST', 'https://app.example.com/api/orders', allowed)).toBe(false)
  })
  it('reads * as any run of characters and everything else as written', () => {
    expect(allowTest(['/api/*/search'])('https://x.test/api/v2/search')).toBe(true)
    expect(allowTest(['/api/v1.0/'])('https://x.test/api/v1X0/')).toBe(false)
    expect(allowTest(['/a+b(c)?'])('https://x.test/a+b(c)?')).toBe(true)
  })
  it('allows nothing when no pattern is given', () => {
    expect(none('https://x.test/anything')).toBe(false)
  })
})

describe('guardReadOnly', () => {
  type Handler = (route: { request: () => { method: () => string; url: () => string }; continue: () => Promise<void>; abort: (why: string) => Promise<void> }) => Promise<void>
  const guarded = async (allow: string[] = []) => {
    let handler!: Handler
    const context = { route: vi.fn(async (_pattern: string, h: Handler) => { handler = h }) }
    const blocked = await guardReadOnly(context as unknown as BrowserContext, allow)
    const send = async (method: string, url: string) => {
      const route = { request: () => ({ method: () => method, url: () => url }), continue: vi.fn(async () => {}), abort: vi.fn(async () => {}) }
      await handler(route)
      return route
    }
    return { context, blocked, send }
  }

  it('watches every request', async () => {
    expect((await guarded()).context.route).toHaveBeenCalledWith('**/*', expect.any(Function))
  })
  it('passes a read on', async () => {
    const { send, blocked } = await guarded()
    const route = await send('GET', 'https://x.test/api/orders')
    expect(route.continue).toHaveBeenCalledOnce()
    expect(route.abort).not.toHaveBeenCalled()
    expect(blocked).toEqual([])
  })
  it('stops a write before it leaves, and lists it without its query', async () => {
    const { send, blocked } = await guarded()
    const route = await send('DELETE', 'https://x.test/api/orders/7?token=secret')
    expect(route.abort).toHaveBeenCalledWith('blockedbyclient')
    expect(route.continue).not.toHaveBeenCalled()
    expect(blocked).toEqual(['DELETE https://x.test/api/orders/7'])
  })
  it('passes an allowed write on', async () => {
    const { send, blocked } = await guarded(['/api/search'])
    expect((await send('POST', 'https://x.test/api/search')).continue).toHaveBeenCalledOnce()
    expect(blocked).toEqual([])
  })
})

describe('saved session', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-session-')) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('lives in the working folder by default', () => {
    expect(DEFAULT_SESSION).toBe('.showcase/session.json')
  })
  it('keeps the session out of git', () => {
    const file = path.join(dir, 'session.json')
    ensureIgnored(file)
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')).toMatch(/^\*$/m)
  })
  it('leaves an ignore file that is already there alone', () => {
    fs.writeFileSync(path.join(dir, '.gitignore'), 'mine\n')
    ensureIgnored(path.join(dir, 'session.json'))
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')).toBe('mine\n')
  })
  it('gives no session when the config names none', () => {
    expect(sessionFor(null)).toBeUndefined()
  })
  it('gives the file when it exists', () => {
    const file = path.join(dir, 'session.json')
    fs.writeFileSync(file, '{}')
    expect(sessionFor(file)).toBe(file)
  })
  it('says to sign in first when the file is missing', () => {
    expect(() => sessionFor(path.join(dir, 'missing.json'))).toThrow(/Run "showcase login" first/)
  })
})

describe('explore: which pages to visit', () => {
  const origin = 'https://app.example.com'
  it('keeps to the product\'s own pages', () => {
    expect(nextPages([`${origin}/orders`, 'https://other.example.com/x'], new Set(), origin, 10).visit).toEqual([`${origin}/orders`])
  })
  it('skips what it has seen, and repeats', () => {
    const found = [`${origin}/orders`, `${origin}/orders/`, `${origin}/reports`]
    expect(nextPages(found, new Set([`${origin}/reports`]), origin, 10).visit).toEqual([`${origin}/orders`])
  })
  it('never follows a sign-out link or a download', () => {
    const found = [`${origin}/logout`, `${origin}/auth/sign-out`, `${origin}/export.csv`, `${origin}/guide.PDF`, `${origin}/ok`]
    expect(nextPages(found, new Set(), origin, 10).visit).toEqual([`${origin}/ok`])
  })
  it('does not open data addresses as if they were screens', () => {
    const found = [`${origin}/api/upload/audit/7/file`, `${origin}/orders`]
    expect(nextPages(found, new Set(), origin, 10).visit).toEqual([`${origin}/orders`])
  })
  it('stops at the limit and says what it left out', () => {
    const found = ['a', 'b', 'c'].map((p) => `${origin}/${p}`)
    expect(nextPages(found, new Set(), origin, 2)).toEqual({ visit: [`${origin}/a`, `${origin}/b`], skipped: [`${origin}/c`] })
  })
})

describe('explore: the product map', () => {
  it('turns a colour into hex', () => {
    expect(rgbToHex('rgb(232, 89, 12)')).toBe('#e8590c')
    expect(rgbToHex('rgba(0, 0, 255, 0.5)')).toBe('#0000ff')
    expect(rgbToHex('transparent')).toBeNull()
    expect(rgbToHex(null)).toBeNull()
  })
  const map: ProductMap = {
    url: 'https://app.example.com', exploredAt: '2026-10-10T08:00:00.000Z', style: { font: 'Inter', accent: '#e8590c' },
    skipped: ['https://app.example.com/more'],
    screens: [{
      url: 'https://app.example.com/orders', title: 'Orders', headings: ['Orders', 'Open'], tables: [['Order', 'Date']], text: 'All open orders',
      screenshot: 'orders.png', controls: [{ kind: 'button', text: 'Moved only', selector: '[data-testid="moved"]' }],
    }],
  }
  it('writes the map as a page to read top to bottom', () => {
    const text = mapAsText(map)
    expect(text).toContain('# Product map: https://app.example.com')
    expect(text).toContain('Explored 2026-10-10. 1 screen(s).')
    expect(text).toContain("The product's own font: Inter. Its main button colour: #e8590c.")
    expect(text).toContain('## 1. Orders')
    expect(text).toContain('Headings: Orders | Open')
    expect(text).toContain('Table with columns: Order, Date')
    expect(text).toContain('- button "Moved only": `[data-testid="moved"]`')
    expect(text).toContain('- https://app.example.com/more')
  })
  it('says what was not found, and falls back to the address for a screen with no title', () => {
    const text = mapAsText({ ...map, style: { font: null, accent: null }, skipped: [], screens: [{ ...map.screens[0]!, title: '', controls: [], headings: [], tables: [], text: '' }] })
    expect(text).toContain("font: not found. Its main button colour: not found.")
    expect(text).toContain('## 1. https://app.example.com/orders')
    expect(text).not.toContain('Not visited')
    expect(text).not.toContain('Controls:')
  })
})
