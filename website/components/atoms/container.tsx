import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** The page width and the side gutter, set once. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)} {...props} />
}

/** A soft clay shape that floats behind a section. Decoration only. */
export function Blob({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute -z-10 animate-drift rounded-[46%_54%_58%_42%/52%_44%_56%_48%] shadow-[inset_0_-16px_26px_rgba(0,0,0,0.1),inset_0_16px_26px_rgba(255,255,255,0.4)]',
        className,
      )}
      {...props}
    />
  )
}

/** JSON-LD for search engines. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
