import type { Page } from 'playwright'
import type { Stage } from './stage.ts'
import type { Theme, ThemeInput } from './theme.ts'

/** The frame: a window of `width` x `height` with the page zoomed by `zoom`, so the
 *  app lays out as on a (width / zoom)-wide screen while frames stay full size. */
export interface Layout {
  width: number
  height: number
  zoom: number
  fps: number
}

export interface SceneContext {
  page: Page
  /** Pointer, spotlight, camera, cards and dissolves. */
  stage: Stage
  baseUrl: string
  theme: Theme
  /** Length of this scene's narration, ms. */
  sayMs: number
  /** Wait for a point in this scene's narration: 0 is its start, 1 its end. */
  untilSaid: (fraction: number) => Promise<void>
  sleep: (ms: number) => Promise<void>
}

export interface Scene {
  id: string
  /** The spoken line. Also the captions, unless `caption` is set. */
  say: string
  /** Caption text when it must differ from what is spoken (for example "EDI" for a
   *  line that spells out "E.D.I." so the voice reads it right). */
  caption?: string
  run: (ctx: SceneContext) => Promise<void>
}

export interface VoiceOptions {
  /** A Kokoro voice name, for example "af_heart". */
  voice: string
  speed: number
}

export interface SoundOptions {
  /** false for no music, "generated" for the built-in soft pad, or a path to a track. */
  music: false | 'generated' | (string & {})
  /** Music level against the voice (1 is equal). */
  musicGain: number
  /** Effects on clicks, callouts and dissolves. */
  effects: boolean
  /** Loudness target for the whole mix, LUFS. */
  lufs: number
}

export interface VideoConfig {
  /** Names the output files: out/<name>.mp4, .vtt and .take.json. */
  name: string
  /** The app to film. Not needed when `serve` is set. */
  baseUrl?: string
  /** A folder of static files to serve and film, relative to the video file. */
  serve?: string
  scenes: Scene[]
  /** Runs before recording starts: sign in, open the first screen, wait for data. */
  prepare?: (ctx: Pick<SceneContext, 'page' | 'baseUrl' | 'theme'>) => Promise<void>
  /** The element that holds the whole app, scaled by the camera. Found
   *  automatically (#root, #app, #__next, #__nuxt, main) when not set. */
  appRoot?: string
  layout?: Partial<Layout>
  theme?: ThemeInput
  voice?: Partial<VoiceOptions>
  sound?: Partial<SoundOptions>
  /** Silence before each scene's narration and the pause after it, ms. */
  pace?: { leadMs?: number; tailMs?: number }
  /** Text that must never appear on screen (a real customer's name, say). The
   *  render fails its checks if any scene shows one. */
  banned?: (string | RegExp)[]
  /** The length the finished video should have, seconds. Checked after rendering. */
  target?: { minSec?: number; maxSec?: number }
}

export interface ResolvedVideo extends Required<Pick<VideoConfig, 'name' | 'scenes' | 'banned'>> {
  baseUrl: string
  serve: string | null
  prepare: VideoConfig['prepare']
  appRoot: string | null
  layout: Layout
  theme: Theme
  voice: VoiceOptions
  sound: SoundOptions
  pace: { leadMs: number; tailMs: number }
  target: { minSec?: number; maxSec?: number }
  /** Folder of the video file; `out/` is created beside it. */
  dir: string
}

export interface Frame { file: string; t: number }
export interface Cue { text: string; start: number; end: number }
export interface Dissolve { t1: number; t2: number; ms: number }
export type EventKind = 'click' | 'callout' | 'whoosh'
export interface StageEvent { t: number; kind: EventKind }
export interface Clip { file: string; at: number; gain?: number }

/** Everything one recording produced. Saved so the file can be rebuilt (a new
 *  sound mix, say) without opening the browser again. */
export interface Take {
  draft: boolean
  frames: Frame[]
  endMs: number
  audio: Clip[]
  cues: Cue[]
  events: StageEvent[]
  dissolves: Dissolve[]
  /** Visible text sampled at the end of each scene, for the banned-text check. */
  seen: { id: string; text: string }[]
  missingFonts: string[]
}
