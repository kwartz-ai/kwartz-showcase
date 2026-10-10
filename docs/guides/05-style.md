# 5. Fonts, colours and captions

**What it is.** The video's cards, captions and labels use one set of colours and
fonts. With nothing set, the kit uses its own. Set `style` to match your brand.

## Steps

1. The quickest way is a ready pairing of fonts. There are eleven, each chosen for
   video: `modern` (the default), `geometric`, `technical`, `minimal`, `bold`,
   `editorial`, `elegant`, `friendly`, `playful`, `poster`, `corporate`.
   ```json
   { "style": { "fontPreset": "technical" } }
   ```
   [Fonts for video](../fonts.md) shows what each one is and what it suits.

   Or set the parts yourself. Every part is optional:
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

2. Let the kit match the product. Explore it once:
   ```bash
   bunx showcase explore
   ```
   From then on, anything you have not set yourself follows the product: its button
   colour becomes the highlight colour, and its font is used for captions and labels
   (when that font is on Google Fonts). `showcase make` says so:
   ```
   note: accent colour #2fa8e0 taken from the product's own buttons (set "style.accent" to choose another)
   ```
   Turn this off with `"style": { "match": false }`.

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
- Any Google Fonts family can be named in `fonts`. The kit asks only for weights the
  family has, and before a render it checks that Google really gave every family. A
  name Google does not have stops the run and is named.
- A button colour that is too dark to show on the dark cards is not used as the
  highlight; the note says so.
- With `google`, a render needs the internet. With `installed`, it does not.
- Use one accent colour only. A second highlight colour splits the viewer's attention.
- Colours are hex values. A font name is a plain family name, such as `Roboto`.
- The backdrop behind the rounded picture has its own colours: see
  [guide 6](06-rounded-border.md).
