# Kwartz Showcase

Narrated product demo videos, rendered from a script.

You write a TypeScript file: one spoken line per scene, plus the clicks that scene
shows. One command films your real app in a browser, reads the narration in a local
voice, adds captions, pointer, zoom, callouts, music and soft sound effects, and writes
a 1080p MP4. Nobody records a screen and nobody opens a video editor. To change what is
said, edit a line and render again.

Or describe the video in a small config file (what to film, how long, for which
platforms) and let the scenes be written for it: see
[A video from a config](docs/config-driven-video.md).

It was built so an AI coding agent such as Claude Code can be the video editor: the
repo ships a skill that tells the agent how a senior editor would cut the video, and
the checks it must pass.

```ts
import { defineVideo } from 'kwartz-showcase'

export default defineVideo({
  name: 'demo',
  baseUrl: 'http://localhost:3000',
  scenes: [
    {
      id: 'moved',
      say: 'One click keeps only the shipments whose date moved.',
      run: async ({ page, stage, untilSaid }) => {
        await stage.click(page.getByRole('button', { name: 'Moved only' }))
        await untilSaid(0.6)
        await stage.focus(page.locator('td.eta').first(), { label: 'Old date kept under the new one' })
        await untilSaid(1)
        await stage.release()
      },
    },
  ],
})
```

```
showcase render video.ts
```

> Version 2.2.1. Until 1.0.0 this project was called Kwartz AI Video and its command was `kav`. Source: [github.com/kwartz-ai/kwartz-showcase](https://github.com/kwartz-ai/kwartz-showcase).
> It is not on npm; install it from GitHub as shown below.

## What you get

| | |
|---|---|
| **Voice** | Kokoro, a free local voice model. No account, no quota, nothing uploaded. |
| **Sync without editing** | Narration is generated first, so each scene lasts exactly as long as its line. |
| **Captions** | Burned in, at most two balanced lines, plus a WebVTT file. |
| **Pointer** | Glides to each element and shows a click. |
| **Camera** | Zooms toward what is being discussed, then back. |
| **Callouts** | A spotlight that dims the rest, with a label that says why it matters. |
| **No blank screens** | Every change of screen is a cross-dissolve. Loading states are filmed and then dropped. |
| **Chapter cards** | Structure for longer videos, and a place to hide a slow load. |
| **Sound** | Soft click, callout and dissolve sounds placed from logged times; a music bed that drops under the voice; the mix levelled to -16 LUFS. |
| **Checks** | After every render: picture, length, loudness, captions, holds, banned text, fonts, and layout: anything cut off, off screen or covered by a caption fails the render and is named. |
| **Config** | `showcase.config.json`: address, length, platforms, style. A word budget for the length, and advice in words when a render misses it. |
| **Shapes** | Landscape, vertical, square, portrait and more from one script, with a named copy per platform (YouTube, Shorts, Reels, TikTok, LinkedIn and others). |
| **Motion scenes** | Hook, steps and end cards rendered frame by frame with motion blur: the same frames on any machine. |
| **Sounds per project** | Effects chosen from soundcn (CC0), measured, and refused when they would squeak. |
| **Safe on a live product** | Read-only mode refuses every request that could change data; sign in once with `showcase login`; banned names are required. |
| **Rounded border and backdrop** | The picture sits on a backdrop with rounded corners and a shadow. Eight backdrops, one made from your brand colour, your own colours or your own picture. |
| **Themes** | One word sets the whole look: `glass`, `clay`, `brutal`, `minimal`, `bento`, `liquid`, `soft`, `maximal`, `real`, `spatial`, `editorial`, `terminal`. Cards, captions, labels, fonts, colours, backdrop, movement and sound change together. |
| **Your own theme** | A small file in your project, from a built-in theme and your brand's colours. Make it by hand, or describe the brand and have it written. It is checked for readability before it can be used. |
| **Fonts chosen for video** | Eleven pairings from Google Fonts, each with its own title weight and tracking; any Google family by name, checked before the render. |
| **Matches your product** | After `showcase explore`, captions use the product's own font and the highlight uses its button colour. |
| **Clip scenes** | Put a finished video file on the timeline, with narration and captions. |
| **showcase auto** (beta) | With an API key, Claude writes the scenes and the kit drafts, fixes and renders. |
| **Remix** | Change the sound mix or the border without recording again. |

Every tool in the pipeline is free: Playwright, FFmpeg, Kokoro.

## Requirements

- [Bun](https://bun.sh) 1.2 or later (Node 22.18 or later also works, from a build)
- [FFmpeg](https://ffmpeg.org) on your PATH (with `ffprobe`)
- Python 3.10 to 3.13, only to install the voice (draft renders work without it)
- Developed and tested on Windows 11. macOS and Linux should work but are untested so far.

## Quick start

```bash
git clone https://github.com/kwartz-ai/kwartz-showcase.git
cd kwartz-showcase
bun install
bun run showcase doctor        # what is installed, what is missing
bun run showcase setup         # one-time: Chromium and the voice (about 350 MB)
bun run example           # renders examples/hello/out/hello.mp4
bun run example:tour      # one script in three shapes, from a config (draft)
bun run example:motion    # motion graphics alone: no product filmed (draft)
```

The example films a tiny made-up app that ships with the repo, so it needs nothing else
running. `bun run example:draft` does the same with no voice and needs no setup beyond
Chromium.

## Use it in your project

Clone the kit once (see Quick start), then link it into any project on the machine:

```bash
cd kwartz-showcase && bun link            # once, in the kit
cd ../your-project && bun link kwartz-showcase
```

Then, in your project:

```bash
bunx showcase init                       # adds video.ts and the editor skill
bunx showcase render video.ts --draft    # check the picture
bunx showcase render video.ts            # voice, music, effects, checks
```

Or, from a config:

```bash
bunx showcase init --config              # adds showcase.config.json, video.ts and the skill
bunx showcase explore                    # map the product's screens
bunx showcase plan                       # the work order: scenes, words, shapes
bunx showcase make --draft               # every shape, picture only
bunx showcase make                       # every shape, with sound and checks
```

Add `out/` and `.showcase/` to your `.gitignore`: frames, takes, the videos and working
files are written there.

## Commands

| Command | Does |
|---|---|
| `showcase render <video.ts>` | Record every scene and build `out/<name>.mp4`, then run the checks |
| `showcase render <video.ts> --draft` | Picture only: no voice, music or effects |
| `showcase remix <video.ts>` | Rebuild from the last take without recording |
| `showcase verify <video.ts>` | Measure the last render again |
| `showcase init [dir]` | Start a video in a project |
| `showcase init --config` | Start a config-driven video: `showcase.config.json`, `video.ts`, the skill |
| `showcase explore [config or address]` | Map the product's screens into `.showcase/explore/` |
| `showcase plan [config]` | Print the work order: scenes, word budget, shapes, safety |
| `showcase auto [config]` | Beta. Explore, have Claude write the scenes through the API, draft, render (needs `ANTHROPIC_API_KEY`) |
| `showcase make [config]` | Render every shape the config asks for, then check each (`--draft`, `--remix`) |
| `showcase login [config or address]` | Sign in once in a visible browser and save the session |
| `showcase themes` | List the themes; `showcase make --theme glass` renders in one |
| `showcase theme new <name>` | A theme of your own: `--from glass --accent "#FF5A1F"`, or `--prompt "the brand"` (beta) |
| `showcase theme check <name>`, `preview <name>` | Is it safe and readable; one picture of how it looks |
| `showcase sounds` | List sound candidates (`--role`, `--mood`) |
| `showcase setup` | One-time: Chromium and the Kokoro voice |
| `showcase doctor` | Show what is installed and what is missing |

Options for `render` and `remix`: `--music <file>`, `--no-music`, `--no-sfx`, `--no-border`. For
`render` only: `--headed` (watch the browser), `--base <url>` (film another instance).

## With Claude Code

`showcase init` copies the skill to `.claude/skills/kwartz-showcase/`. Then, in Claude Code:

```
/kwartz-showcase a 90 second walkthrough for new users, focus on the dashboard
```

The skill makes the agent work like an editor: script first, draft, render, verify with
numbers, and say plainly what it could not check. It cannot hear, so it always asks you
to listen once before the video is shared.

To install only the skill: `npx skills add kwartz-ai/kwartz-showcase`.

## Docs

Start at the [docs index](docs/README.md), which lists these in reading order.

- **[User guide](docs/user-guide.md): make a video of your product, step by step, and how to use the skills**
- [Getting started](docs/getting-started.md): from an empty folder to a first video
- [Writing a video](docs/writing-a-video.md): the video file and everything a scene can do
- **[Feature guides](docs/guides/README.md): one short guide per feature (length, platforms, script, style, border and backdrop, motion, clips, sounds, hosted products, explore, Claude Code, auto, Node)**
- [Themes](docs/themes.md): twelve looks, what each sets, and how to build graphics that follow them
- [Fonts for video](docs/fonts.md): which Google Fonts work on video and why, and the eleven pairings
- [A video from a config](docs/config-driven-video.md): length, platforms and shapes, style, your own script, sounds, a hosted product
- [Craft guide](docs/craft-guide.md): what a senior editor works on, with working numbers
- [How it works](docs/how-it-works.md): the pipeline, and why it is built this way
- [Architecture](docs/architecture.md): processes, modules, data flow, diagrams, where to extend
- [Tech stack](docs/tech-stack.md): every tool, its version, licence and role, and what was not chosen
- [Testing](docs/testing.md): how the 1085 unit tests are organised, and how to add one
- [Release checklist](docs/release-checklist.md): how to know it works before you commit, push or release
- [Troubleshooting](docs/troubleshooting.md)
- [Research notes](docs/research.md): the tools and skills we compared before building this

## Website

The landing page and docs site are in [`website/`](website/README.md): Next.js, in a clay
style, reading these same docs so the two cannot drift apart. It is not part of the
package. A three minute tour of it, made with the kit, is in `examples/website-tour/`.

## Background

The kit grew out of a demo video for Kwartz OWL, a supplier-side order tracking portal.
Three cuts were made in two days, each one after feedback: a first walkthrough, a
second with zoom, callouts and sound, and a third that fixed a squeaky highlight sound,
weak typography and white flashes between screens. Each fix became a rule in the kit
or in the skill, so the next video starts from there.

The research that led to it is kept in this repo as a page,
**[OWL Video Plan](docs/research/owl-video-plan.html)**, and as
[docs/research.md](docs/research.md). The page is plain HTML: download it, or clone the
repo, and open it in a browser.

## Limits to know

- The voice speaks English. Other languages need another Kokoro voice and are untested.
- Caption timing inside one spoken line is estimated from text length; the voice model
  does not report word times.
- The built-in music is generated (soft chords) and plain. Pass `--music` for a real
  track you have the rights to.
- Fonts in the default theme load from Google Fonts at render time, so a render needs
  the internet unless your theme uses installed fonts.
- The checks measure the file. They do not watch or listen to it for you.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[code of conduct](CODE_OF_CONDUCT.md). To report a security problem, see
[SECURITY.md](SECURITY.md).

## Licence

[Apache-2.0](LICENSE). Third-party tools and media are listed in [NOTICE](NOTICE).
