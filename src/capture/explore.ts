// Explore a product before writing its video: open the address, follow its main
// navigation, and write down what is on each screen. The result is a map an
// author (a person or an AI agent) reads to decide what the video should show.
// It only reads: it clicks nothing but links to the product's own pages.
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright'
import { onGoogleFonts } from '../brief/fonts.ts'
import { guardReadOnly } from './readonly.ts'

export interface Control {
  kind: 'button' | 'link' | 'tab' | 'input'
  text: string
  /** A selector an author can paste into a scene. */
  selector: string
}

export interface Screen {
  url: string
  title: string
  headings: string[]
  controls: Control[]
  /** Tables on the screen, by their column headings. */
  tables: string[][]
  /** The first lines of text, to tell what the screen is about. */
  text: string
  screenshot: string
}

export interface ProductMap {
  url: string
  exploredAt: string
  screens: Screen[]
  /** The product's own look, for a matching style. */
  style: { font: string | null; accent: string | null; fontOnGoogle?: boolean | null }
  /** Pages that were found but not visited, because of the limit. */
  skipped: string[]
}

/** How many controls of one screen are listed. */
export const CONTROL_LIMIT = 80

/** The best selector for an element: a test id, an id, or its role and name.
 *  Runs in the page. */
export function describeControls(limit: number): Control[] {
  const out: Control[] = []
  const seen = new Set<string>()
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const quote = (v: string) => v.replace(/'/g, "\\'")
  // the page's own content first: a header and a sidebar are the same on every
  // screen, and listed in document order they used up the whole limit
  const all = [...document.querySelectorAll('button, a[href], [role=tab], [role=button], input:not([type=hidden]), select, textarea')]
  const main = document.querySelector('main, [role=main]')
  const ordered = main ? [...all.filter((el) => main.contains(el)), ...all.filter((el) => !main.contains(el))] : all
  for (const el of ordered) {
    if (out.length >= limit || !visible(el)) continue
    const tag = el.tagName.toLowerCase()
    const role = el.getAttribute('role')
    const kind = role === 'tab' ? 'tab' : tag === 'a' ? 'link' : tag === 'input' || tag === 'select' || tag === 'textarea' ? 'input' : 'button'
    const text = ((el as HTMLElement).innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || '')
      .replace(/\s+/g, ' ').trim().slice(0, 60)
    const testId = el.getAttribute('data-testid')
    const selector = testId ? `page.locator('[data-testid=${quote(testId)}]')`
      : el.id && !/\d{3,}/.test(el.id) ? `page.locator('#${quote(el.id)}')`
      : text && kind !== 'input' ? `page.getByRole('${kind === 'tab' ? 'tab' : kind}', { name: '${quote(text)}' })`
      : kind === 'input' && text ? `page.getByPlaceholder('${quote(text)}')`
      : ''
    if (!selector || !text || seen.has(selector)) continue
    seen.add(selector)
    out.push({ kind, text, selector })
  }
  return out
}

/** Runs in the page: headings, tables, opening text, same-origin links, and look. */
function describeScreen() {
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
  const headings = [...document.querySelectorAll('h1, h2, h3')].map((h) => clean(h.textContent)).filter(Boolean).slice(0, 12)
  const tables = [...document.querySelectorAll('table')].slice(0, 4)
    .map((t) => [...t.querySelectorAll('th')].map((th) => clean(th.textContent)).filter(Boolean).slice(0, 14)).filter((h) => h.length)
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter((a) => a.origin === location.origin && !a.href.includes('#') && a.target !== '_blank').map((a) => a.href.split('?')[0]!)
  const primary = [...document.querySelectorAll<HTMLElement>('button, a')]
    .map((b) => getComputedStyle(b).backgroundColor).find((c) => /^rgb\(/.test(c) && !/^rgb\((255, 255, 255|0, 0, 0)\)/.test(c))
  return {
    title: document.title,
    headings, tables,
    text: clean(document.body.innerText).slice(0, 400),
    links: [...new Set(links)],
    font: getComputedStyle(document.body).fontFamily.split(',')[0]?.replace(/["']/g, '').trim() || null,
    accent: primary ?? null,
  }
}

/** rgb(232, 89, 12) as #e8590c. */
export function rgbToHex(rgb: string | null): string | null {
  const m = rgb?.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? '#' + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('') : null
}

/** Which found links to visit next: the product's own pages, not yet seen, in the
 *  order they were found, up to the limit. */
export function nextPages(found: string[], visited: Set<string>, origin: string, limit: number): { visit: string[]; skipped: string[] } {
  const fresh = [...new Set(found.map((u) => u.replace(/\/$/, '')))]
    .filter((u) => u.startsWith(origin) && !visited.has(u) && !/\.(pdf|zip|png|jpe?g|csv|xlsx?)$/i.test(u) && !/log-?out|sign-?out/i.test(u)
      // an address under /api/ is data or a download, not a screen
      && !/\/api\//i.test(u.slice(origin.length)))
  return { visit: fresh.slice(0, limit), skipped: fresh.slice(limit) }
}

export interface ExploreOptions {
  url: string
  /** Folder for map.json, map.md and the screenshots. */
  outDir: string
  maxPages?: number
  session?: string
  /** Refuse requests that could change data. On by default. */
  readOnly?: boolean
  allow?: string[]
  log?: (line: string) => void
}

async function visit(page: Page, url: string, shot: string): Promise<Omit<Screen, 'screenshot'> & { links: string[]; font: string | null; accent: string | null }> {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.waitForLoadState('load'))
  await page.waitForTimeout(600)
  const info = await page.evaluate(describeScreen)
  const controls = await page.evaluate(describeControls, CONTROL_LIMIT)
  await page.screenshot({ path: shot, type: 'jpeg', quality: 70 })
  return { url: page.url(), title: info.title, headings: info.headings, controls, tables: info.tables, text: info.text, links: info.links, font: info.font, accent: info.accent }
}

/** Map a product: its first screen, then the pages its navigation links to. */
export async function explore(opts: ExploreOptions): Promise<ProductMap> {
  const log = opts.log ?? console.log
  const max = opts.maxPages ?? 8
  fs.rmSync(opts.outDir, { recursive: true, force: true })
  fs.mkdirSync(opts.outDir, { recursive: true })
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(opts.session ? { storageState: opts.session } : {}) })
    if (opts.readOnly ?? true) await guardReadOnly(context, opts.allow ?? [])
    const page = await context.newPage()
    const origin = new URL(opts.url).origin
    const visited = new Set<string>()
    const screens: Screen[] = []
    const skipped: string[] = []
    let queue = [opts.url.replace(/\/$/, '')]
    let style: ProductMap['style'] = { font: null, accent: null }
    while (queue.length && screens.length < max) {
      const url = queue.shift()!
      if (visited.has(url)) continue
      visited.add(url)
      const shot = `screen-${String(screens.length + 1).padStart(2, '0')}.jpg`
      log(`exploring ${url}`)
      const s = await visit(page, url, path.join(opts.outDir, shot))
      visited.add(s.url.replace(/\/$/, ''))
      if (!screens.length) style = { font: s.font, accent: rgbToHex(s.accent) }
      screens.push({ url: s.url, title: s.title, headings: s.headings, controls: s.controls, tables: s.tables, text: s.text, screenshot: shot })
      const next = nextPages(s.links, visited, origin, max - screens.length - queue.length)
      queue.push(...next.visit.filter((u) => !queue.includes(u)))
      skipped.push(...next.skipped.filter((u) => !skipped.includes(u)))
    }
    // a video can only use the product's font if it can be loaded outside the product
    style.fontOnGoogle = style.font ? await onGoogleFonts(style.font) : null
    const map: ProductMap = { url: opts.url, exploredAt: new Date().toISOString(), screens, style, skipped: skipped.filter((u) => !visited.has(u)) }
    fs.writeFileSync(path.join(opts.outDir, 'map.json'), JSON.stringify(map, null, 2))
    fs.writeFileSync(path.join(opts.outDir, 'map.md'), mapAsText(map))
    return map
  } finally {
    await browser.close()
  }
}

/** The controls found on every screen of a product with more than one. */
export function sharedControls(screens: Screen[]): Control[] {
  if (screens.length < 2) return []
  return screens[0]!.controls.filter((c) => screens.every((s) => s.controls.some((o) => o.selector === c.selector)))
}

/** The map as a page a person or an agent can read top to bottom. */
export function mapAsText(map: ProductMap): string {
  const lines = [`# Product map: ${map.url}`, '', `Explored ${map.exploredAt.slice(0, 10)}. ${map.screens.length} screen(s).`,
    `The product's own font: ${map.style.font ?? 'not found'}${map.style.fontOnGoogle ? ' (on Google Fonts)' : map.style.fontOnGoogle === false ? ' (not on Google Fonts)' : ''}. Its main button colour: ${map.style.accent ?? 'not found'}.`, '']
  // what is on every screen (the header, a sidebar) is listed once, not on each
  const shared = sharedControls(map.screens)
  if (shared.length) {
    lines.push('## On every screen', '', 'Navigation that is the same wherever you are:', '')
    for (const c of shared) lines.push(`- ${c.kind} "${c.text}": \`${c.selector}\``)
    lines.push('')
  }
  const everywhere = new Set(shared.map((c) => c.selector))
  for (const [i, full] of map.screens.entries()) {
    const s = { ...full, controls: full.controls.filter((c) => !everywhere.has(c.selector)) }
    lines.push(`## ${i + 1}. ${s.title || s.url}`, '', `Address: ${s.url}`, `Screenshot: ${s.screenshot}`, '')
    if (s.headings.length) lines.push(`Headings: ${s.headings.join(' | ')}`, '')
    for (const t of s.tables) lines.push(`Table with columns: ${t.join(', ')}`, '')
    if (s.text) lines.push(`Opening text: ${s.text}`, '')
    if (s.controls.length) {
      lines.push('Controls:', '')
      for (const c of s.controls) lines.push(`- ${c.kind} "${c.text}": \`${c.selector}\``)
      lines.push('')
    }
  }
  if (map.skipped.length) lines.push('## Not visited (over the page limit)', '', ...map.skipped.map((u) => `- ${u}`), '')
  return lines.join('\n')
}
