// Theme facts, copied from the kit's source by scripts/sync-kit.ts. Nothing here is typed by hand.
import kit from '@/lib/generated/kit.json'

export type KitTheme = (typeof kit.themes)[number]

export const THEMES: KitTheme[] = kit.themes
export const FONT_PRESETS = kit.fontPresets

export const themeNamed = (name: string) => THEMES.find((t) => t.name === name) ?? null

/** How things arrive on screen in a theme, in words. */
export const ENTRANCES: Record<string, string> = {
  rise: 'Rise: things slide up into place',
  pop: 'Pop: things spring in with a small bounce',
  cut: 'Cut: things appear at once, no easing',
  float: 'Float: things drift in softly',
  type: 'Type: text is typed out',
  depth: 'Depth: things come forward from behind',
}

export const FEELS: Record<string, string> = {
  calm: 'calm',
  crisp: 'crisp',
  lively: 'lively',
}

export const fontsOf = (t: KitTheme) => (t.display === t.text ? t.display : `${t.display}, ${t.text}`)

export const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const videoOf = (name: string, shape: 'landscape' | 'vertical') => `/videos/${name}-${shape}.mp4`
export const posterOf = (name: string, shape: 'landscape' | 'vertical') => `/posters/${name}-${shape}.jpg`

/** Turn one of the kit's CSS strings ("background:#fff;border-radius:10px") into a React style. */
export function cssToStyle(css: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of css.split(';')) {
    const i = part.indexOf(':')
    if (i < 0) continue
    const key = part.slice(0, i).trim()
    const value = part.slice(i + 1).trim()
    if (!key || !value) continue
    out[key.startsWith('-webkit-') ? 'Webkit' + camel(key.slice(8), true) : camel(key, false)] = value
  }
  return out
}

function camel(key: string, upperFirst: boolean) {
  const c = key.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase())
  return upperFirst ? c.charAt(0).toUpperCase() + c.slice(1) : c
}
