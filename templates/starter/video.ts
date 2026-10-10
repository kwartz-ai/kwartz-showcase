// Your video. Render it with:  kav render video.ts --draft   (picture only)
//                              kav render video.ts           (voice, music, effects)
// Each scene is one spoken line (`say`, also the captions) plus the steps it shows.
// The scene lasts as long as its line takes to say, so voice and picture stay in step.
import { defineVideo, endCard, hookCard } from 'kwartz-ai-video'

export default defineVideo({
  name: 'demo',
  baseUrl: 'http://localhost:3000',          // the app to film (or: serve: './dist')
  target: { minSec: 60, maxSec: 180 },
  banned: [],                                 // text that must never appear on screen

  // Runs before recording: sign in, open the first screen, wait for real data.
  prepare: async ({ page, baseUrl }) => {
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
  },

  scenes: [
    {
      id: 'hook',
      say: 'Open on the problem your viewer already has, in one or two sentences.',
      run: async ({ stage, theme, sayMs, untilSaid }) => {
        await stage.showFull(hookCard(theme, {
          title: 'The problem.',
          sub: 'In a few words.',
          questions: ['The question it leaves?'],
        }, sayMs), { dissolve: false })
        await untilSaid(1.03)
        await stage.clearFull()
      },
    },
    {
      id: 'first-proof',
      say: 'Then show the one interaction that proves your product solves it.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.3)
        // await stage.click(page.getByRole('button', { name: 'Something' }))
        // await stage.focus(page.locator('.the-result'), { label: 'Why this matters', side: 'right' })
        await untilSaid(1)
        await stage.release()
        void page
      },
    },
    {
      id: 'end',
      say: 'Close with the name, and the one thing the viewer should do next.',
      run: async ({ stage, theme, sayMs, untilSaid }) => {
        await stage.showFull(endCard(theme, {
          title: 'Your product',
          cta: 'The next step.',
          note: 'Say here if the data shown is fictional.',
        }, sayMs))
        await untilSaid(1.06)
      },
    },
  ],
})
