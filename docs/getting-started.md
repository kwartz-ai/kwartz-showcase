# Getting started

From an empty folder to a first video of your own app.

## 1. Install the tools

You need [Bun](https://bun.sh) 1.2 or later (or Node 22.18 or later) and
[FFmpeg](https://ffmpeg.org) on your PATH. Python 3.10 to 3.13 is needed once, to
install the voice.

In your own project:

```bash
bun add -d kwartz-showcase     # or: npm install --save-dev kwartz-showcase
bunx showcase doctor
```

With Node, write `npx` wherever these docs say `bunx`.

`doctor` lists what is there and what is missing. Then:

```bash
bunx showcase setup
```

This installs Chromium for Playwright, creates a Python environment for the voice, and
downloads the Kokoro model (about 350 MB). It all goes into a cache shared by every
project on the machine (`~/.cache/kwartz-showcase`, or `SHOWCASE_HOME` if you set it), so it
happens once. You can skip the voice at first: draft renders work without it.

## 2. Start a video

```bash
bunx showcase init
```

This adds `video.ts`, a starter with three scenes, and the editor skill for Claude Code.
Add `out/` to `.gitignore`.

Open `video.ts` and set where your app runs:

```ts
export default defineVideo({
  name: 'demo',
  baseUrl: 'http://localhost:3000',
  ...
```

If your video is of a static site or a built front end, use `serve: './dist'` instead
and the kit serves the folder itself.

## 3. Write the script first

Before any clicking, write each scene's `say` line. One idea per scene, in plain words.
The voice reads about 3 words a second, so 30 words is roughly ten seconds. The
scene will last as long as its line.

## 4. Draft until it runs

```bash
bunx showcase render video.ts --draft
```

A draft has no voice, music or effects and uses estimated line lengths. Use it to get
every step working. If it stops, the message names the scene, and `out/failed.png`
shows the page at that moment. Add `--headed` to watch the browser.

## 5. Render

```bash
bunx showcase render video.ts
```

The file is `out/demo.mp4`, with `out/demo.vtt` beside it. The checks print after it:

```
ok    picture      h264 1920x1080 at 30/1 fps
ok    length       31.4 s (target 30 to 60 s)
ok    loudness     -16.2 LUFS, peak -1.4 dBTP (target -16)
ok    captions     8 cues, longest 89 characters
ok    holds        4 dissolves, none still holding when the next line starts
ok    banned text  none of 1 banned terms on any screen
ok    fonts        all loaded
not checked: how the voice, music and effects sound. Listen once before sharing.
```

Watch it once with the sound on. The checks cannot do that for you.

## 6. Change it

- What is said: edit a `say` line and render again. Only changed lines are voiced again.
- The sound mix only: `bunx showcase remix video.ts --music track.mp3` rebuilds the file in
  seconds from the last take.
- The look: set `theme` in the video file (see [Writing a video](writing-a-video.md)).

Next: [Writing a video](writing-a-video.md) and the [Craft guide](craft-guide.md).
