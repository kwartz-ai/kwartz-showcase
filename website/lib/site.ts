import kit from '@/lib/generated/kit.json'

/** Where the site lives. Set NEXT_PUBLIC_SITE_URL in Vercel once the domain is chosen. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showcase.kwartz.ai').replace(/\/$/, '')

export const SITE = {
  name: 'Kwartz Showcase',
  short: 'Showcase',
  tagline: 'Demo videos, written not recorded',
  description:
    'Narrated product demo videos rendered from a script. Playwright films your real app, a local voice reads the narration, FFmpeg joins them. No recording, no editing, no paid tools.',
  version: kit.version,
  license: kit.license,
  repo: kit.repository,
} as const

export const NAV = [
  { href: '/docs', label: 'Docs' },
  { href: '/docs/first-video', label: 'First video' },
  { href: '/themes', label: 'Themes' },
  { href: '/studio', label: 'Studio' },
  { href: '/changelog', label: 'Changelog' },
] as const

export const abs = (path: string) => SITE_URL + (path.startsWith('/') ? path : '/' + path)
