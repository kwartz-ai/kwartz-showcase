# Troubleshooting

Start with `showcase doctor`. It shows what is installed and what is missing.

## The render stopped in a scene

The message names the scene and the step that timed out. `out/failed.png` shows the
page at that moment. Run with `--headed` to watch. The usual causes:

- The selector matches nothing, or matches a hidden element. Try it in the browser's
  console with `document.querySelector`.
- The text is styled, not written, in capitals: the page shows `LATE` but the HTML says
  `Late`. Match the HTML, or use a class.
- An element is below the fold in a list taller than the screen. Scroll its container
  first, or pick another element.

## "no frames were captured"

Seen once on a cold start, when the browser had not finished starting. Render again.
If it repeats, run `showcase doctor`.

## The camera says it cannot find the app's root element

Set `appRoot` in the video file to the CSS selector of the element that wraps your
whole app, for example `appRoot: '#app'`.

## A drawer or dialog jumps while zoomed

A zoomed app root changes where fixed-position elements anchor. Call
`stage.release()` (or `stage.zoomOut()`) before the click that opens the drawer.

## The `holds` check fails

A slow screen kept the old picture up after the next line had started. Hide the load
behind a chapter card, or click earlier: move the `stage.cut` to about
`untilSaid(0.85)` of the scene before. See "Changes of screen" in
[Writing a video](writing-a-video.md).

## A font did not load

The log names it, and the `fonts` check fails. The default theme links Google Fonts at
render time, so a render needs the internet. To avoid that, use installed fonts in
`theme.type` and set `theme.fontsCss` to `null`.

## The voice says a word wrong

Spell it the way it should sound in `say`, and put the proper spelling in `caption`.
For example `say: 'as E.D.I.'` with `caption: 'as EDI'`.

## "The voice is not set up"

Run `showcase setup`. It needs Python 3.10 to 3.13. Until then, `--draft` works.

## The music or an effect is wrong

- No music: `--no-music`. Your own track: `--music track.mp3`.
- No effects: `--no-sfx`.
- Quieter music: lower `sound.musicGain` in the video file.
- After any of these, `showcase remix video.ts` rebuilds the file without recording.

## The picture is too small or too big

Change `layout.zoom`. `1.25` lays the app out as on a 1536-wide screen; `1.5` as on a
1280-wide one, with bigger text and fewer rows.

## Git Bash on Windows rewrites paths

If a command you run from Git Bash passes a path like `/app` to Docker, set
`MSYS_NO_PATHCONV=1` first. This is not a kit problem, but it has cost us a wasted
render: the app started with stale data and nothing reported an error.
