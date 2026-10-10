# 4. Your own script

**What it is.** You write the narration in a plain text file. The kit reads it out word
for word. Nothing rewrites it.

## Steps

1. Write `script.txt` beside the config. One paragraph per scene, in order, with a
   blank line between them:
   ```
   The shipment file came in again this morning.

   One click keeps only the shipments whose date moved.

   Tideline. Every change found, and kept.
   ```

2. To tie a paragraph to one scene, whatever its place in the file, put the scene's id
   in a heading above it:
   ```
   ## end
   Tideline. Every change found, and kept.
   ```

3. Point the config at it:
   ```json
   { "url": "http://localhost:3000", "script": "script.txt" }
   ```

4. In `video.ts`, leave `say` out of the scenes. Each still needs an `id`:
   ```ts
   { id: 'hook', motion: ({ theme, sayMs }) => hookCard(theme, { title: 'The file. Again.' }, sayMs) },
   ```

5. Render:
   ```bash
   bunx showcase make --draft
   ```

## Check it worked

- The captions in the video are your sentences, unchanged.
- If the number of paragraphs does not match the scenes, the run stops and names the
  scenes that have no line.
- If the script is more than 10 percent over the word budget for the length, you get a
  note and the video is still rendered:
  ```
  note: the script is 100 words; the chosen length fits about 70. Cut about 30 words, or choose a longer video.
  ```

## Good to know

- A scene that already has `say` in `video.ts` keeps it; the script fills only the
  scenes without one.
- Write for the ear: short sentences, one idea each. Avoid exact counts and dates if
  the product's data changes.
