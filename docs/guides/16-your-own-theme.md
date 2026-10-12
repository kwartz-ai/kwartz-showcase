# 16. Your own theme

**What it is.** A theme for your brand: your colours, your fonts, your corners, and if
you want, your own way of drawing cards and captions. It is one small file in your
project. You can make it by hand, or describe the brand and have it made for you.

## Way 1: by hand

1. Start from the built-in theme closest to your brand, with your colours:
   ```bash
   bunx showcase theme new acme --from glass --accent "#FF5A1F" --ink "#0B1D35"
   ```
   This writes `themes/acme.json` and a preview picture.

2. Open `.showcase/themes/acme-preview.jpg`. It shows a title card, panels, the
   highlight ring and label over a product screen, and the end card, in a wide frame
   and a tall one.

3. Edit `themes/acme.json`. Everything is optional:
   ```json
   {
     "description": "Acme: warm and friendly",
     "extends": "glass",
     "colors": { "accent": "#FF5A1F", "ink": "#0B1D35" },
     "fontPreset": "friendly",
     "feel": "lively",
     "backdrop": ["#7C2D12", "#EA580C", "#FDE68A"],
     "radius": 0.05,
     "mood": "warm friendly",
     "look": {}
   }
   ```

   | Setting | What it changes |
   |---|---|
   | `extends` | The built-in theme to start from |
   | `colors.accent` | The one highlight colour |
   | `colors.ink` | The dark colour |
   | `colors.band`, `colors.bandText` | Behind the captions on a tall frame, and their colour |
   | `fontPreset` | A font pairing ([Fonts for video](../fonts.md)) |
   | `fonts` | Single faces: `display`, `text`, `mono`, and `displayWeight`, `tracking` |
   | `feel` | `calm`, `crisp` or `lively` |
   | `backdrop` | Three colours behind the picture, or a backdrop by name |
   | `backdropPattern` | `glow`, `waves` or `plain` |
   | `radius` | Corner of the picture: 0 is square, 0.06 is very round |
   | `mood` | A few words for the sounds |
   | `look` | How surfaces are drawn. See below |

4. Check it, look again, and use it:
   ```bash
   bunx showcase theme check acme
   bunx showcase theme preview acme
   bunx showcase make --theme acme --draft
   ```
   Then in `showcase.config.json`: `"theme": "acme"`.

## Way 2: from a description

Say what the brand is like, and the theme is written for you. It is the same file, so
you can edit it afterwards.

**In Claude Code, with no key:**

```
/showcase-theme-new orange and dark blue, rounded and friendly, a food delivery app
```

The agent reads your brand from the config and the product, picks a base, writes the
file, checks it, looks at the preview, adjusts, and renders a draft. `showcase init
--config` copies this skill into the project.

**From the command line, with an API key (beta):**

This path is unit-tested but has not yet been run end to end with a real key.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
bunx showcase theme new acme --prompt "orange and dark blue, rounded and friendly, a food delivery app"
```

If you ran `showcase explore` first, the product's own button colour and font are
given to the model too.

## Way 3: on the website

The kit's website has a **Theme Studio**. Pick a look, your brand colour, a font pairing
and the corners, and see the cards on a video frame as you change them. The page runs
the same rules as `showcase theme check`, so a theme it hands over is one a render
accepts.

A **Surprise me** button makes a whole theme by itself: a look, a brand colour, a font
pairing and a backdrop that suit each other, and only one the rules accept.

It gives you three things to copy:

- the theme file, to save as `themes/<name>.json`
- the config file
- one prompt for Claude Code, which carries both, names the skills, and says what to
  make: a video of your website, or a presentation with no product filmed

Paste the prompt into Claude Code in your project folder. Nothing is sent anywhere by
the page itself.

## Check it worked

```
ok    themes/acme.json: from glass, safe to place in a page, and readable on video
```

A theme that fails is refused, with the reason and the numbers:

```
the theme acme.json would be hard to read on video:
- caption text on its box: contrast is 1.1 to 1 (#FFFFFF on #EEEEEE); it must be at least 7 to 1 to be read on a video
```

`showcase themes` lists your themes under the built-in ones.

## Drawing surfaces your own way

`look` changes how things are drawn. Each entry is CSS for a box.

```json
"look": {
  "panel": "background:#FFFFFF;border:2px solid {ink};border-radius:20px",
  "panelFg": "#0B1D35",
  "ring": "border:3px solid {accent};border-radius:12px",
  "label": "background:{accent};color:#0B1D35;border-radius:10px",
  "caption": "background:{ink};color:#FFFFFF;border-radius:14px"
}
```

| Entry | Is |
|---|---|
| `canvas`, `fg`, `muted` | The ground of a dark card, its text, its quieter text |
| `paper`, `paperFg` | The ground of a light card and its text |
| `panel`, `panelFg` | A card within a card, and its text |
| `chip` | A small tag |
| `label`, `ring` | The callout label and the highlight ring |
| `caption` | The caption box |
| `enter` | How things arrive: `rise`, `pop`, `cut`, `float`, `type`, `depth` |
| `upper` | `true` for titles in capitals |
| `steps` | `row` or `grid` for the "how it works" card |

`{accent}` and `{ink}` stand for the theme's colours. Use single quotes only.

## Rules a theme must keep

These are the same rules the built-in themes are held to.

| Rule | Why |
|---|---|
| Caption text on its box: at least 7 to 1 | Captions are read once, quickly |
| Captions on the band of a tall frame: at least 7 to 1 | The same, on a phone |
| Text on a solid card ground: at least 7 to 1 | Titles must be clear at a glance |
| Text on a solid panel: at least 4.5 to 1 | |
| The highlight on a solid ground: at least 3 to 1 | It must stand out |
| Label text on its box: at least 4.5 to 1 | |
| CSS describes a surface only | It may not move or resize a box, or load anything |

Where a surface is see-through or shaded, contrast cannot be measured. The check says
so in a note, and you judge it in the preview.

## Good to know

- Commit the `themes` folder. It is part of the project, and everyone gets the same look.
- A theme file is checked every time it is used, so an edit that breaks a rule stops
  the render with the reason.
- The config still wins: `"style": { "accent": "..." }` goes over your theme.
- A theme never restyles your product's screens.
- `examples/motion/themes/harbor.json` is a complete example.
- `examples/website-tour/themes/lavender.json` is a second: a light clay theme made to match
  the kit's website, used for the tour video of that site.
- A theme made from a description is saved once. Later renders do not ask the model
  again, so the look does not change by itself.
- Nothing here can tell whether a theme is beautiful. The checks keep it readable and
  safe; the preview is for your eye.
