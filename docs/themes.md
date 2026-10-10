# Themes

A theme is one word that sets the whole look of a video: how cards, labels and
captions are drawn, the fonts, the colours, the backdrop behind the picture, how
things move, and the mood of the sounds.

```json
{ "url": "http://localhost:3000", "theme": "glass" }
```

```bash
showcase themes                      # list them
showcase make --theme clay --draft   # try one for a single run, beside the others
showcase init --config --theme glass # start a video in a theme, with its skill
```

With no theme, a video uses the kit's own look, called `classic`: dark navy cards and
an amber highlight.

## The themes

| Theme | Style | Looks like | Suits |
|---|---|---|---|
| `classic` | The kit's own | Dark navy cards, amber highlight, rows of data drifting behind the opening | Most products. The default |
| `minimal` | Minimalism | Light grey ground, thin borders, one blue, lots of space | Business software, finance |
| `glass` | Glassmorphism | Frosted panels on a violet to pink gradient | Modern apps, AI products, launches |
| `liquid` | Liquid glass | Nearly clear panels with bright rims, on teal and blue with warm light | Consumer apps that want to look current |
| `soft` | Neumorphism | Pale grey surfaces raised by a light and a dark shadow | Calm dashboards, wellness, hardware |
| `clay` | Claymorphism | Puffy coral shapes on peach, very round | Consumer apps, education, friendly brands |
| `brutal` | Brutalism | Yellow ground, black borders, hard shadows, capitals | Developer tools, studios, attitude |
| `maximal` | Maximalism | Deep purple with loud shapes in the corners, odd corners, hard coloured shadows | Entertainment, events, short social video |
| `bento` | Bento grid | Dark tiles in a grid, amber highlight | Feature overviews |
| `real` | Skeuomorphism | Leather, metal, brass and paper | Audio tools, physical products, nostalgia |
| `spatial` | Spatial UI | Glass panels floating in a dark lit space | Hardware, AR, premium technology |
| `editorial` | Editorial | Off-white page, serif titles, rules, one red | Finance, law, publishing |
| `terminal` | Terminal | Near-black, mono type, green, typed text | Developer tools, APIs, security |

The design terms work too: `"theme": "glassmorphism"`, `"neumorphism"`,
`"skeuomorphism"`, `"liquid glass"`, `"bento grid"`, `"spatial ui"`.

## What a theme sets

| Part | Example: `clay` |
|---|---|
| Ground and text of cards | Peach, dark brown text |
| Panels, chips | Coral panels with inner highlights, mint chips |
| Captions, callout labels, highlight ring | Dark brown rounded boxes, an orange-red ring |
| Fonts | The `playful` pairing: Fredoka, Nunito Sans |
| Movement | Things pop in with a small bounce |
| Backdrop and corner of the picture | Warm coral glow, very round corners |
| Sound mood | "playful round warm" |

## Changing one part

A theme is a starting point. Anything in `style`, `motion` or `sound` goes over it.

```json
{
  "theme": "glass",
  "style": { "accent": "#22D3EE", "fontPreset": "minimal", "backdrop": "ocean" },
  "motion": { "feel": "crisp" }
}
```

The order is: what you set, then the theme, then the product's own look from
`showcase explore`, then the kit's default. So with a theme, the product's button
colour is not used as the highlight: the theme's own highlight is part of its look.

## How each theme moves

| Movement | Themes | What happens |
|---|---|---|
| Rise | classic, minimal, soft, bento, real, editorial | Things move up a little and settle |
| Float | glass, liquid | Things drift up out of a blur, slowly |
| Pop | clay, maximal | Things scale up past full size and settle |
| Cut | brutal | Things appear at once, on the word |
| Depth | spatial | Things come forward out of a blur |
| Type | terminal | Text is revealed from the left in steps |

## Rules no theme may break

These were set for video, and are checked by tests for every theme.

- **Captions stay readable.** Caption text and its box are at least 7 to 1 apart in
  contrast where both are solid colours, and white on any see-through box.
- **Text on a solid ground** is at least 7 to 1 apart from it.
- **The highlight** is at least 3 to 1 apart from a solid ground.
- **The product is never restyled.** A theme draws cards, labels, captions and the
  frame around the product. The product's own screens are filmed as they are.
- **The layout check applies.** Something cut off fails the render in any theme.

## What a theme does to the product scenes

Only the overlays: the caption box, the highlight ring and the callout label take the
theme's surfaces, and the picture gets the theme's backdrop and corner. On a tall
frame, the band behind the captions takes the theme's ground colour.

## On video, not on a web page

| Theme | What to know |
|---|---|
| `brutal`, `clay`, `minimal`, `terminal`, `bento`, `editorial` | Flat colour and clear edges: they survive compression well |
| `glass`, `liquid`, `spatial` | Soft gradients can show bands, and blur makes motion scenes slower to render |
| `soft` | Low contrast by nature. Its shadows are drawn deeper than a web design would, because faint ones vanish when encoded |
| `maximal` | Tiring over a long video. Best under 45 seconds |
| `liquid` | Plain CSS draws the rims and highlights, not real refraction. It looks best in motion |
| `real` | The hardest to make look right from code alone. A texture picture as the backdrop helps |

## A skill for each theme

Each theme has a skill, in `skills/showcase-theme-<name>/`, that tells an AI agent how
a designer uses that style in a video: when to use it and when not, six rules of the
style, how it moves, what to watch on video, and a checklist.

`showcase init --config --theme glass` copies the skill for that theme into the
project, and `showcase plan` points at it in the work order. In Claude Code, the main
skill `/kwartz-showcase` says how to make the video; the theme skill says how it should
look.

## Graphics of your own

Take every surface from `theme.look`, and let things arrive with `arrive(theme)`. Then
your graphic is in the theme, whichever one is chosen.

```ts
import { CARD_KEYS, arrive } from 'kwartz-showcase'

motion: ({ theme, sayMs }) => {
  const { look } = theme
  const enter = arrive(theme)
  return `${CARD_KEYS}
    <div style="position:absolute;inset:0;background:${look.canvas}"></div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${look.fg}">
      <div style="${look.panel};padding:32px 40px;color:${look.panelFg};${enter(350 + sayMs * 0.2)}">One fact</div>
    </div>`
}
```

| From `theme.look` | Is |
|---|---|
| `canvas`, `fg`, `muted` | The ground of a card, its text, its quieter text |
| `paper`, `paperFg` | The lighter ground, for a "how it works" scene |
| `panel`, `panelFg` | A card within a card |
| `chip`, `label`, `ring`, `caption` | A tag, the callout label, the highlight ring, the caption box |
| `enter`, `upper`, `steps` | How things arrive, capitals for titles, steps in a row or a grid |

`examples/motion/` is built this way, and renders in every theme:

```bash
bun run showcase make examples/motion/showcase.config.json --theme brutal --draft
```

In a hand-written `defineVideo` file, get a theme with `themeFor`:

```ts
import { defineVideo, themeFor } from 'kwartz-showcase'
export default defineVideo({ name: 'demo', baseUrl: '...', theme: themeFor({ theme: 'glass' }), scenes: [...] })
```

## A theme of your own

A project can have its own themes: small files in a `themes` folder beside the config.
Each starts from a built-in theme and changes what the brand needs.

```bash
showcase theme new acme --from glass --accent "#FF5A1F"     # by hand
showcase theme new acme --prompt "orange, rounded, friendly" # from a description, with an API key
showcase theme check acme
showcase theme preview acme
```

Then `"theme": "acme"` in the config. In Claude Code, `/showcase-theme-new` makes one
from a description with no key. A theme of your own passes the same checks as the
built-in ones before it may be used: its CSS must only describe a surface, and
captions and text must stay readable. [Guide 16](guides/16-your-own-theme.md) has every
setting.

## Adding a built-in theme

A built-in theme is one entry in `src/brief/themes.ts`: its colours, a font pairing, a backdrop,
a corner size, a sound mood, and a `look` function that returns the CSS for each
surface. Add a skill beside the others, and the name to the schema. The tests then
check its contrast, its completeness, and that no style attribute can be cut short.
