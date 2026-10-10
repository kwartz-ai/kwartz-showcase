---
name: showcase-theme-clay
description: Design a Kwartz Showcase video in the clay theme (Claymorphism), as a senior motion designer would. Use when showcase.config.json has "theme" set to "clay", or when asked to make a video look like clay.
---

# The clay theme: Claymorphism

Puffy, rounded shapes in warm pastel colours with soft inner highlights, like modelling clay.

Set it with `"theme": "clay"` in `showcase.config.json`, or try it for one run with
`showcase make --theme clay --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Consumer apps, education, children
- Friendly brands, onboarding videos

## Do not use it for

- Finance, law, security: it reads as childish there
- Dense tables and long text

## What the theme already sets

A peach ground, coral panels with white text, mint chips, dark brown captions and labels, very round corners, Fredoka for titles, lively movement with a small bounce.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. Every shape is thick: an outer drop shadow in the shape's own colour, a dark inner shadow below, a light inner highlight above.
2. Corners are very round (34 px on a panel). A sharp corner breaks the look.
3. Two or three flat pastel colours, no gradients on the ground.
4. Big and few: three shapes on a card at most, each large.
5. Text on a coral panel is white and bold. On the peach ground it is dark brown.
6. Keep the highlight a strong warm red-orange, clearly darker than the coral panels.

## Movement

Things pop: scale up past full size and settle, about 550 ms. Stagger by 100 ms so shapes arrive like a row of buttons.

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

- Survives compression very well: big shapes, solid colours.
- Inner highlights need the shape to be at least 60 px tall to show.
- The bounce must be small (4 percent). More looks like a toy.

## Before you call it done

- Does every shape look thick, with a highlight above and a shadow below?
- Are there more than three shapes on a card?
- Is any corner sharp?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
