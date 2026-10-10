import { ArrowRight, Captions, CircleCheck, Mic, Play } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Blob, Container } from '@/components/atoms/container'
import { Pill } from '@/components/atoms/pill'
import { CopyCommand } from '@/components/molecules/copy-command'
import { VideoPlayer } from '@/components/molecules/video-player'
import { posterOf, videoOf } from '@/lib/kit'
import { SITE } from '@/lib/site'

const CHIPS = [
  { icon: Mic, label: 'Local voice', tint: 'bg-mint', at: 'left-[-4%] top-[8%]', delay: '0s' },
  { icon: Captions, label: 'Captions', tint: 'bg-sun', at: 'right-[-3%] top-[38%]', delay: '-1.6s' },
  { icon: CircleCheck, label: 'Checked after every render', tint: 'bg-rose', at: 'right-[6%] top-[-5%]', delay: '-3.1s' },
]

/** The top of the landing page: what it is, one way in, and a real video. */
export function Hero() {
  return (
    <section className="relative pt-12 sm:pt-16">
      <Blob className="top-10 right-[-70px] h-48 w-52 bg-violet-soft" />
      <Blob className="top-[26rem] left-[-60px] h-36 w-40 bg-mint-soft [animation-delay:-5s]" />
      <Blob className="top-[-20px] right-[32%] size-28 rounded-full bg-peach-soft [animation-delay:-9s]" />
      <Container className="grid items-center gap-10 lg:grid-cols-[1.02fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Pill>
            Version {SITE.version} · {SITE.license} · runs on your machine
          </Pill>
          <h1 className="text-5xl font-extrabold tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            Demo videos, <span className="text-violet-deep">written</span> not recorded.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            Write one spoken line per scene. Showcase films your real product in a browser, reads the narration in a local voice, and builds the video. To change what is said,
            edit a line and render again.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ClayLink href="/docs/first-video" size="lg">
              Make your first video <ArrowRight />
            </ClayLink>
            <ClayLink href="/themes" variant="soft" size="lg">
              <Play /> Watch the themes
            </ClayLink>
          </div>
          <CopyCommand command="bunx showcase init --config" className="self-start" />
        </div>
        <div className="relative min-w-0">
          {CHIPS.map((c) => (
            <ClayCard
              key={c.label}
              aria-hidden
              className={`absolute z-10 hidden animate-bob items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold lg:flex ${c.at}`}
              style={{ animationDelay: c.delay }}
            >
              <span className={`clay-tint grid size-6 place-items-center rounded-lg text-[#1E1B3A] ${c.tint}`}>
                <c.icon className="size-3.5" />
              </span>
              {c.label}
            </ClayCard>
          ))}
          <ClayCard className="flex flex-col gap-3 rounded-[2rem] p-3">
            <VideoPlayer src={videoOf('lavender', 'landscape')} poster={posterOf('lavender', 'landscape')} title="A video made with Showcase, in a theme that matches this site" priority />
            <p className="px-2 pb-2 text-sm leading-normal text-muted-foreground">Made with Showcase, from a script. 45 seconds, with sound.</p>
          </ClayCard>
        </div>
      </Container>
    </section>
  )
}
