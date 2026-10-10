import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const TONES = {
  violet: 'bg-violet-soft text-foreground',
  mint: 'bg-mint-soft text-mint-ink',
  peach: 'bg-peach-soft text-peach-ink',
  sun: 'bg-sun-soft text-sun-ink',
  sky: 'bg-sky-soft text-sky-ink',
  rose: 'bg-rose-soft text-rose-ink',
} as const

/** A small label: a status, a count, a category. */
export function Pill({ tone = 'violet', className, ...props }: ComponentProps<'span'> & { tone?: keyof typeof TONES }) {
  return <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs whitespace-nowrap', TONES[tone], className)} {...props} />
}

/** The small uppercase line above a heading. */
export function Kicker({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase', className)} {...props} />
}

/** A keyboard key. */
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return <kbd className={cn('rounded-md bg-clay px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground', className)} {...props} />
}
