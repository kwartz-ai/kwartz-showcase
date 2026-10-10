import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container } from '@/components/atoms/container'

export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center py-24">
      <Container className="max-w-xl">
        <ClayCard className="flex flex-col items-start gap-4 p-8">
          <span className="font-mono text-sm text-muted-foreground">404</span>
          <h1 className="text-4xl font-extrabold">This page is not here.</h1>
          <p className="text-muted-foreground">The address may be old, or mistyped. The docs list every page.</p>
          <div className="flex flex-wrap gap-3">
            <ClayLink href="/docs">All docs</ClayLink>
            <ClayLink href="/" variant="soft">
              Home
            </ClayLink>
          </div>
        </ClayCard>
      </Container>
    </main>
  )
}
