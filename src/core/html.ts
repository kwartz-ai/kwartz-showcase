// Text made safe for HTML. Apart from util.ts, which starts processes, so the cards
// that use it can also be drawn in a web page.

/** Escape text for use inside overlay HTML. */
export const esc = (s: unknown) => String(s).replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
