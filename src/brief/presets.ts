// The presets a brief can name: shapes, platforms, lengths and motion feels.
// Platform sizes and safe areas change over time. Keep them here, in one place,
// and update LAST_CHECKED when they are verified against the platforms' own pages.
import type { Layout } from '../core/types.ts'
import { resolveLayout } from '../video/define.ts'

export const LAST_CHECKED = '2026-10-10'

/** How a product page is placed in the frame.
 *  fill: the page is the whole video.
 *  framed: the page is a window in the upper part of a tall frame, with large
 *    captions below it. For desktop products on phone-shaped video.
 *  fit: the whole landscape page, small, on the tall frame. Quick reposts only.
 *  responsive: the page at phone width, so the product shows its mobile layout. */
export type LayoutMode = 'fill' | 'framed' | 'fit' | 'responsive'

export interface FormatPreset {
  width: number
  height: number
  ratio: string
  /** The layout used when the brief does not choose one. */
  mode: LayoutMode
  /** Share of the frame the platform covers with its own text and buttons. */
  safe: { top: number; bottom: number }
}

export const FORMATS: Record<string, FormatPreset> = {
  landscape: { width: 1920, height: 1080, ratio: '16:9', mode: 'fill', safe: { top: 0, bottom: 0 } },
  vertical: { width: 1080, height: 1920, ratio: '9:16', mode: 'framed', safe: { top: 0.12, bottom: 0.2 } },
  square: { width: 1080, height: 1080, ratio: '1:1', mode: 'fill', safe: { top: 0, bottom: 0 } },
  portrait: { width: 1080, height: 1350, ratio: '4:5', mode: 'fill', safe: { top: 0, bottom: 0 } },
  classic: { width: 1440, height: 1080, ratio: '4:3', mode: 'fill', safe: { top: 0, bottom: 0 } },
  wide: { width: 2560, height: 1080, ratio: '21:9', mode: 'fill', safe: { top: 0, bottom: 0 } },
  tall: { width: 1080, height: 1620, ratio: '2:3', mode: 'framed', safe: { top: 0.04, bottom: 0.06 } },
}

/** short: watched on a phone, sound often off. feed: starts silent in a scroll.
 *  watch: chosen and watched through. share: sent to someone directly. */
export type PlatformKind = 'short' | 'feed' | 'watch' | 'share'

export interface PlatformPreset { label: string; format: string; kind: PlatformKind }

export const PLATFORMS: Record<string, PlatformPreset> = {
  'youtube': { label: 'YouTube', format: 'landscape', kind: 'watch' },
  'youtube-shorts': { label: 'YouTube Shorts', format: 'vertical', kind: 'short' },
  'instagram-reel': { label: 'Instagram Reels', format: 'vertical', kind: 'short' },
  'instagram-story': { label: 'Instagram Stories', format: 'vertical', kind: 'short' },
  'instagram-feed': { label: 'Instagram feed', format: 'portrait', kind: 'feed' },
  'facebook': { label: 'Facebook feed', format: 'portrait', kind: 'feed' },
  'facebook-reel': { label: 'Facebook Reels', format: 'vertical', kind: 'short' },
  'tiktok': { label: 'TikTok', format: 'vertical', kind: 'short' },
  'linkedin': { label: 'LinkedIn feed', format: 'square', kind: 'feed' },
  'x': { label: 'X', format: 'landscape', kind: 'feed' },
  'whatsapp-status': { label: 'WhatsApp Status', format: 'vertical', kind: 'short' },
  'snapchat': { label: 'Snapchat', format: 'vertical', kind: 'short' },
  'pinterest': { label: 'Pinterest', format: 'tall', kind: 'feed' },
  'website': { label: 'Website', format: 'landscape', kind: 'watch' },
  'share': { label: 'Email, chat and decks', format: 'landscape', kind: 'share' },
}

/** The longest a video usually works for each kind of platform, seconds. Common
 *  practice, used for a warning only; a platform's hard limit may differ. */
export const KIND_ADVICE: Record<PlatformKind, { maxSec: number; note: string }> = {
  short: { maxSec: 60, note: 'short vertical video works best at 60 seconds or under, with the problem on screen in the first 2 seconds' },
  feed: { maxSec: 90, note: 'feed video starts silent while people scroll, so the first frame must make sense as a still' },
  watch: { maxSec: 300, note: 'use chapters when the video is over 90 seconds' },
  share: { maxSec: 120, note: 'keep it short: it is sent as an attachment or a link' },
}

// the feels and backdrops are plain data, kept apart so a web page can use them
export { BACKDROPS, MOTION_FEELS, type MotionFeel } from './looks.ts'

const CAPTION_BAND = 250          // canvas px kept for captions under a framed window
const LANDSCAPE_ZOOM = 1.25       // the page lays out 1536 wide in a 1920 frame
const UNZOOMED_UI = 1.7           // overlay size when the page is filmed at zoom 1
const FRAMED_ZOOM = 1.3           // a framed page lays out about 830 wide, so its type reads on a phone

/** The layout for a shape: a preset name, or a custom width and height. */
export function layoutFor(format: string | { width: number; height: number }, mode?: LayoutMode, fps = 30): Layout {
  const preset: FormatPreset = typeof format === 'string'
    ? (FORMATS[format] ?? fail(`unknown shape "${format}". Use one of: ${Object.keys(FORMATS).join(', ')}, or a width and height.`))
    : { ...format, ratio: 'custom', mode: format.width >= format.height ? 'fill' : 'framed', safe: { top: 0, bottom: 0 } }
  const { width: W, height: H, safe } = preset
  const use = mode ?? preset.mode
  const top = Math.round(H * safe.top), bottom = Math.round(H * safe.bottom)

  if (use === 'fill' || use === 'responsive') {
    // a wide frame is zoomed so type reads well; a narrow one is filmed as it is,
    // with larger overlays. 'responsive' zooms until the page is phone width.
    const zoom = use === 'responsive' ? W / 432 : W >= 1400 ? (W === 1440 ? 1.125 : LANDSCAPE_ZOOM) : 1
    return resolveLayout({ width: W, height: H, zoom, fps, ui: zoom === 1 ? UNZOOMED_UI : 1, mode: 'fill', captions: 'page', safe: { top, bottom } })
  }
  const usable = H - top - bottom - CAPTION_BAND
  if (use === 'framed') {
    // the product keeps a desktop layout in a window as wide as the frame
    const h = Math.min(W, usable)
    return resolveLayout({
      width: W, height: h, zoom: FRAMED_ZOOM, fps, ui: UNZOOMED_UI / FRAMED_ZOOM, mode: 'framed', captions: 'composite',
      canvas: { width: W, height: H }, window: { x: 0, y: top, width: W, height: h },
      captionBand: { y: top + h, height: CAPTION_BAND }, safe: { top, bottom },
    })
  }
  // fit: the whole landscape page, scaled to the frame's width
  const h = Math.round(W * 9 / 16)
  const y = top + Math.max(0, Math.round((usable - h) / 2))
  return resolveLayout({
    width: 1920, height: 1080, zoom: LANDSCAPE_ZOOM, fps, ui: 1, mode: 'fit', captions: 'composite',
    canvas: { width: W, height: H }, window: { x: 0, y, width: W, height: h },
    captionBand: { y: y + h, height: CAPTION_BAND }, safe: { top, bottom },
  })
}

function fail(message: string): never {
  throw new Error(message)
}
