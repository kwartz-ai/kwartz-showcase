# 7. Motion scenes

**What it is.** A scene that is a full-screen graphic, not the product: an opening that
states the problem, a "how it works" card, an ending. It is drawn frame by frame, so it
looks the same on any machine, and moving things are blurred as a camera would blur
them.

## Steps

1. In `video.ts`, give the scene `motion` in place of `run`. It returns the card:
   ```ts
   import { defineScenes, endCard, hookCard, stepsCard } from 'kwartz-showcase'

   {
     id: 'hook',
     say: 'The shipment file came in again this morning, with nothing to say what changed.',
     motion: ({ theme, sayMs }) => hookCard(theme, {
       overline: 'EVERY MORNING',
       title: 'The file. Again.',
       sub: 'No list of what changed.',
       questions: ['Which dates moved?'],
     }, sayMs),
   },
   ```

2. Use the card that fits the moment:

   | Card | For |
   |---|---|
   | `hookCard` | The opening: the viewer's problem, and the question it leaves |
   | `titleCard` | A plain title |
   | `stepsCard` | "How it works" in three or four steps |
   | `endCard` | The name, the next step, a note that the data is fictional |

3. For the ending, use the closing line from the config. It arrives as `cta`:
   ```ts
   motion: ({ theme, sayMs, cta }) => endCard(theme, {
     title: 'Tideline', chips: ['Found', 'Kept'],
     cta: cta?.text, ctaSub: cta?.sub,
     note: 'Every company and number shown is fictional.',
   }, sayMs),
   ```

4. Choose how things move, in the config:
   ```json
   { "motion": { "feel": "calm", "blur": true, "fps": 30 } }
   ```
   `calm` is slow with soft landings, `crisp` is quick and exact, `lively` has a little
   bounce.

5. Render a draft and look at the card:
   ```bash
   bunx showcase make --draft
   ```

## Check it worked

The log marks the scene: `scene 1/4 hook @ 0.0 s (motion)`. In the video the card's
lines arrive in time with the voice, and it dissolves into the product.

## Good to know

- Passing `sayMs` to a card is what times its lines to the narration.
- Your own HTML works too: return any HTML string built from `theme`. Animate with
  CSS animations only. A script timer or a video element will not move, because the
  page is never played.
- In style attributes use single quotes only. A double quote cuts the style short.
- Blur is skipped in draft renders, to keep them fast.
- Motion scenes also work in a hand-written `defineVideo` file.
