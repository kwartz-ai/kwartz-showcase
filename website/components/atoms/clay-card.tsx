import type { ComponentProps, ElementType } from 'react'
import { cn } from '@/lib/utils'

const SURFACES = {
  raised: 'clay',
  flat: 'clay-flat',
  pressed: 'clay-pressed',
} as const

const TINTS = {
  none: '',
  violet: 'bg-violet-soft',
  mint: 'bg-mint-soft',
  peach: 'bg-peach-soft',
  sun: 'bg-sun-soft',
  sky: 'bg-sky-soft',
  rose: 'bg-rose-soft',
} as const

export type Tint = keyof typeof TINTS

/** The clay surface every card, bar and well on the site is made of. */
export function ClayCard<T extends ElementType = 'div'>({
  as,
  surface = 'raised',
  tint = 'none',
  className,
  ...props
}: { as?: T; surface?: keyof typeof SURFACES; tint?: Tint } & Omit<ComponentProps<T>, 'as'>) {
  const Tag: ElementType = as ?? 'div'
  return <Tag className={cn('rounded-3xl', SURFACES[surface], TINTS[tint], className)} {...props} />
}
