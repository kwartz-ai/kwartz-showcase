import type { MetadataRoute } from 'next'
import { DOCS, hrefOf } from '@/lib/docs'
import { THEMES } from '@/lib/kit'
import { abs } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: abs(path), changeFrequency: 'monthly', priority })
  return [
    page('/', 1),
    page('/docs', 0.9),
    page('/docs/first-video', 0.9),
    page('/themes', 0.8),
    ...DOCS.map((d) => page(hrefOf(d), d.section === 'start' ? 0.8 : 0.6)),
    ...THEMES.map((t) => page(`/themes/${t.name}`, 0.6)),
    page('/changelog', 0.4),
  ]
}
