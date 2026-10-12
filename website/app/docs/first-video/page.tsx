import { Clock, Film, Palette } from 'lucide-react'
import { ClayCard } from '@/components/atoms/clay-card'
import { JsonLd } from '@/components/atoms/container'
import { Kicker, Pill } from '@/components/atoms/pill'
import { VideoPlayer } from '@/components/molecules/video-player'
import { SectionHeading } from '@/components/molecules/section-heading'
import { CodeBlock } from '@/components/molecules/code-block'
import { GuideStepper } from '@/components/organisms/guide-stepper'
import { GUIDE } from '@/lib/guide'
import { breadcrumbJsonLd, howToJsonLd, pageMeta } from '@/lib/seo'

const title = 'Your first video, step by step'
const description = 'From nothing installed to a finished, narrated demo video of your own product in ten steps. Each step shows the command to type and what you should see.'

export const metadata = pageMeta({ title, description, path: '/docs/first-video' })

export default function FirstVideo() {
  return (
    <div className="flex flex-col gap-10 pb-4">
      <JsonLd data={howToJsonLd(title, description, GUIDE)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Docs', path: '/docs' },
          { name: 'Your first video', path: '/docs/first-video' },
        ])}
      />
      <SectionHeading as="h1" kicker="Start here" title={title}>
        From nothing installed to a finished video. You need a terminal and a product that runs in a browser.
      </SectionHeading>

      <ClayCard className="grid items-center gap-6 rounded-[2rem] p-4 sm:p-5 lg:grid-cols-[1.35fr_1fr]">
        <VideoPlayer src="/videos/website-tour.mp4" poster="/posters/website-tour.jpg" title="A tour of this website" priority />
        <div className="flex min-w-0 flex-col gap-3 px-1 pb-1">
          <Kicker>Watch first</Kicker>
          <h2 className="text-2xl font-bold">A tour of the whole site</h2>
          <p className="text-muted-foreground">
            See the landing page, the docs, this guide, the themes and the theme studio before you start. The tour was made with Showcase itself: one script, filmed on this site while it ran.
          </p>
          <div className="flex flex-wrap gap-2">
            <Pill tone="sky">
              <Clock className="size-3.5" /> 5 min 31 s
            </Pill>
            <Pill tone="mint">
              <Film className="size-3.5" /> 36 scenes
            </Pill>
            <Pill>
              <Palette className="size-3.5" /> lavender theme
            </Pill>
          </div>
          <p className="text-sm text-muted-foreground">
            Its script and theme are in the repo, in <code className="rounded-md bg-clay-2 px-1.5 py-0.5 font-mono text-[0.85em]">examples/website-tour</code>.
          </p>
        </div>
      </ClayCard>

      <GuideStepper steps={GUIDE} />

      {/* the same ten steps as plain text: for reading without scripts, for printing, and for search engines */}
      <section className="flex flex-col gap-6" aria-labelledby="all-steps">
        <h2 id="all-steps" className="text-2xl font-bold">
          All ten steps on one page
        </h2>
        <ol className="flex flex-col gap-8">
          {GUIDE.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3">
              <h3 className="text-xl font-bold">
                {i + 1}. {s.title}
              </h3>
              <p className="max-w-2xl text-muted-foreground">{s.what}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <CodeBlock code={s.code} label={s.codeLabel} />
                <CodeBlock code={s.see} label={s.seeLabel} />
              </div>
              <p className="max-w-2xl text-[0.95rem]">
                <strong>Tip.</strong> {s.tip}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
