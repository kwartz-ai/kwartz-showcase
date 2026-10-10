# User guide: make a video of your product

This guide takes you from nothing installed to a finished, narrated video of your own
product, one step at a time. It has two parts:

- **Part A** is the steps, in order.
- **Part B** is about skills: how to let an AI agent such as Claude Code do most of
  Part A for you.

> **A shorter way.** This guide writes the video by hand, which teaches every part.
> If you would rather describe the video in a config file (length, platforms such as
> YouTube Shorts or Instagram Reels, your fonts and colours) and have the scenes
> written for it, read [A video from a config](config-driven-video.md) after Step 4.

You do not need video editing experience. You do need to be comfortable running
commands in a terminal and reading a little TypeScript.

**What you will have at the end**

- `out/<name>.mp4`: a 1080p video with voice, captions, music and sound effects
- `out/<name>.vtt`: the captions as a separate file
- `video.ts`: the script that made it, which you can edit and render again at any time

**How long it takes**

| | First time | After that |
|---|---|---|
| Install and set up | 20 to 30 minutes | nothing |
| A first 60-second video | 2 to 4 hours | 1 to 2 hours |
| Changing a line of narration | | 5 minutes |

These are estimates from making three videos of one product.

---

# Part A: Step by step

## Step 1. Install the three tools

| Tool | Why | Check it works |
|---|---|---|
| [Bun](https://bun.sh) 1.2 or later | Runs the kit | `bun --version` |
| [FFmpeg](https://ffmpeg.org) | Builds the video and the sound | `ffmpeg -version` and `ffprobe -version` |
| Python 3.10 to 3.13 | Installs the voice (only needed once) | `python --version` |

Typical install commands. Use your own package manager if you prefer.

```bash
# Windows (PowerShell)
winget install Oven-sh.Bun
winget install Gyan.FFmpeg
winget install Python.Python.3.12

# macOS
brew install oven-sh/bun/bun ffmpeg python@3.12
```

Close and reopen the terminal afterwards so the new commands are found.

## Step 2. Get the kit

```bash
git clone https://github.com/kwartz-ai/kwartz-showcase.git
cd kwartz-showcase
bun install
bun link
```

`bun link` makes the kit available to your other projects on this machine.

## Step 3. Set up the browser and the voice

```bash
bun run showcase doctor
```

This lists what is installed. On a new machine it will say `chromium` and `voice` are
missing. Fix both with one command:

```bash
bun run showcase setup
```

It installs a browser for the kit to drive and downloads the voice model (about
350 MB, once per machine). Run `bun run showcase doctor` again: every row should say `ok`.

> You can skip the voice for now. Draft renders work without it, and you can run
> `showcase setup` later.

## Step 4. Render the example

```bash
bun run example
```

About a minute later you have `examples/hello/out/hello.mp4`: a 30-second video of a
small made-up app that ships with the kit. **Watch it with the sound on.** It shows
every building block you are about to use: an opening card, the pointer, a zoom, a
label, a change of screen, a chapter card and a closing card.

Then open `examples/hello/video.ts` beside it. That file is the whole video. Keep it
open as a reference for the rest of this guide.

## Step 5. Get your product ready to be filmed

The kit films your real product in a browser, so the product has to be running and has
to look the way you want it to look in the video.

**5.1 Run it somewhere you control.** A local or test instance is best
(`http://localhost:3000`, say). Do not film production.

**5.2 Fill it with data that may be shown.** Use demo, seed or made-up data. Check that
it tells a story: if the video says "here is a late shipment", there must be a late
shipment on screen.

**5.3 List what must never appear.** Write down the names of real customers, people or
companies that exist anywhere in that system. You will give this list to the kit in
Step 9, and it will fail the render if one of them shows up.

**5.4 Make it repeatable.** You will render many times. If your scenes create or delete
things, the second render will not look like the first. Prefer scenes that only look
and click.

**5.5 Know how to sign in by script.** If the product needs a login, have a test
account. Never put its password in the video file; Step 9 shows how to pass it in.

## Step 6. Start the video in your project

In your product's own folder:

```bash
bun link kwartz-showcase
bunx showcase init
```

`showcase init` adds two files:

| File | What it is |
|---|---|
| `video.ts` | A starter video with three scenes for you to rewrite |
| `.claude/skills/kwartz-showcase/SKILL.md` | The editor skill for Claude Code (see Part B) |

Add this line to your `.gitignore`. Frames and videos are large and can show private
screens:

```
out/
```

## Step 7. Plan the video before touching the keyboard

Answer four questions in writing. This is the most important step, and it takes ten
minutes.

| Question | Example |
|---|---|
| **Who is watching?** | A supply chain manager who has never seen the product |
| **What is the one promise?** | "It shows you what changed in your customer's order file" |
| **What should they do afterwards?** | Ask for a walkthrough on their own data |
| **How long?** | 60 to 120 seconds for one idea; up to 3 minutes for a full tour in chapters |

Then outline the scenes. One row per scene, one idea per row.

| # | Scene | What is on screen | The point it makes |
|---|---|---|---|
| 1 | Hook | A card: the problem | "You get the file again and nobody says what changed" |
| 2 | First proof | The main screen, one click | "One click shows only what moved" |
| 3 | Second proof | A detail view | "Every change is dated" |
| 4 | Close | A card: the name and the next step | "See it on your own data" |

Rules of thumb:

- Open on the viewer's problem, not on your logo.
- Show the two or three interactions that prove the promise. Leave the rest out.
- A scene is 8 to 12 seconds. Six scenes is about a minute.
- For a video over 90 seconds, group scenes into chapters of three or four.

## Step 8. Write the script

Write what the voice will say for each scene, before writing any clicks.

- One or two sentences per scene.
- Plain words. Say "shows" and "click", not "surfaces" and "leverage".
- The voice reads about 3 words a second, so 30 words is roughly ten seconds.
- Avoid exact numbers and dates if your demo data changes over time. Say "thousands of
  lines", not "5,112 lines".
- Read it aloud once. If you stumble, the sentence is too long.

**When the voice says something wrong**, spell it the way it should sound and give the
caption its proper spelling:

```ts
say: 'Files arrive by email, or as E.D.I.',
caption: 'Files arrive by email, or as EDI.',
```

## Step 9. Fill in the settings

Open `video.ts`. The top of the file describes the video as a whole.

```ts
import { defineVideo, endCard, hookCard } from 'kwartz-showcase'

export default defineVideo({
  name: 'demo',                                  // names the files: out/demo.mp4
  baseUrl: 'http://localhost:3000',              // where your product is running
  target: { minSec: 60, maxSec: 120 },           // the length you planned in Step 7
  banned: ['Real Customer Ltd', 'Jane Realname'],   // your list from Step 5.3

  // Runs once, before recording starts.
  prepare: async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/login`)
    await page.getByLabel('Email').fill(process.env.DEMO_USER!)
    await page.getByLabel('Password').fill(process.env.DEMO_PASSWORD!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.getByRole('heading', { name: 'Dashboard' }).waitFor()
  },

  scenes: [ /* Step 10 */ ],
})
```

| Setting | Set it to |
|---|---|
| `name` | A short name with no spaces |
| `baseUrl` | Your running product. For a static site or a built front end use `serve: './dist'` instead |
| `target` | The length from your plan. The checks tell you if you miss it |
| `banned` | Every real name from Step 5.3 |
| `prepare` | Whatever gets the product to its first screen: sign in, pick a workspace, wait for data. Always end with a `waitFor` on something that proves the screen has loaded |

Pass secrets through the environment, never in the file:

```bash
DEMO_USER=demo@example.com DEMO_PASSWORD=... bunx showcase render video.ts --draft
```

**Optional: match your brand.** Add a `theme` to use your own colours and fonts.

```ts
theme: {
  ink: '#10243f',        // dark colour: cards, caption box
  accent: '#e8590c',     // the one highlight colour
  type: { text: `'Roboto', sans-serif` },   // the font your product uses; single quotes only
},
```

**Optional: change the framing.** If your product looks cramped or too small:

```ts
layout: { zoom: 1.5 },   // 1.25 is the default. Higher = bigger text, fewer rows
```

## Step 10. Build the scenes

Every scene has the same shape:

```ts
{
  id: 'moved',                                   // a unique short name
  say: 'One click keeps only the shipments whose date moved.',   // from Step 8
  run: async ({ page, stage, untilSaid }) => {
    // what happens on screen while the line is spoken
  },
},
```

The scene lasts as long as its line takes to say. Inside `run` you have three tools.

### 10.1 Find the element: `page`

`page` is a [Playwright](https://playwright.dev/docs/locators) page. A *locator* points
at something on screen.

```ts
page.getByRole('button', { name: 'Moved only' })    // best: how a user would describe it
page.getByText('Dashboard')
page.getByLabel('Search')
page.locator('#moved-only')                         // a CSS selector, when nothing else fits
page.locator('td.eta').first()                      // the first of several
```

To find the right one, open your product in a browser, right-click the element, choose
Inspect, and look for an `id`, a visible label, or a `data-testid`.

> **A common trap.** If the screen shows `LATE` but the HTML says `Late` (capitals added
> by styling), search for `Late`.

### 10.2 Do something: `stage`

| You want to | Write |
|---|---|
| Click something | `await stage.click(el)` |
| Click something that changes the whole screen (a tab, a page) | `await stage.cut(el, async () => { await page.locator('.new-screen').waitFor() })` |
| Point at something and say why it matters | `await stage.spotlight(el, { label: 'Why it matters', side: 'right' })` |
| Zoom in and point at it | `await stage.focus(el, { label: 'Why it matters' })` |
| Undo the zoom and the spotlight | `await stage.release()` |
| Show a chapter card | `await stage.chapter('PART TWO', 'Reports', async () => { /* go there */ })` |
| Show a full-screen card | `await stage.showFull(hookCard(theme, { ... }, sayMs))` |

### 10.3 Time it to the voice: `untilSaid`

`untilSaid(0.5)` waits until half the line has been spoken. `untilSaid(1)` waits until
it ends. This is how the picture follows the words.

### A worked scene

The line is: *"One click keeps only the shipments whose date moved, with the old date
under the new one."*

```ts
run: async ({ page, stage, untilSaid }) => {
  await untilSaid(0.25)                                     // "One click..."
  await stage.click(page.getByRole('button', { name: 'Moved only' }))
  await page.locator('td.eta .was').first().waitFor()       // wait for the result
  await untilSaid(0.6)                                      // "...with the old date..."
  await stage.focus(page.locator('td.eta').first(), {
    label: 'Old date kept under the new one',
    side: 'right',
  })
  await untilSaid(1)                                        // hold until the line ends
  await stage.release()
},
```

### The opening and closing scenes

```ts
{
  id: 'hook',
  say: 'The shipment file came in again this morning, with nothing to say what changed.',
  run: async ({ stage, theme, sayMs, untilSaid }) => {
    await stage.showFull(hookCard(theme, {
      overline: 'EVERY MORNING',
      title: 'The file. Again.',
      sub: 'No list of what changed.',
      questions: ['Which dates moved?'],
    }, sayMs), { dissolve: false })          // dissolve: false only for the first scene
    await untilSaid(1.03)
    await stage.clearFull()
  },
},
```

```ts
{
  id: 'end',
  say: 'Tideline. Every change found, and kept. All data shown here is fictional.',
  run: async ({ stage, theme, sayMs, untilSaid }) => {
    await stage.showFull(endCard(theme, {
      title: 'Tideline',
      chips: ['Found', 'Kept'],
      cta: 'See it on your own data.',
      ctaSub: 'hello@example.com',
      note: 'Every company and number shown is fictional.',
    }, sayMs))
    await untilSaid(1.06)
  },
},
```

### Four rules that save hours

1. **Wait for the result, never for a time.** After a click, `waitFor` the thing that
   proves it worked. Do not write `sleep(2000)`.
2. **Use `stage.cut` for anything that loads.** It hides the loading state. A plain
   `stage.click` on a tab will film the spinner.
3. **Call `stage.release()` before opening a drawer or dialog.** A zoomed screen moves
   them out of place.
4. **Write the label as a reason.** "Old date kept under the new one", not "Date column".

## Step 11. Draft until it runs

```bash
bunx showcase render video.ts --draft
```

A draft has no voice, music or effects. It takes about as long as the video itself and
needs no voice setup. Its job is to get every step working.

**When it stops**, the message tells you where:

```
render stopped in scene "moved": locator.click: Timeout 30000ms exceeded.
The page at that moment: out/failed.png
```

Open `out/failed.png`. It shows exactly what the browser saw. Usually the selector is
wrong, or the element is not on screen yet. Fix the scene and run again.

**To watch it happen**, add `--headed`:

```bash
bunx showcase render video.ts --draft --headed
```

Repeat until the draft finishes. Then watch `out/demo.mp4` once and check that each
scene shows what its line says.

## Step 12. Render the real thing

```bash
bunx showcase render video.ts
```

This adds the voice, the captions, the music and the sound effects. It ends with a
report:

```
done: out/demo.mp4

ok    picture      h264 1920x1080 at 30/1 fps
ok    length       84.2 s (target 60 to 120 s)
ok    loudness     -16.1 LUFS, peak -1.3 dBTP (target -16)
ok    captions     19 cues, longest 88 characters
ok    holds        6 dissolves, none still holding when the next line starts
ok    banned text  none of 2 banned terms on any screen
ok    fonts        all loaded
not checked: how the voice, music and effects sound. Listen once before sharing.
```

**If a row says `FAIL`:**

| Check | What it means | What to do |
|---|---|---|
| `length` | Too short or too long for your target | Add or cut a scene, or shorten lines |
| `loudness` | The mix missed the level | Render again; if it repeats, report it |
| `captions` | A caption is longer than two lines | Break that sentence into two |
| `holds` | A slow screen kept the old picture up after the next line started | Put a `stage.chapter` over it, or do the `stage.cut` at the end of the scene before |
| `banned text` | A real name was on screen | Change the demo data or the scene. **Do not share this render** |
| `fonts` | A font did not load | Check your internet connection, or use fonts installed on the machine |

## Step 13. Review it like an editor

The checks measure the file. They do not watch it or listen to it. You must.

**Watch it twice:** once with the sound off (does the picture make sense alone?), and
once looking away (does the narration make sense alone?).

- [ ] The first five seconds state a problem the viewer has
- [ ] Every scene makes one point
- [ ] The pointer and every highlight land on the right thing
- [ ] No spinner, blank screen or "Loading" anywhere
- [ ] Captions never cover what is being shown
- [ ] The voice says every word correctly
- [ ] The music is quiet enough to forget
- [ ] No real customer name or data on screen
- [ ] The last card has one clear next step, and says if the data is fictional

Then ask one other person to watch it. They will notice what you no longer can.

## Step 14. Change it

| To change | Do this | Then |
|---|---|---|
| What is said | Edit the `say` line | `showcase render video.ts` (only changed lines are voiced again) |
| What is shown | Edit the scene's `run` | `showcase render video.ts --draft`, then a full render |
| The music | | `showcase remix video.ts --music my-track.mp3` |
| Remove the music | | `showcase remix video.ts --no-music` |
| Remove the sound effects | | `showcase remix video.ts --no-sfx` |
| The voice | Add `voice: { voice: 'bf_emma' }` to the settings | `showcase render video.ts` |
| Colours and fonts | Add or edit `theme` | `showcase render video.ts` |

`showcase remix` rebuilds the file in seconds from the last recording. Use it for anything
that only touches sound.

> Use only music you have the right to use. The built-in music is generated by the kit
> and has no licence attached.

## Step 15. Share it

- **The video:** `out/demo.mp4`. It plays everywhere.
- **Captions:** upload `out/demo.vtt` alongside it where the platform allows. The
  captions are also burned into the picture.
- **A thumbnail:** pick the second that best states your promise.

  ```bash
  ffmpeg -ss 12 -i out/demo.mp4 -frames:v 1 thumbnail.jpg
  ```

- **Keep `video.ts` in git.** It is the source of the video. When the product changes,
  edit it and render again.

---

# Part B: Skills

## What a skill is

A skill is a folder containing a file called `SKILL.md`: written instructions that teach
an AI coding agent how to do one kind of job. When the job comes up, the agent reads the
skill and follows it. A skill is text, not a program. It still matters what it says,
because the agent acts on it with your permissions.

## The skill that ships with this kit

`showcase init` put it in your project at `.claude/skills/kwartz-showcase/SKILL.md`.

It makes the agent work as a **senior video editor** on your video. In short it tells
the agent:

- **the rules it must not break:** film only data that may be shown; never show a real
  customer; free and clean licences only; do not commit or publish unless asked
- **the commands:** `showcase doctor`, `init`, `render --draft`, `render`, `remix`, `verify`
- **what a scene can do:** the same table as Step 10
- **the craft standard:** seven areas an editor works through (story, pacing and
  transitions, motion, camera, type, sound, finish), each with working numbers
- **how to work:** read first, write the script before the picture, draft, render,
  verify with numbers, report
- **to be honest about one limit:** it cannot hear. It must say so in every report and
  ask you to listen before the video is shared.

## Using it with Claude Code

Open Claude Code in your product's folder (the one containing `video.ts`). Type the
command, followed by what you want in plain words.

**To make a first video:**

```
/kwartz-showcase make a 90 second walkthrough for new users. The promise: it shows
what changed in a customer's order file. The app runs on localhost:3000 with demo data.
Never show the names in docs/real-customers.txt.
```

**To improve one you have:**

```
/kwartz-showcase the highlight in scene 3 lands on the wrong column, and the ending
needs a clearer next step: "Book a walkthrough".
```

**To make another cut:**

```
/kwartz-showcase a 45 second version for a sales email, only the first two proofs.
```

**With no brief**, `/kwartz-showcase` alone improves the current video by the next
unfinished item in its craft standard.

### What to tell it

The agent does Steps 7 to 14 for you, but it needs what only you know. Give it:

| Tell it | Why |
|---|---|
| Who the video is for, and the one promise | It decides what to leave out |
| Where the product runs and how to sign in | It cannot guess |
| Which data is safe to show, and the names that are not | It puts them in `banned` |
| The length | It sets `target` |
| The next step for the viewer | It will ask if you do not say |
| Any brand colours or fonts | It sets `theme` |

### What it will ask you

By its own rules it stops and asks before:

- adding a scene that creates, edits or deletes data
- using a music track
- installing another skill or a new dependency
- committing, pushing or publishing

### What you still do yourself

- **Listen to the result.** The agent cannot hear the voice, the music or the effects.
- **Watch it once.** It checks sample frames, not every second.
- **Decide what is true and what may be shown.** It follows your list; it does not know
  your customers.

## Making the skill know your product

The shipped skill is general. The agent works much better when a second, small skill
describes *your* product. Create `.claude/skills/<your-product>-video/SKILL.md`:

```markdown
---
name: acme-video
description: Facts about filming the Acme app for its demo video. Use together with
  kwartz-showcase whenever the Acme demo video is made or changed.
---

# Filming Acme

## Start the product
`docker compose up -d`, then wait for http://localhost:3000/health to answer.
Sign in as the demo user; the credentials are in the environment as DEMO_USER and
DEMO_PASSWORD.

## Data that may be shown
Only the "Tideline Demo" workspace. Its data is fictional and is reset by
`bun run seed:demo`. Run that before every render.

## Never on screen
Any name in docs/real-customers.txt. The Admin and Billing pages.

## The story
Promise: Acme shows what changed in a customer's order file.
The three proofs, in order: Moved-only filter, line history, on-time trend.
Next step for the viewer: "Book a walkthrough at acme.example/demo".

## Selectors that are stable
Buttons and tabs have `data-testid`. The main table is `[data-testid=orders-grid]`.

## Brand
ink #10243f, accent #e8590c, text font Roboto.
```

Keep it to facts the agent cannot find by reading the code. Update it when they change.
Commit it with the project, so everyone's agent has it.

## Other skills that help

None of these is required. Each is instructions only, but read any skill before you
install it: it will be acted on with your permissions.

| Skill | Use it when | Install |
|---|---|---|
| **GSAP** (official, by GreenSock; MIT) | You want a custom animated card with a complex timeline. The kit's own cards need no library | `npx skills add https://github.com/greensock/gsap-skills -a claude-code -s gsap-core gsap-timeline gsap-performance -y --copy` |
| **A motion design skill** | You want the agent to reason about easing and timing beyond the kit's defaults | Several exist in community registries. We have not reviewed them |
| **Your own product skill** | Always | See above |

How to check a skill before installing it:

1. Open its `SKILL.md` and read all of it.
2. Look for instructions to run commands, download things, or send data anywhere.
3. Prefer skills published by the maker of the tool they describe.
4. Install it into the project (`.claude/skills/`), not globally, so it is visible in
   review.

## Without an AI agent

Everything in Part A works by hand. The skill is a convenience, not a requirement. It
is also a good checklist to read yourself: it is one page, and it lists what an editor
would check.

---

# Quick reference

```bash
bunx showcase doctor                       # what is installed
bunx showcase setup                        # once per machine: browser and voice
bunx showcase init                         # once per project: video.ts and the skill
bunx showcase render video.ts --draft      # picture only; use until every scene runs
bunx showcase render video.ts --headed     # watch the browser while it records
bunx showcase render video.ts              # the real thing, then the checks
bunx showcase remix video.ts --no-music    # change the sound without recording again
bunx showcase verify video.ts              # run the checks again
```

```ts
await stage.click(el)                                  // click
await stage.cut(el, async () => { await x.waitFor() }) // click that changes the screen
await stage.focus(el, { label: 'Why', side: 'right' }) // zoom + highlight + label
await stage.release()                                  // undo that
await stage.chapter('PART TWO', 'Title', async () => {})   // chapter card
await stage.showFull(hookCard(theme, {...}, sayMs))    // full-screen card
await stage.clearFull()
await untilSaid(0.5)                                   // wait for half the line
```

**More detail:** [Writing a video](writing-a-video.md) for every option,
[Craft guide](craft-guide.md) for what makes a video good,
[Troubleshooting](troubleshooting.md) when something goes wrong.
