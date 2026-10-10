import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/organisms/site-footer'
import { SiteNav } from '@/components/organisms/site-nav'

/** The frame of the landing page, the themes pages and the changelog. */
export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-clay focus:px-4 focus:py-2">
        Skip to the content
      </a>
      <SiteNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
