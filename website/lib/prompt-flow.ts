// "From one prompt to a finished video": what happens after the theme studio's prompt
// is pasted into Claude Code, and the same journey by hand. Every command here is a
// real command of the kit, and the steps follow the prompt in lib/studio.ts.

export type Who = 'you' | 'claude' | 'kit'

export interface Stage {
  n: string
  who: Who
  title: string
  text: string
  /** The command that runs, or the file that is written. */
  runs?: string
  branches?: { when: string; then: string }[]
}

export interface Phase {
  title: string
  stages: Stage[]
}

export const PROMISE =
  'Copy the prompt into Claude Code and let it set up the project and create your video. If system dependencies are missing, Claude will guide you through installing them. Review the final video before publishing.'

export const CARRIES = [
  { what: 'What to make', text: 'A video of your website (with its address), or a presentation with no product filmed. Plus the length and where it will be posted.' },
  { what: 'Your theme', text: 'The theme file, written out in full, already checked by the engine in the studio.' },
  { what: 'Your settings', text: 'The config file, written out in full.' },
  { what: 'The steps', text: 'Ten numbered steps, each a real command of the kit, in the order below.' },
  { what: 'The rules', text: 'Stop and tell me if a step fails. Do not change the theme unless it fails its check. Look at frames before saying it is done.' },
]

export const PHASES: Phase[] = [
  {
    title: 'Before you start',
    stages: [
      {
        n: '0',
        who: 'you',
        title: 'Make the theme and copy the prompt',
        text: "In the theme studio you pick a look, a brand colour and fonts, or press Surprise me. The page runs the engine's own rules on it. Only a theme that passes can be copied.",
        runs: 'Then: open Claude Code in your project folder, and paste.',
      },
    ],
  },
  {
    title: 'Set up: Claude does this',
    stages: [
      {
        n: '1',
        who: 'claude',
        title: 'Install the kit',
        text: 'Claude makes a package.json if the folder has none, then installs the kit from npm.',
        runs: 'bun add -d kwartz-showcase',
        branches: [{ when: 'If Bun is not installed', then: 'Claude uses npm, and writes npx where the steps say bunx.' }],
      },
      {
        n: '2',
        who: 'kit',
        title: 'Check the machine',
        text: 'The kit lists five things: FFmpeg, ffprobe, the browser, Python and the voice.',
        runs: 'bunx showcase doctor',
        branches: [
          { when: 'If the browser or the voice is missing', then: 'Claude runs "bunx showcase setup" itself. It is a one-time download of about 350 MB.' },
          { when: 'If FFmpeg or Python is missing', then: 'Claude stops, tells you what to install, and waits. These are system tools, so you install them.' },
        ],
      },
      {
        n: '3',
        who: 'kit',
        title: 'Start the project',
        text: 'One command adds the config, a starter scenes file, and the skills that tell Claude how a video editor works: the editor skill, the skill of your look, and the skill for changing the theme later.',
        runs: 'bunx showcase init --config --theme <your look>',
      },
      {
        n: '4',
        who: 'claude',
        title: 'Save your theme and your settings',
        text: 'Claude writes the theme file and the config exactly as the prompt gives them.',
        runs: 'themes/<name>.json  and  showcase.config.json',
        branches: [{ when: 'If your address is a live site', then: 'The config also lists the names that must never appear on screen, or says there are none. The studio asks you for them, so Claude does not have to. The site is then filmed read-only.' }],
      },
      {
        n: '5',
        who: 'kit',
        title: 'Check the theme again',
        text: 'The same rules the studio ran, now on the saved file: safe CSS, and contrast that can be read on video.',
        runs: 'bunx showcase theme check <name>',
      },
    ],
  },
  {
    title: 'Make the video: Claude follows the editor skill',
    stages: [
      {
        n: '6',
        who: 'kit',
        title: 'Learn the product and the budget',
        text: 'For a website, the kit opens it and writes a map: every screen, a screenshot, and a selector for each control. Then it prints the work order: scenes, words, shapes and safety rules.',
        runs: 'bunx showcase explore  then  bunx showcase plan',
        branches: [{ when: 'For a presentation', then: 'Nothing is explored. The plan gives the length and the word budget.' }],
      },
      {
        n: '7',
        who: 'claude',
        title: 'Write the script, then the scenes',
        text: 'Claude writes one spoken line per scene first, then what happens on screen while it is said. It chooses the audience and the promise, and tells you which.',
        runs: 'video.ts',
      },
      {
        n: '8',
        who: 'kit',
        title: 'Draft until it is right',
        text: 'A draft is silent and fast. The kit films every scene and runs the checks. Claude reads the report, looks at frames, fixes the scenes, and drafts again.',
        runs: 'bunx showcase make --draft',
        branches: [{ when: 'If a check fails', then: 'The report names the scene and the reason: too short, something cut off, a label under a caption. Claude fixes that scene. This loop usually runs two to four times.' }],
      },
      {
        n: '9',
        who: 'kit',
        title: 'Render the real video',
        text: 'A local voice reads the narration. The kit adds captions, music and sound effects, builds the video in every shape you asked for, and measures the file.',
        runs: 'bunx showcase make',
      },
      {
        n: '10',
        who: 'claude',
        title: 'Report, and hand back to you',
        text: 'Claude looks at frames from the finished video and reports each check with the value it measured. It ends by asking you to listen once, because it cannot hear.',
        runs: 'out/<name>.mp4, one file per shape and per platform',
      },
    ],
  },
  {
    title: 'After',
    stages: [
      {
        n: 'ok',
        who: 'you',
        title: 'Review before publishing',
        text: 'Watch it with the sound on. The checks measure the file. They do not judge whether the voice sounds right, or whether the story is the one you wanted.',
        runs: 'To change what is said: edit a line in video.ts, and render again.',
      },
    ],
  },
]

export const FILES = [
  { file: 'showcase.config.json', by: 'the prompt', what: 'What the video is: address, length, platforms, theme' },
  { file: 'themes/<name>.json', by: 'the prompt', what: 'Your theme. Commit it, so everyone gets the same look' },
  { file: 'video.ts', by: 'Claude', what: 'The script and the scenes. Edit a line and render again' },
  { file: '.claude/skills/', by: 'the kit', what: 'The skills Claude follows' },
  { file: '.showcase/', by: 'the kit', what: 'Working files: the product map, chosen sounds. Not committed' },
  { file: 'out/', by: 'the kit', what: 'The videos, the captions and the frames. Not committed' },
]

export const NEEDS = [
  'Claude Code, open in a project folder',
  'Bun 1.2 or later, or Node 22.18 or later',
  'FFmpeg on your PATH',
  'Python 3.10 to 3.13, for the voice',
  'Your website running, or reachable at its address',
]

export interface ManualStep {
  title: string
  code?: string
  note?: string
}

export const MANUAL_SETUP: ManualStep[] = [
  { title: 'Install the kit', code: 'bun add -d kwartz-showcase     # or: npm install --save-dev kwartz-showcase' },
  { title: 'Check what is installed', code: 'bunx showcase doctor', note: 'Five lines. On a new machine, chromium and voice say missing.' },
  { title: 'Install the browser and the voice', code: 'bunx showcase setup', note: 'About 350 MB, shared by every project on the machine. Run doctor again: every line should say ok.' },
]

export const MANUAL_MAKE: ManualStep[] = [
  { title: 'Start the project', code: 'bunx showcase init --config', note: 'Adds showcase.config.json, video.ts and the skills. Add out/ and .showcase/ to your .gitignore.' },
  {
    title: 'Describe the video',
    code: '{\n  "name": "demo",\n  "url": "http://localhost:3000",\n  "length": 30,\n  "platforms": ["youtube", "instagram-reel"],\n  "theme": "glass"\n}',
    note: 'In showcase.config.json. Only "url" is required.',
  },
  {
    title: 'Map the product, and get the work order',
    code: 'bunx showcase explore     # screens, screenshots, a selector for each control\nbunx showcase plan        # scenes, words for each, shapes, safety rules',
    note: 'The map is .showcase/explore/map.md. The voice reads about 3 words a second, which is where the word budget comes from.',
  },
  {
    title: 'Write the scenes',
    code: "{\n  id: 'moved',\n  say: 'One click keeps only the shipments whose date moved.',\n  run: async ({ page, stage, untilSaid }) => {\n    await stage.click(page.getByRole('button', { name: 'Moved only' }))\n    await untilSaid(1)\n  },\n}",
    note: 'In video.ts: one spoken line per scene, and what happens on screen while it is said.',
  },
  {
    title: 'Draft, then render',
    code: 'bunx showcase make --draft     # picture only, until every check says ok\nbunx showcase make             # voice, music, effects, every shape',
    note: 'If a draft stops, the message names the scene, and out/failed.png shows the page at that moment.',
  },
  { title: 'Watch it, with the sound on', note: 'The videos are in out/: one per shape, and a named copy per platform. The checks measure the file. They cannot hear it.' },
]

export const COMMANDS = [
  { cmd: 'showcase doctor', does: 'Shows what is installed and what is missing' },
  { cmd: 'showcase setup', does: 'One-time: the browser and the voice' },
  { cmd: 'showcase init --config', does: 'Starts a video: config, scenes file, skills' },
  { cmd: 'showcase init --config --motion', does: 'Starts a presentation: no product is filmed' },
  { cmd: 'showcase explore', does: "Maps the product's screens and controls" },
  { cmd: 'showcase plan', does: 'Prints the work order' },
  { cmd: 'showcase make --draft', does: 'Every shape, picture only' },
  { cmd: 'showcase make', does: 'Every shape, with sound and checks' },
  { cmd: 'showcase make --theme clay', does: 'Tries a theme for one run, beside the others' },
  { cmd: 'showcase themes', does: 'Lists the themes, and your own' },
  { cmd: 'showcase theme new acme --from glass --accent "#FF5A1F"', does: 'Starts a theme of your own' },
  { cmd: 'showcase theme check acme', does: 'Is it safe, and readable on video?' },
  { cmd: 'showcase login', does: 'Signs in once, in a visible browser, for a product that needs it' },
]

export const LATER = [
  { what: 'What is said', how: 'Edit a "say" line and run make again. Only changed lines are voiced again.' },
  { what: 'The look', how: 'Change "theme" in the config.' },
  { what: 'The length', how: 'Change "length", then run plan for the new word budget.' },
  { what: 'Where it goes', how: 'Change "platforms". Each platform gets its own file.' },
]

export const TROUBLE = [
  { what: 'A command is not found', how: 'Run showcase doctor.' },
  { what: 'The length check fails', how: 'The report says how many words to add or cut.' },
  { what: 'The layout check fails', how: 'Something is cut off or under a caption. The report names the scene.' },
  { what: 'A render stops', how: 'Open out/failed.png.' },
]
