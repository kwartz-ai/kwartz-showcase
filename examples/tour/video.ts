// The scenes for examples/tour/showcase.config.json: a 30 second video of the made-up
// app in ../hello/site, rendered in three shapes from one script.
//   bun run showcase make examples/tour/showcase.config.json --draft
import { defineScenes, endCard, hookCard } from 'kwartz-showcase'

export default defineScenes({
  appRoot: '#app',
  prepare: async ({ page }) => {
    await page.locator('table').waitFor()
  },
  scenes: [
    {
      id: 'hook',
      say: 'The shipment file came in again this morning, with nothing in it to say what changed since yesterday.',
      motion: ({ theme, sayMs }) => hookCard(theme, {
        overline: 'EVERY MORNING',
        title: 'The file. Again.',
        sub: 'No list of what changed.',
        questions: ['Which dates moved?'],
      }, sayMs),
    },
    {
      id: 'moved',
      say: 'Tideline compares it with yesterday. One click keeps only the shipments whose date moved, with the old date under the new one.',
      run: async ({ page, stage, untilSaid, layout }) => {
        await untilSaid(0.28)
        await stage.click(page.locator('#moved-only'))
        await untilSaid(0.6)
        // a window on a tall frame needs a closer look than a full landscape frame
        await stage.focus(page.locator('td.eta').first(), {
          scale: layout.mode === 'fill' ? 1.5 : 1.9, pad: 8, label: 'Old date kept', side: 'below',
        })
        await untilSaid(1)
        await stage.release()
      },
    },
    {
      id: 'ontime',
      say: 'And it adds up: on-time delivery by month, including the month it dipped, so one late week never hides inside a good average.',
      run: async ({ page, stage, untilSaid }) => {
        await stage.cut(page.locator('nav button[data-tab=ontime]'), async () => {
          await page.locator('.bars').waitFor()
        })
        await untilSaid(0.6)
        await stage.spotlight(page.locator('.bar.low'), { pad: 8, label: 'The month it dipped', side: 'above' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'end',
      say: 'Tideline. Every change found, and kept. Everything shown here is made up.',
      motion: ({ theme, sayMs, cta }) => endCard(theme, {
        title: 'Tideline',
        overline: 'AN EXAMPLE VIDEO',
        chips: ['Found', 'Kept'],
        cta: cta?.text,
        ctaSub: cta?.sub,
        note: 'Every company and number shown is fictional.',
      }, sayMs),
    },
  ],
})
