# Documentation

Read these in order the first time. After that, use the table at the end to jump to
what you need.

> **Just want to make a video of your product?** Go straight to the
> **[User guide](user-guide.md)**. It is one page, step by step, from installing the
> tools to sharing the video, and it explains how to use the skills with an AI agent.

## Reading order

### Part 1: Make your first video

| # | Doc | What you learn | Time |
|---|---|---|---|
| 0 | **[User guide](user-guide.md)** | The whole journey in 15 steps, plus skills. Start here | 30 min |
| 1 | [Getting started](getting-started.md) | Install the tools, start a video, draft it, render it | 10 min |
| 2 | [Writing a video](writing-a-video.md) | The video file, and everything a scene can do: pointer, cuts, spotlight, camera, cards, theme | 20 min |
| 2a | **[Feature guides](guides/README.md)** | Fourteen short guides, one per feature, each with steps and how to check it worked | 5 min each |
| 2b | [A video from a config](config-driven-video.md) | `showcase.config.json`: length and word budget, platforms and shapes, style, your own script, motion scenes, sounds, a hosted product | 15 min |

The user guide alone is enough to make a complete video. Docs 1 and 2 are the shorter
version and the full reference.

### Part 2: Make it good

| # | Doc | What you learn | Time |
|---|---|---|---|
| 3a | [Fonts for video](fonts.md) | Why video type is not web type, what a check of 60 Google Fonts found, and eleven pairings | 10 min |
| 3 | [Craft guide](craft-guide.md) | What a senior editor works on: story, pacing, motion, camera, type, sound, finish, with working numbers and a review checklist | 10 min |
| 4 | [Troubleshooting](troubleshooting.md) | What to do when a render stops, a check fails, or something looks or sounds wrong | as needed |

### Part 3: Understand how it is built

Read these if you want to change the kit, or just want to know what happens when you
run `showcase render`.

| # | Doc | What you learn | Time |
|---|---|---|---|
| 5 | [How it works](how-it-works.md) | The pipeline in order: narration, browser, capture, encode, checks | 5 min |
| 6 | [Architecture](architecture.md) | Processes, modules, the data that flows between them, diagrams, where to extend | 15 min |
| 7 | [Tech stack](tech-stack.md) | Every tool, its version, licence and role, and what was not chosen | 10 min |
| 8 | [Testing](testing.md) | How the tests are organised, how the browser and FFmpeg are replaced, how to add one | 10 min |
| 9 | [Release checklist](release-checklist.md) | Eight levels of proof, from the unit tests to a trial on a real product and a privacy scan | 10 min |

### Part 4: Background

| # | Doc | What you learn | Time |
|---|---|---|---|
| 10 | [Research notes](research.md) | The tools and skills compared before building this, similar projects, and what three rounds of feedback taught us | 10 min |

## Jump to what you need

| I want to... | Go to |
|---|---|
| Make a video of my product, start to finish | [User guide](user-guide.md) |
| Use Claude Code to make the video | [User guide: skills](user-guide.md#part-b-skills) |
| Teach the agent about my own product | [User guide: making the skill know your product](user-guide.md#making-the-skill-know-your-product) |
| Install and render the example | [Getting started](getting-started.md), or the [project README](../README.md#quick-start) |
| Know what a setting in `video.ts` does | [Writing a video: the video](writing-a-video.md#the-video) |
| Click, zoom, highlight or label something | [Writing a video: the stage](writing-a-video.md#the-stage) |
| Change screens without showing a loading state | [Writing a video: changes of screen](writing-a-video.md#changes-of-screen) |
| Make an opening or closing card | [Writing a video: cards](writing-a-video.md#cards) |
| Use my own colours and fonts | [Writing a video: theme](writing-a-video.md#theme) |
| Make a vertical video for Shorts, Reels or TikTok | [A video from a config: shapes and platforms](config-driven-video.md#shapes-and-platforms) |
| Set how long the video is | [A video from a config: length](config-driven-video.md#length) |
| Use my own script | [A video from a config: your own script](config-driven-video.md#your-own-script) |
| Film a hosted product safely | [A video from a config: a hosted product](config-driven-video.md#a-hosted-product) |
| Choose the sound effects | [A video from a config: sound effects](config-driven-video.md#sound-effects) |
| Fix a render that stopped | [Troubleshooting](troubleshooting.md#the-render-stopped-in-a-scene) |
| Fix a failed `holds` check | [Troubleshooting](troubleshooting.md#the-holds-check-fails) |
| Change the music or effects | [Troubleshooting](troubleshooting.md#the-music-or-an-effect-is-wrong) |
| Review a video before sharing it | [Craft guide: checklist](craft-guide.md#a-checklist-for-review) |
| Add a card, a sound or a check to the kit | [Architecture: where to extend](architecture.md#where-to-extend) |
| Write or run a test | [Testing](testing.md) |
| Know it works before I commit or push | [Release checklist](release-checklist.md) |
| Check a licence | [Tech stack: at a glance](tech-stack.md#at-a-glance) and [NOTICE](../NOTICE) |
| Contribute | [CONTRIBUTING](../CONTRIBUTING.md) |

## Other places

- [Project README](../README.md): what the kit is, quick start, commands
- [The editor skill](../skills/kwartz-showcase/SKILL.md): the brief an AI agent follows when it makes a video
- [The example](../examples/hello/video.ts): a complete small video you can render and copy from
- [The config example](../examples/tour/showcase.config.json): one script rendered in three shapes
- [Changelog](../CHANGELOG.md)
