import Image from 'next/image'
import Link from 'next/link'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container } from '@/components/atoms/container'
import { Logo } from '@/components/organisms/site-nav'
import { SITE } from '@/lib/site'

const COLUMNS = [
  {
    title: 'Start',
    links: [
      { href: '/docs/first-video', label: 'Your first video' },
      { href: '/docs/user-guide', label: 'User guide' },
      { href: '/docs/getting-started', label: 'Getting started' },
      { href: '/docs/guides/with-claude-code', label: 'With Claude Code' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { href: '/docs', label: 'All docs' },
      { href: '/themes', label: 'Themes' },
      { href: '/docs/craft-guide', label: 'Craft guide' },
      { href: '/docs/troubleshooting', label: 'Troubleshooting' },
    ],
  },
  {
    title: 'Project',
    links: [
      { href: SITE.repo, label: 'GitHub' },
      { href: '/changelog', label: 'Changelog' },
      { href: '/docs/tech-stack', label: 'Tech stack and licences' },
      { href: `${SITE.repo}/blob/main/CONTRIBUTING.md`, label: 'Contributing' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-24 pb-10">
      <Container>
        <ClayCard className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">Narrated product demo videos, rendered from a script. Every tool in the pipeline is free: Playwright, FFmpeg, Kokoro.</p>
            <p className="font-mono text-xs text-muted-foreground">
              Version {SITE.version} · {SITE.license}
            </p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="flex flex-col gap-2">
              <h2 className="font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase">{c.title}</h2>
              <ul className="flex flex-col gap-1.5 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}>
                    {l.href.startsWith('http') ? (
                      <a href={l.href} rel="noreferrer" className="hover:text-violet-deep hover:underline">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="hover:text-violet-deep hover:underline">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </ClayCard>
        <div className="flex justify-center pt-6">
          <a
            href="https://kwartz.ai/"
            rel="noreferrer"
            className="clay-flat flex items-center gap-2.5 rounded-full py-2 pr-5 pl-3 text-sm text-muted-foreground transition-transform duration-200 hover:-translate-y-0.5"
          >
            <Image src="/kwartz-logo.png" alt="" width={28} height={28} className="size-7" />
            <span>
              Powered by <strong className="font-heading font-bold text-foreground">Kwartz AI</strong>
            </span>
          </a>
        </div>
      </Container>
    </footer>
  )
}
