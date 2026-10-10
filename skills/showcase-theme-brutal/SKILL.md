---
name: showcase-theme-brutal
description: Design a Kwartz Showcase video in the brutal theme (Brutalism), as a senior motion designer would. Use when showcase.config.json has "theme" set to "brutal", or when asked to make a video look brutalist.
---

# The brutal theme: Brutalism

Hard black borders, flat loud colour, no rounding, hard offset shadows, type in capitals.

Set it with `"theme": "brutal"` in `showcase.config.json`, or try it for one run with
`showcase make --theme brutal --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Developer tools, creative studios
- A brand that wants attitude
- Short, punchy videos

## Do not use it for

- Soft or premium brands
- A product with a gentle interface: the frame will fight it

## What the theme already sets

A yellow ground, black text, white panels with 4 px black borders and hard black shadows, blue as the one highlight, no rounded corners anywhere, Space Grotesk in capitals, things appear at once.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. No rounded corners. Not on panels, chips, the highlight ring or the picture.
2. Shadows are solid and offset (8 px right and down), never blurred.
3. Three colours: the yellow, black, white. The blue highlight is the fourth and is used once per card.
4. Titles in capitals, heavy, tight. Short: a brutal title is three or four words.
5. Borders are 3 to 4 px. A thin border looks like a mistake here.
6. Leave things slightly raw: a hard edge, a box that overlaps another. Do not polish.

## Movement

Hard cuts. Things appear at once, on the word. No easing, no fades. Timing is everything: place each cut exactly on the syllable.

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

- The best look for compression: hard edges and flat colour stay sharp at any size.
- Large yellow areas are bright on a phone at night. Keep scenes short.
- Because nothing eases, a mistimed element is obvious. Check the timing against the voice.

## Before you call it done

- Is anything rounded or blurred?
- Does anything fade or slide in? It should cut.
- Is the highlight blue used more than once on a card?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
