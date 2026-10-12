import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container, JsonLd } from '@/components/atoms/container'
import { Kicker } from '@/components/atoms/pill'
import { CodeBlock } from '@/components/molecules/code-block'
import { SectionHeading } from '@/components/molecules/section-heading'
import { FlowStages, WhoTag } from '@/components/organisms/flow-stages'
import { CARRIES, COMMANDS, FILES, LATER, MANUAL_MAKE, MANUAL_SETUP, NEEDS, PHASES, PROMISE, TROUBLE, type ManualStep } from '@/lib/prompt-flow'
import { breadcrumbJsonLd, howToJsonLd, pageMeta } from '@/lib/seo'

const title = 'From one prompt to a finished video'
const description =
  'What happens after you paste the Theme Studio prompt into Claude Code: who does each step, which commands run, and what ends up in your folder. With a manual guide for the kwartz-showcase npm package.'

export const metadata = pageMeta({ title, description, path: '/studio/how-it-works' })

const th = 'px-3 py-2.5 text-left align-top font-mono text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase'
const td = 'border-t border-line px-3 py-2.5 align-top'

function Steps({ steps, from }: { steps: ManualStep[]; from: number }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <li key={s.title} className="grid grid-cols-[2.6rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.9rem_minmax(0,1fr)] sm:gap-4">
          <span className="clay-flat grid size-10 place-items-center rounded-2xl font-heading font-bold sm:size-11">{from + i}</span>
          <ClayCard surface="flat" className="flex min-w-0 flex-col gap-2.5 rounded-2xl p-4">
            <h3 className="text-lg font-bold">{s.title}</h3>
            {s.code ? <CodeBlock code={s.code} copy /> : null}
            {s.note ? <p className="text-[0.95rem] text-muted-foreground">{s.note}</p> : null}
          </ClayCard>
        </li>
      ))}
    </ol>
  )
}

export default function HowItWorksPage() {
  const stages = PHASES.flatMap((p) => p.stages).map((s) => ({ title: s.title, what: s.text }))
  return (
    <>
      <JsonLd data={howToJsonLd(title, description, stages)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Theme Studio', path: '/studio' },
          { name: 'How it works', path: '/studio/how-it-works' },
        ])}
      />

      <section className="pt-12 sm:pt-16">
        <Container className="flex max-w-4xl flex-col gap-7">
          <SectionHeading as="h1" kicker="Theme Studio: how it works" title={title} />
          <ClayCard className="p-6 font-heading text-xl leading-snug font-semibold sm:text-2xl">{PROMISE}</ClayCard>
          <nav aria-label="On this page" className="flex flex-wrap gap-3">
            <ClayLink href="#prompt" variant="soft" size="sm">
              How the prompt works
            </ClayLink>
            <ClayLink href="#manual" variant="soft" size="sm">
              Manual guide for the npm package
            </ClayLink>
            <ClayLink href="/studio" size="sm">
              Open the studio <ArrowRight />
            </ClayLink>
          </nav>
        </Container>
      </section>

      {/* ── how the prompt works ── */}
      <section id="prompt" className="scroll-mt-28 pt-14">
        <Container className="flex max-w-4xl flex-col gap-7">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-bold">How the prompt works</h2>
            <p className="max-w-2xl text-lg text-muted-foreground">The studio writes one prompt. This is what happens after you paste it, step by step, and who does each part.</p>
            <div className="flex flex-wrap gap-2" aria-label="Who does what">
              <WhoTag who="you" />
              <WhoTag who="claude" />
              <WhoTag who="kit" />
            </div>
          </div>

          <ClayCard className="flex flex-col gap-3 p-5">
            <h3 className="text-lg font-bold">What the prompt carries</h3>
            <dl className="flex flex-col">
              {CARRIES.map((c) => (
                <div key={c.what} className="grid gap-1 border-t border-line py-2.5 first:border-t-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="font-semibold">{c.what}</dt>
                  <dd>{c.text}</dd>
                </div>
              ))}
            </dl>
          </ClayCard>

          <FlowStages phases={PHASES} />

          <ClayCard className="flex flex-col gap-3 p-5">
            <h3 className="text-lg font-bold">What ends up in your folder</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-[0.95rem]">
                <thead>
                  <tr>
                    <th className={th}>File</th>
                    <th className={th}>Made by</th>
                    <th className={th}>What it is</th>
                  </tr>
                </thead>
                <tbody>
                  {FILES.map((f) => (
                    <tr key={f.file}>
                      <th className={`${td} text-left font-mono text-[0.85rem] font-medium`}>{f.file}</th>
                      <td className={td}>{f.by}</td>
                      <td className={td}>{f.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ClayCard>

          <div className="grid gap-4 md:grid-cols-2">
            <ClayCard tint="sky" className="flex flex-col gap-2 p-5 text-sky-ink">
              <h3 className="text-lg font-bold">What you need first</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                {NEEDS.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </ClayCard>
            <ClayCard tint="sun" className="flex flex-col gap-2 p-5 text-sun-ink">
              <h3 className="text-lg font-bold">What is and is not proven</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                <li>Tested three times: a fresh agent with only the prompt, in an empty folder, made a voiced video that passed every check</li>
                <li>Tested on Windows only</li>
                <li>Not yet tested on a machine with nothing installed</li>
                <li>No API key is needed in Claude Code</li>
              </ul>
            </ClayCard>
          </div>
        </Container>
      </section>

      {/* ── the manual guide ── */}
      <section id="manual" className="scroll-mt-28 pt-20">
        <Container className="flex max-w-4xl flex-col gap-7">
          <div className="flex flex-col gap-3">
            <Kicker>By hand</Kicker>
            <h2 className="text-3xl font-bold">Manual guide for the npm package</h2>
            <p className="max-w-2xl text-lg text-muted-foreground">
              The same journey without the prompt, with the package <code className="rounded-md bg-clay-2 px-1.5 py-0.5 font-mono text-[0.85em]">kwartz-showcase</code>. Every command is run in your own project
              folder. With Node, write <code className="rounded-md bg-clay-2 px-1.5 py-0.5 font-mono text-[0.85em]">npx</code> wherever this guide says{' '}
              <code className="rounded-md bg-clay-2 px-1.5 py-0.5 font-mono text-[0.85em]">bunx</code>.
            </p>
          </div>

          <h3 className="text-xl font-bold">Set up, once per machine</h3>
          <Steps steps={MANUAL_SETUP} from={1} />

          <h3 className="text-xl font-bold">Make a video</h3>
          <Steps steps={MANUAL_MAKE} from={MANUAL_SETUP.length + 1} />

          <ClayCard className="flex flex-col gap-3 p-5">
            <h3 className="text-lg font-bold">Commands you will use</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-[0.95rem]">
                <thead>
                  <tr>
                    <th className={th}>Command</th>
                    <th className={th}>Does</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMANDS.map((c) => (
                    <tr key={c.cmd}>
                      <th className={`${td} text-left font-mono text-[0.85rem] font-medium`}>{c.cmd}</th>
                      <td className={td}>{c.does}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ClayCard>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: 'Change it later', rows: LATER },
              { title: 'When something goes wrong', rows: TROUBLE },
            ].map((box) => (
              <ClayCard key={box.title} className="flex flex-col gap-2 p-5">
                <h3 className="text-lg font-bold">{box.title}</h3>
                <ul className="flex flex-col gap-2 text-[0.95rem]">
                  {box.rows.map((r) => (
                    <li key={r.what}>
                      <strong>{r.what}:</strong> {r.how}
                    </li>
                  ))}
                </ul>
              </ClayCard>
            ))}
          </div>

          <p className="text-muted-foreground">
            The longer version, with every setting, is in the{' '}
            <Link href="/docs/user-guide" className="font-semibold text-violet-deep underline underline-offset-4">
              user guide
            </Link>{' '}
            and the{' '}
            <Link href="/docs/first-video" className="font-semibold text-violet-deep underline underline-offset-4">
              ten step first video guide
            </Link>
            .
          </p>
        </Container>
      </section>
    </>
  )
}
