import { ArrowRight, BookOpen } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container } from '@/components/atoms/container'

/** The last block of a marketing page: one clear next step. */
export function CallToAction() {
  return (
    <section className="pt-24">
      <Container>
        <ClayCard tint="violet" className="flex flex-col items-start gap-5 rounded-[2rem] p-7 sm:p-12">
          <h2 className="text-3xl font-bold sm:text-5xl">From an empty folder to a first video.</h2>
          <p className="max-w-xl text-lg text-muted-foreground">Ten steps, each with the command to type and what you should see. Every tool in the pipeline is free.</p>
          <div className="flex flex-wrap gap-3">
            <ClayLink href="/docs/first-video" size="lg">
              Start the guide <ArrowRight />
            </ClayLink>
            <ClayLink href="/docs" variant="soft" size="lg">
              <BookOpen /> Read the docs
            </ClayLink>
          </div>
        </ClayCard>
      </Container>
    </section>
  )
}
