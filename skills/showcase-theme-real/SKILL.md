---
name: showcase-theme-real
description: Design a Kwartz Showcase video in the real theme (Skeuomorphism), as a senior motion designer would. Use when showcase.config.json has "theme" set to "real", or when asked to make a video look skeuomorphic, like real objects.
---

# The real theme: Skeuomorphism

Things drawn like real objects: leather, paper, brushed metal, brass, glossy buttons.

Set it with `"theme": "real"` in `showcase.config.json`, or try it for one run with
`showcase make --theme real --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Music and audio tools, instruments
- Products about a physical thing
- Deliberate nostalgia

## Do not use it for

- A modern flat product: it will look dated, not deliberate
- Anything that must look fast and new

## What the theme already sets

A dark leather-brown ground, cream text, brass as the highlight, metal panels with a top light and a bottom shade, brass chips, paper labels, Playfair Display, calm movement.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. Every surface names a material. Decide which (metal, paper, brass, leather) and keep it for that kind of element.
2. Light comes from above: a 1 px light line on the top edge, a shade at the bottom, a real drop shadow.
3. Small corners. Real objects are rarely very round.
4. Buttons and chips look pressable: a gloss on top, a darker lower half.
5. Do it fully or not at all. One glossy button on a flat card looks like a mistake.
6. Serif titles, cream on the dark ground. Body text stays in the plain sans for reading.

## Movement

Calm and weighty: things rise slowly and settle, 600 ms. No bounce. Heavy objects do not hop.

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

- Gradients and fine highlights need bitrate, and can band.
- The hardest look to make from code alone. Keep cards simple.
- A texture picture as the backdrop (style.backdrop) helps a lot. Use one you have the right to use.

## Before you call it done

- Does every surface look like one material?
- Does the light come from above everywhere?
- Would this look dated, or deliberate?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
