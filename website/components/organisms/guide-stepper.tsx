'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Lightbulb } from 'lucide-react'
import { ClayButton } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Kicker, Pill } from '@/components/atoms/pill'
import { CodeBlock } from '@/components/molecules/code-block'
import type { GuideStep } from '@/lib/guide'
import { cn } from '@/lib/utils'

/** The visual guide: one step at a time, with a rail to jump and a bar that fills. */
export function GuideStepper({ steps }: { steps: GuideStep[] }) {
  const [at, setAt] = useState(0)
  const step = steps[at]!

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="clay-pressed relative h-3.5 flex-1 overflow-hidden rounded-full" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={at + 1} aria-label="Progress through the guide">
          <span className="absolute inset-y-0 left-0 rounded-full bg-mint transition-[width] duration-300" style={{ width: `${((at + 1) / steps.length) * 100}%` }} />
        </div>
        <Kicker>
          step {at + 1} of {steps.length}
        </Kicker>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5" role="tablist" aria-label="Steps">
        {steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            role="tab"
            aria-selected={i === at}
            onClick={() => setAt(i)}
            className={cn('clay-flat flex min-w-0 cursor-pointer items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm leading-tight font-semibold', i === at && 'bg-violet-soft')}
          >
            <span className={cn('grid size-6 shrink-0 place-items-center rounded-lg bg-clay-2 font-heading text-xs', i === at && 'bg-primary text-white', i < at && 'bg-mint text-[#0B3D2B]')}>
              {i < at ? <Check className="size-3.5" /> : i + 1}
            </span>
            {s.title}
          </button>
        ))}
      </div>

      <ClayCard className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2" role="tabpanel">
        <div className="flex min-w-0 flex-col gap-3">
          <Pill tone="mint">Step {at + 1}</Pill>
          <h2 className="text-2xl font-bold">{step.title}</h2>
          <p className="text-muted-foreground">{step.what}</p>
          <ClayCard surface="pressed" className="flex gap-2.5 rounded-2xl p-3.5 text-[0.95rem]">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-violet-deep" />
            <span>{step.tip}</span>
          </ClayCard>
          <Link href={step.more.href} className="text-sm font-semibold text-violet-deep underline underline-offset-4">
            Read more: {step.more.label}
          </Link>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <CodeBlock code={step.code} label={step.codeLabel} copy />
          <CodeBlock code={step.see} label={step.seeLabel} />
        </div>
      </ClayCard>

      <div className="flex justify-between gap-3">
        <ClayButton variant="soft" disabled={at === 0} onClick={() => setAt(at - 1)}>
          <ArrowLeft /> Back
        </ClayButton>
        {at < steps.length - 1 ? (
          <ClayButton onClick={() => setAt(at + 1)}>
            Next step <ArrowRight />
          </ClayButton>
        ) : (
          <ClayButton onClick={() => setAt(0)}>Start again</ClayButton>
        )}
      </div>
    </div>
  )
}
