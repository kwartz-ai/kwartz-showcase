# Testing

The kit has 1100 unit tests, run with [Vitest](https://vitest.dev). They take about ten
seconds and need no browser, no FFmpeg, no voice model and no network.

```bash
bun run test            # run everything once
bun run test:watch      # re-run on every save
bun run coverage        # with a coverage report (also written to coverage/index.html)
bun run check           # type-check, then the tests: what CI runs
bun run test:mutate     # break the code on purpose and confirm the tests notice
bun run test:clean      # install, check and render from exactly what git holds
```

## What is tested

The tests live in `tests/unit/`, in the same folders as the source: one folder per
layer.

| File | Tests | Covers |
|---|---|---|
| `audio/palette.test.ts` | 43 | Choosing sounds from soundcn: licence, blocked sets, mood, the measurements and the gate, the saved choice, credits |
| `audio/sound-voice.test.ts` | 43 | Effects, the music bed, narration and its cache |
| `auto/auto.test.ts` | 44 | `showcase auto`: reading the reply, the checks on a generated file, the API call, the draft and fix loop |
| `brief/custom-theme.test.ts` | 71 | Themes of your own: safe CSS, the shape of a theme file, the readability rules, finding and using one, a theme from a description, the commands |
| `brief/theme-rules.test.ts` | 15 | The theme rules and the cards reach no disk or process code, so a web page can run them; a theme through the plain path gives the same cards as a video |
| `brief/fonts-style.test.ts` | 52 | The font table and pairings, the stylesheet address and its check, the product's own look, backdrops |
| `graphics/clip.test.ts` | 28 | Clip scenes: trimming, fitting, length, captions, sound; backdrop patterns and pictures |
| `brief/brief.test.ts` | 38 | The config: what passes, every refusal, local or hosted, loading the file |
| `brief/plan-script.test.ts` | 33 | Length to scenes and words, advice when a render misses, reading and placing a person's script |
| `brief/presets-resolve.test.ts` | 57 | Shapes, platforms, safe areas, every layout, the theme from the config, one video per shape, the work order |
| `brief/themes.test.ts` | 51 | Themes: every look complete and safe as CSS, contrast rules, names, what a theme sets, cards in each theme, the skills, the commands |
| `capture/recorder.test.ts` | 19 | Page zoom, fonts, frame capture and timing |
| `capture/safety.test.ts` | 23 | Read-only mode, the saved session, which pages explore visits, the product map |
| `capture/serve.test.ts` | 16 | The static server: types, single-page routes, 404, staying inside its folder |
| `capture/stage.test.ts` | 80 | Pointer, click, dissolve, cut, captions, spotlight, camera, cards, chapters |
| `capture/timeline.test.ts` | 15 | Pausing the recorder for a motion scene, inserted frames, overlays in other shapes |
| `cli/cli.test.ts` | 22 | The `showcase` command: help, exit codes, messages, `init` |
| `cli/config.test.ts` | 23 | Argument parsing; `init --config`, `plan`, `make`, `explore` and `login` up to the point a browser opens |
| `core/theme-util.test.ts` | 29 | Theme merging, HTML escaping, starting processes, the cache folder |
| `graphics/cards.test.ts` | 32 | Every card: content, timing with the voice, theme, escaping, intact styles |
| `graphics/motion-only.test.ts` | 18 | A video with no product: the config, the blank page, the caption band, and the motion example in every shape |
| `graphics/motion-compose.test.ts` | 31 | Which frames a motion scene needs, its document, framed frames, the caption track |
| `render/border.test.ts` | 28 | The rounded border: where the picture sits, the mask and backdrop, the encoder inputs, turning it off |
| `render/captions.test.ts` | 34 | Splitting lines into captions, timing them, WebVTT |
| `render/encode.test.ts` | 45 | Planning and blending dissolves, the frame list, the sound graph, loudness gain |
| `render/render.test.ts` | 58 | The order of work, what scenes receive, the take, drafts, failures, remix |
| `render/shapes.test.ts` | 12 | Encoding at canvas size, the caption overlay, checks for framed videos and read-only mode |
| `setup/setup.test.ts` | 23 | `showcase doctor` and `showcase setup` on machines with and without each tool |
| `verify/layout.test.ts` | 23 | The layout check: graphics cut off or covered in a motion scene, highlights and labels off screen, the check in the report |
| `verify/verify.test.ts` | 56 | Every check, passing and failing, at its limits |
| `video/define.test.ts` | 38 | Defaults, overrides, the mistakes refused early, loading a video file |

Coverage is about 92% of statements. `src/cli/` shows as 0% in the report because
its tests start a real `bun` process, which the coverage tool cannot see into; it is
covered by `cli.test.ts` and `config.test.ts`.

## What is not tested here

These tests check what the kit asks for, not what the tools do with it:

- that Chromium paints an overlay where the stage placed it
- that FFmpeg produces a playable file from the command line it was given
- that Kokoro reads a line well
- how any of it looks or sounds

For those, render the example (`bun run example`) and look at the result. A person has
to listen to it; nothing automatic can. The [release checklist](release-checklist.md)
lists every level of real-use testing, from the example to a trial on a real product.

## How the outside world is replaced

| Real thing | In tests | Where |
|---|---|---|
| The Playwright page | `fakePage()`: records overlays and page scripts, hands out locators with a chosen box | `tests/helpers.ts` |
| FFmpeg, ffprobe, Python | `run` from `src/core/util.ts` is mocked; tests read the command lines it was given | `vi.mock('../../../src/core/util.ts', ...)` |
| The browser launch | `playwright` is mocked to return the fake page | `render.test.ts` |
| Time | Vitest fake timers; `settle()` runs a stage call to its end | `tests/helpers.ts` |
| The cache folder | `SHOWCASE_HOME` points at a temporary folder | `vi.stubEnv` |
| The network | `fetch` is stubbed | `vi.stubGlobal` |
| The document inside the page | A small stand-in object; the script sent to the page is run against it | `stage.test.ts`, `recorder.test.ts` |

Two things are real on purpose: `serve.test.ts` starts the real server on a free local
port, and `cli.test.ts` and `config.test.ts` start a real `bun` process. Both are fast and both would be
easy to fake wrongly.

### Mocking `run`

Every program the kit starts goes through one function, so one mock replaces them all:

```ts
const run = vi.fn<(cmd: string, args: string[]) => Promise<string>>()
vi.mock('../../../src/core/util.ts', async (original) => ({
  ...(await original<typeof import('../../../src/core/util.ts')>()),
  run,
}))
const { encode } = await import('../../../src/render/encode.ts')     // import after the mock
```

A test then makes `run` answer like the tool would, and asserts on the arguments:

```ts
it('applies one fixed gain that brings the mix to the target', async () => {
  fakeFfmpeg(-22, -6)                                    // measured loudness, peak
  await encode(input({ clips: [{ file: 'a.wav', at: 0 }] }))
  expect(filterOf(call(2))).toContain('volume=6.00dB,alimiter=limit=0.84:level=false')
})
```

### Testing the stage

The stage's waits are real `setTimeout` calls, so stage tests use fake timers and a
clock derived from them. Times are then exact:

```ts
it('logs a click sound for the moment the pointer arrives', async () => {
  const { stage } = make()
  await vi.advanceTimersByTimeAsync(1000)
  await settle(stage.click(fakeLocator()))
  expect(stage.events).toEqual([{ t: 1550, kind: 'click' }])      // 1000 + the 550 ms glide
})
```

Positions are asserted in layout pixels, which is where the zoom arithmetic lives:
an element at window `(1000, 500)` sized `200x100` has its centre at `(1100, 550)`,
and at zoom 1.25 the pointer must land on `(880, 440)`.

## Tests that guard a past mistake

Some tests exist because of a specific bug. Each has a comment saying so.

| Test | The mistake it guards |
|---|---|
| "has no double quote in any default font stack" | A double-quoted font name ended the `style="..."` attribute and silently dropped the caption's padding and font for a whole render |
| "keeps every style attribute intact" (each card) | The same, for cards |
| "low-passes both generated sounds below about 1 kHz" | A bright highlight sound that reviewers heard as a squeak |
| "never uses an automatic leveller on the final mix" | A dynamic loudness filter raised the music in every pause |
| "draws the caption again so it stays on top and fully lit" | The spotlight dimmed the caption drawn before it |
| "refuses a sound whose licence is ..." | Only CC0 sounds may be downloaded |
| "never serves a file outside the folder" | Path traversal in the static server |
| "applies the transform in the page, and takes every trace of it away afterwards" | A leftover transform re-anchors the app's fixed drawers |
| "refuses a recording with no frames, and says what to do" | A cold browser start that delivered no frames |

## Checking that the tests can fail

A test that cannot fail proves nothing. `tests/mutate.py` breaks the code in 50 places,
one at a time, runs the suite, and reports whether a test caught each:

```
caught    3 failing   loudness gain has the wrong sign
caught   14 failing   overlays ignore the page zoom
caught    4 failing   any sound licence is accepted
caught    1 failing   files outside the folder are served
...
50 of 50 mutations caught
```

It restores each file before moving on. When you add a rule that matters, add a line
to its list.

## Adding a test

1. Put it in the file for the module you changed. Name it for the behaviour, in plain
   words: `'never places a sound before the start of the video'`.
2. Keep the logic in a pure function where you can (`planDissolve`, `lateHolds`,
   `captionChunks`), and test that directly. Use the fakes only for what truly needs
   the page or a process.
3. Test the limits: exactly on the boundary, one over, empty input.
4. If the test guards a real mistake, say which in a comment.
5. Break the code once and watch the test fail.
6. `bun run check`.
