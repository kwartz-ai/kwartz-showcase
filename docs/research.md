# Research notes

What we looked at before and while building this kit, and what we decided. Dated
October 2026. Licences and prices change: check the source before relying on any row.

The first version of these notes is the page
[OWL Video Plan](research/owl-video-plan.html), kept in this folder. Open it in a
browser. This file keeps its content as Markdown and adds what we learned afterwards.

## The question

Can an AI coding agent make a product demo video that looks edited, with no paid tools
and nobody recording a screen?

The answer we reached: an agent does not generate video the way an image model
generates a picture. It writes code, and a renderer turns the code into an MP4. For a
product video that is the better fit, because the code can drive the real product.

## Ways to render video from code

| Approach | What the author writes | Licence | Our view |
|---|---|---|---|
| **Playwright + FFmpeg** (this kit) | A browser script against the real app, plus HTML overlays | Apache-2.0 / LGPL or GPL | Chosen. Films the real product; every tool is free. |
| **HyperFrames** (HeyGen) | HTML scenes that render straight to MP4 | Apache-2.0 | Good for a fully animated intro or explainer with no app in it. Could feed clips to this kit later. |
| **Remotion** | React components | Company licence above a small team size | Avoided because of the licence terms. Read them before using it in a company. |
| **Playwright `recordVideo`** | Nothing extra | Apache-2.0 | Too soft for a product video: low bitrate WebM. The screencast API with per-frame capture is what we use instead. |
| **OBS driven by a script** | A script plus a visible desktop | GPL-2.0 | Takes over the machine while recording. Only needed for windows a page capture cannot see. |

## Similar open-source projects

Found in a search on 2026-10-10. We have not used them; activity and licence were not
checked.

| Project | Shape | Difference from this kit |
|---|---|---|
| codevid (Python) | Turns existing Playwright tests into narrated tutorials, with an LLM writing the script | Voice through OpenAI or Edge TTS |
| demodsl (Python) | YAML steps with narration, spotlight, music ducking | YAML instead of code; Remotion renderer option |
| demo-dev (npm) | A prompt drives the browser; capture, voice and render stages | ElevenLabs, OpenAI or local voice |
| demos-not-memos (TypeScript) | A `NarratedDemo` class; `narrate()` between Playwright actions | ElevenLabs by default |
| demofly (npm) | Playwright spec plus a narration file per scene; built for Claude Code | Closest in idea |

What this kit adds to that field: a fully local voice, dissolves that hide loading
states at encode time, a take that can be remixed, checks after every render, and a
skill that carries an editor's standard.

## Skills an agent can use alongside

A skill is a folder of instructions that teaches an agent a tool or a craft. A
third-party skill runs with the agent's permissions, so read it before installing.

| Skill set | Teaches | Licence | Fit |
|---|---|---|---|
| GSAP skills (official, GreenSock) | Tweens, easing, timelines, staggering, performance | MIT | High, for richer custom cards. We installed `gsap-core`, `gsap-timeline` and `gsap-performance` and read them: documentation only. |
| HyperFrames skills | Writing HTML-to-video scenes | Apache-2.0 | Medium, for standalone animated clips |
| Community motion skills | Easing, springs, timing judgement | Varies | Unreviewed by us |
| claude-code-video-toolkit (digitalsamba) | FFmpeg, Playwright recording, MoviePy, AI music, Remotion | MIT | Useful reference; its core is Remotion and its voice path is paid |
| OpenMontage | A full production system with a screen-demo pipeline and style playbooks | AGPL-3.0 | Reference only. Do not copy AGPL code into an Apache project. |

## Sound

| Source | What | Licence | Use |
|---|---|---|---|
| [soundcn](https://github.com/kapishdima/soundcn) | 700+ short interface sounds, each shipped as base64 in a small module | Mostly CC0; one game-derived set is not | The click. The kit refuses any sound the registry does not mark CC0. |
| Generated with FFmpeg | Callout tap, dissolve breath, music bed | None needed | Everything else |

## Voice

| Engine | Cost | Notes |
|---|---|---|
| **Kokoro-82M** via kokoro-onnx | Free, local | Chosen. About 3 seconds per line on a laptop; 54 voices; Apache-2.0 model, MIT package. Works on Windows. |
| Cloud voices (ElevenLabs, OpenAI, Gemini) | Paid or rate-limited | Better range of voices. A free tier is easy to use up in an afternoon of iteration. |

## What three rounds of feedback taught us

The kit comes from one real project: three cuts of the same demo in two days.

| Cut | Feedback | What changed in the kit |
|---|---|---|
| 1 | Correct, but it looked like a careful screen recording | Camera zoom, callout labels, hook and end cards, sound effects, music, loudness levelling |
| 2 | "The squeak sound when a new section is highlighted" | Effects made low and soft; a rule to measure any repeating sound |
| 2 | Typography was weak | A type system: display, text and mono faces; captions limited to two balanced lines |
| 2 | White flashes between screens | Dissolves at encode time; chapter cards; pre-lap; the `holds` check |
| 3 | Aim for about three minutes | Chapters, so a longer video has structure |

Two bugs worth remembering:

- A font stack with double quotes, placed inside a `style="..."` attribute, silently
  cut the style short. Captions and labels lost their padding and their font for a
  whole render. Theme font stacks use single quotes for this reason.
- A single-pass loudness filter is automatic gain. It raised the music in every pause
  to within 5 dB of the voice. The encoder now measures once and applies one fixed gain.

## Sources

- [Playwright screencast API](https://playwright.dev/docs/api/class-screencast)
- [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx)
- [GSAP official AI skills](https://github.com/greensock/gsap-skills)
- [HyperFrames](https://github.com/heygen-com/hyperframes)
- [claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit)
- [OpenMontage](https://github.com/calesthio/OpenMontage)
- [soundcn](https://github.com/kapishdima/soundcn)
- [Motion design principles guide](https://www.boundev.ai/blog/motion-design-principles-guide) and
  [Motion design principles explained](https://madegooddesigns.com/motion-design-principles/) (timing and stagger ranges)
- [SaaS product demo videos](https://www.moonb.io/blog/saas-product-demo-video) and
  [How to make a demo video](https://www.videostudiopro.com/en/tips/demo-video/)
- [codevid](https://pypi.org/project/codevid/), [demodsl](https://pypi.org/project/demodsl/),
  [demofly](https://cdn.jsdelivr.net/npm/demofly@0.2.11/README.md)
- [Bun issue 10120](https://github.com/oven-sh/bun/issues/10120): an older report of Playwright failing to launch under Bun on Windows. On Bun 1.4.2 it launched and captured in 6 of 7 runs here; the first, cold run captured nothing, which the kit now reports clearly.
