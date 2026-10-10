---
name: showcase-theme-minimal
description: Design a Kwartz Showcase video in the minimal theme (Minimalism), as a senior motion designer would. Use when showcase.config.json has "theme" set to "minimal", or when asked to make a video look clean and minimal.
---

# The minimal theme: Minimalism

Less on screen, placed exactly. Type and space do the work.

Set it with `"theme": "minimal"` in `showcase.config.json`, or try it for one run with
`showcase make --theme minimal --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Business software, finance, analytics
- A product whose screens are already dense
- A calm, exact tone

## Do not use it for

- A product with little to show: the video will look empty
- Playful or loud brands

## What the theme already sets

Light grey ground, near-black text, one blue highlight, thin 1.5 px borders, small corners, Geist for everything, quick exact movement, a plain light backdrop.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. One idea per card. If a card has a title, a line and a graphic, remove one.
2. Leave at least a third of every card empty. The space is the design.
3. One highlight colour, used once per card, on the thing that matters.
4. Align everything to one left edge or one centre line. Never mix the two on a card.
5. No shadows, no gradients, no icons for decoration. A border is the strongest surface there is.
6. Titles large (the kit sets 76 to 86 px) so the card does not look unfinished.

## Movement

Things rise a short way and stop. No bounce, no overshoot. 300 to 500 ms. One thing moves at a time.

The theme sets how things arrive. In a scene of your own, use `arrive(theme)` so your
graphics move the same way as the cards.

## Building your own graphics

Take every surface from `theme.look`, never from a colour you typed in. Then your
graphic is in this style, and would still be right if the theme changed.

```ts
import { CARD_KEYS, arrive, scaleCss } from 'kwartz-showcase'

motion: ({ theme, sayMs }) => {
  const { look } = theme
  const enter = arrive(theme)
  return `${CARD_KEYS}
    <div style="position:absolute;inset:0;background:${look.canvas}"></div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${look.fg}">
      <div style="${look.panel};padding:32px 40px;color:${look.panelFg};${enter(350 + sayMs * 0.2)}">
        <div style="font:${theme.displayWeight} 44px/1.1 ${theme.type.display}">One fact</div>
      </div>
    </div>`
}
```

| From `theme.look` | Use it for |
|---|---|
| `canvas`, `fg`, `muted` | The ground of a card, its text, its quieter text |
| `paper`, `paperFg` | The lighter ground, for a "how it works" scene |
| `panel`, `panelFg` | A card within a card |
| `chip` | A small tag |
| `label`, `ring`, `caption` | Already used by the kit for callouts, highlights and captions |

## On video

- Compresses very well: flat colour and hard edges.
- Thin borders must stay at 1.5 px or more in the finished frame, or they flicker.
- On a tall frame the light caption band joins the card, so the picture reads as one sheet.

## Before you call it done

- Is anything on screen that the narration does not mention? Remove it.
- Is the highlight colour used more than once on a card?
- Is there empty space on every card?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
