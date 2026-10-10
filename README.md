# Kwartz AI Video

Narrated product demo videos, rendered from a script.

You write a TypeScript file: one spoken line per scene, plus the clicks that scene
shows. One command films your real app in a browser, reads the narration in a local
voice, adds captions, pointer, zoom, callouts, music and soft sound effects, and writes
a 1080p MP4. Nobody records a screen and nobody opens a video editor. To change what is
said, edit a line and render again.

It was built so an AI coding agent such as Claude Code can be the video editor: the
repo ships a skill that tells the agent how a senior editor would cut the video, and
the checks it must pass.

```ts
import { defineVideo } from 'kwartz-ai-video'

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
kav render video.ts
```

> Version 1.0.0. Source: [github.com/kwartz-ai/kwartz-ai-video](https://github.com/kwartz-ai/kwartz-ai-video).
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
| **Checks** | After every render: picture, length, loudness, captions, holds, banned text, fonts. |
| **Remix** | Change the sound mix without recording again. |

Every tool in the pipeline is free: Playwright, FFmpeg, Kokoro.

## Requirements

- [Bun](https://bun.sh) 1.2 or later
- [FFmpeg](https://ffmpeg.org) on your PATH (with `ffprobe`)
- Python 3.10 to 3.13, only to install the voice (draft renders work without it)
- Developed and tested on Windows 11. macOS and Linux should work but are untested so far.

## Quick start

```bash
git clone https://github.com/kwartz-ai/kwartz-ai-video.git
cd kwartz-ai-video
bun install
bun run kav doctor        # what is installed, what is missing
bun run kav setup         # one-time: Chromium and the voice (about 350 MB)
bun run example           # renders examples/hello/out/hello.mp4
```

The example films a tiny made-up app that ships with the repo, so it needs nothing else
running. `bun run example:draft` does the same with no voice and needs no setup beyond
Chromium.

## Use it in your project

Clone the kit once (see Quick start), then link it into any project on the machine:

```bash
cd kwartz-ai-video && bun link            # once, in the kit
cd ../your-project && bun link kwartz-ai-video
```

Then, in your project:

```bash
bunx kav init                       # adds video.ts and the editor skill
bunx kav render video.ts --draft    # check the picture
bunx kav render video.ts            # voice, music, effects, checks
```

Add `out/` to your `.gitignore`: frames, takes and the videos are written there.

## Commands

| Command | Does |
|---|---|
| `kav render <video.ts>` | Record every scene and build `out/<name>.mp4`, then run the checks |
| `kav render <video.ts> --draft` | Picture only: no voice, music or effects |
| `kav remix <video.ts>` | Rebuild from the last take without recording |
| `kav verify <video.ts>` | Measure the last render again |
| `kav init [dir]` | Start a video in a project |
| `kav setup` | One-time: Chromium and the Kokoro voice |
| `kav doctor` | Show what is installed and what is missing |

Options for `render` and `remix`: `--music <file>`, `--no-music`, `--no-sfx`. For
`render` only: `--headed` (watch the browser), `--base <url>` (film another instance).

## With Claude Code

`kav init` copies the skill to `.claude/skills/kwartz-ai-video/`. Then, in Claude Code:

```
/kwartz-ai-video a 90 second walkthrough for new users, focus on the dashboard
```

The skill makes the agent work like an editor: script first, draft, render, verify with
numbers, and say plainly what it could not check. It cannot hear, so it always asks you
to listen once before the video is shared.

To install only the skill: `npx skills add kwartz-ai/kwartz-ai-video`.

## Docs

Start at the [docs index](docs/README.md), which lists these in reading order.

- **[User guide](docs/user-guide.md): make a video of your product, step by step, and how to use the skills**
- [Getting started](docs/getting-started.md): from an empty folder to a first video
- [Writing a video](docs/writing-a-video.md): the video file and everything a scene can do
- [Craft guide](docs/craft-guide.md): what a senior editor works on, with working numbers
- [How it works](docs/how-it-works.md): the pipeline, and why it is built this way
- [Architecture](docs/architecture.md): processes, modules, data flow, diagrams, where to extend
- [Tech stack](docs/tech-stack.md): every tool, its version, licence and role, and what was not chosen
- [Testing](docs/testing.md): how the 495 unit tests are organised, and how to add one
- [Release checklist](docs/release-checklist.md): how to know it works before you commit, push or release
- [Troubleshooting](docs/troubleshooting.md)
- [Research notes](docs/research.md): the tools and skills we compared before building this

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
