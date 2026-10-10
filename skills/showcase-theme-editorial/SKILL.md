---
name: showcase-theme-editorial
description: Design a Kwartz Showcase video in the editorial theme (Editorial), as a senior motion designer would. Use when showcase.config.json has "theme" set to "editorial", or when asked to make a video look like a magazine.
---

# The editorial theme: Editorial

Like a well printed magazine: a serif headline, rules above and below, restrained colour.

Set it with `"theme": "editorial"` in `showcase.config.json`, or try it for one run with
`showcase make --theme editorial --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Finance, law, publishing, reports
- A product that must feel trusted
- Explainers with a little more text

## Do not use it for

- Playful consumer products
- Fast, punchy social video

## What the theme already sets

An off-white ground, black text, one deep red, panels marked only by a heavy rule above and a thin rule below, no rounded corners, Fraunces for titles, calm movement.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. Rules, not boxes. A section is marked by a 3 px rule above and a 1.5 px rule below, never by a filled card.
2. The serif is for titles only. Anything under 30 px is set in the sans.
3. One red, used like a printer would: one word, one rule, one figure.
4. Left-align blocks of text when there is more than one line under a title. Centre only a title on its own.
5. Numbers in the mono face, aligned in columns.
6. Wide margins. The page should look like it has room to spare.

## Movement

Calm rises, 500 ms. No scaling, no bounce. Text may appear line by line.

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

- Serif hairlines break up when small: keep the serif large.
- An off-white ground is easy on the eye and compresses well.
- Rules must be 1.5 px or more in the finished frame.

## Before you call it done

- Is any serif text small?
- Is red used more than once on a card?
- Is there a filled box where a rule would do?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
