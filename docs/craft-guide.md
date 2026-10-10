# Craft guide

What a senior video editor works on, in the order they usually handle it. The numbers
are common working ranges, not fixed rules. Each section ends with how the kit helps.

## 1. Story

- One promise per video. If you cannot say it in a sentence, the video is two videos.
- Hook in the first 5 seconds: the viewer's problem, not your logo.
- Show only the two or three interactions that prove the promise. A tour of every
  screen proves nothing.
- End with one clear next step.
- Length follows the promise: 60 to 120 seconds for one idea, up to about 3 minutes for
  a full walkthrough in chapters.

*In the kit:* `hookCard` for the opening, `endCard` with `cta` for the close, `target`
to hold the length.

## 2. Pacing and transitions

- Cut every second where nothing happens.
- Never show a blank screen, a white flash, a spinner or the word "Loading".
- Hold text long enough to read it twice.
- A change of screen is a dissolve, and the wait for a slow screen happens somewhere
  the viewer does not feel it: behind a chapter card, or while the previous line is
  still being spoken.

*In the kit:* `stage.cut`, `stage.dissolve`, `stage.chapter`; the `holds` check.

## 3. Motion

- Nothing moves at constant speed. Things entering slow down as they arrive; things
  leaving speed up.
- Small interface moves last 150 to 300 ms. Camera moves last 400 to 800 ms.
- Items in a list arrive 40 to 80 ms apart.
- One thing moves at a time. Motion pulls the eye, so use it only where the viewer
  should look.
- One motion language for the whole video: the same easing, the same distances.

*In the kit:* the pointer, spotlight, labels and cards share two easing curves
(`EASE_OUT` for arrivals, `EASE_IN_OUT` for moves).

## 4. Camera

- Zoom in to the area of action, hold, then back out.
- Keep the pointer's path smooth and direct.
- Highlight or dim to direct attention.
- Keep anything messy or irrelevant out of frame.

*In the kit:* `stage.focus` and `stage.release`.

## 5. Graphics and type

- One type system: a text face (best: the app's own), a display face for cards and
  titles, a mono face for small labels and data.
- Display type is heavy and tightly tracked (about -0.03em). Small overlines are mono,
  uppercase, widely tracked (about 0.2em).
- At most three sizes on one card.
- A callout label says why a thing matters, not what it is.
- Captions are at most two balanced lines and stay clear of the thing being shown.
- Title, chapter and end cards share one design.

*In the kit:* `theme.type`; captions are split at 92 characters and balanced.

## 6. Sound

- The voice leads. Level the whole mix to a standard loudness (about -16 LUFS for
  online video).
- Use one fixed gain for that. An automatic leveller turns the music up in every pause.
- Music sits at least 15 dB under the voice and drops further while the voice speaks.
- Effects are soft and low. A sound that plays twenty times in a video is judged far
  more harshly than one that plays once.
- No dead silence between scenes.

*In the kit:* the encoder does all of it; `sound.lufs` and `sound.musicGain` adjust it.

> **Learned the hard way.** The first version played a bright interface sound, with
> most of its energy near 4.7 kHz, on every highlight. The first reviewer called it a
> squeak. The replacement sits near 400 Hz. Before adding a sound that repeats, measure
> it: `ffmpeg -i sound.wav -af "aspectralstats=measure=centroid,ametadata=print:key=lavfi.aspectralstats.1.centroid:file=-" -f null -`
> and keep the centroid under about 1 kHz.

## 7. Finish

- Watch it once with the sound off, and once with your eyes closed.
- Export 1080p H.264 with AAC, and keep the caption file with it.
- Pick a thumbnail frame that states the promise.

*In the kit:* the checks after every render. They measure the file; they do not watch
or listen to it.

## A checklist for review

- [ ] The first 5 seconds state a problem the viewer has
- [ ] Every scene makes one point, and its line is one or two sentences
- [ ] No loading state, blank frame or white flash anywhere
- [ ] Every spotlight has a label that says why
- [ ] Captions never cover what is being shown
- [ ] No real customer name or data on screen
- [ ] The end card has one next step, and says if the data is fictional
- [ ] Someone has listened to it from start to end
