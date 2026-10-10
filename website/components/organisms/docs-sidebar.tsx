'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { PanelLeft } from 'lucide-react'
import { clayButton } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { SearchBox, type SearchEntry } from '@/components/molecules/search-box'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export interface SidebarGroup {
  title: string
  links: { href: string; label: string }[]
}

function Links({ groups, onPick }: { groups: SidebarGroup[]; onPick?: () => void }) {
  const path = usePathname()
  return (
    <>
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-1.5">
          <h2 className="px-3 font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase">{g.title}</h2>
          <ul className="flex flex-col gap-0.5">
            {g.links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={onPick}
                  aria-current={path === l.href ? 'page' : undefined}
                  className={cn(
                    'block rounded-xl px-3 py-1.5 text-[0.93rem] text-muted-foreground transition-colors hover:bg-clay-2 hover:text-foreground',
                    path === l.href && 'clay-pressed bg-violet-soft font-semibold text-foreground hover:bg-violet-soft',
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

/** The list of every doc. A fixed column on a wide screen, a sheet on a phone. */
export function DocsSidebar({ groups, search }: { groups: SidebarGroup[]; search: SearchEntry[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex items-center gap-2 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={cn(clayButton({ variant: 'soft', size: 'sm' }), 'cursor-pointer')}>
            <PanelLeft /> All docs
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto bg-background">
            <SheetHeader>
              <SheetTitle className="font-heading text-lg">Docs</SheetTitle>
              <SheetDescription>Every doc and guide</SheetDescription>
            </SheetHeader>
            <nav aria-label="Docs" className="flex flex-col gap-4 px-2 pb-6">
              <Links groups={groups} onPick={() => setOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
        <SearchBox entries={search} className="flex-1" />
      </div>
      <ClayCard as="aside" className="quiet-scroll sticky top-24 hidden max-h-[calc(100dvh-7.5rem)] flex-col gap-4 overflow-y-auto p-3 lg:flex">
        <SearchBox entries={search} hotkey />
        <nav aria-label="Docs" className="flex flex-col gap-4">
          <Links groups={groups} />
        </nav>
      </ClayCard>
    </>
  )
}
