---
name: showcase-theme-bento
description: Design a Kwartz Showcase video in the bento theme (Bento grid), as a senior motion designer would. Use when showcase.config.json has "theme" set to "bento", or when asked to make a video look like a bento grid.
---

# The bento theme: Bento grid

Content in a grid of rounded tiles, like a lunch box. More a layout than a surface.

Set it with `"theme": "bento"` in `showcase.config.json`, or try it for one run with
`showcase make --theme bento --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Feature overviews, "everything it does" videos
- A summary or end scene
- Products with several separate strengths

## Do not use it for

- A single-idea video: a grid needs several things to hold
- A linear story where order matters more than overview

## What the theme already sets

A near-black ground, dark slate tiles with a thin lighter edge and 22 px corners, white text, an amber highlight, Plus Jakarta Sans, quick exact movement. The "how it works" card becomes a grid of tiles.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. One tile, one fact. A tile holds a number, or a word and a line, never a paragraph.
2. Tiles differ in size on purpose: the most important fact gets the largest tile.
3. Equal gaps everywhere (20 px). Unequal gaps break the grid.
4. One tile may carry the highlight colour as its fill. Only one.
5. Light up tiles one at a time as the voice names them.
6. On a tall frame the grid is two columns. Never squeeze four tiles into a row.

## Movement

Tiles rise in one after another, 100 ms apart, in reading order. Quick and exact.

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

- Compresses well: flat tiles on a dark ground.
- Small text in small tiles is the risk. No tile text under 20 px in the finished frame.
- A grid that is full at once is hard to read: let it build with the narration.

## Before you call it done

- Does each tile hold one fact?
- Is the largest tile the most important one?
- Do tiles arrive in the order the voice names them?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
