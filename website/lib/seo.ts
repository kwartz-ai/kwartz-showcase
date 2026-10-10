import type { Metadata } from 'next'
import { SITE, abs } from '@/lib/site'

/** Title, description, canonical address and share cards for one page. */
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: abs(path), siteName: SITE.name, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export const softwareJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE.name,
  description: SITE.description,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Windows',
  softwareVersion: SITE.version,
  license: 'https://www.apache.org/licenses/LICENSE-2.0',
  url: abs('/'),
  codeRepository: SITE.repo,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
})

export const breadcrumbJsonLd = (trail: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: abs(t.path) })),
})

export const howToJsonLd = (name: string, description: string, steps: { title: string; what: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name,
  description,
  step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.what })),
})

export const articleJsonLd = (title: string, description: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: title,
  description,
  url: abs(path),
  publisher: { '@type': 'Organization', name: 'Kwartz' },
})
