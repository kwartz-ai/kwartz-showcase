'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleAlert, Copy, Eye, RotateCcw, Sparkles } from 'lucide-react'
import { ClayButton } from '@/components/atoms/clay-button'
import { ClayCard } from '@/components/atoms/clay-card'
import { Kicker, Pill } from '@/components/atoms/pill'
import { ClayCheckbox, ClaySelect } from '@/components/molecules/clay-select'
import { BASES, DEFAULTS, FEELS, FONT_PAIRINGS, HEX, LENGTHS, LENGTH_MAX, LENGTH_MIN, PLATFORM_SETS, RULES, baseOf, cleanName, configOf, frameOf, promptOf, skillsOf, startFrom, surprise, verdictOf, type Choice, type Scene } from '@/lib/studio'
import { cn } from '@/lib/utils'

const SWATCHES = ['#FF5A1F', '#2563EB', '#16A34A', '#DB2777', '#6A4BEA', '#FDE68A', '#0EA5E9', '#111827']
const SCENES: { id: Scene; label: string }[] = [
  { id: 'hook', label: 'Opening' },
  { id: 'steps', label: 'Steps' },
  { id: 'shot', label: 'On your product' },
  { id: 'end', label: 'Ending' },
]
const OUTPUTS = [
  { id: 'prompt', label: 'The prompt for Claude' },
  { id: 'theme', label: 'Theme file' },
  { id: 'config', label: 'Config file' },
] as const

/** Stand-ins for choices that are not a value of their own. */
const OWN_FACES = 'own-faces'
const CUSTOM = 'custom'

const clock = (seconds: number) => `${Math.floor(seconds / 60)} min ${seconds % 60} s`

const field = 'clay-pressed w-full min-w-0 rounded-xl border-0 px-3 py-2.5 text-[0.95rem] text-foreground outline-none focus-visible:outline-3 focus-visible:outline-violet'

/** A row of choices where one is on. */
function Segments<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="clay-pressed inline-flex max-w-full flex-wrap gap-1 rounded-3xl p-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn('cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold text-muted-foreground', o.id === value && 'clay-violet text-white')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-bold">
          {label}
        </label>
      ) : (
        <span className="text-sm font-bold">{label}</span>
      )}
      {children}
      {hint ? <span className="text-[0.82rem] text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

/** One frame of the video, drawn by the kit's own card code and scaled to fit. */
function Frame({ html, backdrop, radius, replay }: { html: string; backdrop: string; radius: number; replay: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const seen = new ResizeObserver(() => setWidth(el.clientWidth))
    seen.observe(el)
    return () => seen.disconnect()
  }, [])
  const scale = width / 1536
  return (
    <div className="rounded-2xl p-[4.5%] transition-[background] duration-300" style={{ background: backdrop }}>
      {/* the corner is a share of the frame's short side, as in a render */}
      <div ref={box} className="relative aspect-video w-full overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.28)]" style={{ borderRadius: width * 0.5625 * radius }}>
        {width > 0 ? (
          <iframe
            key={replay}
            title="A frame of a video in this theme"
            sandbox=""
            srcDoc={html}
            className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
            style={{ width: 1536, height: 864, transform: `scale(${scale})` }}
          />
        ) : null}
      </div>
    </div>
  )
}

/** The theme studio: shape a theme, see it, have the kit's rules check it, take it to Claude. */
export function ThemeStudio() {
  const [c, setC] = useState<Choice>(DEFAULTS)
  const [scene, setScene] = useState<Scene>('hook')
  const [out, setOut] = useState<(typeof OUTPUTS)[number]['id']>('prompt')
  const [replay, setReplay] = useState(0)
  const [copied, setCopied] = useState(false)
  const [accentText, setAccentText] = useState(DEFAULTS.accent)
  const [customLength, setCustomLength] = useState(false)
  const [lengthText, setLengthText] = useState(String(DEFAULTS.length))

  const set = (patch: Partial<Choice>) => setC((old) => ({ ...old, ...patch }))
  const setAccent = (hex: string) => {
    setAccentText(hex)
    if (HEX.test(hex)) set({ accent: hex.toUpperCase() })
  }
  const pickBase = (base: string) => {
    const next = startFrom(base, c)
    setC(next)
    setAccentText(next.accent)
  }

  const surpriseMe = () => {
    const next = surprise(c)
    setC(next)
    setAccentText(next.accent)
    setReplay((n) => n + 1)
  }

  const base = baseOf(c.base)
  const verdict = useMemo(() => verdictOf(c), [c])
  const frame = useMemo(() => frameOf(c, scene), [c, scene])
  const typed = Number(lengthText)
  const lengthProblem = customLength && !(lengthText && typed >= LENGTH_MIN && typed <= LENGTH_MAX) ? `A video is between ${LENGTH_MIN} and ${LENGTH_MAX} seconds.` : null
  const failed = verdict.errors.length > 0 || !!verdict.nameProblem || !!lengthProblem
  const text = out === 'prompt' ? promptOf(c) : JSON.stringify(out === 'theme' ? verdict.file : configOf(c), null, 2)
  const pairing = FONT_PAIRINGS.find((f) => f.name === c.fontPreset)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // the browser refused: the text is on screen to select
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const stateOf = (key: string) => (verdict.errors.some((e) => e.startsWith(key)) ? 'fail' : verdict.warnings.some((w) => w.includes(key)) ? 'look' : 'pass')

  return (
    <div className="grid gap-5 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
      {/* ── the settings ── */}
      <ClayCard as="aside" aria-label="Theme settings" className="flex flex-col gap-5 p-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto quiet-scroll">
        <div className="flex flex-col gap-2">
          <ClayButton onClick={surpriseMe} className="w-full" data-testid="studio-surprise">
            <Sparkles /> Surprise me
          </ClayButton>
          <span className="text-[0.82rem] text-muted-foreground">A new theme each time: a look, a colour and fonts that suit each other, and that pass every rule.</span>
        </div>

        <Field label="1. What is the video of?" hint={c.kind === 'deck' ? 'No website is filmed. Every scene is a graphic in your theme.' : 'Claude films your real site, with captions, zoom and labels in your theme.'}>
          <Segments
            label="Kind of video"
            value={c.kind}
            options={[
              { id: 'site', label: 'My website' },
              { id: 'deck', label: 'A presentation' },
            ]}
            onChange={(kind) => set({ kind, about: kind === 'deck' ? 'our plan for next quarter, in three points' : 'how a new user gets started' })}
          />
        </Field>

        <Field label="2. Start from a look" hint={`${base.style}: ${base.use}.`}>
          <div className="grid grid-cols-3 gap-1.5">
            {BASES.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={b === c.base}
                onClick={() => pickBase(b)}
                className={cn('clay-pressed flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl p-1.5 text-xs font-bold', b === c.base && 'outline-3 outline-offset-1 outline-violet')}
              >
                <span className="block h-7 rounded-lg" style={{ background: baseOf(b).canvas }} />
                {b}
              </button>
            ))}
          </div>
        </Field>

        <Field label="3. Your brand colour" htmlFor="studio-accent">
          <div className="flex items-center gap-2">
            <input type="color" aria-label="Pick the brand colour" value={c.accent} onChange={(e) => setAccent(e.target.value.toUpperCase())} className="size-10 shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
            <input id="studio-accent" className={cn(field, 'font-mono')} value={accentText} maxLength={7} spellCheck={false} onChange={(e) => setAccent(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Try a colour">
            {SWATCHES.map((s) => (
              <button key={s} type="button" aria-label={`Use ${s}`} onClick={() => setAccent(s)} className="size-7 cursor-pointer rounded-lg ring-2 ring-clay" style={{ background: s }} />
            ))}
          </div>
        </Field>

        {c.base === 'classic' ? (
          <Field label="Dark colour" htmlFor="studio-ink" hint="The cards and caption boxes of the kit's own look.">
            <div className="flex items-center gap-2">
              <input type="color" aria-label="Pick the dark colour" value={c.ink} onChange={(e) => set({ ink: e.target.value.toUpperCase() })} className="size-10 shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
              <input id="studio-ink" className={cn(field, 'font-mono')} value={c.ink} readOnly />
            </div>
          </Field>
        ) : null}

        <Field
          label="4. Font pairing"
          htmlFor="studio-fonts"
          hint={pairing ? `${pairing.display}${pairing.text !== pairing.display ? ` with ${pairing.text}` : ''}. Suits ${pairing.use}.` : `This look has faces of its own (${base.ownFaces}). Choose a pairing to change them.`}
        >
          <ClaySelect
            id="studio-fonts"
            value={c.fontPreset || OWN_FACES}
            onChange={(v) => set({ fontPreset: v === OWN_FACES ? '' : v })}
            options={[
              ...(base.fontPreset === '' ? [{ value: OWN_FACES, label: `the look's own (${base.ownFaces})` }] : []),
              ...FONT_PAIRINGS.map((f) => ({ value: f.name, label: `${f.name} (${f.display})` })),
            ]}
          />
        </Field>

        <Field label="5. Movement">
          <Segments label="Movement" value={c.feel} options={FEELS.map((f) => ({ id: f, label: f }))} onChange={(feel) => set({ feel })} />
        </Field>

        <Field label={`6. Corners of the picture: ${c.radius === 0 ? 'square' : c.radius.toFixed(3)}`} htmlFor="studio-radius">
          <input id="studio-radius" type="range" min={0} max={0.1} step={0.002} value={c.radius} onChange={(e) => set({ radius: Number(e.target.value) })} className="w-full accent-[#6A4BEA]" />
        </Field>

        <ClayCheckbox checked={c.brandLabel} onChange={(brandLabel) => set({ brandLabel })}>
          Callout labels in the brand colour
        </ClayCheckbox>
        <ClayCheckbox checked={c.brandBackdrop} onChange={(brandBackdrop) => set({ brandBackdrop })}>
          Backdrop in the brand colour
        </ClayCheckbox>

        <Field label="7. Name of the theme" htmlFor="studio-name" hint={verdict.nameProblem ?? `Saved as themes/${cleanName(c.name)}.json`}>
          <input id="studio-name" className={cn(field, 'font-mono')} value={c.name} maxLength={24} spellCheck={false} onChange={(e) => set({ name: e.target.value })} />
        </Field>
      </ClayCard>

      <div className="flex min-w-0 flex-col gap-5">
        {/* ── the frame ── */}
        <ClayCard className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">How it looks on video</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Segments label="Scene" value={scene} options={SCENES} onChange={setScene} />
              <ClayButton variant="soft" size="icon" aria-label="Play the scene again" onClick={() => setReplay((n) => n + 1)}>
                <RotateCcw />
              </ClayButton>
            </div>
          </div>
          <Frame html={frame.html} backdrop={frame.backdrop} radius={c.radius} replay={replay} />
          <p className="text-sm text-muted-foreground">
            The cards are drawn by the kit&apos;s own code, at the size of a 16:9 video. {scene === 'shot' ? 'The product screen is a stand-in: in a video it is your real site.' : 'Things arrive as they would while the voice reads.'}
          </p>
        </ClayCard>

        {/* ── the rules ── */}
        <ClayCard className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Can it be read on video?</h2>
            <span className={cn('flex items-center gap-2 font-heading text-lg font-bold', failed ? 'text-rose-ink' : 'text-mint-ink')} role="status">
              {failed ? <CircleAlert className="size-5" /> : <Check className="size-5" />}
              {failed ? 'Not yet' : verdict.warnings.length ? 'Passes, with parts to check by eye' : 'Passes every rule'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">These are the kit&apos;s own rules, run on your theme file. A theme that fails one is refused when a video is rendered, so it is not handed over here either.</p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {RULES.map((r) => {
              const state = stateOf(r.key)
              return (
                <li
                  key={r.key}
                  className={cn('flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm', state === 'pass' && 'bg-mint-soft text-mint-ink', state === 'fail' && 'bg-rose-soft text-rose-ink', state === 'look' && 'bg-sun-soft text-sun-ink')}
                >
                  <span>{r.label}</span>
                  <span className="flex shrink-0 items-center gap-1 font-mono text-xs">
                    {state === 'pass' ? <Check className="size-3.5" /> : state === 'fail' ? <CircleAlert className="size-3.5" /> : <Eye className="size-3.5" />}
                    {state === 'look' ? 'look' : `${r.min} to 1`}
                  </span>
                </li>
              )
            })}
          </ul>
          {verdict.errors.length ? (
            <ul className="flex flex-col gap-1.5 rounded-2xl bg-rose-soft p-3.5 text-sm text-rose-ink">
              {verdict.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          {verdict.warnings.map((w) => (
            <p key={w} className="rounded-2xl bg-sun-soft p-3.5 text-sm text-sun-ink">
              {w}
            </p>
          ))}
        </ClayCard>

        {/* ── what to take away ── */}
        <ClayCard className="flex flex-col gap-5 p-4 sm:p-5">
          <h2 className="text-xl font-bold">Take it to Claude</h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              ['Copy the prompt', 'It holds your theme, your settings and what to make.'],
              ['Paste it into Claude Code', 'In your project folder. No API key is needed.'],
              ['Claude makes the video', 'It saves the theme, writes the scenes, drafts, renders and checks.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex flex-col gap-1.5">
                <span className="clay-tint grid size-9 place-items-center rounded-xl bg-violet-soft font-heading font-bold">{i + 1}</span>
                <span className="font-heading font-bold">{title}</span>
                <span className="text-sm text-muted-foreground">{body}</span>
              </li>
            ))}
          </ol>

          <div className="grid gap-4 sm:grid-cols-2">
            {c.kind === 'site' ? (
              <Field label="Address of your website" htmlFor="studio-url">
                <input id="studio-url" className={cn(field, 'font-mono')} value={c.url} spellCheck={false} onChange={(e) => set({ url: e.target.value })} />
              </Field>
            ) : null}
            <Field label={c.kind === 'deck' ? 'What is the presentation about?' : 'What should the video show?'} htmlFor="studio-about">
              <input id="studio-about" className={field} value={c.about} onChange={(e) => set({ about: e.target.value })} />
            </Field>
            <Field label="Length" htmlFor="studio-length" hint={customLength ? (lengthProblem ?? `${c.length} seconds is ${clock(c.length)}.`) : undefined}>
              <ClaySelect
                id="studio-length"
                value={customLength ? CUSTOM : String(c.length)}
                onChange={(v) => {
                  if (v === CUSTOM) {
                    setCustomLength(true)
                    setLengthText(String(c.length))
                  } else {
                    setCustomLength(false)
                    set({ length: Number(v) })
                  }
                }}
                options={[...LENGTHS.map((l) => ({ value: String(l), label: l < 120 ? `${l} seconds` : `${l / 60} minutes` })), { value: CUSTOM, label: 'Custom length' }]}
              />
              {customLength ? (
                <div className="flex items-center gap-2">
                  <input
                    id="studio-length-custom"
                    aria-label="Length in seconds"
                    aria-invalid={!!lengthProblem}
                    inputMode="numeric"
                    className={cn(field, 'font-mono', lengthProblem && 'outline-2 outline-rose')}
                    value={lengthText}
                    onChange={(e) => {
                      const text = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
                      setLengthText(text)
                      const n = Number(text)
                      if (text && n >= LENGTH_MIN && n <= LENGTH_MAX) set({ length: n })
                    }}
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">seconds</span>
                </div>
              ) : null}
            </Field>
            <Field label="Where it is posted" htmlFor="studio-platforms">
              <ClaySelect id="studio-platforms" value={c.platforms} onChange={(platforms) => set({ platforms })} options={PLATFORM_SETS.map((p) => ({ value: p.id, label: p.label }))} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segments label="What to copy" value={out} options={[...OUTPUTS]} onChange={setOut} />
            <ClayButton onClick={copy} disabled={failed} data-testid="studio-copy">
              {copied ? <Check /> : <Copy />}
              {lengthProblem ? 'Fix the length first' : failed ? 'Fix the theme first' : copied ? 'Copied' : 'Copy'}
            </ClayButton>
          </div>
          <pre data-testid="studio-output" className="max-h-96 overflow-auto rounded-2xl bg-code p-4 font-mono text-[0.8rem] leading-relaxed break-words whitespace-pre-wrap text-code-fg shadow-[inset_0_4px_10px_rgba(0,0,0,0.35)]">
            {text}
          </pre>
          <div className="flex flex-col gap-2">
            <Kicker>Skills Claude will use</Kicker>
            <div className="flex flex-wrap gap-2">
              {skillsOf(c).map((s) => (
                <Pill key={s}>{s}</Pill>
              ))}
            </div>
          </div>
        </ClayCard>
      </div>
    </div>
  )
}
