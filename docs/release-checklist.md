# Before you commit, push or release

How to know the kit really works, in rising order of effort. Automated tests prove the
logic. Only real use proves the product. Do both.

| Level | What it proves | Time | When |
|---|---|---|---|
| 1. Checks | The logic is right | 15 s | Every commit |
| 2. Mutation run | The tests can fail | 2 min | When tests were added or changed |
| 3. Clean copy | What git holds is complete | 1 min | When files were added or moved; before a push |
| 4. Example render | The whole pipeline works on this machine | 2 min | When the stage, encoder, sound or voice changed |
| 5. Real product trial | It works on an app that was not written for it | 30 min | Before a release; after an API change |
| 6. Skill trial | An agent can drive it from the skill alone | 30 min | Before a release; after the skill changed |
| 7. Another machine | It does not depend on your setup | 30 min | Before the first public release, and for a new OS |
| 8. Privacy scan | Nothing private goes public | 2 min | Before every push to a public place |

## 1. Checks

```bash
bun run check
```

The type-check and all unit tests. Must pass before every commit.

## 2. Mutation run

```bash
bun run test:mutate
```

Breaks the code in 18 known places, one at a time, and confirms a test fails each time.
It must end with `18 of 18 mutations caught`.

## 3. Clean copy

```bash
bun run test:clean
```

Copies exactly the files git tracks or would add into an empty folder, then installs,
runs the checks and draft-renders the example there. It catches the classic "works on
my machine" mistakes: a file that was never added, a file that is ignored but needed,
a dependency that is installed but not listed.

## 4. Example render

```bash
bun run kav doctor
bun run example
```

Every row of the report must say `ok`. Then **open `examples/hello/out/hello.mp4` and
watch it with the sound on**:

- [ ] the voice speaks every line, clearly
- [ ] captions match the voice and stay readable over the spotlight
- [ ] the pointer lands on what it clicks; the label sits beside what it names
- [ ] the "Loading…" state of the second tab is never visible
- [ ] music is quiet under the voice; click and transition sounds are soft
- [ ] no white flash, no frozen stretch that feels stuck

## 5. Real product trial

Use the kit the way a stranger would, on a product it was not written for.

1. Make a new folder **outside** the kit. In it:
   ```bash
   bun link kwartz-ai-video
   bunx kav init
   ```
2. Follow the [user guide](user-guide.md) from Step 5, using only the docs. Note every
   place you had to look at the kit's source to continue: each is a gap in the docs.
3. Write five to seven scenes that between them use `click`, `focus`, a drawer or
   dialog, `cut` to another tab, `chapter` over a slow screen, a hook card and an end
   card. Put a real name in `banned`.
4. `bunx kav render video.ts --draft`, then a full render.
5. Break it on purpose once, to see the failure path: use a selector that matches
   nothing, and check that the message names the scene and `out/failed.png` shows the
   page.
6. Watch and listen to the result.

What to write down: every confusing message, every surprise, every step the docs did
not cover. Fix those before release; they are worth more than new features.

## 6. Skill trial

1. Open a **new** Claude Code session in the trial folder, so the agent has no memory of
   building the kit.
2. Give it one brief and nothing else:
   ```
   /kwartz-ai-video make a 60 second walkthrough of this app for a first-time user.
   It runs on http://localhost:3000 with demo data.
   ```
3. Watch what it does, without helping.

- [ ] it found and read the skill
- [ ] it wrote the script before the scenes
- [ ] it drafted before the full render
- [ ] it reported the check results with numbers
- [ ] it said it cannot hear, and asked you to listen
- [ ] it did not commit, install anything, or write data without asking

Where it went wrong or got stuck, the skill is unclear. Fix the skill, not the agent.

## 7. Another machine

Ask one other person, on their own machine, to follow the README from the top. Stay
silent. Everything they ask you is a missing sentence in the docs.

Operating systems not yet tried should be tried this way before they are claimed.

## 8. Privacy scan

Before anything is pushed to a public place:

```bash
git ls-files --others --exclude-standard --cached \
  | xargs grep -n -i -E "password|secret|token|api[_-]?key|@yourcompany\.com"
```

- [ ] no customer names, real people's names or internal product names
- [ ] no credentials, tokens or private URLs
- [ ] no `out/` folder, frames, takes or `failed.png` (they are screenshots)
- [ ] every link in the README goes somewhere you mean the public to see
- [ ] the licence, the security contact and the repository address are final

## What no checklist can do

Nothing here listens to the video. Before a release, one person plays the example and
one real video from start to end, with sound, and says it is good.
