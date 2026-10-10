# A video from a config

There are two ways to make a video with the kit.

- **By hand:** you write one file, `video.ts`, with `defineVideo`. See
  [Writing a video](writing-a-video.md).
- **From a config:** you describe the video in `showcase.config.json` (what to film, how
  long, for which platforms, in what style), and the scenes are written for that
  description, by you or by an AI agent. This page covers that way.

The config way adds: a target length with a word budget, several shapes from one
script, platform names, your own script file, your fonts and colours, sound effects
chosen for the project, read-only mode for a live product, a saved sign-in, and a map
of the product for the author.

The kit itself has no AI in it. `showcase plan` prints a work order; a person or an agent
reads it and writes the scenes. With Claude Code, the skill does this for you.

## The five steps

```bash
showcase init --config        # 1. showcase.config.json, video.ts and the skill
showcase explore              # 2. map the product's screens into .showcase/explore/
showcase plan                 # 3. the work order: scenes, words, shapes, safety
showcase make --draft         # 4. picture only, to check every scene runs
showcase make                 # 5. voice, music, effects, every shape, every check
```

With Claude Code, after step 1 you can type `/kwartz-showcase` and say what the video
is for. The agent runs steps 2 to 5 and reports what it checked.

## The smallest config

```json
{
  "url": "http://localhost:3000"
}
```

That gives a 30 second landscape video with the default voice, fonts, colours, music
and sounds. Everything below is optional.

## Every setting

A JSON schema ships with the kit at `schema/showcase.config.schema.json`. Point `$schema`
at it and your editor completes and checks the file as you type.

| Setting | Default | Meaning |
|---|---|---|
| `name` | `video` | Names the files: `out/<name>.mp4` |
| `url` | (required) | The product to film: local (`http://localhost:3000`) or hosted |
| `serve` | none | In place of `url`: a folder of static files to serve and film |
| `motionOnly` | `false` | In place of `url`: a video of motion graphics and clips alone. No product is filmed |
| `length` | `30` | Seconds, 10 to 600. 30, 60, 90 and 180 have ready structures |
| `platforms` | none | Where it will be posted, by name. See the table below |
| `formats` | `["landscape"]` | Shapes to render, by name or `{ "width", "height" }` |
| `theme` | `classic` | One word for the whole look: `minimal`, `glass`, `liquid`, `soft`, `clay`, `brutal`, `maximal`, `bento`, `real`, `spatial`, `editorial`, `terminal`. See [Themes](themes.md) |
| `layout` | by shape | `fill`, `framed`, `fit` or `responsive`. See Layouts |
| `audience` | asked for | Who the video is for |
| `promise` | asked for | The one thing the video should prove |
| `cta` | see below | The closing line: `{ "text", "sub" }` |
| `script` | none | A text file with your own narration |
| `scenes` | `video.ts` | The scenes file, beside the config |
| `style` | kit theme | `fontPreset`, `ink`, `accent`, `fonts`, `fontSource`, `captions`, `border`, `backdrop`, `backdropPattern`, `match` |
| `voice` | `af_heart` | A Kokoro voice name |
| `music` | `generated` | `generated`, `false`, or the path of a track you may use |
| `motion` | calm, blur on | `feel` (`calm`, `crisp`, `lively`), `blur`, `fps` (30 or 60) |
| `sound` | `auto` | `effects` and `mood`. See Sound effects |
| `auth.session` | none | A sign-in saved by `showcase login` |
| `safety` | see below | `readOnly`, `allow`, `banned` |

A setting the kit does not know is an error, with the list of known ones, so a typing
mistake is found at once. All problems in a config are reported together.

**The closing line.** When `cta` is not set and the product is hosted, the end card
points at the product's own address. When the address is local, there is no closing
line (a viewer cannot use `localhost`), and `showcase make` says so.

## Length

A video's length comes from its narration: the voice reads about 3 words a second, and
each scene adds about 1.15 seconds of lead-in and pause. So a target length is really a
number of scenes and a word budget.

| Length | Scenes | Words | Structure |
|---|---|---|---|
| 30 s | 4 | about 70 | hook, two proofs, end |
| 60 s | 7 | about 143 | hook, intro, four proofs, end |
| 90 s | 9 | about 220 | hook, intro, proofs with a "how it works" card, end |
| 180 s | 18 | about 419 | the same, in chapters with chapter cards |
| other | about one per 10 s | worked out | the same pattern |

A render passes the length check within 10 percent of the target. When it misses,
`showcase make` says by how much in words:

```
to fit the length: 4.9 s too short: add about 14 words of narration, or one scene
```

## Shapes and platforms

Name the platforms and the kit picks the shapes. Platforms that share a shape share one
render, and each gets its own named copy.

| Shape | Size | Ratio | Platforms |
|---|---|---|---|
| `landscape` | 1920x1080 | 16:9 | `youtube`, `x`, `website`, `share` |
| `vertical` | 1080x1920 | 9:16 | `youtube-shorts`, `instagram-reel`, `instagram-story`, `facebook-reel`, `tiktok`, `whatsapp-status`, `snapchat` |
| `square` | 1080x1080 | 1:1 | `linkedin` |
| `portrait` | 1080x1350 | 4:5 | `instagram-feed`, `facebook` |
| `tall` | 1080x1620 | 2:3 | `pinterest` |
| `classic` | 1440x1080 | 4:3 | (by name only) |
| `wide` | 2560x1080 | 21:9 | (by name only) |
| custom | `{ "width", "height" }` | any | even numbers, 240 to 4096 |

```json
{ "platforms": ["youtube", "instagram-reel", "youtube-shorts"], "formats": ["square"] }
```

writes `demo.landscape.mp4` (copy: `demo.youtube.mp4`), `demo.vertical.mp4` (copies:
`demo.instagram-reel.mp4`, `demo.youtube-shorts.mp4`) and `demo.square.mp4`.

The vertical shape keeps the top 12 percent and the bottom 20 percent clear, because
phone apps draw their own buttons and text there. Platform sizes change over time; they
live in one file, `src/brief/presets.ts`, with the date they were last checked.

`showcase make` also warns when a length is unusual for a platform, for example 180 seconds
for a short-video platform.

### Layouts

How a desktop product is placed in a shape that is not landscape.

| Layout | What it does | Use it for |
|---|---|---|
| `fill` | The page is the whole video | Landscape, square, portrait (the default there) |
| `framed` | The page is a window in the upper part of the frame, with large captions below it | Desktop products on vertical video (the default there) |
| `fit` | The whole landscape page, small, on the tall frame | A quick repost only: the product is hard to read |
| `responsive` | The page at phone width, so it shows its mobile layout | Products that have a real mobile layout |

In the framed layout the page is zoomed so its type reads on a phone, cards are drawn
larger, and captions are drawn on the frame itself, not in the page.

One scenes file serves every shape. A scene can read `layout` to zoom closer on a tall
frame, and `formats: ['landscape']` leaves a scene out of the other shapes.

## Your own script

```json
{ "script": "script.txt" }
```

Plain text, one paragraph per scene, in order. A `## scene-id` heading ties a paragraph
to the scene with that id, wherever it is in the file.

```
## hook
The shipment file came in again this morning.

One click keeps only the shipments whose date moved.
```

Your words are never changed. If the script is more than 10 percent over the word
budget, the kit says by how many words and renders it anyway.

## Style

```json
{
  "style": {
    "ink": "#0B1D35",
    "accent": "#F59E0B",
    "fonts": { "display": "Sora", "text": "Roboto", "mono": "Fira Code" },
    "fontSource": "google",
    "captions": "large",
    "border": "rounded",
    "backdrop": ["#1B2A8F", "#3D5AF1", "#B9A5FF"]
  }
}
```

`ink` is the dark colour (cards, caption box). `accent` is the one highlight colour.
`fonts.text` is best set to the font your product uses; `showcase explore` reports it.
`fontSource: "google"` links the families from Google Fonts at render time;
`"installed"` uses fonts already on the machine. Use fonts you have the right to use.
`captions` is `small`, `medium` or `large`.

**Font pairings.** `"fontPreset"` sets all three faces at once from eleven pairings
chosen for video (`modern`, `geometric`, `technical`, `minimal`, `bold`, `editorial`,
`elegant`, `friendly`, `playful`, `poster`, `corporate`). `fonts` then replaces single
faces. See [Fonts for video](fonts.md).

**Matching the product.** Once the product has been explored, its button colour is
used as `accent` and its font for captions and labels, for anything not set here.
`"match": false` turns that off.

**The rounded border.** Every video is set a little smaller on a soft backdrop, with
rounded corners and a shadow under it. `border` is `rounded` (the default) or `none`
(the picture fills the frame). `backdrop` is a preset name (`indigo`, `aurora`, `ocean`,
`forest`, `sunset`, `rose`, `graphite`, `paper`), `brand` (made from the accent
colour), three colours (from, to, glow), or the path of a picture. `backdropPattern`
is `glow`, `waves` or `plain`. The border is added when the file is built, so
`showcase make --remix` changes it without recording again, and `--no-border` leaves it
off for one run.

## Motion scenes

A scene is one of three kinds.

- An **app scene** has `run`: the real product is filmed while the scene clicks.
- A **clip scene** has `clip`: a finished video file is placed on the timeline. See
  [guide 13](guides/13-clip-scenes.md).
- A **motion scene** has `motion`: a full-screen graphic (a hook, a "how it works"
  card, an end card) that is rendered frame by frame, never filmed.

```ts
{
  id: 'hook',
  say: 'The shipment file came in again this morning.',
  motion: ({ theme, sayMs }) => hookCard(theme, { title: 'The file. Again.' }, sayMs),
}
```

A motion scene is not played. Every animation is paused, set to an exact time and
photographed, so the same scene gives the same frames on any machine, however slow.
Moving things are blurred as a camera would blur them (`motion.blur`), and a still
screen costs one frame, not thirty a second.

`motion.feel` sets how everything on a card arrives: `calm` (slow, soft landings),
`crisp` (quick, exact) or `lively` (springy, a little overshoot).

## Sound effects

```json
{ "sound": { "effects": "auto", "mood": "calm professional soft" } }
```

| `effects` | Meaning |
|---|---|
| `auto` | Pick a set from [soundcn](https://github.com/kapishdima/soundcn) that suits the mood and passes the measurements |
| `generated` | The kit's own soft sounds |
| `none` | No effects |
| `{ "click", "callout", "transition" }` | Name a soundcn sound for each role |

Nothing in the kit can hear, so a sound is never chosen by its description alone.

1. **Filter.** Only sounds the registry marks CC0, short enough for the role, and in a
   category that fits it. Some sets are blocked whatever the registry says: one
   game-derived set is marked CC0 there, but its own project says the sounds belong to
   the game's publisher.
2. **Measure.** Each candidate is downloaded and measured with FFmpeg: where its pitch
   is centred, how loud its peak is, how long it is.
3. **Gate.** A sound that plays many times must sit low: under 1500 Hz for a callout
   or a transition, under 3000 Hz for a click. A highlight sound once chosen by
   description was heard by reviewers as a squeak; it measured near 4700 Hz.
4. **Fall back.** If nothing passes for a role, the kit's own sound is used.

The choice is saved in `.showcase/sounds.json`, so every later render sounds the same and
needs no network. `out/<name>.credits.txt` records where each sound came from and why.
`showcase sounds --role callout --mood "calm"` lists candidates without rendering.

A person should still listen once before the video is shared.

## A hosted product

A hosted address may hold real data, so three things change.

**Banned names are required.** `safety.banned` must list the real names (customers,
people, tenants) that must never appear on screen, or `[]` if there are none. Every
render checks every screen and every card against the list.

**Read-only mode is on.** Every request that could change data (anything but GET, HEAD
and OPTIONS) is refused before it leaves the browser. A wrong click cannot create, edit
or delete anything. The checks list what was refused:

```
ok    read-only    refused 1 request(s) that could change data: POST https://app.example.com/api/orders
```

If the product reads with POST (a search, GraphQL), allow that address by name:

```json
{ "safety": { "banned": [], "allow": ["/api/search", "https://api.example.com/graphql*"] } }
```

Set `"readOnly": true` to use it on a local product too, or `false` to turn it off for
a hosted demo instance that is safe to change.

**Sign in once.** No password goes in the config.

```bash
showcase login
```

opens a visible browser. You sign in by hand, two-step codes included, and press Enter.
The session is saved to `.showcase/session.json`, which is kept out of git, and every render
starts from it. Add `"auth": { "session": ".showcase/session.json" }` to the config. The
file is a set of keys to the product: do not share it.

## The product map

```bash
showcase explore                        # the address in the config
showcase explore https://app.example.com --max-pages 12
```

opens the product, follows its own links (never a sign-out link, a download or a data
address), and writes `.showcase/explore/map.md` with a screenshot per screen: headings,
tables, and every button, tab and input with a selector ready to paste into a scene. It
also reports the product's own font and main button colour, for a matching `style`.
Explore runs in read-only mode.

## What is written where

| Path | What | Commit it? |
|---|---|---|
| `showcase.config.json` | The config | Yes |
| `video.ts` | The scenes | Yes |
| `script.txt` | Your narration, if you wrote one | Yes |
| `.showcase/` | Chosen sounds, saved session, product map, the plan | No |
| `out/` | Frames, takes, the videos, captions, credits | No |

## A complete example

`examples/tour/` renders one 30 second script in three shapes, with platform copies:

```bash
bun run showcase make examples/tour/showcase.config.json --draft
bun run showcase make examples/tour/showcase.config.json
```

## With no agent: showcase auto

`showcase auto` explores the product, has Claude write the scenes file through the
API, drafts until every scene runs, and renders. It needs `ANTHROPIC_API_KEY`. The
generated file is checked before it is run. See [guide 14](guides/14-showcase-auto.md).

## Not built yet

- sending screenshots to the model in `showcase auto` (it works from the text map)
- a container file (the layout is ready; see Architecture, Packaging)
- publishing to npm
