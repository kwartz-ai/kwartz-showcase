import { ArrowRight } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container } from '@/components/atoms/container'
import { Kicker, Pill } from '@/components/atoms/pill'
import { CodeBlock } from '@/components/molecules/code-block'
import { VideoPlayer } from '@/components/molecules/video-player'
import { SITE } from '@/lib/site'

// The start of examples/website-tour/themes/lavender.json, as it is in the repo.
const FILE = `{
  "description": "The look of the Showcase website",
  "extends": "clay",
  "colors": {
    "ink": "#1E1B3A",
    "accent": "#6A4BEA",
    "paper": "#F7F5FF"
  },
  "fonts": {
    "display": "Outfit",
    "text": "DM Sans",
    "mono": "JetBrains Mono"
  },
  "backdrop": ["#BBA9F7", "#DDD4FE", "#F7F5FF"],
  "radius": 0.06
}`

/** The site's own theme, lavender: a worked example of a theme of your own. */
export function ThemeFile() {
  return (
    <section className="pt-20">
      <Container>
        <ClayCard className="grid items-start gap-6 rounded-[2rem] p-5 sm:p-7 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <Kicker>A theme of your own, for real</Kicker>
            <h2 className="text-3xl font-bold">This site has its own theme</h2>
            <p className="text-muted-foreground">
              It is called <strong className="text-foreground">lavender</strong>. It starts from the built-in clay theme and takes this site&apos;s colours and fonts, so a video sits
              on the page as if it were part of it. The video here, and the tour in the guide, were rendered in it.
            </p>
            <div className="flex flex-wrap gap-2">
              <Pill tone="mint">extends clay</Pill>
              <Pill>Outfit, DM Sans</Pill>
              <Pill tone="sky">passes every readability check</Pill>
            </div>
            <VideoPlayer src="/videos/lavender-landscape.mp4" poster="/posters/lavender-landscape.jpg" title="A video in the lavender theme" />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <CodeBlock label="themes/lavender.json (the start of it)" code={FILE} />
            <CodeBlock label="Use it" code={'{ "url": "http://localhost:3000", "theme": "lavender" }'} />
            <div className="flex flex-wrap gap-3">
              <ClayLink href={`${SITE.repo}/blob/main/examples/website-tour/themes/lavender.json`} variant="soft" size="sm">
                The whole file <ArrowRight />
              </ClayLink>
              <ClayLink href="/docs/guides/your-own-theme" variant="soft" size="sm">
                Make your own <ArrowRight />
              </ClayLink>
            </div>
          </div>
        </ClayCard>
      </Container>
    </section>
  )
}
