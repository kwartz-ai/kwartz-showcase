import type { Metadata } from 'next'
import { JsonLd } from '@/components/atoms/container'
import { CallToAction } from '@/components/organisms/call-to-action'
import { FeatureBento } from '@/components/organisms/feature-bento'
import { Hero } from '@/components/organisms/hero'
import { HowItWorks } from '@/components/organisms/how-it-works'
import { ThemeStrip } from '@/components/organisms/theme-strip'
import { softwareJsonLd } from '@/lib/seo'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { title: `${SITE.name}: ${SITE.tagline.toLowerCase()}`, description: SITE.description, url: '/' },
}

export default function Home() {
  return (
    <>
      <JsonLd data={softwareJsonLd()} />
      <Hero />
      <HowItWorks />
      <FeatureBento />
      <ThemeStrip names={['glass', 'clay', 'brutal', 'bento', 'editorial', 'terminal']} />
      <CallToAction />
    </>
  )
}
