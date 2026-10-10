// The kit's own docs, read from ../docs by scripts/sync-docs.mjs before every dev and build.
import data from '@/lib/generated/docs.json'

export interface Doc {
  slug: string
  section: string
  source: string
  number: number | null
  title: string
  body: string
  description: string
  headings: { depth: number; text: string }[]
  words: number
}

export const SECTIONS: { id: string; title: string }[] = data.sections
export const DOCS: Doc[] = data.docs
export const CHANGELOG: string = data.changelog

export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug) ?? null
export const docsIn = (section: string) => DOCS.filter((d) => d.section === section)
export const hrefOf = (d: Doc) => '/docs/' + d.slug

/** Reading time at 200 words a minute. */
export const minutes = (d: Doc) => Math.max(1, Math.round(d.words / 200))

export function neighbours(slug: string): { prev: Doc | null; next: Doc | null } {
  const i = DOCS.findIndex((d) => d.slug === slug)
  return { prev: i > 0 ? DOCS[i - 1]! : null, next: i >= 0 && i < DOCS.length - 1 ? DOCS[i + 1]! : null }
}

/** The same ids rehype-slug gives headings, for the "on this page" list. */
export function headingId(text: string, seen: Map<string, number>) {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
  const n = seen.get(base) ?? 0
  seen.set(base, n + 1)
  return n ? `${base}-${n}` : base
}
