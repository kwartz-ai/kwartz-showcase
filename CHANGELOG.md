# Changelog

## 2.0.0 (not released)

The project has a new name, **Kwartz Showcase**, and a video can now be described in
a config file and rendered in several shapes.

Renamed (breaking)
- The project: Kwartz AI Video is now Kwartz Showcase. Package `kwartz-showcase`.
- The command: `kav` is now `showcase`.
- The cache folder: `~/.cache/kwartz-showcase`, set with `SHOWCASE_HOME`. To keep the
  voice model you already downloaded, rename the old `~/.cache/kwartz-ai-video` folder.
- The skill: `/kwartz-showcase`.
- In a video file, import from `kwartz-showcase`.

Added
- `showcase.config.json` with a JSON schema: address (local or hosted), length, platforms,
  shapes, layout, audience, promise, closing line, script, style, voice, music, motion,
  sound and safety. Every problem in a config is reported at once.
- Commands: `showcase make`, `showcase plan`, `showcase explore`, `showcase login`, `showcase sounds`,
  `showcase init --config`.
- Length: 30, 60, 90 and 180 second structures or any length from 10 to 600 seconds,
  with a word budget and, when a render misses, advice in words.
- Shapes: landscape, vertical, square, portrait, classic, wide, tall and custom sizes.
  Fifteen platform names map to them; each platform gets a named copy.
- Layouts: `fill`, `framed` (a desktop page in a window with large captions below),
  `fit` and `responsive`, with safe areas for phone apps.
- Your own script as a text file, one paragraph per scene. The words are never changed.
- Style from the config: colours, fonts (Google Fonts or installed), caption size.
- Motion scenes (`motion:` in place of `run:`), rendered frame by frame with motion
  blur, and three feels: calm, crisp, lively.
- Sound effects chosen per project from soundcn: CC0 only, blocked sets refused, each
  candidate measured and refused if it sits too high. The choice is saved, and a
  credits file is written beside the video.
- A rounded border on every video: the picture set on a soft backdrop with rounded
  corners and a shadow. `border` in a video file, `style.border` and `style.backdrop`
  in a config, `--no-border` on the command line. A remix can change it.
- Hosted products: banned names are required, read-only mode refuses every request
  that could change data, and `showcase login` saves a sign-in outside git.
- `showcase explore`: a map of the product's screens with selectors, its font and colour.
- Twelve feature guides in `docs/guides/`.
- A build for Node and npm (`bun run build`), a launcher (`bin/showcase.js`), and package
  exports for both runtimes.

Changed
- The source is one folder per layer (`cli`, `brief`, `render`, `capture`, `graphics`,
  `audio`, `verify`, `setup`, `video`, `core`); tests mirror it under `tests/unit/`.
- The voice script moved to `python/kokoro_tts.py`.
- `showcase setup` installs the browser with the Playwright the kit uses, under Bun or Node.
- The examples import the kit by its package name.

Fixed
- A motion scene at 60 frames a second no longer gets one frame too many.

Tests: 797 unit tests, and a mutation run of 37 deliberate breaks, all caught.

Not built yet: `clip` scenes, applying the explored style automatically, `showcase auto`.

## 1.0.0 (2026-10-10)

First release, under the name Kwartz AI Video with the command `kav`, extracted from the pipeline that made the Kwartz OWL demo videos.
Source: https://github.com/kwartz-ai/kwartz-showcase

- `kav` command: `render`, `remix`, `verify`, `init`, `setup`, `doctor`
- Video files in TypeScript with `defineVideo`
- Stage: pointer, spotlight with callout labels, camera zoom, cross-dissolves that
  hide loading states, chapter cards
- Cards: hook, title, steps, end
- Local narration with Kokoro, cached per line
- Sound: effects from logged event times, generated music bed with ducking, fixed-gain
  loudness to -16 LUFS
- Captions: two balanced lines at most, burned in and as WebVTT
- Checks after every render: picture, length, loudness, captions, holds, banned text, fonts
- Skill for Claude Code: `skills/kwartz-ai-video`
- 495 unit tests (Vitest), a mutation run and a clean-copy test
- Docs: user guide, reference, craft guide, architecture, tech stack, testing and
  release checklist

Known limits: developed and tested on Windows 11 only; the voice speaks English;
caption timing inside one spoken line is estimated.
