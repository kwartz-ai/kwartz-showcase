'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIZES = { landscape: { width: 960, height: 540 }, vertical: { width: 540, height: 960 } } as const

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * A video with its own clay controls, under the picture so they never cover a caption.
 * It costs nothing until it is asked for: the poster is shown first, and the MP4 is
 * only fetched when the viewer presses play.
 */
export function VideoPlayer({
  src,
  poster,
  title,
  shape = 'landscape',
  priority = false,
  className,
}: {
  src: string
  poster: string
  title: string
  shape?: keyof typeof SIZES
  priority?: boolean
  className?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [full, setFull] = useState(false)
  const [time, setTime] = useState(0)
  const [length, setLength] = useState(0)
  const size = SIZES[shape]

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = () => {
    const v = video.current
    if (!started || !v) return setStarted(true) // the video element mounts and plays itself
    if (v.paused) void v.play()
    else v.pause()
  }

  const seekTo = (clientX: number) => {
    const v = video.current
    const t = track.current
    if (!v || !t || !length) return
    const r = t.getBoundingClientRect()
    v.currentTime = Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * length
    setTime(v.currentTime)
  }

  const nudge = (by: number) => {
    const v = video.current
    if (v && length) v.currentTime = Math.min(length, Math.max(0, v.currentTime + by))
  }

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await box.current?.requestFullscreen()
    } catch {
      // some app views have no fullscreen: the button then does nothing
    }
  }

  const round = 'clay-tint grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-clay text-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95'

  return (
    <div
      ref={box}
      className={cn('flex min-w-0 flex-col gap-3 [&:fullscreen]:justify-center [&:fullscreen]:bg-background [&:fullscreen]:p-6', className)}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-code',
          shape === 'vertical' ? 'mx-auto aspect-[9/16] h-[34rem] max-w-full' : 'aspect-video w-full',
          full && (shape === 'vertical' ? 'h-[calc(100dvh-8rem)]' : 'mx-auto max-w-[calc((100dvh-8rem)*16/9)]'),
        )}
      >
        {started ? (
          <video
            ref={video}
            className="absolute inset-0 size-full cursor-pointer"
            src={src}
            poster={poster}
            autoPlay
            playsInline
            muted={muted}
            aria-label={title}
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          />
        ) : (
          <button type="button" onClick={toggle} className="group absolute inset-0 size-full cursor-pointer" aria-label={`Play: ${title}`}>
            <Image src={poster} alt={title} {...size} priority={priority} sizes={shape === 'vertical' ? '320px' : '(max-width: 768px) 100vw, 640px'} className="size-full object-cover" />
            <span className="clay-violet absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform group-hover:scale-110">
              <Play className="size-6 translate-x-0.5 fill-current" />
            </span>
          </button>
        )}
      </div>

      <div className={cn('flex items-center gap-2.5 px-1', shape === 'vertical' && !full && 'mx-auto w-full max-w-[26rem]')}>
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play the video'} className={cn(round, 'clay-violet size-11 bg-transparent')}>
          {playing ? <Pause className="size-4.5 fill-current" /> : <Play className="size-4.5 translate-x-px fill-current" />}
        </button>

        <div
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label="Position in the video"
          aria-valuemin={0}
          aria-valuemax={Math.round(length)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${clock(time)} of ${clock(length)}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            seekTo(e.clientX)
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) seekTo(e.clientX)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') nudge(5)
            if (e.key === 'ArrowLeft') nudge(-5)
          }}
          className="clay-pressed relative h-3.5 min-w-0 flex-1 cursor-pointer touch-none rounded-full"
        >
          <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#9478ff] to-[#6a4bea]" style={{ width: `${length ? (time / length) * 100 : 0}%` }} />
          <span
            className="clay-tint absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-clay"
            style={{ left: `${length ? (time / length) * 100 : 0}%` }}
            aria-hidden
          />
        </div>

        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {clock(time)} / {clock(length)}
        </span>

        <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Turn the sound on' : 'Turn the sound off'} aria-pressed={muted} className={round}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button type="button" onClick={fullscreen} aria-label={full ? 'Leave full screen' : 'Full screen'} className={cn(round, 'hidden sm:grid')}>
          {full ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </button>
      </div>
    </div>
  )
}
