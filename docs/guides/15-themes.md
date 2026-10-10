# 15. Themes

**What it is.** One word that changes the whole look of a video: cards, captions,
labels, fonts, colours, backdrop, movement and sound. There are twelve, plus the kit's
own look.

## Steps

1. See the list:
   ```bash
   bunx showcase themes
   ```
   ```
   classic      The kit's own look: dark navy cards, an amber highlight. The default.
   minimal      Minimalism: business software, finance, anything that must feel calm and exact
   glass        Glassmorphism: modern apps, AI products, launch videos
   liquid       Liquid glass: consumer apps, products that want to look current
   soft         Neumorphism: calm dashboards, health and wellness, hardware controls
   clay         Claymorphism: consumer apps, education, friendly brands
   brutal       Brutalism: developer tools, creative studios, brands that want attitude
   maximal      Maximalism: entertainment, fashion, events, short social video
   bento        Bento grid: feature overviews, "everything it does" videos
   real         Skeuomorphism: music and audio tools, products about a physical thing
   spatial      Spatial UI: hardware, 3D and AR products, premium technology
   editorial    Editorial: finance, law, publishing, reports
   terminal     Terminal: developer tools, APIs, security products
   ```

2. Try two or three on your own video without changing the config. Each run writes
   files named after the theme, so you can compare them side by side:
   ```bash
   bunx showcase make --theme glass --draft
   bunx showcase make --theme clay --draft
   bunx showcase make --theme brutal --draft
   ```
   This writes `out/demo-glass.mp4`, `out/demo-clay.mp4`, `out/demo-brutal.mp4`.

3. Put the one you like in the config:
   ```json
   { "url": "http://localhost:3000", "theme": "glass" }
   ```

4. Change single parts if you want. Your own settings go over the theme:
   ```json
   { "theme": "glass", "style": { "accent": "#22D3EE" }, "motion": { "feel": "crisp" } }
   ```

5. Render:
   ```bash
   bunx showcase make
   ```

## Check it worked

The first line of the run names the theme:

```
theme: glass
```

and every card, caption and label in the video is drawn in that style. The `layout`
check must still pass in every shape.

## Choosing a theme

| If the product is | Start with |
|---|---|
| Business software, a dashboard | `minimal` or `classic` |
| A modern app, an AI tool | `glass` |
| A consumer app | `clay` or `liquid` |
| A developer tool | `terminal` or `brutal` |
| Finance, legal, a report | `editorial` |
| A feature overview | `bento` |
| Hardware, AR | `spatial` |
| An event, a short social video | `maximal` |

## With Claude Code

Each theme has a skill that tells the agent how a designer uses that style. Start a
video in a theme and its skill is copied into the project:

```bash
bunx showcase init --config --theme glass
```

Then `/kwartz-showcase` as usual. The work order from `showcase plan` points the agent
at the theme's skill.

## Good to know

- A theme never restyles your product's screens. It draws the cards, the captions, the
  labels and the frame around the picture.
- With a theme, the highlight colour is the theme's, not your product's button colour.
  Set `style.accent` to use your own.
- `glass`, `liquid` and `spatial` render more slowly, because of blur.
- `soft` has low contrast by nature, and `maximal` is tiring over a long video.
- The design terms work as names too: `glassmorphism`, `neumorphism`, `skeuomorphism`.
- None of the twelve fits your brand? Make your own: [guide 16](16-your-own-theme.md).
- Your own graphics follow the theme if they are built from `theme.look`. See
  [Themes](../themes.md).
