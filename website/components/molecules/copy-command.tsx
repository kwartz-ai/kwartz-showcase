'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A copy button. Shows a tick for a moment after it is pressed. */
export function CopyButton({ text, className, label = 'Copy' }: { text: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // the browser refused: the text is still on screen to select
    }
    setDone(true)
    setTimeout(() => setDone(false), 1600)
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={done ? 'Copied' : label}
      className={cn('clay-tint grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-violet-soft text-foreground transition-transform active:scale-95', className)}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  )
}

/** One command in a pressed clay well, with a copy button. */
export function CopyCommand({ command, className }: { command: string; className?: string }) {
  return (
    <div className={cn('clay-pressed inline-flex max-w-full min-w-0 items-center gap-3 rounded-2xl py-2 pr-2 pl-4 font-mono text-sm', className)}>
      <span className="min-w-0 truncate">{command}</span>
      <CopyButton text={command} label="Copy the command" />
    </div>
  )
}
