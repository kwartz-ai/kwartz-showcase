// The work order: everything an author needs to write the script and the scenes
// for a brief, in one page. The kit has no AI in it; this page is what a person
// or an AI agent reads before writing.
import fs from 'node:fs'
import path from 'node:path'
import type { Brief } from './brief.ts'
import { isHosted } from './brief.ts'
import { planFor } from './plan.ts'
import { FORMATS, PLATFORMS, layoutFor } from './presets.ts'
import { ctaFor, targetsFor } from './resolve.ts'

export function workOrder(brief: Brief, dir: string): string {
  const length = brief.length ?? 30
  const plan = planFor(length)
  const targets = targetsFor(brief)
  const cta = ctaFor(brief)
  const hasScript = !!brief.script
  const mapFile = path.join(dir, '.showcase', 'explore', 'map.md')
  const lines: string[] = [
    `# Work order: ${brief.name ?? 'video'}`, '',
    brief.motionOnly && !brief.url && !brief.serve
      ? 'Product: none is filmed. Every scene is a motion scene or a clip.'
      : `Product: ${brief.url ?? `the static folder ${brief.serve}`} (${isHosted(brief.url) ? 'hosted' : 'local'})`,
    `Length: ${length} seconds (passes between ${plan.minSec} and ${plan.maxSec})`,
    `Audience: ${brief.audience ?? 'not given. Propose one and say which you chose.'}`,
    `Promise: ${brief.promise ?? 'not given. Propose the one thing the video should prove, and say which you chose.'}`,
    `Next step for the viewer: ${cta ? `${cta.text}${cta.sub ? ` (${cta.sub})` : ''}` : 'not given, and the address is local. Ask the person, or end on the product name alone.'}`,
    '',
    '## Shapes to render', '',
  ]
  for (const t of targets) {
    const shape = t.format.startsWith('{') ? JSON.parse(t.format) as { width: number; height: number } : t.format
    const l = layoutFor(shape, brief.layout)
    const where = t.platforms.length ? ` for ${t.platforms.map((p) => PLATFORMS[p]!.label).join(', ')}` : ''
    lines.push(`- ${t.label}: ${l.canvas.width}x${l.canvas.height}, ${l.mode} layout${where}`
      + (l.mode !== 'fill' ? `. The product is filmed in a ${l.width}x${l.height} window; zoom closer than usual and keep labels short.` : ''))
  }
  if (targets.length > 1) lines.push('', 'One scenes file serves every shape. Give a scene `formats: [\'landscape\']` to leave it out of the others.')
  lines.push('', '## Script', '',
    hasScript
      ? `The person wrote their own script: ${brief.script}. Use their words as they are, one paragraph per scene. Do not rewrite them.`
      : `Write about ${plan.words} words of narration in ${plan.scenes} scenes. The voice reads about 3 words a second.`,
    '', '| # | Scene | Words | What it is |', '|---|---|---|---|')
  plan.beats.forEach((b, i) => lines.push(`| ${i + 1} | ${b.kind} | about ${b.words} | ${b.note} |`))
  if (plan.chapters) lines.push('', `Use ${plan.chapters} chapter card(s) to group the proofs.`)
  lines.push('', '## Scenes', '',
    'Write `video.ts` beside the config, ending with `export default defineScenes({ prepare, scenes })`.',
    '- The hook, a "how it works" card and the end card are motion scenes: `motion: ({ theme, sayMs, cta }) => hookCard(theme, {...}, sayMs)`.',
    '- Each proof is an app scene: `run: async ({ page, stage, untilSaid }) => { ... }`.',
    '- Use the call to action from the brief on the end card: it arrives as `cta`.',
    '', '## Safety', '',
    `Names that must never appear on screen: ${brief.safety?.banned?.length ? brief.safety.banned.join(', ') : 'none listed'}.`,
    (brief.safety?.readOnly ?? isHosted(brief.url))
      ? 'Read-only mode is on: any request that could change data is refused. Scenes must only look and click.'
      : 'Read-only mode is off. Scenes must still not create, edit or delete anything unless the person agreed.',
    brief.auth?.session ? `Sign-in: a saved session at ${brief.auth.session}. If it is missing, ask the person to run "showcase login".` : 'Sign-in: none configured.',
    '', '## Product map', '',
    fs.existsSync(mapFile) ? `Read ${path.relative(dir, mapFile)} and look at the screenshots beside it.` : 'Not explored yet. Run "showcase explore" first, then read .showcase/explore/map.md.',
    '', '## Then', '',
    '1. `showcase make --draft` until every scene runs. Look at frames from every scene.',
    '2. `showcase make`. Read the checks. If the length is off, the report says by how many words.',
    '3. Tell the person which promise and audience you chose, what was checked, and that you cannot hear the result.',
    '')
  return lines.join('\n')
}

export { FORMATS }
