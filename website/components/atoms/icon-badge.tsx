import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const TINTS = {
  violet: 'bg-violet-soft',
  mint: 'bg-mint-soft text-mint-ink',
  peach: 'bg-peach-soft text-peach-ink',
  sun: 'bg-sun-soft text-sun-ink',
  sky: 'bg-sky-soft text-sky-ink',
  rose: 'bg-rose-soft text-rose-ink',
  clay: 'bg-clay',
} as const

export type BadgeTint = keyof typeof TINTS

/** A small clay square that holds an icon or a number. */
export function IconBadge({ tint = 'violet', className, ...props }: ComponentProps<'span'> & { tint?: BadgeTint }) {
  return (
    <span
      className={cn('clay-tint grid size-12 shrink-0 place-items-center rounded-2xl font-heading font-bold [&_svg]:size-5', TINTS[tint], className)}
      {...props}
    />
  )
}
