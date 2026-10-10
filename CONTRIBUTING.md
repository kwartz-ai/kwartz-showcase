# Contributing

Thank you for helping. This kit is small on purpose; the bar for a change is that it
makes a real video better or easier to make.

## Set up

```bash
bun install
bun run showcase setup        # Chromium and the voice; skip the voice if you only need drafts
bun run check            # type-check and tests (Vitest)
bun run example:draft    # renders the example with no voice
```

## Before you open a pull request

- `bun run check` passes, and a change in behaviour comes with a test (see
  [docs/testing.md](docs/testing.md)).
- The example still renders: `bun run example:draft`, and `bun run example` if you
  touched sound or the voice.
- If you added or moved files: `bun run test:clean`. Before a release, the whole
  [release checklist](docs/release-checklist.md).
- If the picture or the sound changed, you watched and listened to the result. Say so
  in the pull request. A reviewer who is an AI agent cannot hear, and must say that too.
- Behaviour changes are reflected in `docs/` and in `skills/kwartz-showcase/SKILL.md`.
- A new rule in the craft guide or the skill comes with the reason: what went wrong
  without it.

## What fits

- Fixes, and things two different videos have needed.
- Support for another operating system, voice or language, with a note on what was tested.

## What needs a conversation first

Open an issue before starting on any of these:

- A new runtime dependency.
- Anything that needs a paid service, an account, or a licence that is not permissive.
- Bundling media (sounds, music, fonts) in the repo. Today nothing is bundled.

## Licences of what you add

Code you contribute is under Apache-2.0, like the rest. Do not copy code from projects
under GPL or AGPL. Sounds must be CC0 or generated; say where each one comes from.

## Style

TypeScript, strict. Match the code around you. Comments say why, not what. Error
messages tell the user what to do next.
