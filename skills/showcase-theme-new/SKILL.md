---
name: showcase-theme-new
description: Create a custom Kwartz Showcase theme for a brand from a description, as a senior brand and motion designer would. Use when asked to make, design or set up a theme, a look or a brand style for showcase videos, or to match videos to a brand's colours and fonts. Trigger: /showcase-theme-new
---

# Make a theme for a brand

You are designing the look of this project's videos. The result is one small file,
`themes/<name>.json`, beside `showcase.config.json`. It starts from a built-in theme and
changes only what the brand needs. Once it exists, `"theme": "<name>"` in the config
uses it for every video.

Anything the user typed after the command is the brief: the brand, its colours, its
character, who it is for. If they gave almost nothing, find out from the product (step
1) and say what you assumed.

You cannot judge a theme from its file. You must look at the preview picture, and at a
rendered frame, before you say it is done.

## Steps

1. **Learn the brand.** In this order, use what exists:
   - what the user said
   - `showcase.config.json`: `style.accent`, `style.ink`, `style.fonts`
   - `.showcase/explore/map.md`: the product's own font and main button colour. If it
     is missing and the config has a `url`, run `showcase explore`
   - the product's own stylesheet or design tokens, if they are in this repo
   Write down three things before going on: the main brand colour, a dark colour, and
   the brand's character in three words (for example "calm, exact, trusted").

2. **Choose the base** by character, not by colour. `showcase themes` lists them.

   | The brand is | Start from |
   |---|---|
   | Business software, a dashboard, serious | `classic` or `minimal` |
   | Modern, colourful, an app or AI product | `glass` |
   | Friendly, consumer, education | `clay` |
   | For developers | `terminal` or `brutal` |
   | Finance, legal, a publisher | `editorial` |
   | Premium hardware, AR | `spatial` |
   | Many features to show at once | `bento` |

   Say which base you chose and why, in one line.

3. **Start the file.**
   ```bash
   showcase theme new <name> --from <base> --accent "<brand colour>" --ink "<dark colour>"
   ```
   The name is lower case with dashes, for example `acme` or `north-bank`.

4. **Edit `themes/<name>.json`.** Change little. In order of how often it is needed:

   | Setting | What it is |
   |---|---|
   | `colors.accent` | The ONE highlight colour. Usually the brand's main colour |
   | `colors.ink` | The dark colour: cards and caption boxes in the classic look |
   | `fontPreset` | A pairing: `modern`, `geometric`, `technical`, `minimal`, `bold`, `editorial`, `elegant`, `friendly`, `playful`, `poster`, `corporate` |
   | `fonts.text` | The product's own font for captions, when it is on Google Fonts |
   | `backdrop` | Three colours behind the picture: two close shades of the brand colour, and a light tint of it for the glow |
   | `radius` | Corner of the picture. Match the product: 0 for square, 0.034 usual, 0.06 very round |
   | `feel` | `calm`, `crisp` or `lively` |
   | `mood` | A few words for the sounds |
   | `look.*` | Surfaces, only when the base cannot give the look. See below |

5. **Check it.**
   ```bash
   showcase theme check <name>
   ```
   An error means the theme may not be used: fix exactly what it says. A note means a
   surface is see-through or shaded, so its contrast could not be measured: you must
   judge it in the preview.

6. **Look at it.**
   ```bash
   showcase theme preview <name>
   ```
   Open `.showcase/themes/<name>-preview.jpg`. It shows a title card, panels, the
   highlight ring and callout label over a product screen, and the end card, in a wide
   frame and a tall one. Ask of it:
   - Can every word be read at a glance, in both shapes?
   - Is the highlight colour clearly the brightest thing, and used for one thing?
   - Does it look like this brand, or like the base with a new colour?
   - Would the product's own screens sit well next to these cards?
   Change the file and preview again until the answers are yes.

7. **Render one real video in it.**
   ```bash
   showcase make --theme <name> --draft
   ```
   Look at frames from every scene in every shape. The `layout` check must pass.

8. **Report.** The name of the theme, the base and why, the three brand facts you used
   and where each came from, what you changed, what the checks said, and how to use it:
   `"theme": "<name>"`. Say plainly what you could not judge (how it sounds, how it
   looks on a phone).

## Rules a theme must keep

`showcase theme check` enforces these. Design inside them.

- Caption text on its box: contrast at least 7 to 1.
- `bandText` on `band` (captions on a tall frame): at least 7 to 1.
- Text on a solid card ground, dark or light: at least 7 to 1.
- The highlight on a solid card ground: at least 3 to 1.
- Callout label text on its box: at least 4.5 to 1.
- `chip`, `label` and `caption` each set their own text colour.

When the brand's main colour is too dark to show on a dark ground, do not force it.
Use it for the ground (`colors.ink`) and choose a light highlight from the brand's
secondary colours, or a light tint of the main one.

## Surfaces, when you need them

Each entry of `look` is CSS for a box. It may set `background`, `border`,
`border-radius`, `box-shadow`, `color`, `opacity` and `backdrop-filter`. It may not set
where a box sits or how it moves, and may not load anything.

```json
"look": {
  "panel": "background:#FFFFFF;border:2px solid {ink};border-radius:20px",
  "panelFg": "#0B1D35",
  "ring": "border:3px solid {accent};border-radius:12px",
  "caption": "background:{ink};color:#FFFFFF;border-radius:14px"
}
```

- `{accent}` and `{ink}` stand for the theme's colours, so a change of colour follows through.
- Use single quotes only, never double quotes.
- `canvas` and `paper` are the dark and light grounds of cards: a colour or a gradient.
- `fg`, `muted`, `paperFg`, `panelFg` are plain colours for text.
- `enter` is how things arrive: `rise`, `pop`, `cut`, `float`, `type` or `depth`.
- `upper: true` sets titles in capitals. `steps: "grid"` lays steps out as tiles.

## What a designer would not do

- Do not use more than one highlight colour, even if the brand has five.
- Do not copy the product's whole palette. A video needs a ground, a text colour, and
  one highlight.
- Do not pick a base for its colour. Colour is the easy part to change; character is not.
- Do not make captions pretty at the cost of contrast. They are read once, quickly.
- Do not use hairlines under 1.5 px or very soft shadows: compression erases them.
- Do not restyle the product's screens. A theme draws cards, captions, labels and the
  frame around the picture.
- Do not call it done from the JSON. Look at the preview and at a rendered frame.

## Without Claude Code

The same file can be made from the command line through the API, with a key:

```bash
showcase theme new <name> --prompt "orange and dark blue, rounded, friendly, a food delivery app"
```

It is checked in the same way before it is saved.
