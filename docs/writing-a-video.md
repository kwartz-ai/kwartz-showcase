# Writing a video

A video is one TypeScript file whose default export is `defineVideo({ ... })`.

## The video

| Field | Meaning | Default |
|---|---|---|
| `name` | Names the output: `out/<name>.mp4`, `.vtt`, `.take.json` | required |
| `baseUrl` | The app to film | required, unless `serve` |
| `serve` | A folder of static files to serve and film, relative to the video file | none |
| `scenes` | The scenes, in order | required |
| `prepare` | Runs before recording: sign in, open the first screen, wait for data | none |
| `appRoot` | CSS selector of the element holding the whole app; the camera scales it | found among `#root`, `#app`, `#__next`, `#__nuxt`, `main` |
| `layout` | `{ width, height, zoom, fps }` | `1920, 1080, 1.25, 30` |
| `theme` | Colours and fonts of everything drawn over the app | see below |
| `voice` | `{ voice, speed }`: a Kokoro voice name and its speed | `af_heart`, `1` |
| `sound` | `{ music, musicGain, effects, lufs }` | `'generated', 0.4, true, -16` |
| `pace` | `{ leadMs, tailMs }`: silence before each line and the pause after | `350, 800` |
| `banned` | Words or patterns that must never appear on screen | `[]` |
| `target` | `{ minSec, maxSec }`: the length the video should have | none |

**`layout.zoom`** is how the kit gets a sharp 1080p picture of an app that reads well:
the window is 1920 wide and the page is zoomed 1.25 times, so the app lays out as on a
1536-wide screen. Raise it for bigger text and fewer rows, lower it for the opposite.

**`sound.music`** is `'generated'` (the built-in soft pad), `false`, or a path to a
track you have the rights to.

**`banned`** exists because a demo is often filmed on a system that also holds real
data. List the names that must never be seen. After each scene the kit samples the
page's text, and the check fails if a banned term was on screen.

## A scene

```ts
{
  id: 'history',
  say: 'Click a shipment to see every change to it, with the day it arrived.',
  run: async ({ page, stage, untilSaid }) => {
    await stage.click(page.locator('td.id').first())
    await page.locator('#drawer.open').waitFor()
    await untilSaid(0.5)
    await stage.spotlight(page.locator('#d-log'), { label: 'Dated evidence', side: 'left' })
    await untilSaid(1)
    await stage.clearSpot()
  },
}
```

- `id` must be unique. It appears in the log and in error messages.
- `say` is the spoken line. It is also the captions, split into pieces of at most two
  lines.
- `caption` replaces the caption text when it must differ from the speech. Example: say
  `'as E.D.I.'` so the voice spells it out, and caption `'as EDI'`.
- `run` does the steps. The scene ends when `run` has finished and the line has been
  spoken, plus the pause.

### What `run` receives

| | |
|---|---|
| `page` | The Playwright [Page](https://playwright.dev/docs/api/class-page). Use locators and `waitFor`. |
| `stage` | Pointer, camera, spotlight, cards, dissolves (below). |
| `untilSaid(f)` | Waits until fraction `f` of this scene's line has been spoken. `0` is the start, `1` the end. Values over 1 wait a little past the end. |
| `sayMs` | Length of this scene's narration in ms. Cards use it to time their own animation. |
| `theme` | The resolved theme, for cards and your own HTML. |
| `baseUrl` | The address being filmed. |
| `sleep(ms)` | A plain wait. Prefer `untilSaid` and `waitFor`. |

`untilSaid` is how picture follows voice. Put the click where the line mentions it:
`await untilSaid(0.3)` then the click, `await untilSaid(1)` to hold until the line ends.

## The stage

### Pointer

| | |
|---|---|
| `stage.click(el)` | The pointer glides to the element, shows a click, and clicks it. |
| `stage.moveTo(el)` | Glide only. |

### Changes of screen

| | |
|---|---|
| `stage.cut(el, ready)` | For a click that changes the whole screen (a tab, a page). The pointer arrives, the click happens, and when `ready()` resolves the old screen dissolves into the new one. |
| `stage.dissolve(fn)` | The same for any other change: `fn` changes the screen. |
| `stage.chapter(overline, title, fn)` | A full-screen chapter card. `fn` runs behind it, so a slow navigation is hidden. |

A dissolve works at encoding time. The kit notes the moment before and after the
change, drops whatever was filmed in between (loading states included), holds the old
picture, and blends it into the new one. That is why a `ready` function matters: it
must resolve only when the new screen is fully loaded.

```ts
await stage.cut(page.getByRole('tab', { name: 'Reports' }), async () => {
  await page.locator('table.report').waitFor()
  await page.waitForLoadState('networkidle')
})
```

**When the next screen is slow**, the old picture holds for as long as the load takes.
Two ways to keep that from feeling stuck:

- Put a chapter card over it: `stage.chapter('PART TWO', 'Reports', async () => { ... })`.
- Click early (pre-lap): do the `stage.cut` at about `untilSaid(0.85)` of the scene
  before, so the wait happens while that scene's line is still being spoken and the
  dissolve lands as the next line begins. The next scene then does no navigation.

The `holds` check fails if a hold of over a second is still on screen when the next
line starts.

### Directing attention

| | |
|---|---|
| `stage.spotlight(el, { label, side, pad })` | A ring around the element; everything else dims. `label` is a short callout placed `'below'`, `'above'`, `'left'` or `'right'`. |
| `stage.clearSpot()` | Remove it. |
| `stage.zoomTo(el, { scale })` | Camera: the app scales toward the element, which stays where it is. |
| `stage.zoomOut()` | Return. |
| `stage.focus(el, { scale, label, side })` | `zoomTo` and `spotlight` together. |
| `stage.release()` | `clearSpot` and `zoomOut` together. |

Write the label to say why the thing matters, not what it is: "Old date kept under the
new one", not "Date column". Zoom out before a click that opens a drawer or dialog.

### Cards

A card can be shown two ways. In a hand-written video, `stage.showFull` lays it over
the app, as below. A scene can also be a **motion scene**: give it `motion` in place of
`run`, returning the card's HTML, and it is rendered frame by frame with motion blur
and never filmed. See [A video from a config: motion scenes](config-driven-video.md#motion-scenes);
motion scenes work in a hand-written video too.

```ts
{ id: 'hook', say: 'The file came in again.', motion: ({ theme, sayMs }) => hookCard(theme, { title: 'The file. Again.' }, sayMs) }
```

`stage.showFull(html)` puts a full-screen layer over the app and `stage.clearFull()`
removes it; both dissolve. For the very first frame of the video pass
`{ dissolve: false }`. The kit has four cards, each taking the theme and, where they
animate with the voice, the narration length:

```ts
import { hookCard, stepsCard, endCard, titleCard } from 'kwartz-showcase'

await stage.showFull(hookCard(theme, {
  overline: 'EVERY MORNING',
  title: 'The file. Again.',
  sub: 'No list of what changed.',
  questions: ['Which dates moved?'],
}, sayMs), { dissolve: false })
```

| Card | For |
|---|---|
| `hookCard(theme, { overline, title, sub, questions, wall }, ms)` | The opening: the problem, before the product |
| `titleCard(theme, title, sub)` | A plain name card |
| `stepsCard(theme, { overline, title, steps }, ms)` | "How it works": up to four numbered steps appearing in turn |
| `endCard(theme, { title, overline, chips, cta, ctaSub, note }, ms)` | The close: name, summary, one next step |

Any HTML works in `showFull`. Use inline styles and CSS keyframes; use single quotes
inside `style="..."` attributes.

## Theme

```ts
theme: {
  ink: '#0B1D35',       // dark: cards, caption box, pointer
  accent: '#F59E0B',    // the one highlight colour: ring, labels, overlines
  mist: '#B8C7DA',      // secondary text on dark cards
  paper: '#F4F7FB',     // light card background
  type: {
    display: `'Plus Jakarta Sans', sans-serif`,   // cards and titles
    text: `'Inter', sans-serif`,                  // captions and labels
    mono: `'JetBrains Mono', monospace`,          // overlines and data
  },
  fontsCss: 'https://fonts.googleapis.com/css2?family=...',   // or null
  fontsToLoad: ['800 40px "Plus Jakarta Sans"'],
}
```

Set `text` to the face your app uses, so captions and labels read as part of the
product. Set `ink` and `accent` from your brand. If all your fonts are installed or
loaded by the app itself, set `fontsCss: null` and renders need no internet.

## The rounded border

Every video is set a little smaller on a soft backdrop, with rounded corners and a
shadow, the way a screen recording is presented in a product video. It is on by
default.

```ts
export default defineVideo({
  // ...
  border: false,                                   // the picture fills the frame
  // or change parts of it:
  border: { inset: 0.03, radius: 0.04, shadow: 0.5, colors: ['#1B2A8F', '#3D5AF1', '#B9A5FF'] },
})
```

| Part | Default | Meaning |
|---|---|---|
| `inset` | `0.022` | Space around the picture, as a share of the frame on each side |
| `radius` | `0.034` | Corner radius, as a share of the frame's short side |
| `colors` | blue to violet | The backdrop: from, to, and the glow at the sides |
| `shadow` | `0.45` | How dark the shadow under the picture is, 0 to 1 |

The border is added when the file is built, not when it is recorded: `showcase remix`
applies a change to it in seconds, and `--no-border` leaves it off for one run. The
video keeps its full size; the picture inside is about 4 percent smaller.

## Using the API directly

```ts
import { loadVideo, render, verify } from 'kwartz-showcase'

const video = await loadVideo('video.ts')
const { file } = await render(video, { draft: true })
const checks = await verify(video)
```
