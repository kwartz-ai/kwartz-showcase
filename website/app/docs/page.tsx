import Link from 'next/link'
import { ArrowRight, BookOpen, Footprints, Wrench } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { JsonLd } from '@/components/atoms/container'
import { IconBadge } from '@/components/atoms/icon-badge'
import { Pill } from '@/components/atoms/pill'
import { SectionHeading } from '@/components/molecules/section-heading'
import { DOCS, SECTIONS, docsIn, hrefOf, minutes } from '@/lib/docs'
import { breadcrumbJsonLd, pageMeta } from '@/lib/seo'

export const metadata = pageMeta({
  title: 'Documentation',
  description: `All ${DOCS.length} docs for Kwartz Showcase in reading order: a step by step first video, the user guide, sixteen feature guides, themes, fonts, and how the kit is built.`,
  path: '/docs',
})

const STARTS = [
  { href: '/docs/first-video', icon: Footprints, tint: 'mint' as const, title: 'Your first video', text: 'Ten steps, each with the command to type and what you should see.' },
  { href: '/docs/user-guide', icon: BookOpen, tint: 'violet' as const, title: 'User guide', text: 'The whole journey on one page, and how to use the skills with an AI agent.' },
  { href: '/docs/troubleshooting', icon: Wrench, tint: 'peach' as const, title: 'Troubleshooting', text: 'What to do when a render stops, a check fails, or something looks or sounds wrong.' },
]

export default function DocsIndex() {
  return (
    <div className="flex flex-col gap-12 pb-4">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Docs', path: '/docs' },
        ])}
      />
      <SectionHeading as="h1" kicker="Documentation" title="Everything, in reading order">
        Read these in order the first time. After that, search or jump to what you need.
      </SectionHeading>

      <div className="grid gap-4 md:grid-cols-3">
        {STARTS.map((s) => (
          <ClayCard key={s.href} as={Link} href={s.href} className="flex flex-col gap-3 p-5 transition-transform duration-200 hover:-translate-y-1">
            <IconBadge tint={s.tint}>
              <s.icon />
            </IconBadge>
            <h2 className="text-xl font-bold">{s.title}</h2>
            <p className="text-[0.95rem] text-muted-foreground">{s.text}</p>
          </ClayCard>
        ))}
      </div>

      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="flex scroll-mt-28 flex-col gap-4">
          <h2 className="text-2xl font-bold">{s.title}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {docsIn(s.id).map((d) => (
              <li key={d.slug} className="min-w-0">
                <ClayCard as={Link} href={hrefOf(d)} surface="flat" className="flex h-full flex-col gap-1.5 rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5">
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-heading text-lg font-bold">{d.number ? `${d.number}. ${d.title}` : d.title}</span>
                    <Pill tone="sky" className="mt-0.5">
                      {minutes(d)} min
                    </Pill>
                  </span>
                  <span className="text-sm text-muted-foreground">{d.description}</span>
                </ClayCard>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ClayLink href="/docs/first-video" className="self-start">
        Start with your first video <ArrowRight />
      </ClayLink>
    </div>
  )
}
