'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ClayCard } from '@/components/atoms/clay-card'
import { Container } from '@/components/atoms/container'
import { IconBadge, type BadgeTint } from '@/components/atoms/icon-badge'
import { Pill } from '@/components/atoms/pill'
import { CodeBlock } from '@/components/molecules/code-block'
import { SectionHeading } from '@/components/molecules/section-heading'
import { cn } from '@/lib/utils'

// The code and the report below are the kit's own: the scene from the README, and the
// checks as getting-started.md prints them.
const STEPS: { title: string; short: string; long: string; tint: BadgeTint; label: string; code: string }[] = [
  {
    title: 'Write',
    short: 'One spoken line per scene, and the clicks that scene shows.',
    long: 'A video is one TypeScript file. Each scene has the line the voice will say, and what happens on screen while it is said.',
    tint: 'violet',
    label: 'video.ts',
    code: `{
  id: 'moved',
  say: 'One click keeps only the shipments whose date moved.',
  run: async ({ page, stage, untilSaid }) => {
    await stage.click(page.getByRole('button', { name: 'Moved only' }))
    await untilSaid(0.6)
    await stage.focus(page.locator('td.eta').first(), {
      label: 'Old date kept under the new one',
    })
  },
}`,
  },
  {
    title: 'Film',
    short: 'A real browser opens your product and films every scene.',
    long: 'Nothing is faked. Playwright drives your real app. The pointer glides to each element, the camera zooms toward what is being discussed, and a spotlight dims the rest.',
    tint: 'mint',
    label: 'What the camera adds',
    code: `Pointer    glides to each element and shows a click
Camera     zooms toward what is discussed, then back
Callouts   a spotlight, with a label that says why it matters
Cuts       every change of screen is a cross-dissolve`,
  },
  {
    title: 'Voice',
    short: 'A local voice reads each line. Captions follow it.',
    long: 'The voice is Kokoro, a free local model. No account, no quota, nothing uploaded. Narration is generated first, so each scene lasts exactly as long as its line.',
    tint: 'peach',
    label: 'What the sound adds',
    code: `Voice      Kokoro, on your machine
Captions   burned in, at most two balanced lines, plus a WebVTT file
Effects    soft click, callout and dissolve sounds
Music      a bed that drops under the voice
Level      the mix is levelled to -16 LUFS`,
  },
  {
    title: 'Check',
    short: 'FFmpeg builds the video. Then the file is measured.',
    long: 'After every render the kit measures the file. Anything cut off, off screen or covered by a caption fails the render and is named.',
    tint: 'sky',
    label: 'The report',
    code: `ok    picture      h264 1920x1080 at 30/1 fps
ok    length       31.4 s (target 30 to 60 s)
ok    loudness     -16.2 LUFS, peak -1.4 dBTP (target -16)
ok    captions     8 cues, longest 89 characters
ok    fonts        all loaded
not checked: how the voice, music and effects sound.
Listen once before sharing.`,
  },
]

/** Four steps from a script to a video. Press a step to see what happens in it. */
export function HowItWorks() {
  const [at, setAt] = useState(0)
  const reduce = useReducedMotion()
  const step = STEPS[at]!
  return (
    <section className="pt-24" aria-labelledby="how-title">
      <Container className="flex flex-col gap-7">
        <SectionHeading kicker="How it works" title="From a script to a video, in four steps">
          <span id="how-title">Press a step to see what happens in it.</span>
        </SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="The four steps">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === at}
              onClick={() => setAt(i)}
              className={cn(
                'clay flex cursor-pointer flex-col gap-3 rounded-3xl p-5 text-left transition-transform duration-200 hover:-translate-y-1',
                i === at && 'outline-3 outline-offset-2 outline-violet',
              )}
            >
              <IconBadge tint={s.tint}>{i + 1}</IconBadge>
              <h3 className="text-xl font-bold">{s.title}</h3>
              <p className="text-[0.95rem] text-muted-foreground">{s.short}</p>
            </button>
          ))}
        </div>
        <ClayCard className="grid items-center gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_1.15fr]" role="tabpanel">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={at}
              className="contents"
              initial={reduce ? false : { opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex min-w-0 flex-col gap-3">
                <Pill>Step {at + 1} of 4</Pill>
                <h3 className="text-2xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.long}</p>
              </div>
              <CodeBlock code={step.code} label={step.label} />
            </motion.div>
          </AnimatePresence>
        </ClayCard>
      </Container>
    </section>
  )
}
