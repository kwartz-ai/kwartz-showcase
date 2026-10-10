# Changelog

## 1.0.0 (2026-10-10)

First release, extracted from the pipeline that made the Kwartz OWL demo videos.
Source: https://github.com/kwartz-ai/kwartz-ai-video

- `kav` command: `render`, `remix`, `verify`, `init`, `setup`, `doctor`
- Video files in TypeScript with `defineVideo`
- Stage: pointer, spotlight with callout labels, camera zoom, cross-dissolves that
  hide loading states, chapter cards
- Cards: hook, title, steps, end
- Local narration with Kokoro, cached per line
- Sound: effects from logged event times, generated music bed with ducking, fixed-gain
  loudness to -16 LUFS
- Captions: two balanced lines at most, burned in and as WebVTT
- Checks after every render: picture, length, loudness, captions, holds, banned text, fonts
- Skill for Claude Code: `skills/kwartz-ai-video`
- 495 unit tests (Vitest), a mutation run and a clean-copy test
- Docs: user guide, reference, craft guide, architecture, tech stack, testing and
  release checklist

Known limits: developed and tested on Windows 11 only; the voice speaks English;
caption timing inside one spoken line is estimated.
