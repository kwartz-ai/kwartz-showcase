// Checks on a finished render. Everything here is measured from the file and the
// take; none of it replaces watching the video, and nothing here can hear it.
import fs from 'node:fs'
import { CAPTION_MAX } from '../render/captions.ts'
import { loudness } from '../render/encode.ts'
import { outFiles } from '../render/render.ts'
import type { ResolvedVideo, Take } from '../core/types.ts'
import { run } from '../core/util.ts'

export interface Check { name: string; ok: boolean; detail: string }

/** Dissolves that held the old screen for over a second and were still holding when
 *  the next line of narration began. A hold is fine while the viewer is still
 *  reading the old screen; it is not fine once the voice has moved on. */
export function lateHolds(take: Pick<Take, 'dissolves' | 'audio'>): { at: number; overrunMs: number }[] {
  const voice = take.audio.map((a) => a.at).sort((a, b) => a - b)
  return take.dissolves
    .filter((d) => d.t2 - d.t1 > 1000)
    .map((d) => ({ at: d.t1, overrunMs: d.t2 - (voice.find((v) => v > d.t1) ?? Infinity) }))
    .filter((h) => h.overrunMs > 300)
}

/** Scenes whose page text contained a banned word or pattern. */
export function bannedHits(take: Pick<Take, 'seen'>, banned: (string | RegExp)[]): string[] {
  const hits: string[] = []
  for (const s of take.seen) {
    for (const b of banned) {
      const found = typeof b === 'string' ? s.text.toLowerCase().includes(b.toLowerCase()) : b.test(s.text)
      if (found) hits.push(`${s.id}: ${b}`)
    }
  }
  return hits
}

export async function verify(video: ResolvedVideo): Promise<Check[]> {
  const files = outFiles(video)
  if (!fs.existsSync(files.mp4) || !fs.existsSync(files.take)) {
    return [{ name: 'render exists', ok: false, detail: `nothing rendered yet for "${video.name}"` }]
  }
  const take = JSON.parse(fs.readFileSync(files.take, 'utf8')) as Take
  const { layout, target, sound } = video
  const checks: Check[] = []

  const probe = JSON.parse(await run('ffprobe', ['-v', 'error', '-print_format', 'json',
    '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', files.mp4])) as {
    format: { duration: string }
    streams: { codec_type: string; codec_name: string; width?: number; height?: number; r_frame_rate?: string }[]
  }
  const v = probe.streams.find((s) => s.codec_type === 'video')
  const a = probe.streams.find((s) => s.codec_type === 'audio')
  const secs = parseFloat(probe.format.duration)
  checks.push({
    name: 'picture',
    ok: v?.codec_name === 'h264' && v.width === layout.canvas.width && v.height === layout.canvas.height && v.r_frame_rate === `${layout.fps}/1`,
    detail: `${v?.codec_name} ${v?.width}x${v?.height} at ${v?.r_frame_rate} fps`,
  })
  checks.push({
    name: 'length',
    ok: (target.minSec == null || secs >= target.minSec) && (target.maxSec == null || secs <= target.maxSec),
    detail: `${secs.toFixed(1)} s` + (target.minSec != null || target.maxSec != null ? ` (target ${target.minSec ?? 0} to ${target.maxSec ?? 'any'} s)` : ''),
  })
  if (take.draft) {
    checks.push({ name: 'sound', ok: true, detail: 'draft render: no voice, music or effects' })
  } else {
    const l = a ? await loudness(files.mp4) : null
    checks.push({
      name: 'loudness',
      ok: !!l && Math.abs(l.lufs - sound.lufs) <= 1.5,
      detail: l ? `${l.lufs.toFixed(1)} LUFS, peak ${l.peak.toFixed(1)} dBTP (target ${sound.lufs})` : 'no audio stream',
    })
  }
  const longest = Math.max(0, ...take.cues.map((c) => c.text.length))
  checks.push({ name: 'captions', ok: longest <= CAPTION_MAX, detail: `${take.cues.length} cues, longest ${longest} characters` })
  const late = lateHolds(take)
  checks.push({
    name: 'holds',
    ok: late.length === 0,
    detail: late.length
      ? late.map((h) => `the hold at ${(h.at / 1000).toFixed(1)} s runs ${Math.round(h.overrunMs)} ms into the next line`).join('; ')
      : `${take.dissolves.length} dissolves, none still holding when the next line starts`,
  })
  const hits = bannedHits(take, video.banned)
  checks.push({
    name: 'banned text',
    ok: hits.length === 0,
    detail: hits.length ? hits.join('; ') : video.banned.length ? `none of ${video.banned.length} banned terms on any screen` : 'no banned terms configured',
  })
  if (video.readOnly.on) {
    const blocked = take.blocked ?? []
    checks.push({
      name: 'read-only',
      ok: true,
      detail: blocked.length
        ? `refused ${blocked.length} request(s) that could change data: ${blocked.slice(0, 3).join(', ')}${blocked.length > 3 ? ', ...' : ''}. If the product needs one of them to show a screen, add it to "safety.allow".`
        : 'on, and nothing tried to change data',
    })
  }
  if (take.layout) {
    const n = take.layout.length
    checks.push({
      name: 'layout',
      ok: n === 0,
      detail: n === 0
        ? 'every graphic, label and caption sits inside its area'
        : `${n} thing(s) cut off, off screen or covered: `
          + take.layout.slice(0, 3).map((i) => `in "${i.scene}", ${i.problem}`).join('; ') + (n > 3 ? `; and ${n - 3} more (see the render log)` : ''),
    })
  }
  checks.push({
    name: 'fonts',
    ok: take.missingFonts.length === 0,
    detail: take.missingFonts.length ? `not loaded, fallback used: ${take.missingFonts.join(', ')}` : 'all loaded',
  })
  return checks
}

export function printChecks(checks: Check[], log: (line: string) => void = console.log): boolean {
  for (const c of checks) log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.name.padEnd(12)} ${c.detail}`)
  log('not checked: how the voice, music and effects sound. Listen once before sharing.')
  return checks.every((c) => c.ok)
}
