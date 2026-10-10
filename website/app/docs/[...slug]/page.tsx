import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react'
import { ClayCard } from '@/components/atoms/clay-card'
import { JsonLd } from '@/components/atoms/container'
import { Kicker, Pill } from '@/components/atoms/pill'
import { Markdown } from '@/components/organisms/markdown'
import { DOCS, SECTIONS, docBySlug, headingId, hrefOf, minutes, neighbours } from '@/lib/docs'
import { articleJsonLd, breadcrumbJsonLd, pageMeta } from '@/lib/seo'
import { SITE } from '@/lib/site'

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug.split('/') }))
}

export async function generateMetadata({ params }: PageProps<'/docs/[...slug]'>) {
  const { slug } = await params
  const doc = docBySlug(slug.join('/'))
  if (!doc) return {}
  return pageMeta({ title: doc.number ? `${doc.title}: feature guide ${doc.number}` : doc.title, description: doc.description, path: hrefOf(doc) })
}

export default async function DocPage({ params }: PageProps<'/docs/[...slug]'>) {
  const { slug } = await params
  const doc = docBySlug(slug.join('/'))
  if (!doc) notFound()
  const section = SECTIONS.find((s) => s.id === doc.section)!
  const { prev, next } = neighbours(doc.slug)
  const seen = new Map<string, number>()
  const toc = doc.headings.filter((h) => h.depth === 2).map((h) => ({ text: h.text, id: headingId(h.text, seen) }))

  return (
    <article className="flex flex-col gap-8 pb-4">
      <JsonLd data={articleJsonLd(doc.title, doc.description, hrefOf(doc))} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Docs', path: '/docs' },
          { name: doc.title, path: hrefOf(doc) },
        ])}
      />
      <header className="flex flex-col gap-3">
        <Kicker>
          <Link href={`/docs#${section.id}`} className="hover:text-foreground">
            {section.title}
          </Link>
          {doc.number ? ` · guide ${doc.number} of 16` : ''}
        </Kicker>
        <h1 className="max-w-3xl text-4xl font-extrabold sm:text-5xl">{doc.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="sky">{minutes(doc)} min read</Pill>
          <a href={`${SITE.repo}/blob/main/${doc.source}`} rel="noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Pencil className="size-3.5" /> Source on GitHub
          </a>
        </div>
      </header>

      {toc.length > 2 ? (
        <ClayCard as="nav" surface="flat" aria-label="On this page" className="flex max-w-[46rem] flex-col gap-2 rounded-2xl p-4">
          <Kicker>On this page</Kicker>
          <ul className="grid gap-x-6 gap-y-1 text-[0.93rem] sm:grid-cols-2">
            {toc.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="text-muted-foreground hover:text-violet-deep hover:underline">
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </ClayCard>
      ) : null}

      <Markdown source={doc.body} />

      <nav aria-label="Next and previous doc" className="grid max-w-[46rem] gap-3 pt-6 sm:grid-cols-2">
        {prev ? (
          <ClayCard as={Link} href={hrefOf(prev)} surface="flat" className="flex flex-col gap-1 rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ArrowLeft className="size-4" /> Before
            </span>
            <span className="font-heading font-bold">{prev.title}</span>
          </ClayCard>
        ) : (
          <span />
        )}
        {next ? (
          <ClayCard as={Link} href={hrefOf(next)} surface="flat" className="flex flex-col items-end gap-1 rounded-2xl p-4 text-right transition-transform hover:-translate-y-0.5">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Next <ArrowRight className="size-4" />
            </span>
            <span className="font-heading font-bold">{next.title}</span>
          </ClayCard>
        ) : null}
      </nav>
    </article>
  )
}
