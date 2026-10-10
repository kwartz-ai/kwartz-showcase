import Image from 'next/image'
import Link from 'next/link'
import { type KitTheme, posterOf, sentence } from '@/lib/kit'
import { cn } from '@/lib/utils'

/** One theme as a card: a real frame of its video, its name and its style. */
export function ThemeSwatch({ theme, className }: { theme: KitTheme; className?: string }) {
  return (
    <Link
      href={`/themes/${theme.name}`}
      className={cn('clay-flat group flex min-w-0 flex-col gap-3 rounded-3xl p-2.5 pb-4 transition-transform duration-200 hover:-translate-y-1', className)}
    >
      <Image
        src={posterOf(theme.name, 'landscape')}
        alt={`A frame from a video in the ${theme.name} theme`}
        width={960}
        height={540}
        sizes="(max-width: 640px) 100vw, 360px"
        className="aspect-video w-full rounded-2xl object-cover"
      />
      <span className="flex flex-col gap-1 px-2">
        <span className="flex items-center justify-between gap-2">
          <span className="font-heading text-lg font-bold">{theme.name}</span>
          <span className="size-4 shrink-0 rounded-full ring-2 ring-clay" style={{ background: theme.accent }} aria-hidden />
        </span>
        <span className="text-sm text-muted-foreground">
          {theme.style}. {sentence(theme.use)}.
        </span>
      </span>
    </Link>
  )
}
