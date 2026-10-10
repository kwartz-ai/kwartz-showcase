# 5. Fonts, colours and captions

**What it is.** The video's cards, captions and labels use one set of colours and
fonts. With nothing set, the kit uses its own. Set `style` to match your brand.

## Steps

1. Add `style` to the config. Every part is optional:
   ```json
   {
     "url": "http://localhost:3000",
     "style": {
       "ink": "#0B1D35",
       "accent": "#F59E0B",
       "fonts": { "display": "Sora", "text": "Roboto", "mono": "Fira Code" },
       "fontSource": "google",
       "captions": "large"
     }
   }
   ```

   | Setting | What it changes |
   |---|---|
   | `ink` | The dark colour: card background, caption box |
   | `accent` | The one highlight colour: spotlight ring, labels, key words |
   | `fonts.display` | Titles and cards |
   | `fonts.text` | Captions and labels. Best set to the font your product uses |
   | `fonts.mono` | Small labels and data |
   | `fontSource` | `google`: link the families from Google Fonts. `installed`: use fonts on the machine |
   | `captions` | `small`, `medium` or `large` |

2. Not sure which font and colour your product uses? Ask the kit:
   ```bash
   bunx showcase explore
   ```
   The last line reports the product's own font and main button colour.

3. Render a draft and look:
   ```bash
   bunx showcase make --draft
   ```

## Check it worked

- The report's `fonts` line says `all loaded`. If a family name is wrong, the line
  fails and names it.
- Look at a frame of the first card: title in the display font, key words in the
  accent colour.

## Good to know

- Use fonts you have the right to use. Google Fonts are free to use in video.
- With `google`, a render needs the internet. With `installed`, it does not.
- Use one accent colour only. A second highlight colour splits the viewer's attention.
- Colours are hex values. A font name is a plain family name, such as `Roboto`.
- The backdrop behind the rounded picture has its own colours: see
  [guide 6](06-rounded-border.md).
