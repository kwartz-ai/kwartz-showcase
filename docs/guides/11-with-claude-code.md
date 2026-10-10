# 11. With Claude Code

**What it is.** The kit has no AI inside it. It ships a skill: a brief that tells an AI
agent how to work as the video's editor. With Claude Code, you describe the video and
the agent writes the script and the scenes, renders, and reports what it checked.

## Steps

1. Start the video in your project. This also copies the skill to
   `.claude/skills/kwartz-showcase/`:
   ```bash
   bunx showcase init --config
   ```

2. Fill in what you already know in `showcase.config.json`: the address, the length,
   the platforms, and for a hosted product the banned names.

3. If the product needs a sign-in, do it yourself. The agent must never be given a
   password:
   ```bash
   bunx showcase login
   ```

4. In Claude Code, in that folder, type the command and say what the video is for:
   ```
   /kwartz-showcase a 30 second video for new users, show how to find what changed
   ```

5. The agent then:
   - reads the config, and proposes an audience and a promise if they are missing
   - runs `showcase explore` and reads the map
   - runs `showcase plan` and follows the word budget
   - writes `video.ts`
   - runs `showcase make --draft` until every scene works in every shape
   - runs `showcase make` and reports each check with its number

## What it will ask you

Only the decisions that are yours:

- the closing line, if the config has none
- the names that must never be on screen
- the music, if you want a real track
- a scene that would change data
- whether to commit

## Check it worked

The agent's report lists every check (`picture`, `length`, `loudness`, `captions`,
`holds`, `banned text`, `read-only`, `fonts`), names the sounds that were used and
refused, and says plainly that it could not hear the result.

## What you still do yourself

- **Listen once** before the video is shared. No agent can hear it.
- Watch the vertical video on a phone.
- Decide whether the story is the right one.

## Good to know

- To change a video later, say what to change: `/kwartz-showcase make the hook shorter`.
- To teach the agent about your product (how to start it, which data may be shown,
  which selectors are stable), add a short section to your project's `CLAUDE.md`. The
  [user guide](../user-guide.md#making-the-skill-know-your-product) has a template.
- To install only the skill: `npx skills add kwartz-ai/kwartz-showcase`.
