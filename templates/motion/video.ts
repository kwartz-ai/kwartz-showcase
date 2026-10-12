// The scenes for the presentation described in showcase.config.json.
//   showcase plan           the length and the word budget
//   showcase make --draft   picture only, until every scene looks right
//   showcase make           with voice, music and effects
//
// The config has "motionOnly": true, so no product is filmed. Every scene is a motion
// scene: one spoken line, and a full-screen graphic drawn while it is said. There is
// no `prepare`, and no scene has `run`.
//
// Use the ready-made cards where they fit, and build your own graphic from
// `theme.look` where they do not, so it matches the theme. A complete example ships
// with the kit: node_modules/kwartz-showcase/examples/motion/video.ts.
import { defineScenes, endCard, hookCard, stepsCard } from 'kwartz-showcase'

export default defineScenes({
  scenes: [
    {
      id: 'opening',
      say: 'Open on the question your viewer already has, in one or two sentences.',
      motion: ({ theme, sayMs }) => hookCard(theme, {
        overline: 'THE QUESTION',
        title: 'The problem.',
        sub: 'In a few words.',
        questions: ['What it leaves open?'],
      }, sayMs),
    },
    {
      id: 'points',
      say: 'Then make your points, one at a time, each arriving as the voice reaches it.',
      motion: ({ theme, sayMs }) => stepsCard(theme, {
        overline: 'THREE POINTS',
        title: 'What changes',
        steps: [
          { title: 'First', body: 'the first point' },
          { title: 'Second', body: 'the second point' },
          { title: 'Third', body: 'the third point' },
        ],
      }, sayMs),
    },
    {
      id: 'close',
      say: 'Close on the conclusion, and a next step if there is one.',
      // `cta` comes from the config. With none, the card ends on the title.
      motion: ({ theme, sayMs, cta }) => endCard(theme, {
        title: 'The conclusion',
        chips: ['One', 'Two', 'Three'],
        cta: cta?.text,
        ctaSub: cta?.sub,
      }, sayMs),
    },
  ],
})
