// showcase: the command line for Kwartz Showcase.
import { parseArgs } from './args.ts'
import { cmdAuto, cmdThemes, cmdDoctor, cmdExplore, cmdInit, cmdLogin, cmdMake, cmdPlan, cmdRemix, cmdRender, cmdSetup, cmdSounds, cmdVerify } from './commands.ts'

const HELP = `showcase: narrated product demo videos, rendered from a script

From a config (showcase.config.json): describe the video, and let scenes be written for it
  showcase init --config          start a config-driven video: showcase.config.json, video.ts, the skill
                                  (--theme <name> sets a theme and adds its skill)
  showcase explore [config]       open the product and map its screens into .showcase/explore/
                                  (also takes an address; --max-pages <n>, default 8)
  showcase plan [config]          the work order: scenes, word budget, shapes, safety
  showcase make [config]          render every shape the config asks for, then check each
      --draft                     no voice, music or effects: check the picture first
      --remix                     rebuild from the last takes, without recording
      --theme <name>              render in this theme, into files named after it
  showcase themes                 list the themes: glass, clay, brutal and the rest
  showcase auto [config]          beta: explore, have Claude write the scenes through the API, draft, render
                                  (needs ANTHROPIC_API_KEY; --model <id>, --tries <n>, --force, --draft)
  showcase login [config]         sign in once in a visible browser and save the session
  showcase sounds                 list sound candidates (--role click|callout|transition, --mood "calm")

From a video file written by hand
  showcase render <video.ts>      record every scene and build out/<name>.mp4, then check it
                                  (exits 1 if a check fails; the file is still written)
      --draft                     no voice, music or effects
      --headed                    show the browser window while it records
      --base <url>                film another instance than the one in the video file
      --music <file>              use this track as the music bed
      --no-music                  no music bed
      --no-sfx                    no click, callout or dissolve sounds
      --no-border                 the picture fills the frame: no rounded border or backdrop
  showcase remix <video.ts>       rebuild the file from the last take, without recording
  showcase verify <video.ts>      measure the last render again
  showcase init [dir]             start a hand-written video: video.ts and the skill

Setting up
  showcase setup                  one-time: Chromium and the Kokoro voice (about 350 MB)
  showcase doctor                 show what is installed and what is missing
`

const [cmd, ...rest] = process.argv.slice(2)
const args = parseArgs(rest)
const COMMANDS: Record<string, () => boolean | Promise<boolean>> = {
  render: () => cmdRender(args),
  remix: () => cmdRemix(args),
  verify: () => cmdVerify(args),
  make: () => cmdMake(args),
  auto: () => cmdAuto(args),
  themes: () => cmdThemes(),
  plan: () => cmdPlan(args),
  explore: () => cmdExplore(args),
  login: () => cmdLogin(args),
  sounds: () => cmdSounds(args),
  init: () => cmdInit(args),
  setup: () => cmdSetup(),
  doctor: () => cmdDoctor(),
}

try {
  const run = cmd ? COMMANDS[cmd] : undefined
  if (!run) {
    console.log(HELP)
    if (cmd && !['help', '--help', '-h'].includes(cmd)) process.exitCode = 1
  } else if (!await run()) {
    process.exitCode = 1
  }
} catch (e) {
  console.error(`\n${(e as Error).message}`)
  process.exitCode = 1
}
