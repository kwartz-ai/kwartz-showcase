// A complete small video, filmed on the made-up app in ./site. It needs nothing
// running: `bun run example:draft` (no voice) or `bun run example` (full render).
// It uses every part of the kit once: hook, pointer, camera, callout, a dissolve
// that hides a loading state, a chapter card and an end card.
import { defineVideo, endCard, hookCard } from '../../src/index.ts'

export default defineVideo({
  name: 'hello',
  serve: './site',
  appRoot: '#app',
  target: { minSec: 30, maxSec: 60 },
  // in a real video: the names of customers who must never appear on screen
  banned: ['Acme Real Customer Ltd'],

  prepare: async ({ page }) => {
    await page.locator('table').waitFor()
  },

  scenes: [
    {
      id: 'hook',
      say: 'The shipment file came in again this morning. Six lines, and nothing to say which of them changed.',
      run: async ({ stage, theme, sayMs, untilSaid }) => {
        await stage.showFull(hookCard(theme, {
          overline: 'EVERY MORNING',
          title: 'The file. Again.',
          sub: 'No list of what changed.',
          questions: ['Which dates moved?'],
        }, sayMs), { dissolve: false })
        await untilSaid(1.03)
        await stage.clearFull()
      },
    },
    {
      id: 'moved',
      say: 'Tideline compares it with yesterday. One click keeps only the shipments whose date moved, with the old date under the new one.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.28)
        await stage.click(page.locator('#moved-only'))
        await untilSaid(0.6)
        await stage.focus(page.locator('td.eta').first(), { scale: 1.5, pad: 8, label: 'Old date kept under the new one', side: 'right' })
        await untilSaid(1)
        await stage.release()
      },
    },
    {
      id: 'history',
      say: 'Click a shipment to see every change to it, with the day it arrived.',
      run: async ({ page, stage, untilSaid }) => {
        await stage.click(page.locator('td.id').first())
        await page.locator('#drawer.open').waitFor()
        await untilSaid(0.5)
        await stage.spotlight(page.locator('#d-log'), { pad: 10, label: 'Dated evidence', side: 'left' })
        await untilSaid(1)
        await stage.clearSpot()
        await stage.click(page.locator('#drawer .close'))
      },
    },
    {
      id: 'ontime',
      say: 'And it adds up. This is on-time delivery by month, including the month it dipped.',
      run: async ({ page, stage, untilSaid }) => {
        // the tab shows "Loading" for a moment; the chapter card covers it
        await stage.chapter('PART TWO', 'The trend', async () => {
          await page.locator('nav button[data-tab=ontime]').click()
          await page.locator('.bars').waitFor()
        })
        await untilSaid(0.62)
        await stage.spotlight(page.locator('.bar.low'), { pad: 8, label: 'The month it dipped', side: 'right' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'end',
      say: 'Tideline. Every change found, and kept. Everything shown here is made up.',
      run: async ({ stage, theme, sayMs, untilSaid }) => {
        await stage.showFull(endCard(theme, {
          title: 'Tideline',
          overline: 'AN EXAMPLE VIDEO',
          chips: ['Found', 'Kept'],
          cta: 'Now film your own app.',
          ctaSub: 'kav init',
          note: 'Every company and number shown is fictional.',
        }, sayMs))
        await untilSaid(1.06)
      },
    },
  ],
})
