import { ArrowRight } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container, JsonLd } from '@/components/atoms/container'
import { SectionHeading } from '@/components/molecules/section-heading'
import { ThemeStudio } from '@/components/organisms/theme-studio'
import { breadcrumbJsonLd, pageMeta } from '@/lib/seo'

export const metadata = pageMeta({
  title: 'Theme Studio: make a video theme for your brand',
  description:
    'Shape a video theme for your brand, see it on a video frame, and have the engine check that it can be read. Then copy one prompt, and Claude makes a demo video of your website or a presentation in it.',
  path: '/studio',
})

const HOW = [
  { title: 'It is the real engine', text: 'The looks, the rules and the cards on this page are the kit\'s own code, not a copy. What passes here passes when you render.' },
  { title: 'Nothing leaves this page', text: 'Your colours and your address stay in your browser. The page sends nothing anywhere: you copy the result yourself.' },
  { title: 'The file is yours', text: 'The result is one small file in your project. Edit it by hand later, or ask Claude to change it with the theme skill.' },
]

export default function StudioPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Theme Studio', path: '/studio' },
        ])}
      />
      <section className="pt-12 sm:pt-16">
        <Container className="flex flex-col gap-8">
          <SectionHeading as="h1" kicker="Theme Studio" title="Make a theme, hand it to Claude">
            Shape a video theme for your brand and see it on a video frame. Then copy one prompt: Claude makes the video of your website, or a presentation, in that theme.
          </SectionHeading>
          <ThemeStudio />
        </Container>
      </section>

      <section className="pt-16">
        <Container className="grid gap-4 md:grid-cols-3">
          {HOW.map((h) => (
            <ClayCard key={h.title} surface="flat" className="flex flex-col gap-2 p-5">
              <h2 className="text-lg font-bold">{h.title}</h2>
              <p className="text-[0.95rem] text-muted-foreground">{h.text}</p>
            </ClayCard>
          ))}
        </Container>
      </section>

      <section className="pt-10">
        <Container className="flex flex-wrap gap-3">
          <ClayLink href="/docs/guides/your-own-theme" variant="soft">
            Guide 16: Your own theme <ArrowRight />
          </ClayLink>
          <ClayLink href="/docs/guides/with-claude-code" variant="soft">
            Guide 11: With Claude Code <ArrowRight />
          </ClayLink>
          <ClayLink href="/themes" variant="soft">
            The twelve looks <ArrowRight />
          </ClayLink>
        </Container>
      </section>
    </>
  )
}
