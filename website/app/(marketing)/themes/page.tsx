import { ArrowRight } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container, JsonLd } from '@/components/atoms/container'
import { CodeBlock } from '@/components/molecules/code-block'
import { Reveal } from '@/components/molecules/reveal'
import { SectionHeading } from '@/components/molecules/section-heading'
import { ThemeSwatch } from '@/components/molecules/theme-swatch'
import { ThemeFile } from '@/components/organisms/theme-file'
import { CallToAction } from '@/components/organisms/call-to-action'
import { THEMES } from '@/lib/kit'
import { breadcrumbJsonLd, pageMeta } from '@/lib/seo'

const description = `${THEMES.length} video themes set by one word: ${THEMES.map((t) => t.name).join(', ')}. See a real rendered video of each, in landscape and vertical.`

export const metadata = pageMeta({ title: 'Video themes', description, path: '/themes' })

export default function ThemesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Themes', path: '/themes' },
        ])}
      />
      <section className="pt-12 sm:pt-16">
        <Container className="flex flex-col gap-8">
          <SectionHeading as="h1" kicker={`${THEMES.length} themes`} title="One word changes the whole look">
            A theme sets how cards, labels and captions are drawn, the fonts, the colours, the backdrop, how things move and how it sounds. Every picture below is a frame from a
            real render.
          </SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 0.05}>
                <ThemeSwatch theme={t} className="h-full" />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="pt-20">
        <Container className="grid gap-4 lg:grid-cols-2">
          <ClayCard className="flex flex-col gap-4 p-6 sm:p-7">
            <h2 className="text-2xl font-bold">Use a theme</h2>
            <p className="text-muted-foreground">Try two or three on your own video without changing the config. Each run writes files named after the theme, so you can compare them.</p>
            <CodeBlock label="Try" code={'bunx showcase themes\nbunx showcase make --theme glass --draft\nbunx showcase make --theme clay --draft'} copy />
            <CodeBlock label="Then keep one, in showcase.config.json" code={'{ "url": "http://localhost:3000", "theme": "glass" }'} />
            <ClayLink href="/docs/guides/themes" variant="soft" className="self-start">
              Guide 15: Themes <ArrowRight />
            </ClayLink>
          </ClayCard>
          <ClayCard tint="mint" className="flex flex-col gap-4 p-6 sm:p-7">
            <h2 className="text-2xl font-bold text-mint-ink">Make your own</h2>
            <p className="text-mint-ink">A theme for your brand is one small file in your project. Start from the built-in theme closest to your brand, with your colours. It is checked for readability before it can be used.</p>
            <CodeBlock label="By hand" code={'showcase theme new acme --from glass --accent "#FF5A1F" --ink "#0B1D35"'} copy />
            <CodeBlock label="From a description, in Claude Code, with no API key" code={'/showcase-theme-new orange and dark blue, rounded and friendly, a food delivery app'} />
            <ClayLink href="/docs/guides/your-own-theme" variant="soft" className="self-start">
              Guide 16: Your own theme <ArrowRight />
            </ClayLink>
          </ClayCard>
        </Container>
      </section>
      <ThemeFile />
      <CallToAction />
    </>
  )
}
