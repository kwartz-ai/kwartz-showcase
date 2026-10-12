# 12. Node and npm

**What it is.** The kit is written in TypeScript. Under Bun it runs as it is. For Node,
and for an npm package, it is compiled to plain JavaScript in `dist/`. One launcher,
`bin/showcase.js`, picks the right one.

## Install it from npm

The package is [`kwartz-showcase`](https://www.npmjs.com/package/kwartz-showcase). It
holds both the TypeScript and the compiled JavaScript, so it runs under Bun and under
Node 22.18 or later with no build.

```bash
npm install --save-dev kwartz-showcase     # or: bun add -d kwartz-showcase
npx showcase doctor                        # or: bunx showcase doctor
```

## Run it from the repo with Bun (no build)

```bash
git clone https://github.com/kwartz-ai/kwartz-showcase.git
cd kwartz-showcase
bun install
bun run showcase doctor
```

## Run it from the repo with Node

Node 22.18 or later.

```bash
bun install
bun run build                  # compiles src/ to dist/
node bin/showcase.js doctor
node bin/showcase.js make examples/tour/showcase.config.json --draft
```

## Check the package before publishing

```bash
bun run check                  # type-check and tests
bun run test:clean             # install, test, render and build from only what git holds
npm pack --dry-run             # lists exactly what would be published
```

The package holds `bin/`, `dist/`, `src/`, `python/`, `schema/`, `skills/`,
`templates/` and `docs/`, and one small example, `examples/motion/` (a config, its scenes
and two themes). It holds no tests and no media.

`npm publish` runs the build first (the `prepack` script). The first version published
was 2.3.0.

## Check it worked

- `node bin/showcase.js help` prints the command list.
- The draft render under Node ends with every line `ok`.

## What a container needs

No container file ships yet. An image needs:

| Need | Why |
|---|---|
| Node 22.18 or later, or Bun 1.2 or later | To run the kit |
| FFmpeg, with `ffprobe` | Encoding and measuring |
| Python 3.10 to 3.13 | The voice |
| Chromium and its system libraries | `npx playwright install --with-deps chromium` |

And two places to mount:

| Mount | Holds |
|---|---|
| `SHOWCASE_HOME` (default `~/.cache/kwartz-showcase`) | The voice model, narration clips, downloaded sounds. Keep it between runs |
| The project folder | `showcase.config.json`, `video.ts`, and the results in `out/` |

## Good to know

- Under Node, a project's own `video.ts` is read by stripping its types. Keep it to
  plain TypeScript: no `enum`, no `namespace`.
- `SHOWCASE_HOME` moves the cache anywhere, for example onto a shared volume.
