---
name: showcase-theme-soft
description: Design a Kwartz Showcase video in the soft theme (Neumorphism), as a senior motion designer would. Use when showcase.config.json has "theme" set to "soft", or when asked to make a video look soft and neumorphic.
---

# The soft theme: Neumorphism

Surfaces the same colour as the page, raised or pressed in by one light shadow and one dark one.

Set it with `"theme": "soft"` in `showcase.config.json`, or try it for one run with
`showcase make --theme soft --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Calm dashboards, health and wellness
- Hardware controls, audio, settings screens
- A quiet, tactile feel

## Do not use it for

- Anything urgent or loud
- Dense information: the style has no strong borders to separate things

## What the theme already sets

A pale blue-grey ground and panels of the same colour, dark slate text, an indigo highlight, deep paired shadows, large corners, Manrope, calm movement.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. A raised panel has a dark shadow lower right and a light one upper left. A pressed chip has the same pair, inset. Never mix directions on one card.
2. The ground and the panel are the same colour. Do not tint the panel.
3. Text is much darker than the style usually uses (the kit sets #232B3D): contrast comes from the type, since it cannot come from the surface.
4. Generous spacing. Two raised panels need at least 40 px between them or their shadows merge.
5. The highlight colour is the only strong colour. Use it for one ring, one word, one number.
6. Captions and labels are dark solid boxes: they are the readable anchor of the card.

## Movement

Calm rises, 500 to 650 ms. Nothing bounces. A pressed-in chip can simply fade in.

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

- The soft shadows are the first thing compression removes. The kit makes them deeper than a web design would; do not make them lighter.
- On a bright phone the raised effect is faint. The video must still read if the shadows vanish.
- Low contrast by nature: never put small grey text on the grey ground.

## Before you call it done

- Cover the shadows with your hand: can you still read everything?
- Are all light sources coming from the upper left?
- Is any text lighter than the dark slate?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
