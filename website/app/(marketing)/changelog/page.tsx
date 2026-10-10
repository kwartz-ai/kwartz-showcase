import { Container } from '@/components/atoms/container'
import { SectionHeading } from '@/components/molecules/section-heading'
import { Markdown } from '@/components/organisms/markdown'
import { CHANGELOG } from '@/lib/docs'
import { pageMeta } from '@/lib/seo'
import { SITE } from '@/lib/site'

export const metadata = pageMeta({
  title: 'Changelog',
  description: `What changed in each version of ${SITE.name}, up to version ${SITE.version}.`,
  path: '/changelog',
})

export default function ChangelogPage() {
  return (
    <section className="pt-12 sm:pt-16">
      <Container className="flex flex-col gap-8">
        <SectionHeading as="h1" kicker={`Now at version ${SITE.version}`} title="Changelog">
          What changed in each version, from the kit&apos;s own CHANGELOG.md.
        </SectionHeading>
        <Markdown source={CHANGELOG} />
      </Container>
    </section>
  )
}
