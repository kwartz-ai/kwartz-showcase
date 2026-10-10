import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** The clay look of a button: it lifts on hover and presses down on click. */
export const clayButton = cva(
  'inline-flex h-auto shrink-0 items-center justify-center gap-2 rounded-full border-0 font-heading font-semibold whitespace-nowrap transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-100 disabled:shadow-none disabled:bg-clay-2 disabled:bg-none disabled:text-muted-foreground [&_svg]:size-[1.1em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'clay-violet hover:bg-transparent',
        soft: 'clay text-foreground hover:bg-clay',
        quiet: 'bg-transparent text-muted-foreground hover:bg-clay-2 hover:text-foreground hover:translate-y-0',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-5 py-3 text-base',
        lg: 'px-6 py-3.5 text-[1.05rem]',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type Look = VariantProps<typeof clayButton>

/** A button that does something on the page. Built on the shadcn/ui Button. */
export function ClayButton({ className, variant, size, ...props }: Omit<ComponentProps<typeof Button>, 'variant' | 'size'> & Look) {
  return <Button className={cn(clayButton({ variant, size }), className)} {...props} />
}

/** A link that looks like a clay button. Outside addresses open as plain links. */
export function ClayLink({ className, variant, size, href, ...props }: Omit<ComponentProps<'a'>, 'href'> & Look & { href: string }) {
  const classes = cn(clayButton({ variant, size }), className)
  if (/^https?:/.test(href)) return <a href={href} className={classes} rel="noreferrer" {...props} />
  return <Link href={href} className={classes} {...props} />
}
