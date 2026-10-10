# Security

## Reporting a problem

Please do not open a public issue for a security problem. Report it privately through
GitHub: open [the repository's Security tab](https://github.com/kwartz-ai/kwartz-showcase/security)
and choose **Report a vulnerability**.

We aim to answer within five working days.

## What to keep in mind when using the kit

- **It runs your video file as code.** `showcase render video.ts` imports and executes the
  file with your permissions. Only render video files you trust.
- **It drives a real browser against your app.** A scene can click anything a user can.
  Film a demo or test instance, and keep scenes read-only unless you mean otherwise.
- **`prepare` often signs in.** Read credentials from the environment. Never write them
  in the video file, and never commit `out/`: frames and the take can show private data.
- **`out/failed.png` is a screenshot.** Check it before attaching it to an issue.
- **Downloads.** `showcase setup` downloads Chromium (through Playwright), Python packages
  from PyPI, and the Kokoro model from the kokoro-onnx GitHub release. The first
  render downloads one click sound from soundcn and, with the default theme, links
  fonts from Google Fonts.
- **Skills run with your agent's permissions.** The skill in this repo is instructions
  only. Read any third-party skill before installing it.
