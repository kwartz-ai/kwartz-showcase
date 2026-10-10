# Fonts for video

How the kit chooses type, which Google Fonts work for video and why, and the eleven
ready pairings. To just pick one, jump to [The pairings](#the-pairings).

Checked against Google Fonts on 2026-10-10: 60 families, each requested with the
weights listed here, and every pairing requested as one stylesheet.

## Why video type is not web type

A web page is read up close, at the reader's own pace. A video is read once, for as
long as the editor allows, often on a phone held at arm's length and often with the
sound off. That changes what a font must do.

| On a web page | On a video |
|---|---|
| Body text does most of the work | Titles and captions do all of it |
| 400 weight is the norm | 500 is the lightest that survives compression; titles need 700 or 800 |
| Many sizes are fine | Three sizes a card, or the eye has nowhere to land |
| A thin, elegant face reads well | Thin strokes break up when the video is encoded |
| Tight tracking is a detail | Tight tracking on a big title is the look; on a caption it is a mistake |

So the kit uses three roles, never more:

| Role | Used for | What it needs |
|---|---|---|
| **display** | Card titles, chapter titles, the closing line | Presence at 70 to 90 px, a real heavy weight, shapes that hold when tracked tight |
| **text** | Captions, callout labels, sub-lines | Open letter shapes, a tall lower case, weights 400 to 700, clear at 20 px |
| **mono** | Small overlines ("EVERY MORNING"), step numbers | Even width, clear in capitals with wide tracking, weights 500 and 700 |

## What the check found

Three things that would otherwise go wrong in a render:

1. **Some families have one weight only.** Bebas Neue, Anton, DM Serif Display and
   Instrument Serif exist in 400 alone. A title set in "800" of such a face is drawn by
   the browser as a faked bold, which looks smeared.
2. **Google leaves a family out without a word.** Ask for a stylesheet with Inter and
   with Bebas Neue in weights 500 to 800, and Google answers "ok" with Inter only. The
   title then falls back to a system font and nothing reports an error. The kit now
   asks only for weights a family has, and before a render it checks that the
   stylesheet really gives every family.
3. **Not every face goes to 800.** Space Grotesk, Instrument Sans, Oswald, Quicksand,
   Fredoka, Lora and DM Sans stop at 700. Lato has 400 and 700 and nothing between. DM
   Mono has no bold.

Each pairing below therefore carries its own title weight and its own tracking.

## How titles are set

| Kind of display face | Title weight | Tracking | Why |
|---|---|---|---|
| Grotesque sans (Plus Jakarta Sans, Manrope, Geist) | 800 | tight, about -0.035em | Heavy and tight reads as confident, and holds together at a glance |
| Geometric sans (Sora, Space Grotesk) | 700 | a little less tight | Round letters collide sooner when tracked tight |
| Serif (Fraunces, Playfair Display) | 600 to 700 | about a third as tight | Serifs need room; a heavy tight serif turns into a dark block |
| Rounded (Nunito, Fredoka) | 600 to 800 | about half as tight | Soft shapes look cramped when tight |
| Condensed (Barlow Condensed) | 800 | none, and drawn 28 percent larger | Already narrow; it needs size, not tightness |

Captions are never tracked tight. They are 500 weight, at most two balanced lines.

## The pairings

Set one with `"style": { "fontPreset": "technical" }`.

| Preset | Display | Text | Mono | Use it for |
|---|---|---|---|---|
| `modern` (default) | Plus Jakarta Sans | Inter | JetBrains Mono | Business software, dashboards, most products |
| `geometric` | Sora | DM Sans | DM Mono | Young technology products, AI tools |
| `technical` | Space Grotesk | IBM Plex Sans | IBM Plex Mono | Developer tools, data and infrastructure |
| `minimal` | Geist | Geist | Geist Mono | Quiet, precise interfaces: let the product talk |
| `bold` | Bricolage Grotesque | Inter | JetBrains Mono | Launch videos, marketing with character |
| `editorial` | Fraunces | Source Sans 3 | IBM Plex Mono | Finance, legal, health, publishing: must feel trusted |
| `elegant` | Playfair Display | Work Sans | Roboto Mono | Premium and lifestyle products |
| `friendly` | Nunito | Nunito Sans | Roboto Mono | Consumer apps, education, a wide audience |
| `playful` | Fredoka | Nunito Sans | DM Mono | Products for children, games, light videos |
| `poster` | Barlow Condensed | Inter | JetBrains Mono | Short vertical video: a tall, loud title for a phone |
| `corporate` | Manrope | Public Sans | Roboto Mono | Enterprise and public sector: neutral and serious |

### How they were chosen

- **One voice, two registers.** In every pairing the display and text faces share a
  build (both grotesque, or a serif over a humanist sans), so the card and the caption
  feel like one design. Two unrelated faces look like two videos.
- **Text faces are the safe ones.** Inter, DM Sans, IBM Plex Sans, Source Sans 3, Work
  Sans, Nunito Sans, Public Sans and Geist all have the four weights captions and
  labels use, and all stay clear at caption size after encoding.
- **A serif is used only for display.** Captions in a serif lose their thin strokes
  to compression on a phone.
- **Mono follows the family where it can.** IBM Plex Mono with IBM Plex Sans, Geist
  Mono with Geist, DM Mono with DM Sans.

### Faces left out, and why

| Face | Why it is not a pairing |
|---|---|
| Bebas Neue, Anton | Capitals or one weight only: fine for one loud line, too rigid for a whole video. Use them as `fonts.display` if you want that |
| DM Serif Display, Instrument Serif | One weight, and thin strokes that break up small. Fine as a large title |
| Poppins, Montserrat | Good faces, seen everywhere. They are in the table if a brand uses them |
| Unbounded, Syne | Strong personalities that fight the product on screen |
| Lato | No 500 or 600, which captions and labels use |

## Using your own

```json
{ "style": { "fonts": { "display": "Poppins", "text": "Roboto" } } }
```

Any face of a pairing can be replaced, and any Google Fonts family can be named.

- A family in the kit's table is asked for in exactly the weights it has, and its
  titles are set by its kind (see the table above).
- A family the kit does not know is asked for in the weights its role uses. Before the
  render, the kit checks the stylesheet; a family Google left out is asked for again in
  its regular weight, and a family Google does not have stops the run with its name.
- For a font that is not on Google Fonts, install it on the machine and set
  `"fontSource": "installed"`.

## The product's own font

When the product has been explored (`showcase explore`), its own font is used for
captions and labels, as long as it is on Google Fonts and you have not chosen fonts
yourself. Captions drawn over the product then look like part of it. Titles keep the
display face of the pairing. `showcase make` prints a note when it does this, and
`"style": { "match": false }` turns it off.

## The full table

All 60 families the kit knows, with the weights it will ask for.

| Kind | Families |
|---|---|
| Sans, to 800 | Plus Jakarta Sans, Inter, Sora, Manrope, Outfit, Bricolage Grotesque, Poppins, Montserrat, Urbanist, Figtree, Lexend, Archivo, Syne, Unbounded, Geist, Onest, Red Hat Display, Schibsted Grotesk, Hanken Grotesk, Albert Sans, Be Vietnam Pro, Rubik |
| Sans, to 700 | Space Grotesk, Instrument Sans, DM Sans, Roboto, IBM Plex Sans, Source Sans 3, Work Sans, Nunito Sans, Public Sans, Open Sans, Noto Sans, Mulish, Karla |
| Sans, 400 and 700 only | Lato |
| Serif | Fraunces, Playfair Display, Newsreader, Source Serif 4 (to 800); Lora (to 700); DM Serif Display, Instrument Serif (400 only) |
| Condensed | Barlow Condensed (to 800); Oswald (to 700); Bebas Neue, Anton (400 only) |
| Rounded | Nunito, Baloo 2 (to 800); Quicksand, Fredoka (to 700) |
| Mono | JetBrains Mono, IBM Plex Mono, Roboto Mono, Geist Mono, Fira Code, Source Code Pro, Red Hat Mono (400, 500, 700); DM Mono (400, 500); Space Mono (400, 700) |

The table lives in `src/brief/fonts.ts` with the date it was checked. Google adds and
changes families; check again before relying on a weight that is not listed.

All of these are free to use in video under the SIL Open Font License or Apache
License, as Google Fonts publishes them.
