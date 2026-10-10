# How it works

The pipeline, told in order. For the modules, data structures and diagrams see
[Architecture](architecture.md); for the tools and versions see [Tech stack](tech-stack.md).

One command runs five stages.

```
video.ts ──► narration ──► browser ──► frames + times ──► encode ──► out/<name>.mp4
 (scenes)    (Kokoro,      (Playwright  (every repaint,    (FFmpeg)   out/<name>.vtt
              one WAV       drives the   with timestamp;              out/<name>.take.json
              per scene)    real app)    events logged)
```

## 1. Narration first

Every scene's `say` line goes to Kokoro, a local voice model, which writes one WAV per
line. `ffprobe` measures each clip. A scene then lasts: a short lead-in, the clip, and
a pause.

Making the voice before the picture is the idea the whole kit rests on. The length of
the speech sets the length of the scene, so voice and picture cannot drift and nobody
has to line them up in an editor.

Clips are cached by text, voice and speed, so only edited lines are generated again.

## 2. The browser

Playwright opens Chromium at 1920x1080 with the page zoomed (1.25 by default). The app
lays out as on a 1536-wide screen and the frames stay a sharp 1080p. Your `prepare`
function runs, then the fonts are awaited so no frame is filmed in a fallback face.

## 3. Scenes

For each scene the captions start on their own clock, the scene's steps run, and the
runner waits for the narration to finish. Steps wait for real states of the page, never
for fixed times, so the same script works on a slow or a fast machine.

Everything drawn over the app (pointer, caption, spotlight, labels, cards) is an HTML
overlay that Playwright places inside the page. Overlays never block a click.

## 4. Capture

Playwright's screencast hands over a JPEG each time Chromium repaints, with a
millisecond timestamp. Each frame is written to disk as it arrives. When nothing
changes, no frame arrives.

Alongside the frames the stage keeps two logs:

- **events**: the time of every click, callout and dissolve, for sound effects
- **dissolves**: for every change of screen, the moment before and the moment after

Everything a recording produced is saved as a *take* (`out/<name>.take.json`), so the
file can be rebuilt without the browser.

## 5. Encode

- **Dissolves.** For each one, the frames filmed between its two moments are dropped,
  loading states and all. FFmpeg blends the picture from before into the picture from
  after, and those blended frames are placed just before the "after" moment. The old
  screen holds, then fades into the new one.
- **Picture.** FFmpeg reads the frames as a list in which each frame lasts until the
  next one, so the video keeps real time. It writes 30 fps H.264.
- **Sound.** Each narration clip is delayed to its scene's start. Each effect is
  delayed to its event's time. The music bed loops under everything, and a compressor
  keyed by the voice pulls it down while the voice speaks. The mix is measured, given
  one fixed gain to reach -16 LUFS, and passed through a limiter that only catches
  peaks.
- **Captions.** The same cue times are written as WebVTT.

## 6. Checks

`verify` reads the file and the take: codec, size and frame rate; length against the
target; loudness; caption length; holds that run into the next line; banned text; fonts.

## Why it is built this way

| Choice | Reason |
|---|---|
| Film the real app, not a mock-up | The video cannot show something the product does not do |
| Narration before picture | Sync with no editing |
| Overlays in the page, not added afterwards | They are positioned from the real elements, so they are always on target |
| Dissolves at encode time | A loading state can be filmed and still never be shown |
| Save the take | Sound can be reworked in seconds without recording again |
| A local voice | Free, private, no quota; a render never fails on someone else's API |
| One fixed loudness gain | An automatic leveller raises the music in every pause |
| Bun and TypeScript | The video file is type-checked and runs with no build step under Bun |

## Files

| File | What it does |
|---|---|
| `bin/showcase.js` | The launcher for the `showcase` command |
| `src/cli/` | The commands |
| `src/video/define.ts` | `defineVideo`, defaults, validation |
| `src/brief/` | `showcase.config.json`: checks, shapes, platforms, plan, script, work order |
| `src/render/render.ts` | The runner: narration, browser, scenes, take, finish |
| `src/render/make.ts` | Every shape a config asks for |
| `src/render/encode.ts` | Dissolve blending, the sound mix, the final file |
| `src/render/compose.ts` | Framed layouts: the page as a window, captions on the frame |
| `src/render/captions.ts` | Splitting lines into captions; WebVTT |
| `src/capture/recorder.ts` | Page zoom, fonts, frame capture |
| `src/capture/stage.ts` | Pointer, captions, spotlight, camera, dissolves, chapters |
| `src/capture/readonly.ts`, `session.ts`, `explore.ts` | Read-only mode, saved sign-in, the product map |
| `src/graphics/cards.ts` | Hook, title, steps and end cards |
| `src/graphics/motion.ts` | Motion scenes, rendered frame by frame |
| `src/audio/` | The voice, the effects, the music bed, the soundcn palette |
| `python/kokoro_tts.py` | The small Python script that runs the voice |
| `src/verify/verify.ts` | The checks |
| `src/setup/setup.ts` | `showcase setup` and `showcase doctor` |
| `src/capture/serve.ts` | Static file server for `serve` |
