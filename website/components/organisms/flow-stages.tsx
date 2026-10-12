import { Bot, Check, User, Wrench } from 'lucide-react'
import { ClayCard } from '@/components/atoms/clay-card'
import { Kicker } from '@/components/atoms/pill'
import type { Phase, Who } from '@/lib/prompt-flow'
import { cn } from '@/lib/utils'

const WHO: Record<Who, { label: string; icon: typeof User; tone: string }> = {
  you: { label: 'You', icon: User, tone: 'bg-peach-soft text-peach-ink' },
  claude: { label: 'Claude Code', icon: Bot, tone: 'bg-violet-soft text-foreground' },
  kit: { label: 'The kit', icon: Wrench, tone: 'bg-mint-soft text-mint-ink' },
}

/** Who does a step: you, Claude Code, or the kit. */
export function WhoTag({ who, className }: { who: Who; className?: string }) {
  const w = WHO[who]
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-medium whitespace-nowrap', w.tone, className)}>
      <w.icon className="size-3.5" />
      {w.label}
    </span>
  )
}

/** The journey as a line of stages, grouped in phases, with who does each one. */
export function FlowStages({ phases }: { phases: Phase[] }) {
  return (
    <div className="flex flex-col gap-2">
      {phases.map((phase) => (
        <section key={phase.title} className="flex flex-col">
          <Kicker className="py-3 pl-[3.6rem] sm:pl-[4.1rem]">{phase.title}</Kicker>
          <ol className="flex flex-col">
            {phase.stages.map((s, i) => (
              <li key={s.n} className="relative grid grid-cols-[2.6rem_minmax(0,1fr)] gap-3 pb-4 sm:grid-cols-[2.9rem_minmax(0,1fr)] sm:gap-4">
                {/* the line that joins one stage to the next */}
                {i < phase.stages.length - 1 ? <span aria-hidden className="absolute top-11 bottom-0 left-[1.25rem] w-0.5 bg-line sm:left-[1.4rem]" /> : null}
                <span className="clay-flat relative z-10 grid size-10 place-items-center rounded-2xl font-heading font-bold sm:size-11">{s.n === 'ok' ? <Check className="size-5" /> : s.n}</span>
                <ClayCard surface="flat" className="flex min-w-0 flex-col gap-2 rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">{s.title}</h3>
                    <WhoTag who={s.who} />
                  </div>
                  <p>{s.text}</p>
                  {s.runs ? <p className="font-mono text-[0.82rem] break-words text-muted-foreground">{s.runs}</p> : null}
                  {s.branches?.map((b) => (
                    <p key={b.when} className="border-l-[3px] border-line pl-3 text-[0.95rem]">
                      <strong className="block font-heading">{b.when}</strong>
                      {b.then}
                    </p>
                  ))}
                </ClayCard>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
