import Link from 'next/link'
import { AudioLines, Bot, Clapperboard, Lock, Palette, ScanLine, Type } from 'lucide-react'
import { ClayCard, type Tint } from '@/components/atoms/clay-card'
import { Container } from '@/components/atoms/container'
import { IconBadge } from '@/components/atoms/icon-badge'
import { CodeBlock } from '@/components/molecules/code-block'
import { Reveal } from '@/components/molecules/reveal'
import { SectionHeading } from '@/components/molecules/section-heading'
import { THEMES } from '@/lib/kit'
import { cn } from '@/lib/utils'

// The five shapes and their sizes, as guide 3 lists them.
const SHAPES = [
  { name: 'landscape', ratio: '16:9', w: 88, h: 50 },
  { name: 'vertical', ratio: '9:16', w: 40, h: 71 },
  { name: 'square', ratio: '1:1', w: 56, h: 56 },
  { name: 'portrait', ratio: '4:5', w: 52, h: 65 },
  { name: 'tall', ratio: '2:3', w: 46, h: 69 },
]

function Tile({ className, tint, href, children }: { className?: string; tint?: Tint; href: string; children: React.ReactNode }) {
  return (
    <Reveal className={cn('min-w-0', className)}>
      <ClayCard as={Link} href={href} tint={tint} className="flex h-full flex-col gap-3 p-6 transition-transform duration-200 hover:-translate-y-1">
        {children}
      </ClayCard>
    </Reveal>
  )
}

/** What the kit does, as a grid of clay tiles. Every tile leads to its guide. */
export function FeatureBento() {
  return (
    <section className="pt-24">
      <Container className="flex flex-col gap-7">
        <SectionHeading kicker="What you get" title="Everything a video editor would add">
          Nobody records a screen and nobody opens a video editor.
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-6">
          <Tile className="md:col-span-3" href="/docs/guides/platforms-and-shapes">
            <IconBadge tint="violet">
              <Clapperboard />
            </IconBadge>
            <h3 className="text-xl font-bold">One script, every shape</h3>
            <p className="text-muted-foreground">Landscape for YouTube, vertical for Shorts, Reels and TikTok, square for LinkedIn. Each platform gets its own named file.</p>
            <div className="mt-auto flex flex-wrap items-end gap-3 pt-2">
              {SHAPES.map((s) => (
                <span key={s.name} className="flex flex-col items-center gap-1.5">
                  <span className="clay-violet block rounded-lg" style={{ width: s.w, height: s.h }} />
                  <span className="font-mono text-[0.7rem] text-muted-foreground">{s.ratio}</span>
                </span>
              ))}
            </div>
          </Tile>
          <Tile className="md:col-span-3" tint="mint" href="/themes">
            <IconBadge tint="clay">
              <Palette />
            </IconBadge>
            <h3 className="text-xl font-bold">Twelve themes, or your own</h3>
            <p className="text-muted-foreground">One word sets the whole look. Or make a theme for your brand: by hand, or describe the brand and have it written.</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {THEMES.map((t) => (
                <span key={t.name} title={t.name} className="clay-tint size-8 rounded-xl" style={{ background: t.backdrop.colors[1] }} />
              ))}
            </div>
          </Tile>
          <Tile className="md:col-span-2" href="/docs/guides/sound-effects">
            <IconBadge tint="peach">
              <AudioLines />
            </IconBadge>
            <h3 className="text-xl font-bold">Sound that is measured</h3>
            <p className="text-muted-foreground">Effects are chosen for your project, measured, and refused when they would squeak.</p>
          </Tile>
          <Tile className="md:col-span-2" href="/docs/troubleshooting">
            <IconBadge tint="sky">
              <ScanLine />
            </IconBadge>
            <h3 className="text-xl font-bold">Nothing cut off</h3>
            <p className="text-muted-foreground">Anything cut off, off screen or covered by a caption fails the render and is named.</p>
          </Tile>
          <Tile className="md:col-span-2" href="/docs/guides/hosted-product">
            <IconBadge tint="sun">
              <Lock />
            </IconBadge>
            <h3 className="text-xl font-bold">Safe on a live product</h3>
            <p className="text-muted-foreground">Read-only mode refuses every request that could change data. You sign in once, yourself.</p>
          </Tile>
          <Tile className="md:col-span-4" href="/docs/config-driven-video">
            <h3 className="text-xl font-bold">Or describe the video in a small file</h3>
            <p className="text-muted-foreground">Say what to film, how long, and where it will be posted. Only the address is required.</p>
            <CodeBlock
              label="showcase.config.json"
              code={`{
  "url": "http://localhost:3000",
  "length": 30,
  "platforms": ["youtube", "instagram-reel"],
  "theme": "clay"
}`}
            />
          </Tile>
          <Tile className="md:col-span-2" tint="violet" href="/docs/guides/with-claude-code">
            <IconBadge tint="clay">
              <Bot />
            </IconBadge>
            <h3 className="text-xl font-bold">Works with Claude Code</h3>
            <p className="text-muted-foreground">The kit ships a skill that tells the agent how a senior editor would cut the video, and the checks it must pass.</p>
          </Tile>
          <Tile className="md:col-span-6" tint="peach" href="/docs/fonts">
            <div className="flex flex-wrap items-center gap-4">
              <IconBadge tint="clay">
                <Type />
              </IconBadge>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-xl font-bold text-peach-ink">Fonts chosen for video</h3>
                <p className="text-peach-ink">Eleven pairings from Google Fonts, each with its own title weight and tracking. Video type is not web type.</p>
              </div>
            </div>
          </Tile>
        </div>
      </Container>
    </section>
  )
}
