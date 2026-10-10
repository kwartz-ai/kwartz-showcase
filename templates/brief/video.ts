// The scenes for the video described in showcase.config.json.
//   showcase explore        map the product's screens into .showcase/explore/
//   showcase plan           how many scenes, how many words, which shapes
//   showcase make --draft   picture only, until every scene runs
//   showcase make           every shape, with voice, music and effects
//
// The config says what the video is: address, length, shapes, style. This file says
// how it is filmed. A scene is one spoken line plus what is on screen while it is
// said. Two kinds:
//   motion: full-screen graphics (hook, "how it works", end card), frame by frame
//   run:    steps on the real product
import { defineScenes, endCard, hookCard } from 'kwartz-showcase'

export default defineScenes({
  // Runs before recording: open the first screen and wait for real data.
  prepare: async ({ page, baseUrl }) => {
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
  },

  scenes: [
    {
      id: 'hook',
      say: 'Open on the problem your viewer already has, in one or two sentences.',
      motion: ({ theme, sayMs }) => hookCard(theme, {
        title: 'The problem.',
        sub: 'In a few words.',
        questions: ['The question it leaves?'],
      }, sayMs),
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
      // `cta` comes from the config: its "cta", or the product's own address
      motion: ({ theme, sayMs, cta }) => endCard(theme, {
        title: 'Your product',
        cta: cta?.text,
        ctaSub: cta?.sub,
        note: 'Say here if the data shown is fictional.',
      }, sayMs),
    },
  ],
})
