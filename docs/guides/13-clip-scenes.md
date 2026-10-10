# 13. Clip scenes

**What it is.** A scene that plays a finished video file: a recording from a phone, a
piece of an older demo, a logo animation, some footage. It sits on the timeline like
any other scene, with narration, captions and dissolves.

## Steps

1. Put the video file beside `video.ts`.

2. Add a scene with `clip` in place of `run` or `motion`:
   ```ts
   {
     id: 'on-site',
     say: 'Here it is on the warehouse floor.',
     clip: 'warehouse.mp4',
   },
   ```

3. To use part of a file, fill the frame, or keep its sound, use an object:
   ```ts
   {
     id: 'on-site',
     say: 'Here it is on the warehouse floor.',
     clip: { file: 'warehouse.mp4', from: 12, seconds: 6, fit: 'cover', sound: true },
   },
   ```

   | Setting | Default | Meaning |
   |---|---|---|
   | `file` | (required) | The video file |
   | `from` | `0` | Start this many seconds into it |
   | `seconds` | to the end | Use this many seconds |
   | `fit` | `contain` | `contain`: the whole picture, inside the frame. `cover`: fill the frame, cut the overflow |
   | `sound` | `false` | Keep the clip's own sound |

4. Render a draft and look:
   ```bash
   bunx showcase make --draft
   ```

## How long the scene lasts

The longer of the two: the part of the clip you use, or the narration with its pauses.
If the narration is longer, the clip's last frame holds.

A clip scene may have nothing to say. Set `say: ''` and it plays for its own length:

```ts
{ id: 'logo', say: '', clip: 'logo-sting.mp4' },
```

## Check it worked

The log marks the scene: `scene 4/5 on-site @ 23.5 s (clip)`. In the video the clip
dissolves in and out like any other scene, and the captions sit on it.

## Good to know

- **Sound.** With `sound: true` the clip's sound plays at full level when the scene is
  silent, and is turned down under the narration when there is some.
- **Shapes.** A landscape clip in a vertical video is shown whole with dark bars
  (`contain`). Use `fit: 'cover'` to fill the frame, or give the scene
  `formats: ['landscape']` to keep it out of the other shapes.
- **Banned names.** The kit cannot read what a clip shows. The `banned text` check
  does not cover a clip: look at it yourself before using it.
- **Rights.** Use only footage you may use. The kit bundles none.
- **Captions already in the clip.** If the file has burned-in captions, they will show
  under the kit's own. Use a clean file.
- Clip scenes work in a hand-written `defineVideo` file too.
