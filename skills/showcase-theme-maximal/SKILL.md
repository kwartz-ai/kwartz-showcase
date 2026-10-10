---
name: showcase-theme-maximal
description: Design a Kwartz Showcase video in the maximal theme (Maximalism), as a senior motion designer would. Use when showcase.config.json has "theme" set to "maximal", or when asked to make a video look loud and maximal.
---

# The maximal theme: Maximalism

Many colours, patterns, tilted corners and big type. Deliberately busy.

Set it with `"theme": "maximal"` in `showcase.config.json`, or try it for one run with
`showcase make --theme maximal --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Entertainment, fashion, events
- Short social video where standing out matters most

## Do not use it for

- Any product video where the interface must be studied
- Corporate or regulated subjects

## What the theme already sets

A deep purple ground with pink, cyan, yellow and violet shapes in the corners and a faint stripe, pink panels with odd corners and cyan hard shadows, a yellow highlight, Bricolage Grotesque, lively popping movement.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. Busy at the edges, clear in the middle. The loud shapes sit in the corners; titles and graphics keep the centre.
2. Even here there is one colour that means "look here": the yellow. Do not use it for decoration.
3. Odd corners (one small, one large) on panels and chips are the signature. Use them consistently.
4. Hard coloured shadows, never soft ones.
5. Use this theme for cards only. The product scenes stay plain so the viewer can read them.
6. Text always sits on a solid colour, never on the stripe or on a shape.

## Movement

Pop in with a small overshoot. Fast, about 500 ms, staggered by 80 ms. Energy, but one thing at a time.

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

- Patterns cost bitrate. The stripe is kept faint for that reason: do not strengthen it.
- The layout check still applies: a shape that covers text fails the render.
- Tiring over a long video. Best under 45 seconds.

## Before you call it done

- Is the centre of every card clear of decoration?
- Can the title be read in one second?
- Is yellow used only for the highlight?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
