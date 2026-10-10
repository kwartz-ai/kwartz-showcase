---
name: showcase-theme-liquid
description: Design a Kwartz Showcase video in the liquid theme (Liquid glass), as a senior motion designer would. Use when showcase.config.json has "theme" set to "liquid", or when asked to make a video look like liquid glass.
---

# The liquid theme: Liquid glass

Clearer than frosted glass, with bright edges and light that seems to bend. After the look Apple introduced in 2025.

Set it with `"theme": "liquid"` in `showcase.config.json`, or try it for one run with
`showcase make --theme liquid --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Consumer apps, products that want to look current
- Short, polished launch pieces

## Do not use it for

- Data-heavy explainers
- Anything that must look serious or traditional

## What the theme already sets

A teal to blue ground with warm and cyan light sources, white text, a yellow highlight, nearly clear panels with bright rims and inner highlights, very round corners, Plus Jakarta Sans, slow floating movement.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. The panel is almost clear: what makes it read as glass is the bright top edge and the soft inner glow. Do not add a fill.
2. Keep light sources in the corners of the ground so panels in the middle have something to refract.
3. Round everything: panels 34 px, chips and labels fully round.
4. Few words per panel. Liquid glass is for a title, a number, a short label.
5. Callout labels are solid white pills, so they stay readable over the moving ground.
6. This is the hardest look to do well. If a card looks like ordinary glass, simplify it rather than add effects.

## Movement

Slow, 800 to 1000 ms, floating in out of a blur. The effect lives in movement: let panels arrive one at a time.

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

- A still frame looks like plain glass: judge this theme in motion, not on a still.
- Saturated light sources can band. Keep them large and soft.
- Plain CSS cannot bend light like the real thing. The kit draws the rims and highlights, not refraction.

## Before you call it done

- Does each panel have a visible bright edge on the encoded frame?
- Is any panel carrying more than about eight words?
- Do the light sources sit behind the panels, not behind the title?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
