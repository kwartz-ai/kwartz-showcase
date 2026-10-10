import { CopyButton } from '@/components/molecules/copy-command'
import { cn } from '@/lib/utils'

/** A block of code or terminal text on the dark code ground. */
export function CodeBlock({ code, label, copy = false, className }: { code: string; label?: string; copy?: boolean; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      {label ? <span className="font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase">{label}</span> : null}
      <div className="relative min-w-0">
        <pre className="overflow-x-auto rounded-2xl bg-code p-4 font-mono text-[0.82rem] leading-relaxed text-code-fg shadow-[inset_0_4px_10px_rgba(0,0,0,0.35)]">
          <code>{code}</code>
        </pre>
        {copy ? <CopyButton text={code} className="absolute top-2 right-2 size-8 bg-clay" label="Copy the code" /> : null}
      </div>
    </div>
  )
}
