import type { ReactNode } from 'react'
import { Container } from '@/components/atoms/container'
import type { SearchEntry } from '@/components/molecules/search-box'
import { DocsSidebar, type SidebarGroup } from '@/components/organisms/docs-sidebar'
import { SiteFooter } from '@/components/organisms/site-footer'
import { SiteNav } from '@/components/organisms/site-nav'
import { DOCS, SECTIONS, docsIn, hrefOf } from '@/lib/docs'
import { THEMES } from '@/lib/kit'

const groups: SidebarGroup[] = [
  {
    title: 'Begin here',
    links: [
      { href: '/docs', label: 'All docs' },
      { href: '/docs/first-video', label: 'Your first video' },
      { href: '/studio/how-it-works', label: 'From a prompt to a video' },
    ],
  },
  ...SECTIONS.map((s) => ({
    title: s.title,
    links: docsIn(s.id).map((d) => ({ href: hrefOf(d), label: d.number ? `${d.number}. ${d.title}` : d.title })),
  })),
]

const search: SearchEntry[] = [
  { href: '/docs/first-video', title: 'Your first video, step by step', group: 'Start', hint: 'install setup guide' },
  { href: '/studio/how-it-works', title: 'From one prompt to a finished video', group: 'Start', hint: 'claude code prompt flow manual npm' },
  { href: '/studio', title: 'Theme Studio', group: 'Start', hint: 'make a theme surprise brand colour' },
  ...DOCS.map((d) => ({
    href: hrefOf(d),
    title: d.title,
    group: SECTIONS.find((s) => s.id === d.section)?.title ?? 'Docs',
    hint: d.description,
  })),
  ...THEMES.map((t) => ({ href: `/themes/${t.name}`, title: `${t.name} theme`, group: 'Themes', hint: `${t.style} ${t.aliases.join(' ')}` })),
]

/** The frame of every docs page: the bar, the list of docs, the page, the footer. */
export function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-clay focus:px-4 focus:py-2">
        Skip to the content
      </a>
      <SiteNav />
      <Container className="grid flex-1 gap-6 pt-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <DocsSidebar groups={groups} search={search} />
        <main id="main" className="min-w-0">
          {children}
        </main>
      </Container>
      <SiteFooter />
    </>
  )
}
