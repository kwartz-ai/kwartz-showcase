---
name: showcase-theme-glass
description: Design a Kwartz Showcase video in the glass theme (Glassmorphism), as a senior motion designer would. Use when showcase.config.json has "theme" set to "glass", or when asked to make a video look like frosted glass.
---

# The glass theme: Glassmorphism

Frosted, see-through panels over a colourful blurred ground, with a thin light edge.

Set it with `"theme": "glass"` in `showcase.config.json`, or try it for one run with
`showcase make --theme glass --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Modern apps, AI products, launch videos
- A product with a colourful brand
- A light, current feel

## Do not use it for

- Dense text: glass makes long text tiring
- A product whose own screens are grey and plain: the cards will outshine it

## What the theme already sets

A violet to blue to pink ground, white text, a warm yellow highlight, frosted panels with a 1 px light edge and large corners, Sora for titles, slow floating movement, a backdrop with ribbons of light.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. Glass needs something behind it. Always place a panel over the gradient, never over a flat colour.
2. Put text only on a panel or directly on the ground, never half on each.
3. At most three panels on a card. More, and the layers turn to mud.
4. Text on glass is white and at least 500 weight. Thin type disappears.
5. Keep the highlight warm (the yellow) so it separates from the cool ground.
6. Captions use a dark tinted glass: they must stay readable over any colour.

## Movement

Panels float up out of a blur and settle, 700 to 900 ms. Nothing snaps. Stagger panels by 120 ms.

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

- Soft gradients show bands when compressed. The kit encodes at high quality; do not lower it.
- Blur is slow to render: a motion scene with many panels takes longer.
- Check one encoded frame on a phone: the frosted edge should still be visible.

## Before you call it done

- Can every line of text be read without effort?
- Is there a panel floating over a flat area?
- Are more than three layers stacked anywhere?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
