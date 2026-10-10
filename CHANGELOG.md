# Changelog

## 2.1.0 (not released)

Themes: one word sets the whole look of a video.

Added
- Twelve themes, set with `"theme"` in the config: `minimal`, `glass`, `liquid`,
  `soft`, `clay`, `brutal`, `maximal`, `bento`, `real`, `spatial`, `editorial`,
  `terminal`. Each sets how cards, chips, captions, callout labels and the highlight
  ring are drawn, the font pairing, the colours, the backdrop and corner of the
  picture, how things arrive, and the mood of the sounds. The design terms
  (`glassmorphism`, `neumorphism`, `skeuomorphism` and so on) work as names too.
- Six ways of arriving: rise, float, pop, cut, depth and typed text.
- `showcase themes`, `showcase make --theme <name>` (renders into files named after
  the theme, so looks can be compared), and `showcase init --config --theme <name>`.
- A skill for each theme (`skills/showcase-theme-<name>`), on how a designer uses that
  style in a video. The work order points at it.
- `theme.look` for graphics of your own, with `arrive`, `CARD_KEYS` and `scaleCss`.
  The motion example is built from it and renders in every theme.
- `docs/themes.md` and guide 15.

Changed
- Cards, captions, labels and the highlight ring take their surfaces from the theme.
  The kit's own look is unchanged and is now called `classic`.
- On a tall frame the band behind the captions follows the theme.
- The "how it works" card uses a grid of two on a narrow frame.

Tests: 1013 unit tests, and a mutation run of 55 deliberate breaks.

Rules checked by tests for every theme: caption contrast of at least 7 to 1, text on
a solid ground at least 7 to 1, the highlight at least 3 to 1.

## 2.0.0 (2026-10-10)

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
- Fonts chosen for video: 60 Google Fonts families checked with their real weights,
  eleven pairings (`style.fontPreset`), title weight and tracking per face, and a
  check before every render that Google really gave every family. See `docs/fonts.md`.
- Backdrops: eight presets, `brand` (made from the accent colour), your own picture,
  and three patterns (`glow`, `waves`, `plain`).
- The product's own look: after `showcase explore`, its button colour and font are
  used for anything the config leaves unset (`style.match`).
- Clip scenes: `clip:` places a finished video file on the timeline, trimmed, fitted
  or covering, with or without its own sound, with narration and captions.
- `showcase auto` (beta): with `ANTHROPIC_API_KEY`, Claude writes the scenes file through
  the API; the file is checked before it runs, a failed draft goes back for a fix,
  and the length is fitted in words. Unit-tested, and the request was sent to the
  live API once with an invalid key (answered 401, as expected). It has not yet been
  run end to end with a real key.
- A layout check after every render. Each motion scene is measured at several
  moments, in every shape: text or a box that reaches outside its area, into the
  caption band, or under the caption fails the render and is named, with the scene
  and the number of pixels. In app scenes a highlight or label that would leave the
  screen, or sit under the caption, is reported the same way. A caption too tall for
  its band is reported too. `showcase auto` sends these back for a fix.
- Motion-only videos: `"motionOnly": true` in place of an address, for a video of
  graphics and clips alone. `examples/motion/` is one, in landscape and vertical.
- Fourteen feature guides in `docs/guides/`.
- A build for Node and npm (`bun run build`), a launcher (`bin/showcase.js`), and package
  exports for both runtimes.

Changed
- The source is one folder per layer (`cli`, `brief`, `render`, `capture`, `graphics`,
  `audio`, `verify`, `setup`, `video`, `core`); tests mirror it under `tests/unit/`.
- The voice script moved to `python/kokoro_tts.py`.
- `showcase setup` installs the browser with the Playwright the kit uses, under Bun or Node.
- The examples import the kit by its package name.

Fixed
- On a framed video, captions under a light motion scene were white on a light
  ground and could not be read. The caption band now stays dark.
- A caption that changed during a blurred frame showed both texts for one frame.
- A long title on a tall frame ran to the edges of a card; it now wraps.
- A motion scene at 60 frames a second no longer gets one frame too many.

Tests: 962 unit tests, and a mutation run of 50 deliberate breaks, all caught.

Known limits: built and tested on Windows 11 only; `showcase auto` is beta and has not
run end to end with a real key; the `fit` and `responsive` layouts have unit tests but
no real render yet; the layout check measures positions, not taste, and cannot see
inside a clip.

Not built yet: screenshots in `showcase auto`, a container file, an npm release.

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
- 962 unit tests (Vitest), a mutation run and a clean-copy test
- Docs: user guide, reference, craft guide, architecture, tech stack, testing and
  release checklist

Known limits: developed and tested on Windows 11 only; the voice speaks English;
caption timing inside one spoken line is estimated.
