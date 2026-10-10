import type { Page } from 'playwright'
import type { Stage } from '../capture/stage.ts'
import type { Theme, ThemeInput } from './theme.ts'

/** The frame: a window of `width` x `height` with the page zoomed by `zoom`, so the
 *  app lays out as on a (width / zoom)-wide screen while frames stay full size. */
export interface Layout {
  /** Size of what the browser films. In a 'fill' layout this is the whole video. */
  width: number
  height: number
  zoom: number
  fps: number
  /** Multiplier for everything the stage draws (captions, labels, pointer), so
   *  they stay readable when the page is not zoomed. */
  ui: number
  /** 'fill': the filmed page is the video. 'framed' and 'fit': the filmed page is
   *  a window placed on a larger canvas, with captions drawn on the canvas. */
  mode: 'fill' | 'framed' | 'fit'
  /** The finished video. Equal to width x height in a 'fill' layout. */
  canvas: { width: number; height: number }
  /** Where the filmed page sits on the canvas. */
  window: { x: number; y: number; width: number; height: number }
  /** 'page': captions are overlays in the filmed page. 'composite': they are
   *  drawn on the canvas afterwards, in `captionBand`. */
  captions: 'page' | 'composite'
  captionBand: { y: number; height: number }
  /** Canvas px at the top and bottom that a platform covers with its own text
   *  and buttons. Nothing important is placed there. */
  safe: { top: number; bottom: number }
}

/** The closing line of a video and where it sends the viewer. */
export interface Cta { text: string; sub?: string }

export interface SceneContext {
  page: Page
  /** Pointer, spotlight, camera, cards and dissolves. */
  stage: Stage
  baseUrl: string
  theme: Theme
  /** The shape being rendered, for example "landscape" or "vertical". */
  format: string
  layout: Layout
  /** The call to action from the brief, when there is one. */
  cta: Cta | null
  /** Length of this scene's narration, ms. */
  sayMs: number
  /** Wait for a point in this scene's narration: 0 is its start, 1 its end. */
  untilSaid: (fraction: number) => Promise<void>
  sleep: (ms: number) => Promise<void>
}

export interface Scene {
  id: string
  /** The spoken line. Also the captions, unless `caption` is set. A clip scene may
   *  leave it empty: the clip then plays for its own length with no narration. */
  say: string
  /** Caption text when it must differ from what is spoken (for example "EDI" for a
   *  line that spells out "E.D.I." so the voice reads it right). */
  caption?: string
  /** An app scene: steps on the real product, filmed as the browser paints. */
  run?: (ctx: SceneContext) => Promise<void>
  /** A motion scene: full-screen graphics as HTML with CSS animations, rendered
   *  frame by frame so every frame is exact. Give one of `run` or `motion`. */
  motion?: (ctx: MotionContext) => string
  /** A clip scene: a finished video file placed on the timeline. A path beside the
   *  video file, or an object to trim it, fill the frame, or keep its sound. */
  clip?: string | ClipSpec
  /** Leave the scene out of every shape not listed here. */
  formats?: string[]
}

export interface ClipSpec {
  /** The video file, beside the video file or config. */
  file: string
  /** contain: the whole clip, inside the frame. cover: fill the frame, cut the overflow. */
  fit?: 'contain' | 'cover'
  /** Keep the clip's own sound, under the narration. Default: silent. */
  sound?: boolean
  /** Start this many seconds into the clip. */
  from?: number
  /** Use this many seconds of it. Default: to its end. */
  seconds?: number
}

export interface MotionContext {
  theme: Theme
  /** Length of this scene's narration, ms. Cards use it to time themselves. */
  sayMs: number
  format: string
  layout: Layout
  cta: Cta | null
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
  /** The name of the shape, passed to scenes. */
  format?: string
  cta?: Cta | null
  /** Motion scenes: blur moving things as a camera would. */
  motion?: { blur?: boolean }
  /** A saved browser session to start from (see `showcase login`). */
  session?: string | null
  /** Block every request that would change data, except those matching `allow`. */
  readOnly?: boolean | { allow?: string[] }
  /** The rounded border and backdrop around the picture. On by default; false
   *  turns it off, an object changes parts of it. */
  border?: boolean | Partial<Omit<Border, 'on'>>
}

/** The picture set a little smaller on a soft backdrop, with rounded corners. */
export interface Border {
  on: boolean
  /** Space around the picture, as a share of the frame on each side. */
  inset: number
  /** Corner radius, as a share of the frame's short side. */
  radius: number
  /** Backdrop colours: from, to, and the glow at the sides. */
  colors: [string, string, string]
  /** How dark the shadow under the picture is, 0 to 1. */
  shadow: number
  /** What is drawn in the backdrop: soft glows at the sides, flowing ribbons, or
   *  the plain slope of colour. */
  pattern: 'glow' | 'waves' | 'plain'
  /** A picture to use as the backdrop in place of the colours. */
  image: string | null
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
  format: string
  cta: Cta | null
  motion: { blur: boolean }
  session: string | null
  readOnly: { on: boolean; allow: string[] }
  border: Border
  /** Folder of the video file; `out/` is created beside it. */
  dir: string
}

export interface Frame { file: string; t: number }
export interface Cue { text: string; start: number; end: number }
export interface Dissolve { t1: number; t2: number; ms: number }
export type EventKind = 'click' | 'callout' | 'whoosh'
/** A caption drawn on the canvas instead of in the page. */
/** Something that sits where it should not: cut off, off screen, or covered. */
export interface LayoutIssue { scene: string; problem: string }

export interface CaptionImage { file: string; start: number; end: number }
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
  /** Captions as images, when the layout draws them on the canvas. */
  captionImages?: CaptionImage[]
  /** Requests that read-only mode refused, as "METHOD url". */
  blocked?: string[]
  /** What the layout check found. Present (and empty) when everything was measured
   *  and sat inside its area. */
  layout?: LayoutIssue[]
}
