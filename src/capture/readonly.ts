// Read-only mode: when a live product is filmed, a wrong click must not change
// anything real. Every request that could change data is refused before it leaves
// the browser, unless the config allows it by name.
import type { BrowserContext } from 'playwright'

/** Methods that only read. Everything else may change data. */
const READS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Turn an allow pattern into a test. A pattern is part of a URL, with * for any
 *  run of characters: "/api/search" or "https://api.example.com/graphql*". */
export function allowTest(patterns: string[]): (url: string) => boolean {
  const tests = patterns.map((p) => new RegExp(p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')))
  return (url) => tests.some((t) => t.test(url))
}

/** Whether a request may go out in read-only mode. */
export function mayPass(method: string, url: string, allowed: (url: string) => boolean): boolean {
  return READS.has(method.toUpperCase()) || allowed(url)
}

/** Refuse every request that could change data. Returns the list it fills with
 *  what was refused, as "METHOD url", for the report after the render. */
export async function guardReadOnly(context: BrowserContext, allow: string[]): Promise<string[]> {
  const blocked: string[] = []
  const allowed = allowTest(allow)
  await context.route('**/*', async (route) => {
    const req = route.request()
    if (mayPass(req.method(), req.url(), allowed)) return route.continue()
    blocked.push(`${req.method()} ${req.url().split('?')[0]}`)
    return route.abort('blockedbyclient')
  })
  return blocked
}
