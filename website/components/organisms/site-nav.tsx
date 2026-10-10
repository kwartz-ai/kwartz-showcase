import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { Container } from '@/components/atoms/container'
import { ThemeToggle } from '@/components/molecules/theme-toggle'
import { MobileMenu } from '@/components/organisms/mobile-menu'
import { NAV, SITE } from '@/lib/site'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold" aria-label={`${SITE.name}, home`}>
      <span className="clay-violet grid size-9 place-items-center rounded-xl">
        <Play className="size-4 translate-x-px fill-current" />
      </span>
      {SITE.short}
    </Link>
  )
}

/** The bar at the top of every page. */
export function SiteNav() {
  return (
    <header className="sticky top-3 z-40 mt-3">
      <Container>
        <nav aria-label="Main" className="clay flex items-center justify-between gap-3 rounded-full py-2 pr-2 pl-4">
          <Logo />
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded-full px-3.5 py-2 font-semibold text-muted-foreground transition-colors hover:bg-clay-2 hover:text-foreground">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={SITE.repo} rel="noreferrer" className="rounded-full px-3.5 py-2 font-semibold text-muted-foreground transition-colors hover:bg-clay-2 hover:text-foreground">
                GitHub
              </a>
            </li>
          </ul>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ClayLink href="/docs/first-video" size="sm" className="hidden sm:inline-flex">
              Get started <ArrowRight />
            </ClayLink>
            <MobileMenu />
          </div>
        </nav>
      </Container>
    </header>
  )
}
