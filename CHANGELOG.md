# Changelog

## 2.3.1 (2026-10-12)

The kit is on npm, and the docs say so.

Changed
- Installing is one line: `bun add -d kwartz-showcase` or
  `npm install --save-dev kwartz-showcase`. The README, the getting started page, the
  user guide, guide 12, the website's "Your first video" guide and the Theme Studio's
  prompt no longer tell you to clone the repo and link it.
- The requirements say Bun 1.2 or later, or Node 22.18 or later: the package holds the
  compiled JavaScript, so Node needs no build.
- The examples are in the repo, not in the package. The README and the user guide say
  how to get them.

Checked: the package was installed from the registry in fresh folders with npm and with
Bun, and a video was rendered from each kind of install. 2.3.0 was the first version
published to npm.

## 2.3.0 (2026-10-12)

A theme studio on the website: make a theme in the browser, and hand it to Claude.

Added
- Theme Studio, at `/studio` on the website. Pick one of the looks, a brand colour, a
  font pairing, the movement and the corners, and see the cards on a video frame as
  they change. The page runs the kit's own theme rules and draws with the kit's own
  card code, bundled for the browser, so a theme it hands over is one a render accepts.
  A theme that fails a rule shows the kit's own message and cannot be copied.
- Three things to copy from it: the theme file, the config, and one prompt for Claude
  Code that carries both, names the skills, and says what to make. Two kinds of video:
  one of your website, or a presentation with no product filmed.
- "Surprise me": a whole theme by chance, from combinations that suit each other, and
  only one the rules accept. A backdrop can be drawn in shades of the brand colour.
- The editor skill has a section for a video with no product (`"motionOnly": true`):
  what to skip, how to count scenes, and how to end with no address to link to.

Changed
- The rules of a theme file moved to `src/brief/theme-rules.ts`, with the motion feels
  and backdrops in `src/brief/looks.ts` and `esc` in `src/core/html.ts`. None of them
  reads the disk or starts a process, so a web page can run them. Everything is still
  exported from where it was. A test fails if these files start to need the disk.
  Nothing about how a video renders changed.
- `presetTheme`: a theme preset as the theme the cards are drawn with. A test holds it
  to what a video that names the theme gets, for all twelve themes.

Known limits: the studio shows a landscape frame only. Its "on your product" scene is a
stand-in screen with the theme's real highlight, label and caption styles. The prompt
was tested by giving it to a fresh agent in an empty folder, for a website video and for
a presentation; each produced a voiced video that passed every check. For a
presentation, `showcase plan` and `showcase init` still print lines about a product:
the prompt and the skill say which to skip.

## 2.2.2 (2026-10-11)

A small change to the website. Nothing in the kit's own code changed.

Added
- The website's footer says "Powered by Kwartz AI", with the Kwartz logo, and links to
  kwartz.ai.

## 2.2.1 (2026-10-11)

A website for the kit. Nothing in the kit's own code changed.

Added
- `website/`: a landing page and docs site in a clay style (Next.js, TypeScript,
  Tailwind CSS, shadcn/ui, lucide-react, Motion). It reads every doc and the changelog
  from this repo at build time, and the themes, font pairings and version from the
  kit's source, so the site cannot say something different from the product. It has a
  ten step "Your first video" guide, a page for each of the twelve themes with its
  video in two shapes, search, light and dark, a sitemap and structured data. It is not
  part of the package.
- `examples/website-tour/`: a tour of the website of a little over three minutes, in 21
  scenes, filmed on the site while it ran locally.
- A second example theme, `lavender`: a light clay theme made to match the website
  (`examples/website-tour/themes/lavender.json`, and beside `harbor` in
  `examples/motion/themes/`).
- CI builds the website, and fails when its copy of the theme facts is out of date.

Known limits: the website has been built and looked at on one machine and is not
deployed yet. Its address is a setting (`NEXT_PUBLIC_SITE_URL`). An unknown address
shows the "not here" page but answers with status 200.

## 2.2.0 (2026-10-11)

A theme of your own, for your brand.

Added
- Theme files: `themes/<name>.json` beside the config, each starting from a built-in
  theme (`extends`) and changing colours, fonts, movement, backdrop, corner, sound mood,
  or how single surfaces are drawn (`look`). `"theme": "<name>"` uses it.
- `showcase theme new <name>`: by hand with `--from`, `--accent` and `--ink`, or from a
  description with `--prompt` (beta: through the Claude API, with a key).
- `showcase theme check <name>` and `showcase theme preview <name>`: one picture of the
  cards, captions, highlight ring and label in a wide frame and a tall one, in seconds.
- A skill, `showcase-theme-new`, for making a theme from a brand description in Claude
  Code with no key. `showcase init --config` copies it into the project.
- The same checks as the built-in themes, for every theme file, every time it is used:
  contrast of captions, text and the highlight, and CSS that may only describe a
  surface (it may not move or resize a box, or load anything).
- A schema for theme files, an example theme, and guide 16.

Fixed
- Text on the panels of the `clay` and `maximal` themes was too close to its ground
  (2.3 and 3.4 to 1). A new rule, at least 4.5 to 1 on a solid panel, caught both.

Known limits: `showcase theme new --prompt` is beta. It is unit-tested and uses the
same request code as the rest of the kit, but has not been run end to end with a real
key. The by-hand way and the Claude Code skill were both tested with real videos. The
checks keep a theme readable and safe; they cannot tell whether it is beautiful.

Tests: 1085 unit tests, and a mutation run of 60 deliberate breaks.

## 2.1.1 (2026-10-10)

Corrects the release itself. The code is the same as 2.1.0.

Fixed
- `package.json` said version 2.0.0 in the 2.1.0 release. It now says 2.1.1.
- The changelog said 2.1.0 was not released, and a line in the README said the same.

## 2.1.0 (2026-10-10)

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
