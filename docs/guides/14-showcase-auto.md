# 14. showcase auto (beta)

> **Beta.** This command is built and unit-tested, and its request has reached the
> live API. It has not yet been run end to end with a real key. Expect rough edges,
> and please report what you find.

**What it is.** One command that goes from a config to a finished video with nobody
writing scenes. The kit explores the product, asks Claude through the API to write the
scenes file, renders a draft, sends any error back for a fix, and then renders the real
video.

It needs an Anthropic API key, and each run costs a little on that key. Every other
command works without one. If you use Claude Code, the `/kwartz-showcase` skill does
the same job with no key ([guide 11](11-with-claude-code.md)).

## Steps

1. Write the config as usual ([guide 1](01-start-from-a-config.md)). The more it says,
   the better the result: `audience`, `promise` and `cta` matter most.
   ```json
   {
     "name": "demo",
     "url": "http://localhost:3000",
     "length": 30,
     "audience": "a customer service lead",
     "promise": "It shows what changed since the last download",
     "cta": { "text": "See your own data.", "sub": "example.com" }
   }
   ```

2. Set the key for this terminal:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...          # PowerShell: $env:ANTHROPIC_API_KEY = "sk-ant-..."
   ```

3. Run it. `--draft` stops after the draft, which is the cheap way to look first:
   ```bash
   bunx showcase auto --draft
   bunx showcase auto --force
   ```

| Option | Meaning |
|---|---|
| `--draft` | Stop after the draft: no voice, music or effects |
| `--force` | Replace an existing scenes file (the old one is kept as `video.ts.before-auto`) |
| `--model <id>` | The model to ask. Default `claude-opus-5-5`, or the `SHOWCASE_MODEL` variable |
| `--tries <n>` | How many times a failed draft may go back for a fix. Default 3 |

## What happens, in order

1. The config is checked. A hosted address still needs `safety.banned`.
2. The product is explored, unless `.showcase/explore/map.md` is already there.
3. The work order and the map are sent to the model, with the kit's own guide.
4. The reply is checked before anything runs (see below), then written to `video.ts`.
5. A draft is rendered. If it stops, the error goes back and the model sends a fixed
   file, up to `--tries` times.
6. If the length is off, the model is asked once to change the narration by the number
   of words the kit worked out.
7. The full video is rendered and checked.

## Check it worked

```
scenes written by claude-opus-5-5 in 2 attempt(s): video.ts
Read that file before you share the video: it is the script, and it was not written by a person.
```

followed by the usual report for each shape.

## What the generated file may do

The scenes file is code that runs on your machine, so it is checked first and refused
if it does more than a scenes file needs:

- its only import is `kwartz-showcase`
- no other modules, no `require`, no dynamic import
- no file system, no `process`, no starting programs
- no network calls of its own, no timers, no `eval`
- nothing that changes how the page loads or uploads files

A refused file is never written or run; the model is told why and asked again. This is
a guard against mistakes, not a sandbox. Read-only mode still applies to a hosted
product, and you should read `video.ts` before sharing the video.

## Good to know

- **What is sent.** The work order (from your config), the product map (screen titles,
  headings, table columns, button names, selectors, the first lines of text on each
  screen) and the kit's own guide. Screenshots are not sent. Do not explore a screen
  whose text must not leave your machine.
- **No password is sent.** Sign in with `showcase login` first
  ([guide 9](09-hosted-product.md)).
- **It will not overwrite your work** without `--force`.
- **When it gives up**, the last file stays at `video.ts`. Fix it by hand and run
  `showcase make`.
- **Then listen.** Nothing here can hear the result.

This guide describes the command as built and unit-tested. See the changelog for what
has and has not been run against the live API.
