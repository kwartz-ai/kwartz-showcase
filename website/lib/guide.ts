// The ten steps of "Your first video". Every command and every printed line here is
// taken from the kit's docs (getting-started.md and guides 1, 3, 10, 11 and 12).

export interface GuideStep {
  title: string
  what: string
  /** What you type, or the file you edit. */
  code: string
  codeLabel: string
  /** What you should see, in the kit's own words. */
  see: string
  seeLabel: string
  tip: string
  /** The doc that covers this step in full. */
  more: { href: string; label: string }
}

export const GUIDE: GuideStep[] = [
  {
    title: 'Install the tools',
    what: 'Three free tools. Bun or Node runs the kit, FFmpeg builds the video, and Python is needed once, to install the voice.',
    codeLabel: 'Check each one',
    code: 'bun --version\nffmpeg -version\npython --version',
    seeLabel: 'You need',
    see: 'Bun 1.2 or later, or Node 22.18 or later\nFFmpeg on your PATH, with ffprobe\nPython 3.10 to 3.13',
    tip: 'Draft renders work without Python. You only need it for the voice.',
    more: { href: '/docs/getting-started', label: 'Getting started' },
  },
  {
    title: 'Get the kit',
    what: 'Install it from npm, in your own project folder. One line, and nothing to clone.',
    codeLabel: 'You type, in your project',
    code: 'bun add -d kwartz-showcase',
    seeLabel: 'Or, with npm',
    see: 'npm install --save-dev kwartz-showcase',
    tip: 'This guide writes bunx. With Node, write npx in its place: npx showcase doctor.',
    more: { href: '/docs/getting-started', label: 'Getting started' },
  },
  {
    title: 'Set up the voice',
    what: 'doctor lists what is there and what is missing. setup installs Chromium, creates a Python environment for the voice and downloads the Kokoro model.',
    codeLabel: 'You type',
    code: 'bunx showcase doctor\nbunx showcase setup',
    seeLabel: 'What setup installs',
    see: 'Chromium, for Playwright\nA Python environment for the voice\nThe Kokoro voice model, about 350 MB',
    tip: 'It all goes into one cache shared by every project (~/.cache/kwartz-showcase), so it happens once.',
    more: { href: '/docs/user-guide', label: 'User guide' },
  },
  {
    title: 'Start a video',
    what: 'In your project folder, one command adds the config, a starter scenes file and the skill for Claude Code.',
    codeLabel: 'You type',
    code: 'bunx showcase init --config',
    seeLabel: 'It adds',
    see: 'showcase.config.json\nvideo.ts\n.claude/skills/kwartz-showcase/',
    tip: 'Add out/ and .showcase/ to your .gitignore. Frames, takes and the videos are written there.',
    more: { href: '/docs/guides/start-from-a-config', label: 'Guide 1: Start from a config' },
  },
  {
    title: 'Describe the video',
    what: 'Open showcase.config.json. Say what to film, how long it should be, and where it will be posted.',
    codeLabel: 'showcase.config.json',
    code: '{\n  "name": "demo",\n  "url": "http://localhost:3000",\n  "length": 30,\n  "platforms": ["youtube", "instagram-reel"],\n  "theme": "clay"\n}',
    seeLabel: 'Good to know',
    see: 'Only "url" is required.\nA mistake stops the run with a list, for example:\n"lenght" is not a setting',
    tip: 'Start your product first, so the address answers. To film a folder of static files, use "serve" in place of "url".',
    more: { href: '/docs/config-driven-video', label: 'A video from a config' },
  },
  {
    title: 'Explore the product',
    what: 'The kit opens your product, visits its pages, and writes a map with a screenshot of each screen and a selector for each control.',
    codeLabel: 'You type',
    code: 'bunx showcase explore',
    seeLabel: 'You see',
    see: "4 screen(s) mapped. Read .showcase/explore/map.md and the screenshots beside it.\nthe product's own font: Inter; main button colour: #2fa8e0",
    tip: 'After this, captions use the product\'s own font and the highlight uses its button colour.',
    more: { href: '/docs/guides/explore', label: 'Guide 10: Explore the product' },
  },
  {
    title: 'Get the work order',
    what: 'plan prints what the video needs: the number of scenes, the words for each, the shapes, and the safety rules.',
    codeLabel: 'You type',
    code: 'bunx showcase plan',
    seeLabel: 'Why words are counted',
    see: 'The voice reads about 3 words a second,\nso 30 words is roughly ten seconds.\nA scene lasts as long as its line.',
    tip: 'Write each line first, one idea per scene, in plain words. The clicks come after.',
    more: { href: '/docs/guides/length', label: 'Guide 2: Set the length' },
  },
  {
    title: 'Write the scenes',
    what: 'Write video.ts yourself, or let Claude Code do it. The skill makes the agent work like an editor: script first, draft, render, verify.',
    codeLabel: 'In Claude Code',
    code: '/kwartz-showcase a 30 second video for new users, show how to find what changed',
    seeLabel: 'The agent then',
    see: 'runs showcase explore and reads the map\nruns showcase plan and follows the word budget\nwrites video.ts\nruns showcase make --draft until every scene works\nruns showcase make and reports each check',
    tip: 'No API key is needed in Claude Code. If the product needs a sign-in, run showcase login yourself: the agent must never be given a password.',
    more: { href: '/docs/guides/with-claude-code', label: 'Guide 11: With Claude Code' },
  },
  {
    title: 'Draft, then render',
    what: 'A draft has no voice, music or effects. Use it to get every step working. Then render the real thing, and the checks print after it.',
    codeLabel: 'You type',
    code: 'bunx showcase make --draft\nbunx showcase make',
    seeLabel: 'The checks',
    see: 'ok    picture      h264 1920x1080 at 30/1 fps\nok    length       31.4 s (target 30 to 60 s)\nok    loudness     -16.2 LUFS, peak -1.4 dBTP (target -16)\nok    captions     8 cues, longest 89 characters\nok    fonts        all loaded',
    tip: 'If a draft stops, the message names the scene, and out/failed.png shows the page at that moment.',
    more: { href: '/docs/troubleshooting', label: 'Troubleshooting' },
  },
  {
    title: 'Watch and share',
    what: 'The videos are in the out folder: one file per shape, and a named copy for each platform.',
    codeLabel: 'In out/',
    code: 'demo.landscape.mp4      demo.youtube.mp4\ndemo.vertical.mp4       demo.instagram-reel.mp4',
    seeLabel: 'Before sharing',
    see: 'not checked: how the voice, music and effects sound.\nListen once before sharing.',
    tip: 'To change what is said, edit a line and render again. Only changed lines are voiced again.',
    more: { href: '/docs/craft-guide', label: 'Craft guide' },
  },
]
