import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ClayLink } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container, JsonLd } from '@/components/atoms/container'
import { Kicker, Pill } from '@/components/atoms/pill'
import { CodeBlock } from '@/components/molecules/code-block'
import { CopyCommand } from '@/components/molecules/copy-command'
import { ThemePlayer } from '@/components/organisms/theme-player'
import { ENTRANCES, THEMES, cssToStyle, fontsOf, sentence, themeNamed } from '@/lib/kit'
import { breadcrumbJsonLd, pageMeta } from '@/lib/seo'
import { SITE } from '@/lib/site'

export function generateStaticParams() {
  return THEMES.map((t) => ({ name: t.name }))
}

export async function generateMetadata({ params }: PageProps<'/themes/[name]'>) {
  const { name } = await params
  const t = themeNamed(name)
  if (!t) return {}
  return pageMeta({
    title: `${sentence(t.name)} theme: ${t.style} for demo videos`,
    description: `The ${t.name} video theme (${t.style}). Suits ${t.use}. Watch a real render in landscape and vertical, and use it with one word.`,
    path: `/themes/${t.name}`,
  })
}

export default async function ThemePage({ params }: PageProps<'/themes/[name]'>) {
  const { name } = await params
  const t = themeNamed(name)
  if (!t) notFound()
  const i = THEMES.indexOf(t)
  const prev = THEMES[(i + THEMES.length - 1) % THEMES.length]!
  const next = THEMES[(i + 1) % THEMES.length]!

  const facts = [
    { label: 'Style', value: t.style },
    { label: 'Suits', value: sentence(t.use) },
    { label: 'Fonts', value: fontsOf(t) },
    { label: 'Moves', value: `${ENTRANCES[t.enter] ?? t.enter}. The feel is ${t.feel}.` },
    { label: 'Sounds', value: sentence(t.mood) },
    { label: 'Also called', value: t.aliases.join(', ') },
  ]

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Themes', path: '/themes' },
          { name: t.name, path: `/themes/${t.name}` },
        ])}
      />
      <section className="pt-10 sm:pt-14">
        <Container className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <Link href="/themes" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> All themes
            </Link>
            <Pill>{t.style}</Pill>
            <h1 className="text-4xl font-extrabold sm:text-6xl">The {t.name} theme</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{sentence(t.use)}.</p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr] lg:items-start">
            <ThemePlayer name={t.name} priority />
            <ClayCard className="flex flex-col gap-5 p-6">
              <dl className="flex flex-col gap-3 text-[0.95rem]">
                {facts.map((f) => (
                  <div key={f.label} className="grid grid-cols-[5.5rem_1fr] gap-3">
                    <dt className="pt-0.5 font-mono text-xs tracking-[0.06em] text-muted-foreground uppercase">{f.label}</dt>
                    <dd className="min-w-0">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <CodeBlock label="showcase.config.json" code={`{\n  "url": "http://localhost:3000",\n  "theme": "${t.name}"\n}`} />
              <CopyCommand command={`bunx showcase make --theme ${t.name} --draft`} />
            </ClayCard>
          </div>
        </Container>
      </section>

      <section className="pt-16">
        <Container className="grid gap-4 lg:grid-cols-2">
          <ClayCard className="flex flex-col gap-4 p-6">
            <Kicker>How its surfaces are drawn</Kicker>
            <h2 className="text-2xl font-bold">The parts of the look</h2>
            <p className="text-muted-foreground">These are drawn here with the theme&apos;s own styles, read from the kit&apos;s source. In a video they sit over your product.</p>
            <div className="flex flex-col gap-4 overflow-hidden rounded-2xl p-6" style={{ background: t.look.canvas, color: t.look.fg }}>
              <div className="px-5 py-4 text-lg font-bold" style={{ ...cssToStyle(t.look.panel), color: t.look.panelFg, textTransform: t.look.upper ? 'uppercase' : undefined }}>
                A panel
                <span className="mt-1 block text-sm font-normal" style={{ color: t.look.panelFg, opacity: 0.85, textTransform: 'none' }}>
                  Cards and steps are drawn like this
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1.5 text-sm font-semibold" style={cssToStyle(t.look.chip)}>
                  A chip
                </span>
                <span className="px-3 py-1.5 text-sm font-semibold" style={cssToStyle(t.look.label)}>
                  A callout label
                </span>
                <span className="size-6 rounded-full" style={{ background: t.accent }} title={`The highlight colour, ${t.accent}`} />
              </div>
              <span className="self-center px-4 py-2 text-center text-sm font-semibold" style={cssToStyle(t.look.caption)}>
                A caption, read once and quickly
              </span>
            </div>
          </ClayCard>
          <ClayCard className="flex flex-col gap-4 p-6">
            <Kicker>For an AI agent</Kicker>
            <h2 className="text-2xl font-bold">A skill for this theme</h2>
            <p className="text-muted-foreground">
              Each theme has a skill that tells an agent how to build graphics that follow it. Starting a video in a theme copies its skill into your project.
            </p>
            <CodeBlock label="Start a video in this theme" code={`bunx showcase init --config --theme ${t.name}`} copy />
            <p className="text-sm text-muted-foreground">
              The skill is{' '}
              <a className="font-semibold text-violet-deep underline underline-offset-4" href={`${SITE.repo}/blob/main/skills/showcase-theme-${t.name}/SKILL.md`} rel="noreferrer">
                showcase-theme-{t.name}
              </a>
              .
            </p>
            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              <ClayLink href="/docs/themes" variant="soft" size="sm">
                Themes reference <ArrowRight />
              </ClayLink>
              <ClayLink href="/docs/guides/your-own-theme" variant="soft" size="sm">
                Make your own from it <ArrowRight />
              </ClayLink>
            </div>
          </ClayCard>
        </Container>
      </section>

      <section className="pt-12">
        <Container className="flex justify-between gap-3">
          <ClayLink href={`/themes/${prev.name}`} variant="soft">
            <ArrowLeft /> {prev.name}
          </ClayLink>
          <ClayLink href={`/themes/${next.name}`} variant="soft">
            {next.name} <ArrowRight />
          </ClayLink>
        </Container>
      </section>
    </>
  )
}
