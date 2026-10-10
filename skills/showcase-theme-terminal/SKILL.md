---
name: showcase-theme-terminal
description: Design a Kwartz Showcase video in the terminal theme (Terminal), as a senior motion designer would. Use when showcase.config.json has "theme" set to "terminal", or when asked to make a video look like a terminal.
---

# The terminal theme: Terminal

A dark screen, mono type, one bright green, text that is typed on.

Set it with `"theme": "terminal"` in `showcase.config.json`, or try it for one run with
`showcase make --theme terminal --draft`. Use this skill together with the main
`kwartz-showcase` skill: that one says how to make the video, this one says how it
should look.

## Use it for

- Developer tools, APIs, command-line products
- Security and infrastructure

## Do not use it for

- Non-technical audiences
- Consumer products

## What the theme already sets

A near-black green ground, pale green text, bright green as the highlight, thin-bordered panels with 6 px corners, JetBrains Mono for titles, text revealed from the left as if typed.

You do not set these by hand. The ready-made cards (`hookCard`, `stepsCard`, `endCard`),
the captions, the highlight ring and the callout labels all follow the theme.

## Rules of this style

1. Mono type is wide. A title is at most four or five words; a line of text at most about 40 characters.
2. One colour family: greens on near-black. No second hue except pass and fail in a chart.
3. Panels are outlined, not filled. A filled green box is reserved for the callout label.
4. Write like a terminal where it helps: a leading "$" or ">" on a command, not on every line.
5. Left-align when showing commands or output. Centre only the title card.
6. No shadows, no gradients, no rounded pills.

## Movement

Text is typed on from the left in steps, about 600 ms a line. Panels appear at once after their text.

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

- Compresses well. Bright green on black can bloom on some screens: the kit uses a softer green for body text.
- Check that mono titles do not run off a tall frame: the layout check will say.
- A blinking cursor is a nice touch, but only one on screen.

## Before you call it done

- Is any line longer than about 40 characters?
- Is there a colour that is not green or near-black?
- Do lines type on, not fade in?
- Did the `layout` check pass in every shape? Something cut off is never acceptable.
- Look at one frame from each scene of each shape. Does it look like one design?
