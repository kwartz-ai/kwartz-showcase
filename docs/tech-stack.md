# Tech stack

Every technology the kit uses, what it does here, and why it was chosen. Versions are
the ones the kit was built and tested with in October 2026, on Windows 11.

## At a glance

| Layer | Technology | Version | Licence | Role |
|---|---|---|---|---|
| Runtime | [Bun](https://bun.sh) | 1.4.2 | MIT | Runs the TypeScript, installs packages, runs tests |
| Language | [TypeScript](https://www.typescriptlang.org) | 5.9 | Apache-2.0 | The kit and the video files |
| Browser automation | [Playwright](https://playwright.dev) | 1.64.0 | Apache-2.0 | Drives the app, captures frames, places overlays |
| Browser | Chromium (Playwright's build) | 156 | BSD-style | The app runs and is painted here |
| Voice model | [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | v1.0 | Apache-2.0 | Text to speech |
| Voice runtime | [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) | 0.6.1 | MIT | Runs Kokoro on the CPU |
| | ONNX Runtime | 1.31 | MIT | Inference engine under kokoro-onnx |
| | espeak-ng (via espeakng-loader) | 0.2.4 | GPL-3.0 | Turns text into phonemes; bundled by the loader |
| | Python | 3.10 to 3.13 | PSF | Hosts the voice, in its own environment |
| Media | [FFmpeg](https://ffmpeg.org) and ffprobe | 8.1 | LGPL-2.1+, or GPL with libx264 | Encoding, mixing, measuring, generating sounds |
| Video codec | H.264 through libx264 | | GPL-2.0+ | The picture |
| Audio codec | AAC | | part of FFmpeg | The sound |
| Captions | WebVTT | | W3C standard | The caption file |
| Motion | HTML, CSS keyframes | | web standards | Overlays and cards |
| Sound effects | [soundcn](https://github.com/kapishdima/soundcn) | | CC0 sounds only | The click |
| Fonts | Inter, Plus Jakarta Sans, JetBrains Mono | | SIL OFL 1.1 | The default theme, from Google Fonts |
| Tests | [Vitest](https://vitest.dev) | 5.0 | MIT | Unit tests, mocks, coverage (V8) |
| CI | GitHub Actions, `oven-sh/setup-bun` | v2 | | Type-check and tests on each push |
| Agent | Claude Code skill format (`SKILL.md`) | | | The editor's brief |

The kit's own code is Apache-2.0. It bundles none of the above: each is installed on
your machine or downloaded into the cache. See [NOTICE](../NOTICE).

## Runtime: Bun

**What it does.** Runs the TypeScript in `src/` directly, with no compile step. Installs
dependencies (`bun install`, `bun.lock`). Provides `fetch` for the two downloads the
kit makes. The tests run on Vitest, started with `bun run test`.

**Why.** A video file is TypeScript, and with Bun the user's `video.ts` just runs. The
package exports its source to Bun, so a clone needs no build.

**Node.** The kit also runs under Node 22.18 or later, from `dist/`, which
`bun run build` compiles with the TypeScript compiler (no bundler). The launcher
`bin/showcase.js` picks `src/` under Bun and `dist/` under Node. This is what an npm
install uses. Node reads a project's own `video.ts` by stripping its types.

**What to know.**
- The kit uses only Node-compatible APIs (`node:fs`, `node:child_process`,
  `node:http`), not Bun-only ones, so it is not locked to Bun.
- Playwright under Bun on Windows had launch failures in older Bun versions. On 1.4.2
  it launched and captured correctly in 6 of 7 trial runs. The one failure was a cold
  first start that delivered no frames; the kit reports that with a "render again"
  message instead of writing an empty video.
- The kit installs from npm. To use a local clone from another project, while changing
  the kit, use `bun link`: installing the folder with `file:` failed with a permissions
  error on Windows.

## Language: TypeScript

Strict mode, with `noUncheckedIndexedAccess`. `defineVideo` exists only to give a video
file type checking and editor completion: a wrong option name or a missing `say` is an
error in the editor, not a failure four minutes into a render. `tsc --noEmit` is the
type-check; nothing is emitted.

## Browser automation: Playwright

**What it does.**

| Playwright feature | Used for |
|---|---|
| `chromium.launch`, `newContext({ viewport })` | A 1920x1080 window |
| `page.addInitScript` | Zoom the page and link fonts before the app paints |
| Locators, `waitFor`, `click` | The steps of every scene |
| `page.screencast.start({ onFrame })` | A JPEG and a timestamp on every repaint |
| `page.screencast.showOverlay(html)` | Captions, pointer, spotlight, labels, cards |
| `page.evaluate` | The camera's CSS transform; reading page text; awaiting fonts |
| `page.screenshot` | `failed.png` when a render stops |

**Why.** It is the one tool that drives the app, captures the frames and draws on top
of them. The screencast API with per-frame callbacks arrived in Playwright 1.59; that
is the minimum version.

**What was not used, and why.**

| Feature | Reason |
|---|---|
| `recordVideo` | Low-bitrate WebM, visibly soft for a product video |
| The built-in pointer (`showActions`) | It is placed in window pixels inside the zoomed page, so it lands off target |
| `showChapter` | Did not appear in our one test of it, and the kit's own cards give control over type and timing |

## Voice: Kokoro

**What it does.** `audio/tts.ts` sends the lines that are not yet cached to
`python/kokoro_tts.py` as JSON on standard input. The script loads the model once and
writes a 24 kHz mono WAV per line.

**Why.** It is free, runs on a laptop CPU in about three seconds per line, needs no
account and uploads nothing. A render never fails because of someone else's quota. The
voice quality is good enough that the first reviewers commented on the sound effects
and not on the voice.

**Why Python, in a TypeScript project.** kokoro-onnx is a Python package. Rather than
reimplement its text-to-phoneme pipeline, the kit keeps a 25-line script and runs it in
its own virtual environment (`~/.cache/kwartz-showcase/kokoro-venv`), created by
`showcase setup`. Python is needed for the voice and nothing else; draft renders work
without it.

**Model files.** `kokoro-v1.0.onnx` (about 325 MB) and `voices-v1.0.bin` (about 28 MB),
from the kokoro-onnx GitHub release. Downloaded once.

## Media: FFmpeg

One program does all of these jobs.

| Job | How |
|---|---|
| Measure a clip's length | `ffprobe -show_entries format=duration` |
| Generate the callout tap | `aevalsrc`: two decaying sines at 210 and 420 Hz |
| Generate the dissolve breath | `anoisesrc` (pink noise), band-passed 140 to 650 Hz, faded in and out |
| Generate the music bed | 40 `sine` sources as four slow chords, mixed, low-passed, looped without a seam |
| Blend a dissolve | `xfade=transition=fade` between two still frames |
| Build the mix | `adelay` per clip, `amix`, `sidechaincompress` for ducking |
| Measure loudness | `loudnorm=print_format=json` (reading only its measurement) |
| Encode | `concat` demuxer with a duration per frame, `libx264 -crf 18`, AAC at 160 kbit/s, `+faststart` |

**Why frames as a list with durations.** The browser paints when something changes, not
30 times a second. Giving FFmpeg each frame and how long it lasts keeps real time
exactly, and a still screen costs one frame instead of thirty a second.

**Output.** 1920x1080, 30 fps, H.264 (yuv420p, plays everywhere), AAC 48 kHz, about
1 Mbit/s for a typical screen video (a three-minute video is about 28 MB).

## Motion: HTML and CSS

Every overlay and card is a string of HTML with inline styles and CSS keyframes. There
is no animation library in the kit.

**Why.** An agent writes HTML and CSS well, the result needs no bundling, and it is
captured by the same screencast as the app. Two easing curves cover everything:
`cubic-bezier(.2,.8,.2,1)` for arrivals and `cubic-bezier(.45,0,.2,1)` for moves.

For a card with a complex timeline, a video file can load an animation library such as
GSAP into its own HTML. The kit does not need it and does not depend on it.

## What the kit depends on

```
dependencies
  playwright 1.64.0        the only runtime dependency

devDependencies
  typescript ^5.6          type-check
  @types/bun               types for Bun's APIs
  vitest ^5.0              the test runner
  @vitest/coverage-v8      coverage reports
```

One runtime dependency is on purpose. FFmpeg, Python and the voice are programs on the
machine, checked by `showcase doctor`, not packages.

## Considered and not chosen

| Option | Why not |
|---|---|
| Remotion (React to video) | Needs a paid company licence above a small team size. It also renders components, not a real running app. |
| HyperFrames (HTML to video) | A good tool for fully animated clips, but it does not drive an existing app. |
| A cloud voice (ElevenLabs, OpenAI, Gemini) | Cost, accounts, rate limits, and narration text leaving the machine. |
| Recording the screen (OBS, Screen Studio) | Needs a visible desktop and a person; not repeatable from a script. |
| Puppeteer | The same Chromium capture, but none of the overlay features. |
| Node.js with a build step | Works, but adds a compile step between editing a video file and rendering it. |
| A YAML or JSON scene format | Scenes need real waits and branches; code with types is clearer and safer. |
| A dynamic loudness filter | It is automatic gain: it raises the music in every pause. One measured, fixed gain is used. |

## System requirements

| | |
|---|---|
| OS | Windows 11 (tested). macOS and Linux should work and are untested. |
| CPU and memory | Any recent laptop. The voice uses the CPU; no GPU is needed. |
| Disk | About 350 MB for the voice model, about 400 MB for Chromium, and roughly 150 to 200 MB of frames per minute of video in `out/` |
| Network | For setup; for fonts with the default theme; once for the click sound |
| Time | A three-minute video renders in about four minutes |
