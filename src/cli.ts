#!/usr/bin/env bun
// kav: the command line for Kwartz AI Video.
import fs from 'node:fs'
import path from 'node:path'
import { loadVideo } from './config.ts'
import { remix, render, type RenderOptions } from './render.ts'
import { doctor, setup } from './setup.ts'
import { printChecks, verify } from './verify.ts'

const HELP = `kav: narrated product demo videos, rendered from a script

  kav render <video.ts>   record every scene and build out/<name>.mp4, then check it
                          (exits 1 if a check fails; the file is still written)
      --draft             no voice, music or effects: check the picture first
      --headed            show the browser window while it records
      --base <url>        film another instance than the one in the video file
      --music <file>      use this track as the music bed
      --no-music          no music bed
      --no-sfx            no click, callout or dissolve sounds
  kav remix <video.ts>    rebuild the file from the last take, without recording
                          (takes the same --music, --no-music, --no-sfx)
  kav verify <video.ts>   measure the last render: picture, length, loudness,
                          captions, holds, banned text, fonts
  kav init [dir]          start a video in a project: video.ts and the editor skill
  kav setup               one-time: Chromium and the Kokoro voice (about 350 MB)
  kav doctor              show what is installed and what is missing
`

const [cmd, ...rest] = process.argv.slice(2)
const flag = (name: string) => rest.includes(`--${name}`)
const opt = (name: string) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 ? rest[i + 1] : undefined
}
const positional = () => {
  const withValue = new Set(['--base', '--music'])
  return rest.filter((a, i) => !a.startsWith('--') && !withValue.has(rest[i - 1] ?? ''))[0]
}
const renderOptions = (): RenderOptions => ({
  draft: flag('draft'),
  headed: flag('headed'),
  baseUrl: opt('base'),
  music: flag('no-music') ? false : opt('music'),
  effects: flag('no-sfx') ? false : undefined,
})
const videoArg = () => {
  const file = positional()
  if (!file) throw new Error(`which video? For example: kav ${cmd} video.ts`)
  return loadVideo(file)
}

function init(dir = '.'): void {
  const root = path.resolve(import.meta.dirname, '..')
  const copy = (from: string, to: string) => {
    if (fs.existsSync(to)) { console.log(`kept     ${path.relative(process.cwd(), to)} (already there)`); return }
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
    console.log(`created  ${path.relative(process.cwd(), to)}`)
  }
  copy(path.join(root, 'templates', 'starter', 'video.ts'), path.resolve(dir, 'video.ts'))
  copy(path.join(root, 'skills', 'kwartz-ai-video', 'SKILL.md'), path.resolve(dir, '.claude', 'skills', 'kwartz-ai-video', 'SKILL.md'))
  console.log('\nnext: edit video.ts, then "kav render video.ts --draft". Add "out/" to .gitignore.')
}

try {
  switch (cmd) {
    case 'render': {
      const video = await videoArg()
      const { file } = await render(video, renderOptions())
      console.log(`done: ${file}\n`)
      // the file is written either way; the exit code says whether it passed its checks
      if (!printChecks(await verify(video))) process.exitCode = 1
      break
    }
    case 'remix': {
      const video = await videoArg()
      console.log(`done: ${await remix(video, renderOptions())}\n`)
      if (!printChecks(await verify(video))) process.exitCode = 1
      break
    }
    case 'verify':
      if (!printChecks(await verify(await videoArg()))) process.exitCode = 1
      break
    case 'init':
      init(positional())
      break
    case 'setup':
      await setup()
      break
    case 'doctor':
      if (!await doctor()) process.exitCode = 1
      break
    default:
      console.log(HELP)
      if (cmd && cmd !== 'help' && cmd !== '--help' && cmd !== '-h') process.exitCode = 1
  }
} catch (e) {
  console.error(`\n${(e as Error).message}`)
  process.exitCode = 1
}
