'use client'

import { useState } from 'react'
import { ClayCard } from '@/components/atoms/clay-card'
import { VideoPlayer } from '@/components/molecules/video-player'
import { posterOf, videoOf } from '@/lib/kit'
import { cn } from '@/lib/utils'

const SHAPES = [
  { id: 'landscape', label: '16:9', note: 'Landscape, 1920x1080' },
  { id: 'vertical', label: '9:16', note: 'Vertical, 1080x1920' },
] as const

/** The video of one theme, in both shapes it was rendered in. */
export function ThemePlayer({ name, priority = false }: { name: string; priority?: boolean }) {
  const [shape, setShape] = useState<(typeof SHAPES)[number]['id']>('landscape')
  const current = SHAPES.find((s) => s.id === shape)!
  return (
    <ClayCard className="flex flex-col gap-3 rounded-[2rem] p-3">
      {/* the key makes a change of shape or theme start from the poster again */}
      <VideoPlayer key={name + shape} src={videoOf(name, shape)} poster={posterOf(name, shape)} shape={shape} title={`The ${name} theme, ${current.note.toLowerCase()}`} priority={priority} />
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
        <p className="text-sm text-muted-foreground">{current.note}. A web copy of the real render.</p>
        <div className="clay-pressed inline-flex gap-1 rounded-full p-1" role="group" aria-label="Shape">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === shape}
              onClick={() => setShape(s.id)}
              className={cn('cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold text-muted-foreground', s.id === shape && 'clay-flat text-foreground')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </ClayCard>
  )
}
