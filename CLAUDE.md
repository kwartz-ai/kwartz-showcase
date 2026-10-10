# Kwartz Showcase: project context

A kit that renders narrated product demo videos from a TypeScript script. Playwright
drives a real web app and captures frames, Kokoro (a local voice) reads the narration,
FFmpeg encodes. The command is `showcase`. Open source under Apache-2.0.

## Layout

- `bin/showcase.js`: the launcher. Runs `src/` under Bun, `dist/` under Node.
- `src/`: the kit, one folder per layer: `cli/` (commands), `brief/` (the config:
  checks, presets, plan, script, work order), `render/` (runner, encoder, captions,
  framed layouts, make), `capture/` (recorder, stage, read-only mode, session, explore),
  `graphics/` (cards, motion scenes), `audio/` (voice, effects, soundcn palette),
  `verify/`, `setup/`, `video/` (defineVideo), `core/` (types, theme, paths, util),
  `auto/` (the only code that calls an AI API; nothing else may depend on it).
  `docs/architecture.md` has the full map; `docs/tech-stack.md` the tools and versions.
- `python/kokoro_tts.py`: the voice script. `schema/`: the JSON schema for the config.
- `examples/hello/`: a hand-written video on a made-up app in `site/`.
  `examples/tour/`: the same app from a config, in three shapes.
  `examples/motion/`: motion graphics alone, no product filmed.
- `templates/starter/` and `templates/brief/`: what `showcase init` copies into a project.
- `skills/kwartz-showcase/SKILL.md`: the editor skill that ships to users.
  `skills/showcase-theme-<name>/SKILL.md`: one per theme, on how that style is used.
  `skills/showcase-theme-new/SKILL.md`: how to make a theme for a brand.
- `docs/`: user docs. `docs/research.md` records what was compared and learned.
- `tests/unit/<layer>/`: Vitest. The browser, FFmpeg, the voice and the network are
  replaced by stand-ins, so the suite needs none of them. See `docs/testing.md`.

## Working here

- Bun and TypeScript. No build step to work here; `bun run build` makes `dist/` for
  Node and npm. `bun run check` (type-check and tests) must pass.
- Files that ship but are not TypeScript live at the package root and are found with
  `asset()` from `src/core/paths.ts`, never with a path relative to a source file.
- A theme is one entry in `src/brief/themes.ts` plus its skill. Surfaces are CSS strings
  in a `look`; cards and overlays must read them from `theme.look` and never hardcode a
  colour. After changing a look, render `examples/motion` with `--theme <name>` in both
  shapes and look at the frames.
- A user's theme file is untrusted input: its CSS goes into a page the kit renders.
  `unsafeCss` in `src/brief/custom-theme.ts` is the gate. Never place a value from a
  theme file in HTML without it having passed `checkThemeFile`.
- Font families and their weights live only in `src/brief/fonts.ts`. Add a family only
  after requesting it from Google Fonts with those weights, and update the date.
- Platform sizes and safe areas live only in `src/brief/presets.ts`. A new config
  setting changes the type, `validateBrief`, the schema and the docs together.
- A change in behaviour comes with a test. After adding tests for something that
  matters, break the code on purpose once and confirm a test fails (`tests/mutate.py`
  does this for the known cases).
- After a change to the stage, encoder or sound: `bun run example:draft`, then
  `bun run example`, and look at frames from the result. After a change to layouts,
  motion scenes or the config: `bun run example:tour`, and look at the vertical video.
- You cannot hear the output. Say so, and ask a person to listen, whenever sound changed.
- Overlay HTML goes inside `style="..."` attributes: single quotes only in font stacks
  and other values. A double quote silently cuts the style short.
- Nothing is bundled: no media, no models. Keep it that way; see CONTRIBUTING.md.
- A behaviour change updates `docs/` and the skill in the same change. A new tool or a
  version bump updates `docs/tech-stack.md` and `NOTICE`.
- Do not commit, push or publish unless asked.
