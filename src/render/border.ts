// The border: the finished picture is set a little smaller on a soft coloured
// backdrop, with rounded corners and a shadow under it, the way a screen recording
// is presented in a product video. It is added at encode time, so a remix can turn
// it on or off, or change its colours, without recording again.
import path from 'node:path'
import type { Border, Layout } from '../core/types.ts'
import { run } from '../core/util.ts'

export interface BorderBox { x: number; y: number; width: number; height: number; radius: number }

/** Where the picture sits on the canvas: the same shape as the canvas, smaller by
 *  the inset on every side. Sizes are even, as the encoder needs. */
export function borderBox(canvas: Layout['canvas'], border: Border): BorderBox {
  const even = (n: number) => Math.round(n / 2) * 2
  const scale = 1 - 2 * border.inset
  const width = even(canvas.width * scale), height = even(canvas.height * scale)
  return {
    x: Math.round((canvas.width - width) / 2), y: Math.round((canvas.height - height) / 2),
    width, height,
    // the corner follows the short side, so every shape gets the same corner
    radius: Math.round(Math.min(canvas.width, canvas.height) * border.radius),
  }
}

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

/** A rounded rectangle as a grey picture: white inside, black outside, with a soft
 *  one pixel edge so the corner is not jagged. */
export function maskFilter(box: BorderBox): string {
  const { width: w, height: h, radius: r } = box
  const d = `hypot(max(0,abs(X-${(w - 1) / 2})-${w / 2 - r}),max(0,abs(Y-${(h - 1) / 2})-${h / 2 - r}))`
  // square corners need no rounding at all: the formula below would leave the whole
  // picture half see-through, and the video would come out dimmed
  if (r <= 0) return `color=c=white:s=${w}x${h},format=gray`
  return `nullsrc=s=${w}x${h},format=gray,geq=lum='255*clip(${r}+0.5-${d},0,1)'`
}

/** The backdrop, drawn small and scaled up: a slope from the first colour to the
 *  second, and on it either soft glows of the third colour at the sides, flowing
 *  ribbons of it, or nothing. */
export function backdropFilter(canvas: Layout['canvas'], colors: Border['colors'], pattern: Border['pattern'] = 'glow'): string {
  const [a, b, glow] = colors.map(rgb) as [[number, number, number], [number, number, number], [number, number, number]]
  const W = Math.max(16, Math.round(canvas.width / 8)), H = Math.max(16, Math.round(canvas.height / 8))
  const t = `((X/${W})+(Y/${H}))/2`
  const blob = (cx: number, cy: number, s: number) => `exp(-(pow(X-${(cx * W).toFixed(1)},2)+pow(Y-${(cy * H).toFixed(1)},2))/${(2 * (s * W) ** 2).toFixed(1)})`
  // a ribbon is a wave line made thin by a high power; three of them cross the frame
  const ribbon = (lines: number, bend: number, lean: number, shift: number) =>
    `pow(0.5+0.5*sin(Y/${H}*${lines}+${bend}*sin(X/${W}*3.1+${shift})+X/${W}*${lean}),8)`
  const g = pattern === 'plain' ? '0'
    : pattern === 'waves' ? `min(1,0.55*${ribbon(5, 2.2, 2, 0)}+0.4*${ribbon(8, 1.4, -1.5, 1.7)}+0.5*${blob(0, 0.55, 0.12)}+0.5*${blob(1, 0.3, 0.11)})`
      : `min(1,${blob(0, 0.5, 0.13)}+${blob(1, 0.32, 0.12)}+0.6*${blob(0.5, 1.05, 0.22)})`
  const channel = (i: number) => `'(${a[i]}+(${b[i]}-${a[i]})*${t})*(1-${g})+${glow[i]}*${g}'`
  return `nullsrc=s=${W}x${H},format=rgb24,geq=r=${channel(0)}:g=${channel(1)}:b=${channel(2)},`
    + `scale=${canvas.width}:${canvas.height}:flags=bicubic,gblur=sigma=${Math.round(canvas.width / (pattern === 'waves' ? 240 : 96))}`
}

/** A picture as the backdrop: scaled to cover the frame, the overflow cut off. */
export function imageBackdropFilter(canvas: Layout['canvas']): string {
  return `scale=${canvas.width}:${canvas.height}:force_original_aspect_ratio=increase,crop=${canvas.width}:${canvas.height},setsar=1`
}

export interface BorderAssets { backdrop: string; mask: string; box: BorderBox }

/** Draw the two still pictures the border needs: the mask of the rounded picture,
 *  and the backdrop with the picture's shadow already on it. */
export async function buildBorder(layout: Layout, border: Border, workDir: string): Promise<BorderAssets> {
  const { canvas } = layout
  const box = borderBox(canvas, border)
  const mask = path.join(workDir, 'border-mask.png')
  const backdrop = path.join(workDir, 'border-backdrop.png')
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', maskFilter(box), '-frames:v', '1', mask])
  const drop = Math.round(canvas.height * 0.011), soft = Math.round(canvas.height * 0.022)
  const base = border.image
    ? { input: ['-i', border.image], pre: `[0:v]${imageBackdropFilter(canvas)}[bg];` }
    : { input: ['-f', 'lavfi', '-i', backdropFilter(canvas, border.colors, border.pattern)], pre: '[0:v]null[bg];' }
  await run('ffmpeg', ['-y', '-v', 'error', ...base.input, '-i', mask,
    '-filter_complex', base.pre
    +
    // the mask, moved down a little and blurred, becomes the shadow's strength
    `[1:v]format=gray,pad=${canvas.width}:${canvas.height}:${box.x}:${box.y + drop}:black,gblur=sigma=${soft},lut=y=val*${border.shadow}[strength];`
    + `color=c=black:s=${canvas.width}x${canvas.height},format=rgba[dark];[dark][strength]alphamerge[shadow];`
    + '[bg][shadow]overlay=format=auto,format=rgb24[out]',
    '-map', '[out]', '-frames:v', '1', backdrop])
  return { backdrop, mask, box }
}

/** The end of the picture filter: take the finished picture, round it, and lay it
 *  on the backdrop. `backdropAt` and `maskAt` are the numbers of those inputs. */
export function borderFilter(from: string, box: BorderBox, backdropAt: number, maskAt: number): string {
  return `[${from}]scale=${box.width}:${box.height}:flags=lanczos,format=rgba[inner];[inner][${maskAt}:v]alphamerge[rounded];`
    + `[${backdropAt}:v][rounded]overlay=${box.x}:${box.y}:format=auto,format=yuv420p[v]`
}
