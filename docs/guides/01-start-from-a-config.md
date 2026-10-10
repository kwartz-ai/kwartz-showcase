# 1. Start from a config

**What it is.** A small file, `showcase.config.json`, says what the video is: the
address of the product, the length, where it will be posted. A second file, `video.ts`,
says how it is filmed. One command renders everything the config asks for.

## Steps

1. In your project folder:
   ```bash
   bunx showcase init --config
   ```
   This adds `showcase.config.json`, a starter `video.ts`, and the skill for Claude Code.

2. Open `showcase.config.json` and set the address:
   ```json
   {
     "name": "demo",
     "url": "http://localhost:3000",
     "length": 30,
     "formats": ["landscape"]
   }
   ```
   Only `url` is required. To film a folder of static files, use `"serve": "site"` in
   place of `url`.

3. Add two lines to `.gitignore`:
   ```
   out/
   .showcase/
   ```

4. See what the video needs:
   ```bash
   bunx showcase plan
   ```
   It prints the number of scenes, the words for each, the shapes, and the safety rules.

5. Write the scenes in `video.ts` (or let Claude Code do it: [guide 11](11-with-claude-code.md)).

6. Check the picture, then render:
   ```bash
   bunx showcase make --draft
   bunx showcase make
   ```

## Check it worked

- `out/demo.mp4` exists and every line of the report starts with `ok`.
- A mistake in the config stops the run with a list of everything wrong, for example
  `"lenght" is not a setting`.

## Good to know

- Add `"$schema": "./node_modules/kwartz-showcase/schema/showcase.config.schema.json"`
  and your editor completes the settings as you type.
- A complete example is in `examples/tour/`.
