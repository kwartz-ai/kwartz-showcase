'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { clayButton } from '@/components/atoms/clay-button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NAV, SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

/** The menu on a phone: the same links as the bar, in a sheet. */
export function MobileMenu() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={cn(clayButton({ variant: 'soft', size: 'icon' }), 'cursor-pointer md:hidden')} aria-label="Open the menu">
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="bg-background">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg">{SITE.name}</SheetTitle>
          <SheetDescription>Version {SITE.version}</SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-2 px-4">
          {[...NAV, { href: SITE.repo, label: 'GitHub' }].map((n) => (
            <li key={n.href}>
              <Link href={n.href} onClick={() => setOpen(false)} className="clay-flat block rounded-2xl px-4 py-3 font-heading text-base font-semibold">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
