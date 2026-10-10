import type { ReactNode } from 'react'
import { Kicker } from '@/components/atoms/pill'
import { cn } from '@/lib/utils'

/** The heading of a section: a small kicker, the title, one line under it. */
export function SectionHeading({ kicker, title, children, as: Tag = 'h2', className }: { kicker?: string; title: string; children?: ReactNode; as?: 'h1' | 'h2'; className?: string }) {
  return (
    <header className={cn('flex max-w-2xl flex-col gap-2', className)}>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <Tag className={cn('font-bold', Tag === 'h1' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl')}>{title}</Tag>
      {children ? <p className="text-lg text-muted-foreground">{children}</p> : null}
    </header>
  )
}
