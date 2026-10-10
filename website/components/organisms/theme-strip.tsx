import { ArrowRight } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { Container } from '@/components/atoms/container'
import { Reveal } from '@/components/molecules/reveal'
import { SectionHeading } from '@/components/molecules/section-heading'
import { ThemeSwatch } from '@/components/molecules/theme-swatch'
import { THEMES } from '@/lib/kit'

/** A row of themes on the landing page. The frames are from real rendered videos. */
export function ThemeStrip({ names }: { names: string[] }) {
  const shown = names.map((n) => THEMES.find((t) => t.name === n)).filter((t) => t !== undefined)
  return (
    <section className="pt-24">
      <Container className="flex flex-col gap-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading kicker="Themes" title="One word changes the whole look">
            Cards, captions, labels, fonts, colours, backdrop, movement and sound change together.
          </SectionHeading>
          <ClayLink href="/themes" variant="soft">
            All {THEMES.length} themes <ArrowRight />
          </ClayLink>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.05}>
              <ThemeSwatch theme={t} className="h-full" />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
