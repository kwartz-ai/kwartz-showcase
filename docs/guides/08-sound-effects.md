# 8. Sound effects

**What it is.** Three small sounds: a click, a highlight (when a spotlight appears) and
a transition (when the screen changes). The kit picks a set for your project from
[soundcn](https://github.com/kapishdima/soundcn), a free library, and measures each
sound before using it.

## Steps

1. Describe how the product should sound, in a few words:
   ```json
   { "sound": { "effects": "auto", "mood": "calm professional soft" } }
   ```

   | `effects` | Meaning |
   |---|---|
   | `auto` (default) | Pick from soundcn for the mood, measure, use what passes |
   | `generated` | The kit's own soft sounds, no download |
   | `none` | No effects |
   | `{ "click": "...", "callout": "...", "transition": "..." }` | Sounds you name |

2. To see candidates before rendering:
   ```bash
   bunx showcase sounds --role callout --mood "calm soft"
   ```
   Listen to any of them at soundcn.xyz by searching for its name.

3. Render:
   ```bash
   bunx showcase make
   ```

## Check it worked

The log says which sound was chosen for each role, and why:

```
sound, click: click-001 (first candidate, passed)
sound, callout: drop-002 (passed after 1 refused (drop-001: its pitch is centred at 2567 Hz, above the 1500 Hz limit for a callout sound))
sound, transition: generated (no soundcn sound passed ...)
```

`out/<name>.credits.txt` records where each sound came from. Keep it with the video.

## Why sounds are refused

Nothing in the kit can hear. A sound chosen by its description alone was once heard by
reviewers as a squeak. So every sound must pass these rules:

- **Licence:** CC0 only, and some sets are blocked whatever the library says.
- **Pitch:** a sound that plays many times must sit low. Under 1500 Hz for a highlight
  or a transition, under 3000 Hz for a click.
- **Length and level:** short enough for its role, and not nearly silent.

If nothing passes for a role, the kit's own sound is used.

## Good to know

- The choice is saved in `.showcase/sounds.json`, so every later render sounds the
  same and needs no internet. Delete that file, or change `mood`, to choose again.
- After changing only the sound, rebuild without recording: `showcase make --remix`.
- A sound you name yourself is used as asked, with a note if it fails a measurement.
- Listen to the video once before sharing it. The measurements are not an ear.
