---
name: showcase-theme-spatial
description: Design a Kwartz Showcase video in the spatial theme (Spatial UI), as a senior motion designer would. Use when showcase.config.json has "theme" set to "spatial", or when asked to make a video look spatial, with depth.
---

# The spatial theme: Spatial UI

Glass panels floating at different depths in a dark, softly lit space, as in a headset.

Set it with `"theme": "spatial"` in `showcase.config.json`, or try it for one run with
`showcase make --theme spatial --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Hardware, 3D and AR products
- Premium technology
- A sense of depth and calm

## Do not use it for

- Budget or utilitarian products
- Dense information

## What the theme already sets

A dark ground lit from the centre, white text, a pale cyan highlight, frosted panels with a top light and a deep shadow under them, fully round chips and captions, Sora, things arrive by coming forward out of a blur.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. Depth is shown three ways: size, blur and shadow. A nearer panel is larger, sharper, and casts a deeper shadow.
2. At most two depth layers on a card. A third is lost.
3. The space is dark and nearly empty. Light comes from the centre, behind the main panel.
4. Panels are frosted with a bright top edge. Captions and chips are pills.
5. Leave a lot of room around the main panel: floating needs air.
6. The highlight is a cool pale cyan, used for one ring or one line.

## Movement

Things come forward: they start small and blurred and settle, 750 to 900 ms. Slow and smooth. Never slide in from a side.

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

- Depth needs movement to read. On a still it looks like glass.
- Deep shadows on a dark ground can crush to black when compressed. Keep the ground lighter than pure black.
- Blur and large shadows make motion scenes slower to render.

## Before you call it done

- Is there a clear nearer and a clear farther layer?
- Does anything slide in from a side? It should come forward.
- Is the main panel surrounded by empty space?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
