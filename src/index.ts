// Kwartz AI Video: the public API.
// A video file imports from here; everything else is used by the `kav` command.
export { defineVideo, loadVideo, resolveVideo } from './config.ts'
export { endCard, hookCard, stepsCard, titleCard } from './cards.ts'
export type { EndCard, HookCard, StepsCard } from './cards.ts'
export { defaultTheme, resolveTheme } from './theme.ts'
export type { Theme, ThemeInput } from './theme.ts'
export { Stage } from './stage.ts'
export type { Side } from './stage.ts'
export { remix, render } from './render.ts'
export type { RenderOptions } from './render.ts'
export { verify } from './verify.ts'
export type { Check } from './verify.ts'
export type { Layout, Scene, SceneContext, SoundOptions, Take, VideoConfig, VoiceOptions } from './types.ts'
