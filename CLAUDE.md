# Kwartz AI Video: project context

A kit that renders narrated product demo videos from a TypeScript script. Playwright
drives a real web app and captures frames, Kokoro (a local voice) reads the narration,
FFmpeg encodes. The command is `kav`. Open source under Apache-2.0.

## Layout

- `src/`: the kit. `cli.ts` (commands), `render.ts` (the runner), `stage.ts` (pointer,
  spotlight, camera, dissolves), `encode.ts` (blending, sound mix), `verify.ts` (checks).
  `docs/architecture.md` has the full map; `docs/tech-stack.md` the tools and versions.
- `examples/hello/`: a self-contained example on a made-up app in `site/`.
- `templates/starter/`: what `kav init` copies into a project.
- `skills/kwartz-ai-video/SKILL.md`: the editor skill that ships to users.
- `docs/`: user docs. `docs/research.md` records what was compared and learned.
- `tests/`: Vitest, one file per module. The browser, FFmpeg, the voice and the network
  are replaced by stand-ins, so the suite needs none of them. See `docs/testing.md`.

## Working here

- Bun and TypeScript, no build step. `bun run check` (type-check and tests) must pass.
- A change in behaviour comes with a test. After adding tests for something that
  matters, break the code on purpose once and confirm a test fails (`tests/mutate.py`
  does this for the known cases).
- After a change to the stage, encoder or sound: `bun run example:draft`, then
  `bun run example`, and look at frames from the result.
- You cannot hear the output. Say so, and ask a person to listen, whenever sound changed.
- Overlay HTML goes inside `style="..."` attributes: single quotes only in font stacks
  and other values. A double quote silently cuts the style short.
- Nothing is bundled: no media, no models. Keep it that way; see CONTRIBUTING.md.
- A behaviour change updates `docs/` and the skill in the same change. A new tool or a
  version bump updates `docs/tech-stack.md` and `NOTICE`.
- Do not commit, push or publish unless asked.
